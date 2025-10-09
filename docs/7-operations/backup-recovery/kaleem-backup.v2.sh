#!/usr/bin/env bash
# kaleem-backup.v2.sh — unified backup + retention for Kaleem VPS
# Adds Mongo Docker mode (run mongodump inside container) to avoid host connectivity issues.

set -euo pipefail

########################
# === Configuration ===
########################

# Required
BACKUP_ROOT="${BACKUP_ROOT:-/backups}"                 # Local backup root folder
RESTIC_REPO="${RESTIC_REPO:-/backups/restic-local}"    # Restic repository (local path or s3: URL)
RESTIC_PASSWORD_FILE="${RESTIC_PASSWORD_FILE:-/etc/restic.pass}"

# Optional Healthchecks URL
HEALTHCHECKS_URL="${HEALTHCHECKS_URL:-}"

# MongoDB
MONGO_ENABLED="${MONGO_ENABLED:-1}"
# mode: host | docker
MONGO_MODE="${MONGO_MODE:-host}"
MONGO_URI="${MONGO_URI:-mongodb://127.0.0.1:27017/kaleem}"   # override to include auth/replicaSet as needed
MONGO_CONTAINER="${MONGO_CONTAINER:-kaleem-mongo}"           # used when MONGO_MODE=docker

# Qdrant
QDRANT_ENABLED="${QDRANT_ENABLED:-1}"
QDRANT_HTTP="${QDRANT_HTTP:-http://127.0.0.1:6333}"
QDRANT_CONTAINER="${QDRANT_CONTAINER:-kaleem-qdrant}"

# RabbitMQ
RABBIT_ENABLED="${RABBIT_ENABLED:-1}"
RABBIT_HTTP="${RABBIT_HTTP:-http://127.0.0.1:15672}"
RABBIT_USER="${RABBIT_USER:-kaleem}"
RABBIT_PASS="${RABBIT_PASS:-supersecret}"

# n8n
N8N_ENABLED="${N8N_ENABLED:-1}"
N8N_VOLUME_PATH="${N8N_VOLUME_PATH:-/var/lib/docker/volumes/kaleem-n8n_n8n_data/_data}"

# Configs
CONFIGS_ENABLED="${CONFIGS_ENABLED:-1}"
CONFIG_PATHS="${CONFIG_PATHS:-/etc/nginx /etc/cron.d /opt/kaleem}"

# MinIO
MINIO_ENABLED="${MINIO_ENABLED:-0}"
MINIO_ALIAS="${MINIO_ALIAS:-local}"
MINIO_ENDPOINT="${MINIO_ENDPOINT:-http://127.0.0.1:9000}"
MINIO_ACCESS_KEY="${MINIO_ACCESS_KEY:-minioadmin}"
MINIO_SECRET_KEY="${MINIO_SECRET_KEY:-minioadmin}"
MINIO_SOURCE="${MINIO_SOURCE:-local/documents}"
MINIO_TARGET="${MINIO_TARGET:-$BACKUP_ROOT/minio/documents}"

# Retention policy
KEEP_DAILY="${KEEP_DAILY:-7}"
KEEP_WEEKLY="${KEEP_WEEKLY:-4}"
KEEP_MONTHLY="${KEEP_MONTHLY:-6}"

# Misc
LOG_DIR="${LOG_DIR:-/var/log/kaleem-backups}"
DATE="$(date +%F-%H%M%S)"
HOST_TAG="${HOST_TAG:-$(hostname -s)}"

########################
# === Helpers ===
########################
log() { echo "$(date -Is) | $*"; }
notify_start() { [[ -n "$HEALTHCHECKS_URL" ]] && curl -fsS -m 10 --retry 3 "$HEALTHCHECKS_URL/start" >/dev/null || true; }
notify_ok()    { [[ -n "$HEALTHCHECKS_URL" ]] && curl -fsS -m 10 --retry 3 "$HEALTHCHECKS_URL" >/dev/null || true; }
notify_fail()  { [[ -n "$HEALTHCHECKS_URL" ]] && curl -fsS -m 10 --retry 3 "$HEALTHCHECKS_URL/fail" >/dev/null || true; }

abort() {
  log "ERROR: $*"
  notify_fail
  exit 1
}

ensure_cmd() {
  command -v "$1" >/dev/null 2>&1 || abort "Missing required command: $1"
}

trap 'abort "Script failed at line $LINENO."' ERR

########################
# === Pre-flight ====
########################
mkdir -p "$BACKUP_ROOT"/{mongo,qdrant,rabbitmq,n8n,configs,minio} "$LOG_DIR"
ensure_cmd restic
ensure_cmd tar
ensure_cmd curl

# Mongo requirements
if [[ "${MONGO_ENABLED}" == "1" ]]; then
  if [[ "${MONGO_MODE}" == "host" ]]; then
    ensure_cmd mongodump
  else
    ensure_cmd docker
  fi
fi

if [[ "${QDRANT_ENABLED}" == "1" ]]; then ensure_cmd docker; fi
if [[ "${RABBIT_ENABLED}" == "1" ]]; then ensure_cmd curl; fi
if [[ "${MINIO_ENABLED}" == "1" ]]; then ensure_cmd mc; fi

# Initialize restic repo if needed
if [[ ! -f "$RESTIC_PASSWORD_FILE" ]]; then
  abort "RESTIC_PASSWORD_FILE not found: $RESTIC_PASSWORD_FILE"
fi

if ! restic -r "$RESTIC_REPO" snapshots --password-file "$RESTIC_PASSWORD_FILE" >/dev/null 2>&1; then
  log "Initializing restic repo at: $RESTIC_REPO"
  restic -r "$RESTIC_REPO" init --password-file "$RESTIC_PASSWORD_FILE"
fi

notify_start
log "===== Kaleem Backup Started ($DATE) ====="

########################
# === MongoDB dump ===
########################
if [[ "${MONGO_ENABLED}" == "1" ]]; then
  if [[ "${MONGO_MODE}" == "host" ]]; then
    log "[MongoDB] Dumping from host via mongodump"
    mongodump       --uri "$MONGO_URI"       --archive="$BACKUP_ROOT/mongo/mongo-$DATE.archive.gz"       --gzip       --oplog
    log "[MongoDB] Done → $BACKUP_ROOT/mongo/mongo-$DATE.archive.gz"
  else
    log "[MongoDB] Dumping inside container: $MONGO_CONTAINER"
    DUMP="/dump/mongo-$DATE.archive.gz"
    docker exec "$MONGO_CONTAINER" sh -lc "mkdir -p /dump && mongodump --uri '$MONGO_URI' --archive='$DUMP' --gzip --oplog"
    docker cp "$MONGO_CONTAINER:$DUMP" "$BACKUP_ROOT/mongo/mongo-$DATE.archive.gz"
    log "[MongoDB] Done → $BACKUP_ROOT/mongo/mongo-$DATE.archive.gz"
  fi
else
  log "[MongoDB] Skipped"
fi

########################
# === Qdrant snapshot ===
########################
if [[ "${QDRANT_ENABLED}" == "1" ]]; then
  SNAP="qdrant-$DATE.snapshot"
  log "[Qdrant] Creating snapshot via API: $SNAP"
  curl -fsS -X POST "$QDRANT_HTTP/snapshots"     -H 'content-type: application/json'     -d "{"snapshot_name":"$SNAP"}" >/dev/null
  docker cp "${QDRANT_CONTAINER}:/qdrant/storage/snapshots/$SNAP" "$BACKUP_ROOT/qdrant/$SNAP"
  log "[Qdrant] Done → $BACKUP_ROOT/qdrant/$SNAP"
else
  log "[Qdrant] Skipped"
fi

########################
# === RabbitMQ defs ===
########################
if [[ "${RABBIT_ENABLED}" == "1" ]]; then
  log "[RabbitMQ] Exporting definitions"
  curl -fsS -u "${RABBIT_USER}:${RABBIT_PASS}"     "${RABBIT_HTTP}/api/definitions"     -o "$BACKUP_ROOT/rabbitmq/defs-$DATE.json"
  log "[RabbitMQ] Done → $BACKUP_ROOT/rabbitmq/defs-$DATE.json"
else
  log "[RabbitMQ] Skipped"
fi

########################
# === n8n (SQLite) ===
########################
if [[ "${N8N_ENABLED}" == "1" ]]; then
  log "[n8n] Archiving SQLite database from volume"
  tar -C "$N8N_VOLUME_PATH" -czf "$BACKUP_ROOT/n8n/n8n-sqlite-$DATE.tar.gz" database.sqlite
  log "[n8n] Done → $BACKUP_ROOT/n8n/n8n-sqlite-$DATE.tar.gz"
else
  log "[n8n] Skipped"
fi

########################
# === Configs tar.gz ===
########################
if [[ "${CONFIGS_ENABLED}" == "1" ]]; then
  log "[Configs] Archiving: $CONFIG_PATHS"
  tar -czf "$BACKUP_ROOT/configs/configs-$DATE.tar.gz" $CONFIG_PATHS
  log "[Configs] Done → $BACKUP_ROOT/configs/configs-$DATE.tar.gz"
else
  log "[Configs] Skipped"
fi

########################
# === MinIO mirror ===
########################
if [[ "${MINIO_ENABLED}" == "1" ]]; then
  log "[MinIO] Mirroring $MINIO_SOURCE → $MINIO_TARGET"
  mkdir -p "$MINIO_TARGET"
  mc alias set "$MINIO_ALIAS" "$MINIO_ENDPOINT" "$MINIO_ACCESS_KEY" "$MINIO_SECRET_KEY" >/dev/null
  mc mirror "$MINIO_SOURCE" "$MINIO_TARGET"
  log "[MinIO] Done"
else
  log "[MinIO] Skipped"
fi

########################
# === Restic backup ===
########################
log "[Restic] Backing up $BACKUP_ROOT to $RESTIC_REPO"
restic -r "$RESTIC_REPO"   backup "$BACKUP_ROOT"   --password-file "$RESTIC_PASSWORD_FILE"   --host "$HOST_TAG"   --tag kaleem   --tag "$DATE"

########################
# === Retention (forget + prune) ===
########################
log "[Restic] Applying retention policy (daily=$KEEP_DAILY, weekly=$KEEP_WEEKLY, monthly=$KEEP_MONTHLY)"
restic -r "$RESTIC_REPO"   forget --password-file "$RESTIC_PASSWORD_FILE"   --keep-daily "$KEEP_DAILY"   --keep-weekly "$KEEP_WEEKLY"   --keep-monthly "$KEEP_MONTHLY"   --prune

log "===== Kaleem Backup Finished ($DATE) ====="
notify_ok

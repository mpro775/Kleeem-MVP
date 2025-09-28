#!/usr/bin/env bash
set -euo pipefail

# Vars
BACKUP_DIR=${BACKUP_DIR:-/backups/$(date +%F)}
MONGO_URI=${MONGO_URI:-"mongodb://mongo:27017/kaleem"}
MINIO_ALIAS=${MINIO_ALIAS:-"local"}
S3_BUCKET=${S3_BUCKET:-"kaleem-backups"}
QDRANT_HOST=${QDRANT_HOST:-"qdrant"}
QDRANT_PORT=${QDRANT_PORT:-"6333"}

mkdir -p "$BACKUP_DIR"

echo "[*] MongoDB dump"
mongodump --uri="$MONGO_URI" --out "$BACKUP_DIR/mongo"

echo "[*] Qdrant snapshot (collections)"
curl -s -X POST "http://$QDRANT_HOST:$QDRANT_PORT/collections/_snapshot" -o "$BACKUP_DIR/qdrant-snapshot.json" || true

echo "[*] Redis RDB copy (if local)"
if [ -f "/data/dump.rdb" ]; then
  cp /data/dump.rdb "$BACKUP_DIR/redis-dump.rdb"
fi

echo "[*] Tar & upload to MinIO"
tar -czf "$BACKUP_DIR.tar.gz" -C "$(dirname "$BACKUP_DIR")" "$(basename "$BACKUP_DIR")"
mc cp "$BACKUP_DIR.tar.gz" "$MINIO_ALIAS/$S3_BUCKET/"
echo "[+] Done"

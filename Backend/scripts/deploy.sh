#!/usr/bin/env bash
set -euo pipefail

### ================== إعدادات عامة ==================
COMPOSE_BASE="docker-compose.yml"
COMPOSE_OVERRIDE="docker-compose.image.override.yml"

# متغيّرات يجب تمريرها من الـ CI أو يدويًا قبل التشغيل:
# KALEEM_API_IMAGE : مثال ghcr.io/OWNER/REPO/kaleem-api@sha256:XXXXXXXX
: "${KALEEM_API_IMAGE:?KALEEM_API_IMAGE is required (e.g., ghcr.io/OWNER/REPO/kaleem-api@sha256:...)}"

# (اختياري) بيانات الدخول لـ GHCR إن كان السيرفر غير مسجل:
GHCR_USER="${GHCR_USER:-}"
GHCR_TOKEN="${GHCR_TOKEN:-}"

# عنوان فحص الصحة — يفضل عبر الـ LB (nginx) أو الدومين
HEALTH_URL="${HEALTH_URL:-http://localhost:8088/api/health}"

# إعدادات النسخ الاحتياطي لمونغو
BACKUP_DIR="${BACKUP_DIR:-/opt/kaleem/backups}"
RETENTION="${RETENTION:-7}"        # احتفظ بآخر 7 نسخ
MONGODB_URI="${MONGODB_URI:-mongodb://admin:strongpassword@mongo:27017/admin?authSource=admin}"

# محاولات فحص الصحة
MAX_ATTEMPTS="${MAX_ATTEMPTS:-10}"
SLEEP_SECONDS="${SLEEP_SECONDS:-20}"

# سجل النشر
LOG_DIR="${LOG_DIR:-/opt/kaleem/logs}"
LOG_FILE="${LOG_FILE:-$LOG_DIR/deploy.log}"

### ================== دوال مساعدة ==================
log() { printf "[%s] %s\n" "$(date '+%F %T')" "$*"; }
error_exit() { log "ERROR: $*"; exit 1; }
trap 'error_exit "Unexpected error on line $LINENO"' ERR

ensure_cmd() { command -v "$1" >/dev/null 2>&1 || error_exit "Missing required command: $1"; }

### ================== تهيئة و فحوصات ==================
mkdir -p "$LOG_DIR" "$BACKUP_DIR"
# وجه الإخراج إلى السجل أيضًا
exec > >(tee -a "$LOG_FILE") 2>&1

log "🚀 بدء النشر باستخدام الملف الأساسي: $COMPOSE_BASE + override: $COMPOSE_OVERRIDE"

ensure_cmd docker
ensure_cmd curl

[ -f "$COMPOSE_BASE" ] || error_exit "File not found: $COMPOSE_BASE"
[ -f "$COMPOSE_OVERRIDE" ] || error_exit "File not found: $COMPOSE_OVERRIDE"

### ================== تسجيل الدخول إلى GHCR (اختياري) ==================
if [[ -n "$GHCR_USER" && -n "$GHCR_TOKEN" ]]; then
  log "🔐 Docker login to GHCR as $GHCR_USER"
  echo "$GHCR_TOKEN" | docker login ghcr.io -u "$GHCR_USER" --password-stdin
else
  log "ℹ️  Skipping GHCR login (GHCR_USER/TOKEN not provided). Assuming already logged in."
fi

### ================== سحب الصورة الجديدة ==================
log "⬇️  Pulling image: $KALEEM_API_IMAGE"
docker pull "$KALEEM_API_IMAGE"

### ================== التقاط صورة الخدمة الحالية (للرجوع) ==================
# نحاول استعمال jq؛ إن لم يوجد نستعمل awk كبديل بسيط
PREV_IMAGE=""
if command -v jq >/dev/null 2>&1; then
  PREV_IMAGE="$(docker compose -f "$COMPOSE_BASE" ps --format json 2>/dev/null \
    | jq -r '.[] | select(.Service=="api") | .Image' || true)"
else
  # بديل بدائي بدون jq (قد لا يعمل على جميع الإصدارات)
  PREV_IMAGE="$(docker compose -f "$COMPOSE_BASE" ps 2>/dev/null | awk '/api/ {print $3}' | head -n1 || true)"
fi
[[ "$PREV_IMAGE" == "null" ]] && PREV_IMAGE=""
log "📦 Previous API image: ${PREV_IMAGE:-<none>}"

### ================== نسخ احتياطي لمونغو مع تدوير ==================
BACKUP_NAME="mongo-$(date '+%Y%m%d-%H%M%S').archive.gz"
log "🧰 Mongo backup to: $BACKUP_DIR/$BACKUP_NAME"
# نستخدم أداة mongodump من حاوية mongo الرسمية عبر docker run (أضمن)
docker run --rm --network host \
  -v "$BACKUP_DIR:/backup" \
  mongo:5 bash -lc "mongodump --uri='$MONGODB_URI' --archive=/backup/$BACKUP_NAME --gzip"

# تدوير النسخ: احتفظ بآخر $RETENTION نسخ
log "🧹 Rotating backups (keep last $RETENTION)"
(ls -1t "$BACKUP_DIR"/mongo-*.archive.gz 2>/dev/null | tail -n +$((RETENTION+1)) | xargs -r rm -f) || true

### ================== تطبيق الترقية للخدمة API فقط ==================
log "🔄 Updating service: api"
export KALEEM_API_IMAGE
docker compose -f "$COMPOSE_BASE" -f "$COMPOSE_OVERRIDE" up -d --no-deps api

### ================== فحص الصحة ==================
log "🩺 Health check: $HEALTH_URL"
ATTEMPT=1
until curl -fsS "$HEALTH_URL" >/dev/null; do
  log "⏳ Not healthy yet... ($ATTEMPT/$MAX_ATTEMPTS)"
  if (( ATTEMPT >= MAX_ATTEMPTS )); then
    log "❌ Health check failed after $MAX_ATTEMPTS attempts"
    # رجوع للصورة السابقة إن وُجدت
    if [[ -n "$PREV_IMAGE" ]]; then
      log "🔙 Rolling back to previous image: $PREV_IMAGE"
      export KALEEM_API_IMAGE="$PREV_IMAGE"
      docker compose -f "$COMPOSE_BASE" -f "$COMPOSE_OVERRIDE" up -d --no-deps api || true
    else
      log "⚠️ No previous image recorded — skip rollback"
    fi
    error_exit "Deployment failed"
  fi
  ATTEMPT=$((ATTEMPT+1))
  sleep "$SLEEP_SECONDS"
done
log "✅ Service is healthy"

### ================== تحديث خدمات اختيارية (إن رغبت) ==================
# مثال: إن مرّرت صور عمال عبر Env؛ وإلا سيبقى البناء المحلي كما هو
# if [[ -n "${KALEEM_AI_REPLY_IMAGE:-}" ]] && docker compose -f "$COMPOSE_BASE" ps ai-reply-worker >/dev/null 2>&1; then
#   export KALEEM_AI_REPLY_IMAGE
#   docker compose -f "$COMPOSE_BASE" -f "$COMPOSE_OVERRIDE" up -d --no-deps ai-reply-worker
#   log "🔄 Updated ai-reply-worker"
# fi

# if [[ -n "${KALEEM_WEBHOOK_DISPATCHER_IMAGE:-}" ]] && docker compose -f "$COMPOSE_BASE" ps webhook-dispatcher >/dev/null 2>&1; then
#   export KALEEM_WEBHOOK_DISPATCHER_IMAGE
#   docker compose -f "$COMPOSE_BASE" -f "$COMPOSE_OVERRIDE" up -d --no-deps webhook-dispatcher
#   log "🔄 Updated webhook-dispatcher"
# fi

### ================== تنظيف صور قديمة (dangling) ==================
log "🧼 Pruning dangling images"
docker image prune -f || true

log "🎉 Done."

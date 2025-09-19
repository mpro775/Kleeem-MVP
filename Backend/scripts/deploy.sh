#!/bin/bash

# سكريبت نشر Kaleem API
set -euo pipefail

# متغيرات
IMAGE_TAG=${IMAGE_TAG:-"ghcr.io/kaleem/kaleem-api:latest"}
COMPOSE_FILE="docker-compose.prod.yml"
BACKUP_DIR="/opt/kaleem/backups"
LOG_FILE="/opt/kaleem/logs/deploy.log"

# دوال مساعدة
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

error_exit() {
    log "ERROR: $1"
    exit 1
}

# إنشاء المجلدات المطلوبة
mkdir -p "$BACKUP_DIR" "$(dirname "$LOG_FILE")"

log "🚀 بدء عملية النشر..."
log "صورة Docker: $IMAGE_TAG"

# فحص متطلبات النشر
if [ ! -f "$COMPOSE_FILE" ]; then
    error_exit "ملف $COMPOSE_FILE غير موجود"
fi

if ! docker --version > /dev/null 2>&1; then
    error_exit "Docker غير مثبت أو غير متاح"
fi

if ! docker compose version > /dev/null 2>&1; then
    error_exit "Docker Compose غير متاح"
fi

# نسخ احتياطية
log "📦 إنشاء نسخة احتياطية..."
BACKUP_NAME="kaleem-backup-$(date +%Y%m%d-%H%M%S).tar.gz"

# نسخ احتياطية للبيانات المهمة
docker compose -f "$COMPOSE_FILE" exec -T mongo mongodump --archive | gzip > "$BACKUP_DIR/mongo-$BACKUP_NAME" || log "تحذير: فشل في النسخ الاحتياطي لـ MongoDB"

# سحب الصورة الجديدة
log "⬇️ سحب الصورة الجديدة..."
docker pull "$IMAGE_TAG" || error_exit "فشل في سحب الصورة"

# تحديث متغير البيئة
export KALEEM_API_IMAGE="$IMAGE_TAG"

# إيقاف الخدمات القديمة تدريجياً
log "🔄 تحديث الخدمات..."

# تحديث API service فقط
docker compose -f "$COMPOSE_FILE" up -d --no-deps api

# انتظار بدء الخدمة
log "⏳ انتظار بدء الخدمة الجديدة..."
sleep 10

# فحص الصحة
log "🏥 فحص صحة التطبيق..."
HEALTH_URL="http://localhost:3000/api/health"
MAX_ATTEMPTS=30
ATTEMPT=1

while [ $ATTEMPT -le $MAX_ATTEMPTS ]; do
    if curl -f -s "$HEALTH_URL" > /dev/null 2>&1; then
        log "✅ فحص الصحة نجح!"
        break
    fi
    
    if [ $ATTEMPT -eq $MAX_ATTEMPTS ]; then
        log "❌ فشل فحص الصحة بعد $MAX_ATTEMPTS محاولة"
        
        # استرجاع النسخة السابقة
        log "🔙 استرجاع النسخة السابقة..."
        docker compose -f "$COMPOSE_FILE" rollback api || true
        
        error_exit "فشل النشر - تم استرجاع النسخة السابقة"
    fi
    
    log "محاولة فحص الصحة $ATTEMPT/$MAX_ATTEMPTS..."
    sleep 5
    ((ATTEMPT++))
done

# تنظيف الصور القديمة
log "🧹 تنظيف الصور القديمة..."
docker image prune -f || log "تحذير: فشل في تنظيف الصور"

# تحديث workers إذا لزم الأمر
log "🔄 تحديث العمال..."
docker compose -f "$COMPOSE_FILE" up -d --no-deps ai-reply-worker webhook-dispatcher || log "تحذير: فشل في تحديث العمال"

log "🎉 تم النشر بنجاح!"
log "الصورة: $IMAGE_TAG"
log "الوقت: $(date)"

# إشعار النجاح (اختياري)
if [ -n "${WEBHOOK_URL:-}" ]; then
    curl -X POST "$WEBHOOK_URL" \
        -H "Content-Type: application/json" \
        -d "{\"text\":\"✅ نجح نشر Kaleem API\\nالصورة: $IMAGE_TAG\\nالوقت: $(date)\"}" || true
fi

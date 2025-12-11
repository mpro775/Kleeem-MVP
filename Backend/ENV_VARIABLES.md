# 🔐 Kaleem Backend - Environment Variables Guide

## نظرة عامة
هذا الدليل يحتوي على جميع المتغيرات البيئية المطلوبة والاختيارية لتشغيل Backend الخاص بـ Kaleem MVP.

---

## 🌐 العمل عبر SSH Tunnel

لتشغيل التطبيق من حاسوبك أثناء الاتصال بخدمات الـ VPS، افتح نفق SSH واحد يضم كل المنافذ المهمة:

```bash
ssh \
  -L 27017:localhost:27017 \
  -L 6379:localhost:6379 \
  -L 5672:localhost:5672 \
  -L 9000:localhost:9000 \
  -L 9001:localhost:9001 \
  -L 8080:localhost:8080 \
  -L 5678:localhost:5678 \
  root@72.61.5.166
```

طالما هذه الجلسة مفتوحة يمكنك استخدام نفس عناوين الـ VPS (127.0.0.1) في ملف `.env` المحلي، وسيتم تمرير الطلبات إلى الحاويات البعيدة بأمان.

---

## 📋 ملف .env.example

```bash
# =============================================================================
# Kaleem Backend Environment Variables
# =============================================================================
# نسخ هذا الملف إلى .env وتعديل القيم حسب البيئة

# =============================================================================
# Node Environment
# =============================================================================
NODE_ENV=development
PORT=3000
APP_DEFAULT_PORT=3000
APP_VERSION=1.0.0
APP_MINIMAL_BOOT=0

# =============================================================================
# Database Configuration - MongoDB
# =============================================================================
# يمكن استخدام DATABASE_URL أو MONGODB_URI
MONGO_PASSWORD=kaleem@123
DATABASE_URL=mongodb://kaleem:${MONGO_PASSWORD}@127.0.0.1:27017/kaleem?authSource=admin
MONGODB_URI=mongodb://kaleem:${MONGO_PASSWORD}@127.0.0.1:27017/kaleem?authSource=admin
# تفعيل SSL للاتصال بـ MongoDB (true/false)
MONGODB_SSL=false

# =============================================================================
# Redis Configuration
# =============================================================================
# استخدم redis:// للاتصال العادي أو rediss:// لـ SSL
REDIS_URL=redis://127.0.0.1:6379

# =============================================================================
# RabbitMQ Configuration
# =============================================================================
RABBITMQ_PASSWORD=supersecret
RABBIT_URL=amqp://kaleem:${RABBITMQ_PASSWORD}@127.0.0.1:5672/kleem
# مهلة تأكيد الرسائل بالميلي ثانية (افتراضي: 10000)
RABBIT_CONFIRM_TIMEOUT_MS=10000

# =============================================================================
# JWT Authentication
# =============================================================================
# سر JWT (يجب أن يكون 32 حرف على الأقل، استخدم openssl rand -hex 32)
JWT_SECRET=your-super-secret-jwt-key-min-32-chars-change-this-in-production
# مدة صلاحية Access Token (مثال: 15m, 1h, 7d)
JWT_ACCESS_TTL=15m
# مدة صلاحية Refresh Token
JWT_REFRESH_TTL=7d

# =============================================================================
# Email Configuration (SMTP)
# =============================================================================
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
# استخدام SSL/TLS (true/false)
MAIL_SECURE=false
MAIL_USER=your-email@gmail.com
MAIL_PASS=your-app-password
MAIL_FROM=noreply@kaleem-ai.com

# =============================================================================
# Object Storage - Cloudflare R2 (S3 Compatible)
# =============================================================================
# مفاتيح حساب R2
AWS_ACCESS_KEY_ID=change-me
AWS_SECRET_ACCESS_KEY=change-me
# R2 يقبل المنطقة auto
AWS_REGION=auto
# Endpoint الخاص بحساب R2 (بدون / في النهاية)
AWS_ENDPOINT=https://56c86161349f5102ec103ae2ea495e01.r2.cloudflarestorage.com
# اسم الحاوية
S3_BUCKET_NAME=kaleem-assets
# يُستخدم لروابط عامة إن كان هناك CDN أو دومين مخصص (اختياري)
# ASSETS_CDN_BASE_URL=https://cdn.kaleem-ai.com
# ملاحظة: يمكن الإبقاء على MINIO_* فقط للتوافق المحلي القديم، لكن الإنتاج يستخدم القيم أعلاه.

# =============================================================================
# Vector Database - Qdrant
# =============================================================================
QDRANT_URL=http://127.0.0.1:6333

# =============================================================================
# Evolution API - WhatsApp Integration
# =============================================================================
EVOLUTION_API_URL=http://127.0.0.1:8080
EVOLUTION_API_KEY=any-secret-key
# يمكن استخدام EVOLUTION_APIKEY أيضاً (نفس القيمة)
EVOLUTION_APIKEY=any-secret-key

# =============================================================================
# Telegram Bot Configuration
# =============================================================================
# سر webhook للتيليجرام (يجب أن يكون 16 حرف على الأقل)
TELEGRAM_WEBHOOK_SECRET=your-telegram-webhook-secret-min-16-chars
# إعدادات بوت الدعم (اختياري)
SUPPORT_TELEGRAM_BOT_TOKEN=your-telegram-bot-token
SUPPORT_TELEGRAM_CHAT_ID=your-telegram-chat-id

# =============================================================================
# N8N Workflow Automation
# =============================================================================
# مفتاح API لـ N8N
N8N_API_KEY=your-n8n-api-key
# رابط API لـ N8N
N8N_API_URL=http://127.0.0.1:5678
# رابط أساسي لـ N8N (يمكن استخدام N8N_BASE_URL أو N8N_BASE)
N8N_BASE_URL=http://127.0.0.1:5678
N8N_BASE=http://127.0.0.1:5678
# مسار webhook الوارد لـ N8N
N8N_INCOMING_PATH=/webhook/ai-agent-{merchantId}
# رابط webhook OpenAI (اختياري)
N8N_OPENAI_WEBHOOK_URL=https://n8n.kaleem-ai.com/webhook/openai
# توكن الخدمة لـ N8N (للطلبات الداخلية)
N8N_SERVICE_TOKEN=your-n8n-service-token
# استخدام الاتصال المباشر بـ N8N عند الفشل (true/false)
N8N_DIRECT_CALL_FALLBACK=false

# =============================================================================
# AI Services
# =============================================================================
# مفتاح Google Gemini API
GEMINI_API_KEY=your-gemini-api-key

# =============================================================================
# Webhook & Public URLs
# =============================================================================
# رابط أساسي عام للـ webhooks (بدون / في النهاية)
PUBLIC_WEBHOOK_BASE=https://api.kaleem-ai.com
# رابط الواجهة الأمامية
FRONTEND_URL=https://app.kaleem-ai.com

# =============================================================================
# Grafana Cloud (اختياري)
# =============================================================================
GRAFANA_CLOUD_METRICS_URL=https://prometheus-prod-XX.grafana.net/api/prom/push
GRAFANA_CLOUD_METRICS_USERNAME=123456
GRAFANA_CLOUD_API_KEY=glc_********************************

# =============================================================================
# ZID E-commerce Integration
# =============================================================================
ZID_CLIENT_ID=your-zid-client-id
ZID_CLIENT_SECRET=your-zid-client-secret
ZID_REDIRECT_URI=https://api.kaleem-ai.com/api/integrations/zid/callback
ZID_WEBHOOK_URL=https://api.kaleem-ai.com/api/integrations/zid/webhook

# =============================================================================
# CORS Configuration
# =============================================================================
# قائمة Origins الثابتة المسموح بها (مفصولة بفاصلة)
CORS_STATIC_ORIGINS=http://localhost:5173,http://127.0.0.1:5173,https://app.kaleem-ai.com,https://kaleem-ai.com
# الدومين الأساسي للسماح بالساب دومينز
CORS_ALLOW_SUBDOMAIN_BASE=kaleem-ai.com
# السماح بالمنافذ على الساب دومينز (true/false)
CORS_SUBDOMAIN_ALLOW_PORTS=false
# السماح بطلبات بدون Origin (true/false)
CORS_ALLOW_EMPTY_ORIGIN=true
# السماح لجميع Origins (خطر في الإنتاج!) (true/false)
CORS_ALLOW_ALL=false
# السماح بإرسال Credentials (true/false)
CORS_CREDENTIALS=true
# الطرق المسموح بها (مفصولة بفاصلة)
CORS_METHODS=GET,HEAD,POST,PUT,PATCH,DELETE,OPTIONS
# Headers المسموح بها (مفصولة بفاصلة)
CORS_ALLOWED_HEADERS=Authorization,Content-Type,X-Request-Id,X-Idempotency-Key,X-Signature,X-Timestamp,Idempotency-Key,X-Kaleem-Timestamp,X-Kaleem-Nonce,X-Kaleem-Signature
# Headers المكشوفة للعميل (مفصولة بفاصلة)
CORS_EXPOSED_HEADERS=x-request-id,X-RateLimit-Remaining,X-RateLimit-Reset
# مدة تخزين preflight request (بالثواني، افتراضي: 86400)
CORS_MAX_AGE=86400
# حالة النجاح لطلبات OPTIONS (افتراضي: 204)
CORS_OPTIONS_SUCCESS_STATUS=204

# =============================================================================
# Chat Configuration
# =============================================================================
# نقطة نهاية N8N للشات
CHAT_N8N_ENDPOINT=/webhook/webhooks/kleem/incoming
# اسم البوت
CHAT_BOT_NAME=kleem
# القناة الافتراضية
CHAT_DEFAULT_CHANNEL=webchat
# تأخير إيقاف الكتابة بالميلي ثانية (افتراضي: 3000)
CHAT_TYPING_STOP_DELAY_MS=3000

# =============================================================================
# Embeddings Service Configuration
# =============================================================================
# الأبعاد المتوقعة للـ embeddings (افتراضي: 1536)
EMBEDDINGS_EXPECTED_DIM=1536
# مهلة HTTP بالميلي ثانية (افتراضي: 30000)
EMBEDDINGS_HTTP_TIMEOUT_MS=30000
# مهلة RxJS بالميلي ثانية (افتراضي: 35000)
EMBEDDINGS_RX_TIMEOUT_MS=35000
# الحد الأقصى لطول النص (افتراضي: 8000)
EMBEDDINGS_MAX_TEXT_LENGTH=8000
# الحد الأقصى لإعادة المحاولات (افتراضي: 3)
EMBEDDINGS_MAX_RETRIES=3
# تأخير أساسي لإعادة المحاولة بالميلي ثانية (افتراضي: 1000)
EMBEDDINGS_BASE_RETRY_DELAY_MS=1000
# مسار نقطة النهاية للـ embeddings (افتراضي: /embed)
EMBEDDINGS_ENDPOINT_PATH=/embed

# =============================================================================
# Security Configuration
# =============================================================================
# مدة HSTS بالثواني (افتراضي: 31536000 = 1 سنة)
SEC_HSTS_MAX_AGE=31536000
# سر ملفات الكوكيز (اختياري، استخدم openssl rand -hex 32)
COOKIE_SECRET=your-cookie-secret-key

# =============================================================================
# Rate Limiting
# =============================================================================
# نافذة زمنية للـ rate limit بالميلي ثانية (افتراضي: 900000 = 15 دقيقة)
RATE_LIMIT_WINDOW_MS=900000
# الحد الأقصى للطلبات في النافذة الزمنية (افتراضي: 100)
RATE_LIMIT_MAX=100
# كود الخطأ عند تجاوز الحد (افتراضي: RATE_LIMIT_EXCEEDED)
RATE_LIMIT_CODE=RATE_LIMIT_EXCEEDED
# رسالة الخطأ (افتراضي: تم تجاوز حد الطلبات)
RATE_LIMIT_TEXT=تم تجاوز حد الطلبات، الرجاء المحاولة لاحقاً

# =============================================================================
# Cache Configuration
# =============================================================================
# مدة تخزين بيانات التاجر بالميلي ثانية (افتراضي: 600000 = 10 دقائق)
CACHE_MERCHANT_TTL_MS=600000
# مدة تخزين prompt التاجر بالميلي ثانية (افتراضي: 1800000 = 30 دقيقة)
CACHE_MERCHANT_PROMPT_TTL_MS=1800000
# مدة تخزين حالة التاجر بالميلي ثانية (افتراضي: 300000 = 5 دقائق)
CACHE_MERCHANT_STATUS_TTL_MS=300000

# =============================================================================
# Monitoring & Logging - Sentry/GlitchTip
# =============================================================================
# Sentry/GlitchTip DSN (اختياري)
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
# تفعيل debug mode لـ Sentry (true/false)
SENTRY_DEBUG=false

# =============================================================================
# OpenTelemetry (اختياري)
# =============================================================================
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318/v1/traces

# =============================================================================
# MongoDB Initialization (for docker-compose)
# =============================================================================
MONGO_INITDB_ROOT_USERNAME=kaleem
MONGO_INITDB_ROOT_PASSWORD=kaleem@123
```

---

## 📊 جدول المتغيرات الحرجة (Critical Variables)

| المتغير | الوصف | إلزامي | القيمة الافتراضية |
|---------|--------|--------|-------------------|
| `JWT_SECRET` | سر JWT (32+ حرف) | ✅ نعم | - |
| `DATABASE_URL` | رابط MongoDB | ✅ نعم | - |
| `REDIS_URL` | رابط Redis | ✅ نعم | - |
| `RABBIT_URL` | رابط RabbitMQ | ✅ نعم | `amqp://kaleem:supersecret@rabbitmq:5672/kleem` |
| `PUBLIC_WEBHOOK_BASE` | رابط webhooks العام | ✅ نعم | - |
| `TELEGRAM_WEBHOOK_SECRET` | سر Telegram webhook | ✅ نعم | - |
| `EVOLUTION_APIKEY` | مفتاح Evolution API | ✅ نعم | - |

---

## 🔧 المتغيرات الاختيارية (Optional Variables)

### Email Service (اختياري - لإرسال البريد الإلكتروني)
- `MAIL_HOST`
- `MAIL_PORT`
- `MAIL_USER`
- `MAIL_PASS`
- `MAIL_FROM`
- `MAIL_SECURE`

### MinIO/S3 Storage (اختياري - لتخزين الملفات)
- `MINIO_ENDPOINT`
- `MINIO_PORT`
- `MINIO_ACCESS_KEY`
- `MINIO_SECRET_KEY`
- `MINIO_BUCKET`
- `MINIO_REGION`
- `MINIO_PUBLIC_URL`

### AI Services (اختياري - للذكاء الاصطناعي)
- `GEMINI_API_KEY`
- `N8N_API_KEY`
- `N8N_API_URL`

### Integrations (اختياري)
- `ZID_CLIENT_ID` - للتكامل مع Zid
- `ZID_CLIENT_SECRET`
- `SUPPORT_TELEGRAM_BOT_TOKEN` - لبوت الدعم

---

## 🚀 Quick Start - إنشاء ملف .env

### 1. نسخ الملف
```bash
cd Backend
cp .env.example .env
```

### 2. توليد الأسرار
استخدم الأوامر التالية لتوليد أسرار قوية:

```bash
# JWT Secret
openssl rand -hex 32

# Cookie Secret
openssl rand -hex 32

# Telegram Webhook Secret
openssl rand -hex 16
```

### 3. تعديل القيم الأساسية
افتح ملف `.env` وعدل القيم التالية:

```bash
JWT_SECRET=<النتيجة من openssl rand -hex 32>
MONGO_PASSWORD=<ضع كلمة المرور الفعلية>
DATABASE_URL=mongodb://kaleem:${MONGO_PASSWORD}@127.0.0.1:27017/kaleem?authSource=admin
REDIS_URL=redis://127.0.0.1:6379
RABBITMQ_PASSWORD=<ضع كلمة المرور الفعلية>
RABBIT_URL=amqp://kaleem:${RABBITMQ_PASSWORD}@127.0.0.1:5672/kleem
MINIO_ENDPOINT=http://127.0.0.1:9000
QDRANT_URL=http://127.0.0.1:6333
EVOLUTION_API_URL=http://127.0.0.1:8080
N8N_BASE_URL=http://127.0.0.1:5678
PUBLIC_WEBHOOK_BASE=https://your-domain.com
TELEGRAM_WEBHOOK_SECRET=<النتيجة من openssl rand -hex 16>
EVOLUTION_API_KEY=your-evolution-api-key
```

---

## 🏢 ملف `.env` داخل الـ VPS (قِيَم تعمل داخل الحاويات)

عند النسخ إلى الخادم ووضع الملف في `Backend/.env` ليستخدمه `docker-compose.mvp.yml`، استخدم القيم التالية المبنية على أسماء الخدمات في الشبكة الداخلية:

```bash
# =============================================================================
# Kaleem Backend Environment Variables (VPS)
# =============================================================================

NODE_ENV=production
PORT=3000
APP_DEFAULT_PORT=3000
APP_VERSION=1.0.0
APP_MINIMAL_BOOT=0

# MongoDB
MONGO_PASSWORD=${MONGO_PASSWORD}                # عيّن القيمة الحقيقة
DATABASE_URL=mongodb://kaleem:${MONGO_PASSWORD}@mongo:27017/kaleem?authSource=admin
MONGODB_URI=mongodb://kaleem:${MONGO_PASSWORD}@mongo:27017/kaleem?authSource=admin
MONGODB_SSL=false

# Redis
REDIS_URL=redis://redis:6379

# RabbitMQ
RABBITMQ_PASSWORD=${RABBITMQ_PASSWORD}          # عيّن القيمة الحقيقة
RABBIT_URL=amqp://kaleem:${RABBITMQ_PASSWORD}@rabbitmq:5672/kleem
RABBIT_CONFIRM_TIMEOUT_MS=10000

# MinIO
MINIO_ENDPOINT=http://minio:9000
MINIO_PORT=9000
MINIO_USE_SSL=false
MINIO_ACCESS_KEY=${MINIO_ACCESS_KEY}
MINIO_SECRET_KEY=${MINIO_SECRET_KEY}
MINIO_BUCKET=kaleem-uploads
MINIO_REGION=us-east-1
MINIO_PUBLIC_URL=https://storage.kaleem-ai.com

# Evolution API
EVOLUTION_API_URL=http://evolution-api:8080
EVOLUTION_API_KEY=${EVOLUTION_API_KEY}
EVOLUTION_APIKEY=${EVOLUTION_API_KEY}

# N8N
N8N_API_KEY=${N8N_API_KEY}
N8N_API_URL=http://n8n:5678
N8N_BASE_URL=http://n8n:5678
N8N_BASE=http://n8n:5678
N8N_INCOMING_PATH=/webhook/ai-agent-{merchantId}
N8N_OPENAI_WEBHOOK_URL=http://n8n:5678/webhook/openai
N8N_SERVICE_TOKEN=${N8N_SERVICE_TOKEN}
N8N_DIRECT_CALL_FALLBACK=false

# JWT & Security
JWT_SECRET=${JWT_SECRET}
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=7d
COOKIE_SECRET=${COOKIE_SECRET}
SEC_HSTS_MAX_AGE=31536000

# Public URLs
PUBLIC_WEBHOOK_BASE=https://api.kaleem-ai.com
FRONTEND_URL=https://app.kaleem-ai.com

# Telegram
TELEGRAM_WEBHOOK_SECRET=${TELEGRAM_WEBHOOK_SECRET}
SUPPORT_TELEGRAM_BOT_TOKEN=${SUPPORT_TELEGRAM_BOT_TOKEN}
SUPPORT_TELEGRAM_CHAT_ID=${SUPPORT_TELEGRAM_CHAT_ID}

# Grafana Cloud (اختياري)
GRAFANA_CLOUD_METRICS_URL=${GRAFANA_CLOUD_METRICS_URL}
GRAFANA_CLOUD_METRICS_USERNAME=${GRAFANA_CLOUD_METRICS_USERNAME}
GRAFANA_CLOUD_API_KEY=${GRAFANA_CLOUD_API_KEY}

# البقية (Mail، ZID، AI، إلخ) كما في القسم السابق لكن بقيم الإنتاج
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_SECURE=false
MAIL_USER=${MAIL_USER}
MAIL_PASS=${MAIL_PASS}
MAIL_FROM=noreply@kaleem-ai.com

GEMINI_API_KEY=${GEMINI_API_KEY}
ZID_CLIENT_ID=${ZID_CLIENT_ID}
ZID_CLIENT_SECRET=${ZID_CLIENT_SECRET}
```

> استبدل العلامات `${...}` بقيمك الفعلية قبل التشغيل، واحتفظ بالملف داخل الخادم بصلاحيات تقتصر على المستخدم الجذري.

---

## 📝 ملاحظات هامة

### 🔒 الأمان
1. **لا تشارك ملف `.env` الحقيقي** مع أي شخص
2. **استخدم قيم قوية وعشوائية** للأسرار في بيئة الإنتاج
3. **أضف `.env` إلى `.gitignore`** لتفادي رفعه إلى Git

### 🌍 البيئات المختلفة
- **Development**: استخدم `NODE_ENV=development`
- **Production**: استخدم `NODE_ENV=production` مع قيم آمنة
- **Testing**: استخدم `NODE_ENV=test`

### 🔄 القيم الافتراضية
معظم المتغيرات لها قيم افتراضية في الكود، ولكن يُفضل تحديدها صراحة في ملف `.env` لتجنب المشاكل.

### 📦 Docker
عند استخدام Docker Compose، بعض المتغيرات يتم تعيينها تلقائياً في `docker-compose.mvp.yml`.

---

## 🆘 استكشاف الأخطاء

### خطأ: Missing required environment variable
**الحل**: تأكد من وجود المتغير المطلوب في ملف `.env`

### خطأ: Invalid value for JWT_SECRET
**الحل**: يجب أن يكون JWT_SECRET على الأقل 32 حرف

### خطأ: REDIS_URL not defined
**الحل**: أضف `REDIS_URL=redis://localhost:6379` إلى ملف `.env`

---

## 📚 المراجع

- [NestJS Configuration](https://docs.nestjs.com/techniques/configuration)
- [dotenv Documentation](https://github.com/motdotla/dotenv)
- [12 Factor App - Config](https://12factor.net/config)

---

**آخر تحديث**: 2024
**الإصدار**: 1.0.0

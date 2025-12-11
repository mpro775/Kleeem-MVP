# 🚀 دليل إعداد متغيرات البيئة - Kaleem Backend

## الخطوة الأولى: إنشاء ملف .env

قم بإنشاء ملف `.env` في المجلد `Backend/` وانسخ المحتوى التالي:

```bash
# =============================================================================
# Kaleem Backend Environment Variables
# =============================================================================

# =============================================================================
# Node Environment
# =============================================================================
NODE_ENV=development
PORT=3000
APP_DEFAULT_PORT=3000
APP_VERSION=1.0.0
APP_MINIMAL_BOOT=0

# =============================================================================
# Database - MongoDB
# =============================================================================
DATABASE_URL=mongodb://kaleem:kaleem@123@localhost:27017/kaleem?authSource=admin
MONGODB_URI=mongodb://kaleem:kaleem@123@localhost:27017/kaleem?authSource=admin
MONGODB_SSL=false

# =============================================================================
# Redis
# =============================================================================
REDIS_URL=redis://localhost:6379

# =============================================================================
# RabbitMQ
# =============================================================================
RABBIT_URL=amqp://kaleem:supersecret@localhost:5672/kleem
RABBIT_CONFIRM_TIMEOUT_MS=10000

# =============================================================================
# Qdrant - Vector Database
# =============================================================================
QDRANT_URL=http://qdrant:6333
QDRANT_HOST=qdrant

# =============================================================================
# JWT Authentication & Secrets
# =============================================================================
JWT_SECRET=your-super-secret-jwt-key-min-32-chars-change-this-in-production
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=7d
SECRETS_KEY=your-secrets-key-for-encryption-32-chars-minimum
WORKER_TOKEN=super-secret-worker-token-change-in-production

# Email (SMTP)
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_SECURE=false
MAIL_USER=your-email@gmail.com
MAIL_PASS=your-app-password
MAIL_FROM=noreply@kaleem-ai.com

# Cloudflare R2 (S3-compatible)
AWS_ACCESS_KEY_ID=8b3520254704a5b33623378610a04f01
AWS_SECRET_ACCESS_KEY=3cb75008b81f604e131c108961fde021373ce44a58a7c98ccd8e3b5cac8dc201
AWS_REGION=auto
AWS_ENDPOINT=https://56c86161349f5102ec103ae2ea495e01.r2.cloudflarestorage.com
S3_BUCKET_NAME=kaleem-assets
# (اختياري) CDN للملفات
# ASSETS_CDN_BASE_URL=https://cdn.kaleem-ai.com
# ملاحظة: يمكن الإبقاء على MINIO_* للاستخدام المحلي الاختياري، لكن الإنتاج يستخدم القيم أعلاه.

# WhatsApp Integration
EVOLUTION_API_URL=http://localhost:8080
EVOLUTION_API_KEY=any-secret-key
EVOLUTION_APIKEY=any-secret-key

# Telegram
TELEGRAM_WEBHOOK_SECRET=your-telegram-webhook-secret-min-16-chars
SUPPORT_TELEGRAM_BOT_TOKEN=your-telegram-bot-token
SUPPORT_TELEGRAM_CHAT_ID=your-telegram-chat-id

# N8N Workflow
N8N_API_KEY=your-n8n-api-key
N8N_API_URL=https://n8n.kaleem-ai.com
N8N_BASE_URL=https://n8n.kaleem-ai.com
N8N_BASE=https://n8n.kaleem-ai.com
N8N_INCOMING_PATH=/webhook/ai-agent-{merchantId}
N8N_OPENAI_WEBHOOK_URL=https://n8n.kaleem-ai.com/webhook/openai
N8N_SERVICE_TOKEN=your-n8n-service-token
N8N_DIRECT_CALL_FALLBACK=false

# =============================================================================
# AI Services - Embeddings & Extraction
# =============================================================================
GEMINI_API_KEY=your-gemini-api-key
EMBEDDING_BASE_URL=http://embedding:8000
EMBEDDING_DIM=384
EXTRACTOR_BASE_URL=http://extractor:8001

# =============================================================================
# Public URLs
# =============================================================================
PUBLIC_WEBHOOK_BASE=https://api.kaleem-ai.com/api/integrations
FRONTEND_URL=https://app.kaleem-ai.com
PUBLIC_APP_ORIGIN=https://app.kaleem-ai.com
PUBLIC_WEB_BASE_URL=https://kaleem-ai.com
STORE_PUBLIC_ORIGIN=https://stores.kaleem-ai.com

# =============================================================================
# ZID E-commerce Integration (اختياري)
# =============================================================================

# ZID Integration  
ZID_CLIENT_ID=your-zid-client-id
ZID_CLIENT_SECRET=your-zid-client-secret
ZID_REDIRECT_URI=https://api.kaleem-ai.com/api/integrations/zid/callback
ZID_WEBHOOK_URL=https://api.kaleem-ai.com/api/integrations/zid/webhook

# =============================================================================
# SALLA E-commerce Integration (اختياري)
# =============================================================================
SALLA_CLIENT_ID=fa23d9b6-145e-413a-82f9-6cfb77703271
SALLA_CLIENT_SECRET=ec85d470677653148ea12cbe0a419705
SALLA_REDIRECT_URI=https://api.kaleem-ai.com/api/integrations/salla/callback
SALLA_SCOPE=offline_access products.read orders.read webhooks.read webhooks.write
SALLA_WEBHOOK_URL=${PUBLIC_WEBHOOK_BASE}/salla/webhook
SALLA_API_BASE=https://api.salla.sa
SALLA_WEBHOOK_PROTECTION=token
SALLA_WEBHOOK_TOKEN=fbf2e04de36ddf764795fc1fdc1fc1a0
SALLA_WEBHOOK_SECRET=your-salla-webhook-secret

# =============================================================================
# Support & File Upload
# =============================================================================
SUPPORT_UPLOAD_DIR=./uploads/support
SUPPORT_MAX_FILES=5
SUPPORT_MAX_FILE_SIZE_MB=5
SUPPORT_ALLOWED_FILE_TYPES=png,jpg,jpeg,pdf,doc,docx
SUPPORT_SLACK_WEBHOOK_URL=https://hooks.slack.com/services/T00/B00/xxxx
SUPPORT_N8N_WEBHOOK_URL=https://n8n.kaleem-ai.com/webhook/support

# =============================================================================
# Assets & CDN (اختياري)
# =============================================================================
ASSETS_CDN_BASE_URL=https://cdn.kaleem-ai.com
RECAPTCHA_SECRET=6Lc...your-recaptcha-secret

# CORS
CORS_STATIC_ORIGINS=http://localhost:5173,http://127.0.0.1:5173,https://app.kaleem-ai.com,https://kaleem-ai.com
CORS_ALLOW_SUBDOMAIN_BASE=kaleem-ai.com
CORS_SUBDOMAIN_ALLOW_PORTS=false
CORS_ALLOW_EMPTY_ORIGIN=true
CORS_ALLOW_ALL=false
CORS_CREDENTIALS=true
CORS_METHODS=GET,HEAD,POST,PUT,PATCH,DELETE,OPTIONS
CORS_ALLOWED_HEADERS=Authorization,Content-Type,X-Request-Id,X-Idempotency-Key,X-Signature,X-Timestamp,Idempotency-Key,X-Kaleem-Timestamp,X-Kaleem-Nonce,X-Kaleem-Signature
CORS_EXPOSED_HEADERS=x-request-id,X-RateLimit-Remaining,X-RateLimit-Reset
CORS_MAX_AGE=86400
CORS_OPTIONS_SUCCESS_STATUS=204

# Chat
CHAT_N8N_ENDPOINT=/webhook/webhooks/kleem/incoming
CHAT_BOT_NAME=kleem
CHAT_DEFAULT_CHANNEL=webchat
CHAT_TYPING_STOP_DELAY_MS=3000

# Embeddings
EMBEDDINGS_EXPECTED_DIM=1536
EMBEDDINGS_HTTP_TIMEOUT_MS=30000
EMBEDDINGS_RX_TIMEOUT_MS=35000
EMBEDDINGS_MAX_TEXT_LENGTH=8000
EMBEDDINGS_MAX_RETRIES=3
EMBEDDINGS_BASE_RETRY_DELAY_MS=1000
EMBEDDINGS_ENDPOINT_PATH=/embed

# Security
SEC_HSTS_MAX_AGE=31536000
COOKIE_SECRET=your-cookie-secret-key

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100
RATE_LIMIT_CODE=RATE_LIMIT_EXCEEDED
RATE_LIMIT_TEXT=تم تجاوز حد الطلبات، الرجاء المحاولة لاحقاً

# Webhooks Rate Limiting
WEBHOOKS_INCOMING_TTL=10
WEBHOOKS_INCOMING_LIMIT=1
WEBHOOKS_BOT_REPLY_TTL=10
WEBHOOKS_BOT_REPLY_LIMIT=1
WEBHOOKS_TEST_BOT_REPLY_TTL=10
WEBHOOKS_TEST_BOT_REPLY_LIMIT=1
WEBHOOKS_AGENT_REPLY_TTL=10
WEBHOOKS_AGENT_REPLY_LIMIT=1

# Cache
CACHE_MERCHANT_TTL_MS=600000
CACHE_MERCHANT_PROMPT_TTL_MS=1800000
CACHE_MERCHANT_STATUS_TTL_MS=300000

# Monitoring
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
SENTRY_DEBUG=false

# OpenTelemetry
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318/v1/traces

# Fallback Options
DIRECT_SEND_FALLBACK=false

# MongoDB Init (for docker-compose)
MONGO_INITDB_ROOT_USERNAME=kaleem
MONGO_INITDB_ROOT_PASSWORD=kaleem@123
```

## الخطوة الثانية: توليد الأسرار

استخدم الأوامر التالية لتوليد أسرار قوية:

```bash
# JWT Secret (32 بايت)
openssl rand -hex 32

# Secrets Key (32 بايت)
openssl rand -hex 32

# Worker Token (32 بايت)
openssl rand -hex 32

# Cookie Secret (32 بايت)
openssl rand -hex 32

# N8N Service Token (32 بايت)
openssl rand -hex 32

# Telegram Webhook Secret (16 بايت)
openssl rand -hex 16

# Salla Webhook Token (16 بايت)
openssl rand -hex 16
```

**ملاحظة**: انسخ كل نتيجة واستخدمها في المتغير المناسب في ملف `.env`

## الخطوة الثالثة: تعديل القيم

قم بتعديل القيم التالية في ملف `.env`:

### 1. الأسرار (استبدلها بنتائج openssl):
- **JWT_SECRET**: نتيجة `openssl rand -hex 32`
- **SECRETS_KEY**: نتيجة `openssl rand -hex 32`
- **WORKER_TOKEN**: نتيجة `openssl rand -hex 32`
- **COOKIE_SECRET**: نتيجة `openssl rand -hex 32`
- **N8N_SERVICE_TOKEN**: نتيجة `openssl rand -hex 32`
- **TELEGRAM_WEBHOOK_SECRET**: نتيجة `openssl rand -hex 16`
- **SALLA_WEBHOOK_TOKEN**: نتيجة `openssl rand -hex 16`

### 2. قواعد البيانات:
- **DATABASE_URL**: عدّل username و password و host
- **REDIS_URL**: عدّل host و password
- **RABBIT_URL**: عدّل username و password
- **QDRANT_URL**: عدّل host (محلي أو cloud)

### 3. الروابط العامة:
- **PUBLIC_WEBHOOK_BASE**: دومين API الخاص بك
- **FRONTEND_URL**: رابط الفرونت إند
- **PUBLIC_APP_ORIGIN**: نفس رابط الفرونت إند

### 4. خدمات AI:
- **EMBEDDING_BASE_URL**: تأكد من تشغيل embedding service
- **GEMINI_API_KEY**: احصل عليه من Google AI Studio
- **EXTRACTOR_BASE_URL**: تأكد من تشغيل extractor service

### 5. Evolution API (WhatsApp):
- **EVOLUTION_API_URL**: رابط Evolution API
- **EVOLUTION_API_KEY**: مفتاح API الذي حددته في Evolution

### 6. N8N:
- **N8N_API_KEY**: من N8N dashboard
- **N8N_API_URL**: رابط N8N instance

### 7. التكاملات الاختيارية (Salla/ZID):
- عدّل القيم حسب credentials من Salla أو ZID dashboard

## الخطوة الرابعة: التحقق

بعد إنشاء ملف `.env`، قم بتشغيل الأمر التالي للتحقق من صحة الإعدادات:

```bash
cd Backend
npm run start:dev
```

إذا ظهرت أخطاء تتعلق بمتغيرات البيئة، راجع الملف وتأكد من تعيين جميع القيم المطلوبة.

## ملاحظات إضافية

- **لا تشارك ملف `.env`** مع أي شخص أو ترفعه إلى Git
- **استخدم قيم مختلفة** لكل بيئة (development, staging, production)
- **احفظ نسخة احتياطية آمنة** من ملف `.env` الخاص بالإنتاج

---

للمزيد من التفاصيل، راجع ملف `ENV_VARIABLES.md`


# 🔐 Config & Secrets Management

## المبادئ العامة (الواقع الحقيقي)
- **حالة الحالية**: Environment variables فقط (غير محمية بـ Vault)
- **المستقبل**: SOPS أو Vault للأسرار الحساسة
- **Schema Validation**: `@nestjs/config` مع Joi في Backend
- **No .env files**: كل شيء عبر environment variables
- **Documentation**: جميع المفاتيح موثقة في `Backend/src/common/config/vars.config.ts`

## متغيرات البيئة الحقيقية (Backend)

### Core Application
```bash
NODE_ENV=production
PORT=3000
PUBLIC_API_BASE_URL=https://api.kaleem-ai.com
```

### Database & Storage
```bash
MONGODB_URI=mongodb://admin:strongpassword@mongo:27017/kaleem?authSource=admin
REDIS_URL=redis://redis:6379/0
QDRANT_URL=http://qdrant:6333
MINIO_ENDPOINT=minio
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
```

### Security & Auth
```bash
JWT_SECRET=your-super-secret-jwt-key-change-in-production
ENCRYPTION_KEY=your-32-char-encryption-key-change-in-production
CORS_ORIGIN=https://kaleem-ai.com,https://www.kaleem-ai.com
```

### External Services
```bash
# WhatsApp Cloud
WHATSAPP_CLOUD_VERIFY_TOKEN=your-verify-token
WHATSAPP_CLOUD_ACCESS_TOKEN=your-access-token

# Telegram
TELEGRAM_WEBHOOK_SECRET=your-telegram-secret
TELEGRAM_BOT_TOKEN=your-bot-token

# Evolution API (WhatsApp QR)
EVOLUTION_APIKEY=your-evolution-api-key
```

### Monitoring & Logging
```bash
# Prometheus
PROMETHEUS_ENDPOINT=http://prometheus:9090

# Sentry (Error Tracking)
SENTRY_DSN=https://your-sentry-dsn

# Logging
LOG_LEVEL=info
```

### Business Configuration
```bash
# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=200

# Cache TTLs
CACHE_MERCHANT_TTL_MS=300000
CACHE_MERCHANT_PROMPT_TTL_MS=3600000

# Chat Configuration
CHAT_N8N_ENDPOINT=/webhook/webhooks/kleem/incoming
CHAT_BOT_NAME=kleem
CHAT_DEFAULT_CHANNEL=webchat
CHAT_TYPING_STOP_DELAY_MS=1000
```

## Frontend Environment Variables
```bash
VITE_API_BASE_URL=https://api.kaleem-ai.com
VITE_APP_ENV=production
VITE_SENTRY_DSN=https://your-sentry-dsn
```

## Environment Files Structure

### .env.example (Template)
```bash
# Database
MONGODB_URI=mongodb://localhost:27017/kaleem

# Cache
REDIS_URL=redis://localhost:6379/0

# Vector DB
QDRANT_URL=http://localhost:6333

# Storage
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin

# Security
JWT_SECRET=your-secret-key
ENCRYPTION_KEY=your-encryption-key

# External Services
OPENAI_API_KEY=your-openai-key
```

### Production .env (Server-side only)
```bash
NODE_ENV=production
MONGODB_URI=mongodb://admin:realpassword@mongo:27017/kaleem?authSource=admin
JWT_SECRET=super-secure-production-secret
# ... etc
```

## Security Best Practices (الحالي)

### Container Security
- **Non-root User**: API runs as `node` user (UID 1000)
- **Read-only Filesystem**: Where possible
- **Minimal Base Images**: Alpine Linux for smaller attack surface
- **Security Updates**: Regular base image updates

### Secrets Management
- **Environment Variables**: Primary method (not ideal for production)
- **No Hardcoded Secrets**: All secrets from environment
- **Docker Secrets**: Future implementation for k8s
- **External Secrets**: SOPS or Vault integration

### Network Security
- **Internal Network**: Services communicate via Docker internal network
- **No External Database**: MongoDB/Redis not exposed externally
- **Nginx Proxy**: Handles SSL and request routing
- **Rate Limiting**: Application-level per merchant

## Kubernetes Secrets (مستقبلي)

### Secret Manifest
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: kaleem-secrets
  namespace: kaleem
type: Opaque
stringData:
  # Database
  mongodb-password: "strong-db-password"
  # Cache
  redis-password: "strong-redis-password"
  # API
  jwt-secret: "production-jwt-secret"
  # Storage
  minio-access-key: "minio-access-key"
  minio-secret-key: "minio-secret-key"
```

### ConfigMap Manifest
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: kaleem-config
  namespace: kaleem
data:
  # Public configuration
  api-base-url: "https://api.kaleem-ai.com"
  frontend-url: "https://kaleem-ai.com"
  # Feature flags
  enable-new-chat: "true"
  enable-analytics: "true"
```

## CI/CD Integration (مستقبلي)

### GitHub Actions Secrets
```yaml
# Repository Settings > Secrets and variables > Actions
secrets:
  DOCKER_USERNAME: ${{ secrets.DOCKER_USERNAME }}
  DOCKER_PASSWORD: ${{ secrets.DOCKER_PASSWORD }}
  GHCR_TOKEN: ${{ secrets.GHCR_TOKEN }}
  # Environment-specific secrets
  PROD_JWT_SECRET: ${{ secrets.PROD_JWT_SECRET }}
  PROD_DB_PASSWORD: ${{ secrets.PROD_DB_PASSWORD }}
```

### Environment Validation
```typescript
// Backend/src/common/config/vars.config.ts
const getSecurityConfig = () => ({
  jwtSecret: process.env.JWT_SECRET,
  encryptionKey: process.env.ENCRYPTION_KEY,
  // Validate required secrets
  required: ['JWT_SECRET', 'ENCRYPTION_KEY', 'MONGODB_URI']
});
```

## Validation Schema (حقيقي من المشروع)

```typescript
// Backend/src/common/config/vars.config.ts (مقتطف)
const getRabbitConfig = () => ({
  confirmTimeoutMs: parseIntWithDefault(
    process.env.RABBIT_CONFIRM_TIMEOUT_MS,
    RABBIT_CONFIRM_TIMEOUT_MS_DEFAULT,
  ),
});

const getChatConfig = () => ({
  n8nEndpoint:
    process.env.CHAT_N8N_ENDPOINT ?? '/webhook/webhooks/kleem/incoming',
  botName: process.env.CHAT_BOT_NAME ?? 'kleem',
  defaultChannel: process.env.CHAT_DEFAULT_CHANNEL ?? 'webchat',
  typing: {
    stopDelayMs: parseIntWithDefault(
      process.env.CHAT_TYPING_STOP_DELAY_MS,
      CHAT_TYPING_STOP_DELAY_MS_DEFAULT,
    ),
  },
});

const getEmbeddingsConfig = () => ({
  expectedDim: parseIntWithDefault(
    process.env.EMBEDDINGS_EXPECTED_DIM,
    EMBEDDINGS_EXPECTED_DIM_DEFAULT,
  ),
  // ... etc
});
```

## Current Issues & Improvements

### 🔴 Issues
- **No Secrets Management**: Environment variables only
- **No Environment Separation**: Single environment currently
- **No Automated Validation**: Schema validation not enforced
- **No Rotation**: Secrets don't rotate automatically

### 🟡 Improvements Needed
- **SOPS Integration**: Encrypt secrets in Git
- **Multi-environment**: Separate staging/production configs
- **Automated Validation**: CI/CD pipeline validation
- **Secrets Rotation**: Automated key rotation
- **Audit Logging**: Track secret access

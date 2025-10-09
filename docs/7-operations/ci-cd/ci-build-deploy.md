# CI/CD — Build & Deploy Pipelines (Kaleem AI)

> الهدف: أتمتة البناء والاختبارات والإصدار إلى **staging** ثم **production** مع بوابات جودة واضحة، وتتبّع إصدار مُحكم.

## 0) الملخص التنفيذي (TL;DR)
- **حالة CI/CD**: **يتم يدوياً حالياً** (لا GitHub Actions)
- **Deployment**: Docker Compose + manual scripts (`deploy.sh`)
- **Environment**: VPS واحد (staging/production نفس السيرفر)
- **Monitoring**: Docker health checks + manual verification
- **Rollback**: Script-based rollback مع backup/restore
- **Versioning**: Manual tagging (لا SemVer automation)
- **Future**: GitHub Actions + multi-environment + k8s

## 1) نظرة عامة (الواقع الحقيقي)
- **المستودع**: Monorepo (Backend NestJS + Frontend React/Vite + Docker Compose)
- **النظام**: **Manual deployment** عبر `scripts/deploy.sh` + Docker + Docker Compose على VPS
- **التوسيم**: Manual tagging (لا SemVer automation حالياً)
- **البيئات**: staging/production على نفس السيرفر (development mode)
- **المستقبل**: GitHub Actions + multi-environment + k8s migration

## 2) Pipeline Stages (الحالي - Manual)

### Pre-deployment
```bash
# 1. Local Testing (مطلوب قبل الدفع)
cd Backend && npm run test:all
cd ../Frontend && npm run test:all

# 2. Docker Build (محلي أولاً)
cd Backend && docker build -t kaleem-api:local .
cd ../Frontend && docker build -t kaleem-frontend:local .
```

### Deployment Process
```bash
# 3. Push to Registry (manual)
docker tag kaleem-api:local ghcr.io/owner/repo/kaleem-api:tag
docker push ghcr.io/owner/repo/kaleem-api:tag

# 4. Deploy to Server
# Copy deploy.sh to server and run:
# KALEEM_API_IMAGE=ghcr.io/owner/repo/kaleem-api:tag ./deploy.sh
```

### Post-deployment
- Manual health check: `curl http://server/api/health`
- Manual verification: check logs, database connectivity
- Manual rollback if needed: `./deploy.sh` with previous image

## 3) Deployment Strategy (الواقع الحقيقي)

### Docker Architecture
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Nginx Proxy   │    │  Docker Compose  │    │   External      │
│   (Load Bal)    │◄──►│   Services       │    │   Services      │
│   Port: 80/443  │    │   - API          │    │   - Redis       │
└─────────────────┘    │   - Frontend     │    │   - MongoDB     │
                       │   - Workers      │    │   - Qdrant      │
                       │   - Monitoring   │    │   - RabbitMQ    │
                       └──────────────────┘    └─────────────────┘
```

### Services Overview
- **API Service**: NestJS application (Node.js)
- **Frontend**: React/Vite SPA
- **Database**: MongoDB with replica set
- **Cache**: Redis cluster
- **Vector DB**: Qdrant
- **Message Queue**: RabbitMQ
- **Monitoring**: Custom health checks

### Environment Variables
```bash
# Server Environment
NODE_ENV=production
MONGODB_URI=mongodb://mongo:27017/kaleem
REDIS_URL=redis://redis:6379
QDRANT_URL=http://qdrant:6333
RABBITMQ_URL=amqp://rabbitmq:5672

# API Configuration
PORT=3000
CORS_ORIGIN=https://domain.com

# Security
JWT_SECRET=...
ENCRYPTION_KEY=...
```

## 4) Monitoring & Health Checks

### Health Endpoints
- **API Health**: `/api/health` (database, redis, qdrant connectivity)
- **Frontend Health**: `/health` (SPA loaded successfully)
- **Database Health**: MongoDB replica set status
- **Cache Health**: Redis ping/pong
- **Vector Health**: Qdrant API availability

### Monitoring Tools
- **Docker Health Checks**: Built-in healthcheck commands
- **Log Aggregation**: Docker logs + manual logrotate
- **Metrics**: Custom metrics via `/api/metrics` endpoint
- **Alerting**: Manual monitoring (no automated alerts حالياً)

### Health Check Implementation
```bash
# API Health Check
curl -f http://localhost:3000/api/health || exit 1

# Database Connectivity
docker exec mongo mongosh --eval "db.adminCommand('ping')" || exit 1

# Cache Connectivity
docker exec redis redis-cli ping || exit 1
```

## 5) Rollback Procedures (الواقع الحقيقي)

### Automated Rollback (في deploy.sh)
```bash
# Script handles rollback automatically on health check failure
if ! curl -fsS "$HEALTH_URL"; then
  log "🔙 Rolling back to previous image: $PREV_IMAGE"
  export KALEEM_API_IMAGE="$PREV_IMAGE"
  docker compose up -d --no-deps api
fi
```

### Manual Rollback Steps
```bash
# 1. Identify previous working image
PREV_IMAGE=$(docker compose ps --format json | jq -r '.[] | select(.Service=="api") | .Image')

# 2. Deploy previous image
export KALEEM_API_IMAGE="$PREV_IMAGE"
docker compose -f docker-compose.yml -f docker-compose.image.override.yml up -d --no-deps api

# 3. Verify rollback
curl -f http://localhost:3000/api/health
```

### Database Rollback
```bash
# Restore from backup
BACKUP_FILE="/opt/kaleem/backups/mongo-$(date '+%Y%m%d-%H%M%S').archive.gz"
docker run --rm --network host -v "$BACKUP_DIR:/backup" mongo:5 \
  bash -lc "mongorestore --uri='$MONGODB_URI' --archive=/backup/$BACKUP_FILE --gzip"
```

## 6) Security Considerations

### Container Security
- **Non-root User**: API runs as non-root user
- **Minimal Base Images**: Alpine Linux for smaller attack surface
- **Security Updates**: Regular base image updates
- **Secrets Management**: Environment variables (no hardcoded secrets)

### Network Security
- **Internal Network**: Services communicate via internal Docker network
- **Nginx Proxy**: Handles SSL termination and request routing
- **Rate Limiting**: Application-level rate limiting per merchant
- **CORS**: Configured for allowed origins only

### Access Control
- **SSH Access**: Key-based authentication only
- **Docker Registry**: Token-based authentication
- **Database Access**: Strong passwords + network isolation
- **API Security**: JWT authentication + role-based access

## 7) Future Improvements (CI/CD Automation)

### GitHub Actions Pipeline
```yaml
name: CI/CD Pipeline
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run test:all
      - run: npm run build

  deploy-staging:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - run: ./scripts/deploy.sh
        env:
          KALEEM_API_IMAGE: ${{ secrets.DOCKER_IMAGE }}
          GHCR_TOKEN: ${{ secrets.GHCR_TOKEN }}
```

### Multi-Environment Setup
- **Staging**: Automated deployment from main branch
- **Production**: Manual promotion from staging
- **Environment Variables**: Different configs per environment
- **Database**: Separate databases per environment

### Advanced Features
- **Blue-Green Deployment**: Zero-downtime deployments
- **Canary Releases**: Gradual rollout to users
- **Automated Rollbacks**: Based on error rates/metrics
- **Infrastructure as Code**: Terraform/CloudFormation
- **Secrets Management**: HashiCorp Vault or AWS Secrets Manager

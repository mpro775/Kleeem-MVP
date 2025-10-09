# Release Strategy (Staging / Production) — Kaleem AI

> توحيد دورة الإصدار من الدمج إلى الإصدار النهائي مع وضوح حالات RC/Hotfix.

## 0) الملخص التنفيذي (TL;DR)
- **حالة الإصدار**: **يتم يدوياً حالياً** (لا automation)
- **قنوات الإصدار**: staging/production على نفس السيرفر
- **Release Process**: Manual tagging + Docker build + deploy script
- **Versioning**: Manual (لا SemVer automation)
- **Quality Gates**: Manual testing + health checks
- **Hotfix**: Direct deployment مع rollback capability

## 1) قنوات الإصدار (الواقع الحقيقي)
- **Single Environment**: staging/production على نفس السيرفر VPS
- **No Staging Environment**: كل deployment مباشر للإنتاج
- **Manual Deployment**: عبر `scripts/deploy.sh` script
- **No Blue-Green**: Single instance deployment
- **Manual Rollback**: Script-based rollback مع database restore

## 2) Release Process (الحالي - Manual)

### Pre-Release Steps
```bash
# 1. Code Review & Testing
# - Manual code review
# - npm run test:all (local testing)
# - Manual E2E testing (no automated E2E pipeline)

# 2. Version Tagging
git tag v0.0.1  # Manual tagging
git push origin v0.0.1

# 3. Docker Build & Push
docker build -t kaleem-api:v0.0.1 .
docker tag kaleem-api:v0.0.1 ghcr.io/owner/repo/kaleem-api:v0.0.1
docker push ghcr.io/owner/repo/kaleem-api:v0.0.1
```

### Deployment Steps
```bash
# 4. Deploy to Server
# Copy deploy.sh to server and execute:
# KALEEM_API_IMAGE=ghcr.io/owner/repo/kaleem-api:v0.0.1 ./deploy.sh

# 5. Post-Deployment Verification
curl -f http://server/api/health
# Check logs, database connectivity, webhook functionality
```

### Release Checklist
- [ ] Code reviewed and approved
- [ ] All tests pass locally
- [ ] Docker image built and pushed
- [ ] Deployment script executed
- [ ] Health checks pass
- [ ] Manual testing completed
- [ ] Rollback plan ready

## 3) Release Management (الواقع الحقيقي)

### Environment Configuration
```bash
# Production Environment Variables
NODE_ENV=production
MONGODB_URI=mongodb://mongo:27017/kaleem
REDIS_URL=redis://redis:6379
QDRANT_URL=http://qdrant:6333
RABBITMQ_URL=amqp://rabbitmq:5672

# Security Configuration
JWT_SECRET=production-secret
ENCRYPTION_KEY=production-key
CORS_ORIGIN=https://domain.com

# Monitoring
HEALTH_URL=http://localhost:3000/api/health
MAX_ATTEMPTS=10
SLEEP_SECONDS=20
```

### Database Migration Strategy
- **No Automated Migrations**: Manual schema updates
- **Backup Before Release**: Automatic backup in deploy.sh
- **Rollback Capability**: Database restore from backup
- **Data Migration**: Manual if needed

### Service Dependencies
```yaml
# Docker Compose Service Order
1. Database (MongoDB) - replica set initialization
2. Cache (Redis) - cluster setup
3. Vector DB (Qdrant) - collection creation
4. Message Queue (RabbitMQ) - queue setup
5. API Service - application startup
6. Frontend - SPA deployment
7. Nginx Proxy - routing configuration
```

## 4) Quality Gates (الحالي - Manual)

### Pre-deployment Gates
- **Code Quality**: ESLint + Prettier checks
- **Type Safety**: TypeScript compilation
- **Unit Tests**: npm run test:unit
- **Integration Tests**: npm run test:integration
- **Security Scan**: npm audit (manual)

### Post-deployment Gates
- **Health Check**: API responds with 200
- **Database Connectivity**: MongoDB connection established
- **Cache Connectivity**: Redis ping/pong
- **Vector DB**: Qdrant API available
- **Webhook Processing**: Test webhook endpoint
- **Frontend Loading**: SPA loads without errors

### Manual Testing Checklist
- [ ] Authentication (login/logout)
- [ ] Product listing and filtering
- [ ] Category navigation
- [ ] Order creation flow
- [ ] Chat functionality
- [ ] Webhook processing (WhatsApp/Telegram)
- [ ] Multi-tenant isolation
- [ ] Performance metrics (response time < 300ms)

## 5) Release Types (الواقع الحقيقي)

### Regular Release
```bash
# Process for new features/fixes
1. Feature development on main branch
2. Manual testing and code review
3. Docker build and push
4. Deploy to production
5. Post-deployment verification
6. Git tag creation
```

### Hotfix Release
```bash
# Process for critical bug fixes
1. Create hotfix branch from main
2. Develop and test fix
3. Deploy to production immediately
4. Merge back to main
5. Create git tag for hotfix
```

### Emergency Rollback
```bash
# Process for critical issues
1. Execute deploy.sh with previous image
2. Verify rollback success
3. Investigate root cause
4. Deploy fixed version
5. Update documentation
```

## 6) Release Communication (الحالي)

### Internal Communication
- **No Automated Notifications**: Manual updates via Slack/Teams
- **Deployment Logs**: Available in deploy.sh output
- **Status Updates**: Manual posting in team channels
- **Incident Reports**: Manual creation for issues

### User Communication
- **No Release Notes**: Users notified manually if needed
- **Maintenance Windows**: Manual scheduling
- **Service Status**: No public status page
- **Customer Support**: Manual notification for issues

## 7) Future Release Strategy (المستقبلي)

### Automated Release Pipeline
```yaml
# GitHub Actions Release Workflow
name: Release
on:
  push:
    tags:
      - 'v*'

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm ci && npm run test:all
      - run: npm run build
      - run: docker build -t kaleem-api:${{ github.ref_name }}
      - run: docker push kaleem-api:${{ github.ref_name }}
      - run: ./scripts/deploy.sh
```

### Multi-Environment Strategy
- **Staging Environment**: Automated deployment from main
- **Production Environment**: Manual promotion from staging
- **Environment Variables**: GitHub Secrets per environment
- **Database Per Environment**: Separate databases for staging/production

### Advanced Release Features
- **Semantic Versioning**: Automated version bumping
- **Release Notes**: Auto-generated from conventional commits
- **Gradual Rollout**: Canary releases with feature flags
- **Automated Rollbacks**: Based on monitoring metrics
- **Release Dashboard**: GitHub Projects for tracking releases

# SECURITY — Kaleem AI

> تم التحديث ليعكس الواقع الحقيقي للمشروع (2025-09-27)

هذا المستند يغطي ضوابط الأمان التطبيقية والتشغيلية في Kaleem (NestJS + React/Vite + n8n + Mongo/Redis/RabbitMQ/Qdrant/MinIO).

## 🛡️ **حالة الأمان الحالية**

### ✅ **مطبق بالكامل**
- JWT authentication مع access/refresh tokens
- Role-based access control (RBAC)
- Webhook signature verification (WhatsApp Cloud, Telegram, Evolution)
- CORS configuration مع allowlist
- Rate limiting per merchant
- Container security (non-root, read-only filesystem)

### 🔄 **مطبق جزئياً**
- Security metrics (بعض المقاييس موجودة)
- Audit logging (interceptor موجود، غير مفعل)
- Input sanitization (class-sanitizer integration)

### ❌ **غير مطبق**
- Advanced secrets management (SOPS/Vault)
- Security scanning (SAST/DAST)
- Compliance automation
- Security monitoring/alerting

## 1) JWT / Token Management (مطبق)

### Implementation Details
```typescript
// Backend/src/modules/auth/services/token.service.ts
- Access tokens: 15 minutes expiry
- Refresh tokens: 7 days expiry
- JTI (JWT ID) tracking in MongoDB
- Token rotation on refresh
```

### Guards & Interceptors
```typescript
// Backend/src/common/guards/jwt-auth.guard.ts
- Validates JWT signature and expiry
- Checks JTI against blacklist
- Extracts user/merchant context

// Backend/src/common/guards/merchant-state.guard.ts
- Validates merchant status (active/not deleted)
- Enforces multi-tenant isolation
```

### Session Management
```typescript
// Backend/src/modules/auth/repositories/session-store.repository.ts
- Redis storage for active sessions
- Automatic cleanup on expiry
- logoutAll functionality
```

## 2) RBAC (Roles & Permissions) (مطبق)

### Role System
```typescript
// Backend/src/common/decorators/roles.decorator.ts
export enum Role {
  ADMIN = 'ADMIN',
  MERCHANT = 'MERCHANT',
  MEMBER = 'MEMBER'
}

// Backend/src/common/guards/roles.guard.ts
- @Roles('ADMIN', 'MERCHANT') decorator
- Least privilege principle
- Multi-tenant role enforcement
```

### Permission Matrix
| Role | Products | Orders | Analytics | Users | Settings |
|------|----------|--------|-----------|-------|----------|
| ADMIN | ✅ | ✅ | ✅ | ✅ | ✅ |
| MERCHANT | ✅ | ✅ | ✅ | ❌ | ✅ |
| MEMBER | ❌ | ❌ | ✅ | ❌ | ❌ |

## 3) Webhook Signing / API Keys (مطبق)

### Implementation
```typescript
// Backend/src/common/guards/webhook-signature.guard.ts
- HMAC-SHA256 signature verification
- Timestamp validation (5-minute window)
- Provider-specific validation:
  - WhatsApp Cloud: x-hub-signature-256
  - Telegram: x-telegram-bot-api-secret-token
  - Evolution API: x-evolution-apikey
```

### Supported Providers
- **WhatsApp Cloud**: Meta webhook verification
- **Telegram**: Bot API secret token
- **WhatsApp QR (Evolution)**: API key authentication

## 4) CORS / CSP / Rate Limiting (مطبق)

### CORS Configuration
```typescript
// Backend/src/common/config/cors.config.ts
- Allowlist: ['https://kaleem-ai.com', 'https://www.kaleem-ai.com']
- Regex subdomains: /^https:\/\/.*\.kaleem-ai\.com$/
- Credentials: true for authenticated requests
- Methods: GET, POST, PUT, DELETE, OPTIONS
```

### Content Security Policy
```typescript
// Backend/src/common/config/app.config.ts
- Helmet integration with CSP headers
- Frame options: DENY
- XSS protection: enabled
- Content type: nosniff
```

### Rate Limiting
```typescript
// Backend/src/common/guards/throttler-tenant.guard.ts
- Per-merchant throttling
- Sliding window algorithm
- Configurable limits per endpoint
- Burst protection
```

## 5) Input Validation & Sanitization (مطبق جزئياً)

### DTO Validation
```typescript
// Backend/src/common/validators/i18n-validator.ts
- @IsString(I18nMessage('validation.string'))
- @IsEnum(Currency, I18nMessage('validation.enum'))
- @IsNumber({}, I18nMessage('validation.number'))
```

### Sanitization
```typescript
// Backend/src/common/pipes/validation.pipe.ts
- class-sanitizer integration
- HTML sanitization for user inputs
- SQL injection prevention
```

## 6) Secrets Management (محسن)

### Current Implementation
```bash
# Environment variables (not ideal for production)
JWT_SECRET=your-super-secret-key
ENCRYPTION_KEY=your-32-char-encryption-key
MONGODB_URI=mongodb://admin:password@mongo:27017/kaleem
```

### Security Issues
- **No Encryption**: Secrets stored in plain text in environment
- **No Rotation**: Manual secret rotation required
- **No Access Logging**: No audit trail for secret access
- **Single Point of Failure**: All secrets in one environment file

### Future Implementation
```yaml
# SOPS encrypted secrets
apiVersion: v1
kind: Secret
metadata:
  name: kaleem-secrets
data:
  jwt-secret: <base64-encoded-encrypted>
  db-password: <base64-encoded-encrypted>
```

## 7) Container Security (مطبق)

### Security Context
```yaml
# Dockerfile
USER node
RUN chown -R node:node /app
```

### Pod Security Standards
```yaml
# Kubernetes deployment
securityContext:
  runAsNonRoot: true
  runAsUser: 1000
  fsGroup: 1000
  readOnlyRootFilesystem: true
  allowPrivilegeEscalation: false
```

### Network Policies
```yaml
# Network policy
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: kaleem-backend-policy
spec:
  podSelector:
    matchLabels:
      app: backend
  policyTypes:
  - Ingress
  - Egress
```

## 8) Monitoring & Alerting (مستقبلي)

### Security Metrics
```typescript
// Backend/src/metrics/security.metrics.ts
- authentication_failures_total
- authorization_failures_total
- webhook_verification_failures_total
- suspicious_activity_total
- rate_limit_exceeded_total
```

### Alert Rules
```yaml
# Prometheus alerts
groups:
  - name: security
    rules:
      - alert: HighAuthenticationFailures
        expr: increase(authentication_failures_total[5m]) > 10
        for: 2m
        labels:
          severity: critical
```

## 9) Incident Response (مستقبلي)

### Security Incidents
- **Detection**: Automated monitoring alerts
- **Response**: Pre-defined runbooks
- **Communication**: Internal Slack + external status page
- **Documentation**: Post-incident analysis

### Security Testing
- **SAST**: Static Application Security Testing
- **DAST**: Dynamic Application Security Testing
- **Dependency Scanning**: npm audit + vulnerability scanning
- **Penetration Testing**: Regular security assessments

## 10) Compliance & Audit (مستقبلي)

### GDPR Compliance
- **Data Mapping**: Complete data flow documentation
- **Right to Access**: User data export functionality
- **Right to Deletion**: Complete user data removal
- **Data Retention**: Automated data lifecycle management

### Audit Logging
```typescript
// Backend/src/common/audit/audit.interceptor.ts
- Track all data access/modification
- User action logging
- Sensitive operation monitoring
- Retention: 180 days in MongoDB
```

## 📋 **Security Checklist قبل الإطلاق**

### ✅ **مطبق**
- [x] JWT authentication مع access/refresh tokens
- [x] RBAC مع role guards
- [x] Webhook signature verification
- [x] CORS configuration
- [x] Rate limiting per merchant
- [x] Container security (non-root, read-only)
- [x] Input validation and sanitization

### 🔄 **يحتاج تحسين**
- [ ] Secrets management (SOPS/Vault)
- [ ] Security scanning (SAST/DAST)
- [ ] Audit logging (complete implementation)
- [ ] Security metrics and alerting

### ❌ **غير مطبق**
- [ ] Multi-environment secrets
- [ ] Automated security testing
- [ ] Compliance automation
- [ ] Security training documentation

## 🔮 **خارطة الطريق الأمنية**

### قصيرة المدى (1-3 أشهر)
- [ ] **SOPS Integration**: Encrypt secrets in Git
- [ ] **Security Scanning**: SAST/DAST tools
- [ ] **Audit Logging**: Complete implementation
- [ ] **Security Metrics**: Prometheus integration

### متوسطة المدى (3-6 أشهر)
- [ ] **Zero Trust**: Complete network segmentation
- [ ] **Compliance Tools**: GDPR automation
- [ ] **SIEM Integration**: Security monitoring
- [ ] **Incident Response**: Automated procedures

### طويلة المدى (6-12 شهر)
- [ ] **Advanced Auth**: MFA, biometric, hardware tokens
- [ ] **Data Protection**: End-to-end encryption
- [ ] **AI Security**: Model security and privacy
- [ ] **Regulatory Compliance**: SOC 2, ISO 27001

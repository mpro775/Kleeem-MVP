# Security Controls Matrix — Kaleem AI

> تم التحديث ليعكس الواقع الحقيقي للمشروع (2025-09-27)

| Control | Status | Implementation | Code / Path | Env Vars | Notes |
|---|---|---|---|---|---|
| **Authentication** | | | | | |
| JWT Access/Refresh | ✅ | Access+Refresh + JTI | `src/modules/auth/services/token.service.ts` | `JWT_*` | 15min access, 7 days refresh |
| Session Management | ✅ | Redis JTI storage | `src/modules/auth/repositories/session-store.repository.ts` | `REDIS_URL` | Automatic cleanup |
| Password Hashing | ✅ | bcrypt | `src/modules/auth/services/auth.service.ts` | - | Secure password storage |
| **Authorization** | | | | | |
| RBAC | ✅ | @Roles + RolesGuard | `src/common/guards/roles.guard.ts` | - | ADMIN/MERCHANT/MEMBER roles |
| Multi-tenant Isolation | ✅ | Merchant state guard | `src/common/guards/merchant-state.guard.ts` | - | Per-merchant data access |
| Permission Matrix | ✅ | Role-based permissions | `src/common/decorators/roles.decorator.ts` | - | Granular access control |
| **API Security** | | | | | |
| Webhook Signing | ✅ | HMAC-SHA256 verification | `src/common/guards/webhook-signature.guard.ts` | `WEBHOOK_*` | WhatsApp/Telegram/Evolution |
| CORS | ✅ | Allowlist + Regex | `src/common/config/cors.config.ts` | `CORS_ORIGIN` | Configurable origins |
| CSP (Helmet) | ✅ | Content Security Policy | `src/common/config/app.config.ts` | `CSP_*` | XSS protection |
| Rate Limiting | ✅ | Tenant-aware throttler | `src/common/guards/throttler-tenant.guard.ts` | `RATE_LIMIT_*` | Per-merchant throttling |
| Input Validation | ✅ | class-validator + I18nMessage | `src/common/validators/i18n-validator.ts` | - | Sanitized inputs |
| **Container Security** | | | | | |
| Non-root User | ✅ | Node user (UID 1000) | `Dockerfile` | - | Privilege separation |
| Read-only Filesystem | ✅ | RO root filesystem | `Dockerfile` | - | Immutable containers |
| Security Context | ✅ | RunAsNonRoot, allowPrivilegeEscalation=false | `k8s/10-backend-deployment.yaml` | - | Pod security standards |
| **Network Security** | | | | | |
| Internal Network | ✅ | Docker internal network | `docker-compose.yml` | - | Service isolation |
| SSL/TLS | ✅ | Nginx + Cloudflare | `nginx.conf` | `SSL_CERT` | End-to-end encryption |
| **Data Protection** | | | | | |
| Encryption at Rest | ❌ | Not implemented | - | - | Database encryption needed |
| Encryption in Transit | ✅ | TLS everywhere | `nginx.conf` | `SSL_CERT` | HTTPS enforcement |
| PII Masking | ❌ | Not implemented | - | - | Log sanitization needed |
| **Monitoring & Alerting** | | | | | |
| Security Metrics | 🔄 | Partial implementation | `src/metrics/security.metrics.ts` | - | Some metrics exist |
| Audit Logging | ⏳ | Interceptor exists | `src/common/audit/*` | `AUDIT_*` | Not activated |
| Security Alerts | ❌ | Not implemented | - | - | No automated alerts |
| **Compliance** | | | | | |
| GDPR Compliance | ❌ | Not implemented | - | - | Privacy APIs needed |
| Data Retention | 🔄 | Partial implementation | `src/common/services/data-retention.service.ts` | - | Some retention policies |
| Right to Access | ❌ | Not implemented | - | - | Data export APIs needed |
| **Secrets Management** | | | | | |
| Environment Secrets | ✅ | Docker/CI secrets | `docker-compose.yml` | `*_SECRET` | Production secrets |
| Secret Rotation | ❌ | Manual only | - | - | No automated rotation |
| Secret Encryption | ❌ | Plain text | - | - | Encryption needed |
| **Infrastructure Security** | | | | | |
| Container Scanning | ❌ | Not implemented | - | - | Image vulnerability scanning |
| Dependency Scanning | 🔄 | npm audit only | `package.json` | - | Basic vulnerability check |
| Network Policies | ✅ | K8s network policies | `k8s/90-ingress.yaml` | - | Traffic control |
| **Incident Response** | | | | | |
| Security Monitoring | ❌ | Not implemented | - | - | No SIEM integration |
| Incident Playbooks | ❌ | Not implemented | - | - | No response procedures |
| Breach Notification | ❌ | Not implemented | - | - | No notification system |

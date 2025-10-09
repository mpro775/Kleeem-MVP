# 🇾🇪 Kaleem — وثائق التشغيل (Ops & DevOps)

> تاريخ الإصدار: 2025-09-27
> تم التحديث ليعكس الواقع الحقيقي للمشروع

هذا المجلد يحتوي وثائق تشغيل وإدارة منصّة **Kaleem** (البنية التحتية، التشغيل، الحوادث، المراقبة، النسخ الاحتياطي والتعافي).

## 📋 نظرة عامة على الحالة الحالية

### 🚀 **حالة النشر الحالية**
- **Docker Compose**: يُستخدم للتطوير والإنتاج (VPS واحد)
- **Kubernetes**: ملفات موجودة للمستقبل (غير مطبقة حالياً)
- **CI/CD**: يدوي حالياً (scripts فقط)

### 📊 **حالة المراقبة**
- **Prometheus + Grafana**: ملفات config موجودة (غير مطبقة حالياً)
- **Logging**: Docker logs + manual monitoring
- **Alerts**: لا يوجد نظام تنبيه آلي حالياً

### 🛡️ **حالة الأمان**
- **Secrets**: Environment variables (غير محمية بـ Vault)
- **Network**: Internal Docker network + Nginx proxy
- **SSL**: Cloudflare (مستقبلي)

## 📚 ترتيب القراءة الموصى به

1. **`deployment/`** — ملفات النشر (Docker Compose الحالي + Kubernetes المستقبلي)
2. **`config-secrets.md`** — إدارة المتغيرات والأسرار
3. **`backup-recovery/`** — النسخ الاحتياطي والتعافي (مطبق جزئياً)
4. **`monitoring/`** — المراقبة والمقاييس (مستقبلي)
5. **`runbooks/`** — كتيبات التعامل مع الحوادث (مطبق جزئياً)

## 🏗️ **البنية التحتية الحالية**

### Services المنشورة
- **Backend (NestJS)**: API server مع multi-tenancy
- **Frontend (React/Vite)**: SPA dashboard
- **MongoDB**: Primary database مع replica set
- **Redis**: Cache layer (L1/L2)
- **Qdrant**: Vector database للبحث الدلالي
- **RabbitMQ**: Message queue للـ background jobs
- **MinIO**: S3-compatible storage
- **Nginx**: Reverse proxy + SSL termination

### Environment الحالي
- **Single VPS**: staging/production على نفس السيرفر
- **Manual Deployment**: عبر `scripts/deploy.sh`
- **No Load Balancing**: Single instance لكل service
- **Manual Monitoring**: Logs + health checks يدوياً

## 🔮 **خارطة الطريق المستقبلية**

### قصيرة المدى (3-6 أشهر)
- [ ] **GitHub Actions**: CI/CD آلي
- [ ] **Multi-environment**: staging/production منفصلة
- [ ] **Monitoring Stack**: Prometheus + Grafana + Loki
- [ ] **Load Balancing**: Nginx upstream + health checks

### متوسطة المدى (6-12 شهر)
- [ ] **Kubernetes Migration**: k8s deployment
- [ ] **Multi-region**: Disaster recovery
- [ ] **Secrets Management**: Vault أو AWS Secrets Manager
- [ ] **CDN Integration**: Cloudflare full setup

### طويلة المدى (1-2 سنة)
- [ ] **Auto-scaling**: HPA + VPA
- [ ] **Service Mesh**: Istio
- [ ] **Observability**: Distributed tracing
- [ ] **Chaos Engineering**: Fault injection testing

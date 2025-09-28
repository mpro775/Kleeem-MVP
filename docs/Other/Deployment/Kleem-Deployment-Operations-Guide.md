# Kleem — دليل النشر والتشغيل (Deployment & Operations Guide)

**الإصدار:** 1.0  
**التاريخ:** 2025-08-15  
**النطاق:** Dev / Staging / Production

> هذا الدليل عملي ومُفصّل لتثبيت وتشغيل Kleem على البيئات الثلاث، مع قوالب جاهزة (Compose/Nginx) وتشغيل أوّل مرة، مراقبة، نسخ احتياطي، وترقية بدون توقّف.

---

## 0) نظرة سريعة على المكوّنات
- **Frontend (React + Vite + MUI)**: لوحة التاجر + ودجت الويب شات + متجر مصغّر.
- **Backend API (NestJS/TS)**: Auth/RBAC، محادثات، منتجات، معرفة، متجر مصغّر، تكاملات.
- **Orchestrator (n8n)**: فهم النيّة (Intent-first)، Tool-gating للمنتجات، Quality Gate، Analytics Hook.
- **Datastores**: MongoDB (المعاملات)، **Qdrant** (المتجهات)، **MinIO** (ملفات)، **Redis** (كاش)، **RabbitMQ** (رسائل).

منافذ افتراضية: API `3000`, Frontend `5173`, n8n `5678`, Mongo `27017`, Redis `6379`, RabbitMQ `5672/15672`, Qdrant `6333`, MinIO `9000/9001`.

---

## 1) المتطلبات (عام)
- **Docker** و **Docker Compose v2** (يوصى به) — أو بديلًا: Node 20 LTS + Mongo 6+ + Redis 7+ + Qdrant 1.8+ + MinIO + RabbitMQ 3.12+.
- اسم نطاق للبيئات البعيدة:  
  - Dev: `dev.yourdomain.tld` (اختياري)  
  - Staging: `staging.yourdomain.tld`  
  - Prod: `app.yourdomain.tld` + `api.yourdomain.tld` + `n8n.yourdomain.tld` … إلخ.
- شهادات TLS (Let's Encrypt أو مزود آخر)، وDNS مضبوط.
- أسرار مخزّنة خارج المستودع (Vault/KMS) — لا تضع أسرارًا في Git.

---

## 2) إعداد البيئة المحلية (Dev)

### 2.1 تجهيز الملفات
1. انسخ أمثلة البيئة ثم عدّل محليًا فقط:  
   ```bash
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env
   ```
2. (اختياري) أنشئ مفاتيح JWT (RS256):  
   ```bash
   mkdir -p backend/secrets
   openssl genrsa -out backend/secrets/jwtRS256.key 2048
   openssl rsa -in backend/secrets/jwtRS256.key -pubout -out backend/secrets/jwtRS256.key.pub
   ```

### 2.2 تشغيل الخدمات
```bash
docker compose up -d --build
docker compose logs -f api
```
الوصول: API: `http://localhost:3000`, Frontend: `http://localhost:5173`, n8n: `http://localhost:5678`

### 2.3 إعداد n8n أول مرة
- افتح n8n، استورد ملف الـ workflow.
- اضبط الاعتمادات (API base، توقيع الويبهوك، مفاتيح القنوات).
- فعّل **Quality Gate** واحفظ نقاط جمع **missing_response**.

### 2.4 اختبارات صحّة سريعة
- Auth (تسجيل دخول/خروج).  
- رسالة منتج → تمر عبر **searchProducts** وتُرجِع اسم/سعر/رابط/بدائل.  
- رسالة سياسات → بحث قاعدة المعرفة + مصدر.  
- Widget embed محليًا على صفحة HTML — تأكد من الاتصال بالـ API.  

---

## 3) بيئة Staging (خادم واحد أو حاويات على VPS)

### 3.1 مبادئ
- مطابق تقريبًا لـ Prod لكن مصغّر، ويستخدم نطاقًا فرعيًا وتذاكر/أسرار خاصة بالاختبار.
- تفعيل HTTPS، وجمع المراقبة والسجلات.

### 3.2 خطوات
1. أنشئ خادم (مثال Ubuntu 22.04) + مستخدم غير root + جدار حماية (80/443/22).  
2. ثبّت Docker/Compose، واضبط swap/limits حسب الحمل.  
3. انسخ ملفات المشروع وقيم `.env` (من Vault).  
4. استخدم **docker-compose.prod.yml** (انظر القالب بالمرفقات) مع صور بناء Production:  
   ```bash
   docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
   ```
5. ضع Nginx أمام الخدمات مع TLS (انظر القالب).  
6. استورد n8n workflow بقِيَم Staging.

### 3.3 فحوص قبول
- صفحات الخدمة تعمل عبر HTTPS.  
- مسارات المنتجات والمعرفة تعمل وتُسجّل التحليلات.  
- التنبيهات (CPU, Mem, 5xx, Latency) تصل إلى Slack/Email.

---

## 4) بيئة Production

### 4.1 خيارات النشر
- **بـ Docker على عدة خوادم**: فصل طبقة البيانات (Mongo/Qdrant/MinIO/RabbitMQ) عن طبقة التطبيق (API/Frontend/n8n).  
- **Kubernetes** (GKE/EKS/K3s): مفضّل للتوسع العالي والترقيات بدون توقف.

### 4.2 كتل الإنتاج الأساسية
- **API/Workers/n8n/Frontend**: 2+ نسخ خلف Load Balancer (Nginx/ALB).  
- **MongoDB**: Replica Set (Primary + 2 Secondary) أو Mongo Atlas.  
- **RabbitMQ**: Cluster/HA أو خدمة مُدارة.  
- **Qdrant**: عقدة قوية مع snapshots؛ أو عنقدة حسب الحمل.  
- **MinIO**: Gateway لـ S3 أو Cluster محلي مع النسخ المتماثل.  
- **Redis**: primary/replica + Sentinel أو خدمة مُدارة.

### 4.3 إطلاق أولي (Docker مثال)
1. إعداد DNS وTLS.  
2. تحميل صور Production (CI/CD أو `docker build --target production`).  
3. نشر Compose Production + Nginx:  
   ```bash
   docker compose -f docker-compose.yml -f docker-compose.prod.yml pull
   docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
   ```
4. استيراد n8n workflow بقِيَم الإنتاج، وتثبيت Webhook Signing.  
5. إنشاء حسابات خدمة لمزوّدي القنوات/المتاجر بمفاتيح إنتاجية.

### 4.4 ترقيات بدون توقف
- **Blue/Green** أو **Rolling**:  
  - جهّز نسخة جديدة خلف منفذ/اسم خدمة مختلف.  
  - صحّة التطبيق (health checks).  
  - تحويل التوجيه (Nginx/ALB) عند النجاح.  
  - Rollback فوري عند فشل الفحوص.

---

## 5) الأمن في النشر
- TLS 1.3، HSTS، منع Mixed Content.  
- توقيع Webhooks + طابع زمني + **Idempotency-Key**.  
- معدلّات (IP/مستخدم/تاجر/خدمة) + حظر تلقائي.  
- أسرار عبر Vault/KMS + دوران مفاتيح دوري.  
- سياسات رفع ملفات: Allow-list + فحص AV + Signed URLs.  
- جدران حماية للتطبيق/WAF + حماية من DDoS.  
- صلاحيات دقيقة على الحاويات (non-root)، حدود CPU/RAM.  

---

## 6) المراقبة والسجلات
- **Metrics**: زمن الاستجابة، معدل رسائل/دقيقة، طول طوابير RabbitMQ، استدعاءات n8n، استهلاك الذاكرة.  
- **Logs**: موحّدة بصيغة JSON مع Masking للحقول الحساسة.  
- **Tracing**: تتبّع الرحلة (API → n8n → DBs).  
- **تنبيهات**: 5xx ≥ عتبة، Latency، فشل Healthcheck، امتلاء قرص، Snapshot/Qdrant فاشل.

---

## 7) النسخ الاحتياطي والاستعادة (Runbook)
### 7.1 الجداول الزمنية
- Mongo: يومي/أسبوعي/شهري + اختبار استعادة شهري.  
- Qdrant: Snapshots مجدولة ونقلها لتخزين خارجي.  
- MinIO: نسخ ليلية إلى مخزن ثانوي أو S3.  
- n8n: تصدير Workflows/Creds دوريًا (مشفّرة).

### 7.2 أوامر أمثلة (Docker)
```bash
# Mongo dump (داخل شبكة الخدمات)
docker exec mongo mongodump --archive=/backup/kleem.gz --gzip --db kleem
docker cp mongo:/backup/kleem.gz ./backup/kleem-$(date +%F).gz

# Qdrant snapshot
curl -X POST http://qdrant:6333/collections/products/snapshots
# ثم نسخ snapshot إلى مخزن آمن

# MinIO replication / mc mirror (مثال)
mc mirror --overwrite minio/kleem-files s3/kleem-backup
```

### 7.3 اختبار الاستعادة
- استعد نسخة على بيئة منفصلة (Staging/DR) وشغّل اختبارات صحة أساسية.  
- وثّق الزمن الكلي ونجاح البيانات الحرجة.

---

## 8) التشغيل اليومي (Ops Routines)
- مراجعة التنبيهات واللوحات كل صباح.  
- تفريغ قائمة **الأسئلة غير المجابة** وتدريب المعرفة أسبوعيًا.  
- تدوير المفاتيح/الشهادات حسب الجداول.  
- تدقيق صلاحيات المستخدمين شهريًا.  
- تحديثات تبعيات حرجة أسبوعيًا (أمن).

---

## 9) CI/CD (اقتراح GitHub Actions)
- **build-backend.yml**: تثبيت → lint/test → build → Docker image → push.  
- **build-frontend.yml**: تثبيت → lint/test → build → رفع Artifacts/CDN.  
- **deploy.yml**: مصفوفة بيئات (staging/production) مع موافقات وإطلاق تدريجي.

أسرار CI/CD في مخزن أسرار المنصة (GitHub Secrets/Actions Variables)، ومفاتيح نشر مقيّدة الصلاحيات.

---

## 10) استكشاف الأخطاء وإصلاحها (Troubleshooting)
- `RabbitMQ vhost mismatch`: وحّد `RABBIT_URL` و`AMQP_VHOST` وأنشئ vhost وصلاحياته.  
- `Mongo auth failed`: تأكد من تطابق مستخدم/كلمة المرور بين init وURI.  
- `getaddrinfo ENOTFOUND`: استخدم أسماء خدمات Docker بدل IP داخل الشبكة.  
- `n8n webhook 401`: تحقق من توقيع الويبهوك والـ path الصحيح.  
- بطء ردود الذكاء: راقب Qdrant/Redis، وحسّن الفهارس والسعات.

---

## 11) ملاحق
### 11.1 مصفوفة الفروق بين البيئات
| البند | Dev | Staging | Production |
|---|---|---|---|
| نطاق | localhost | `staging.domain` | `app.domain`, `api.domain` |
| TLS | اختياري | إجباري | إجباري |
| قواعد بيانات | حاويات محلية | مفردة أو مُدارة | Replica/Managed |
| أسرار | `.env` محلي | Vault/Secrets | Vault/KMS |
| قياس ومراقبة | أساسي | متوسط | كامل + تنبيهات |
| سعة | منخفضة | متوسطة | عالية وموزّعة |

### 11.2 Healthchecks (اقتراح)
- API: `GET /health` → `{ status: 'ok', db, cache }`  
- Frontend: `GET /` وملف `/.well-known/health` ثابت.  
- n8n: فحص `/healthz` أو خطوة وظيفة “ping”.  
- Datastores: مراقبة منافذ + اختبارات قراءة/كتابة دورية.

---

**خاتمة**  
باتباع هذا الدليل يمكنك نشر Kleem بثبات على البيئات الثلاث، مع مسارات واضحة للتوسّع، أمان، مراقبة، وعمليات يومية متكرّرة. أي تعديل جذري في البنية أو القنوات يستلزم تحديث هذا الدليل وقوالبه.

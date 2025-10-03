# 🛠️ Kaleem AI --- ONBOARDING GUIDE

مرحبًا بك في فريق **Kaleem AI**! 🎉\
هذا الدليل يشرح لك كل ما تحتاجه لتشغيل المشروع محليًا، فهم بنيته، اتباع
القواعد، والبدء في المساهمة بشكل صحيح.

------------------------------------------------------------------------

## 1️⃣ نظرة عامة على البنية

-   **Backend:** NestJS (TypeScript), MongoDB, Redis, RabbitMQ, Qdrant,
    MinIO, n8n Workflows, FastAPI (Embeddings).
-   **Frontend Web:** React + Vite + MUI + RTL support.
-   **Frontend Mobile:** Flutter (Cubit + Clean Architecture).
-   **Infra:** Docker + Docker Compose, VPS, Nginx reverse proxy, TLS
    (Let's Encrypt).
-   **Monitoring:** Prometheus, Grafana, Loki, Alertmanager, Tempo,
    Glitchtip.

------------------------------------------------------------------------

## 2️⃣ المتطلبات الأساسية (Prerequisites)

### عام

-   Git + GitHub account.
-   VSCode أو IDE آخر مع إضافات: ESLint, Prettier, Flutter.
-   Node.js \>= 20, npm/pnpm, Python \>= 3.10, Docker \>= 24.

### Mobile

-   Flutter SDK (مع PATH).
-   Xcode / Android Studio مع simulators.

### DevOps

-   rclone, restic, jq, curl, make.

------------------------------------------------------------------------

## 3️⃣ تشغيل البيئة محليًا (Development Setup)

### 3.1 Clone

``` bash
git clone https://github.com/kaleem-ai/kaleem-backend.git
git clone https://github.com/kaleem-ai/kaleem-frontend.git
git clone https://github.com/kaleem-ai/kaleem-frontend-mobile.git
cd kaleem-backend
```

### 3.2 إنشاء ملف `.env`

``` bash
cp .env.example .env
# عدّل القيم مثل DB_URL, REDIS_URL, JWT_SECRET إلخ.
```

### 3.3 تشغيل Docker stack

``` bash
docker compose up -d
# سيشغل: MongoDB, Redis, RabbitMQ, Qdrant, MinIO, n8n
```

### 3.4 تشغيل Backend

``` bash
cd kaleem-backend
npm install
npm run start:dev
```

### 3.5 تشغيل Frontend Web

``` bash
cd kaleem-frontend
npm install
npm run dev
```

### 3.6 تشغيل Frontend Mobile

``` bash
cd kaleem-frontend-mobile
flutter pub get
flutter run
```

------------------------------------------------------------------------

## 4️⃣ قواعد الكود (Code Guidelines)

-   ✅ التزم بـ **Conventional Commits**: `feat:`, `fix:`, `docs:`, إلخ.
-   ✅ أضف **unit tests** لأي feature جديدة.
-   ✅ لا ترفع secrets (استخدم .env).
-   ✅ كل PR يجب أن يمر عبر **Code Review**.

------------------------------------------------------------------------

## 5️⃣ الاختبارات (Testing)

### Backend

``` bash
npm run test
npm run test:e2e
```

### Frontend Web

``` bash
npm run test
```

### Flutter

``` bash
flutter test
```

### E2E (Playwright)

``` bash
cd kaleem-frontend
npx playwright test
```

------------------------------------------------------------------------

## 6️⃣ النسخ الاحتياطي (Backups)

-   نعتمد **restic + rclone** للنسخ إلى Cloudflare R2.
-   ملفات التهيئة: `/etc/restic-s3.env`, `/etc/restic.pass`.
-   سكربت: `/opt/kaleem/scripts/kaleem-backup.r2.sh`.

### استعادة النسخة

``` bash
restic -r rclone:r2:kaleem-backup/restic restore latest --target /restore-path
```

------------------------------------------------------------------------

## 7️⃣ المراقبة (Observability)

-   **Grafana:** https://grafana.kaleem-ai.com
-   **Prometheus:** https://prometheus.kaleem-ai.com
-   **Glitchtip:** https://errors.kaleem-ai.com

------------------------------------------------------------------------

## 8️⃣ الأمن (Security)

-   ✅ جميع APIs محمية بـ JWT + RBAC.
-   ✅ CORS whitelist = FRONTEND_ORIGIN.
-   ✅ Webhooks موقعة ويجب التحقق منها.
-   ✅ Audit logs مفعلة (Mongo + Loki).

------------------------------------------------------------------------

## 9️⃣ أول مهمة لك (First Task)

1.  شغّل البيئة محليًا بنجاح.
2.  أضف test بسيط لـ endpoint موجود.
3.  افتح PR على فرع `develop` بعنوان:\
    `chore(onboarding): add test for health endpoint`.

------------------------------------------------------------------------

## 🔟 موارد إضافية

-   [NestJS Docs](https://docs.nestjs.com/)
-   [Flutter Docs](https://docs.flutter.dev/)
-   [React Docs](https://react.dev/)
-   [Prometheus Docs](https://prometheus.io/docs/)
-   [n8n Docs](https://docs.n8n.io/)

------------------------------------------------------------------------

🎯 **الهدف:** بعد أسبوعين من قراءة هذا الدليل + التدرب، يجب أن تتمكن من
تشغيل بيئة كاملة، إضافة Feature صغيرة، وكتابة Tests لها.

# 🆘 Kaleem AI --- Disaster Recovery Runbook

هذا الملف يوضح خطوات استعادة الخدمة والبيانات في حال حدوث كارثة (فقدان
بيانات، تعطل خادم، اختراق).

------------------------------------------------------------------------

## 1️⃣ الاستعداد (Preparation)

-   جميع الخدمات تعمل عبر **Docker Compose**.
-   النسخ الاحتياطية تُأخذ يوميًا باستخدام restic+rclone إلى Cloudflare
    R2.
-   ملفات التهيئة موجودة في:
    -   `/etc/restic-s3.env`
    -   `/etc/restic.pass`
    -   `/opt/kaleem/scripts/kaleem-backup.r2.sh`

------------------------------------------------------------------------

## 2️⃣ خطوات الاستعادة (Restore Steps)

### استعادة قاعدة البيانات

``` bash
export RESTIC_REPOSITORY="rclone:r2:kaleem-backup/restic"
export RESTIC_PASSWORD_FILE="/etc/restic.pass"

# عرض النسخ المتوفرة
restic snapshots

# استعادة آخر نسخة
restic restore latest --target /restore-path
```

### استعادة الخدمات (Docker)

``` bash
cd /opt/kaleem
docker compose down
docker compose pull
docker compose up -d
```

### التحقق من الصحة (Health Check)

-   افتح `/health` endpoint للـ Backend.
-   تحقق من دخول الـ Frontend (Web + Mobile).
-   تحقق من وظائف AI Embeddings + Qdrant.

------------------------------------------------------------------------

## 3️⃣ خطة الطوارئ (Fallback)

-   في حال فشل الاستعادة الكاملة:
    -   استعادة نسخة DB من الأمس فقط.
    -   تشغيل Frontend مع Read-only APIs.
    -   إرسال إشعار للعملاء بانقطاع الخدمة مؤقتًا.

------------------------------------------------------------------------

## 4️⃣ أدوار ومسؤوليات (Roles)

-   **Incident Commander:** مسؤول عن القرارات النهائية.
-   **Backend Lead:** استعادة DB + APIs.
-   **DevOps:** إدارة Docker + VPS + TLS.
-   **Support:** التواصل مع العملاء.

------------------------------------------------------------------------

## 5️⃣ التواصل (Communication)

-   قناة Telegram داخلية للتنبيهات.
-   بريد incident@kaleem-ai.com للتقارير.
-   تحديث العملاء عبر لوحة التحكم أو البريد.

------------------------------------------------------------------------

✅ يجب اختبار خطة الاستعادة كل 3 أشهر.

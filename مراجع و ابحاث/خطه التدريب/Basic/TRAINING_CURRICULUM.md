# 📚 Kaleem AI --- Training Curriculum

هذا الملف يوضح خطة تدريبية متكاملة لفريق Kaleem، من الصفر حتى المستوى
المتقدم، تغطي جميع المسارات الضرورية: Backend, Frontend, DevOps, AI/ML,
Security, QA, UX.

------------------------------------------------------------------------

## 1️⃣ المستويات التدريبية (Levels)

-   **Level 0 --- Onboarding (أسبوع 1--2)**
    -   تشغيل البيئة محليًا (Backend + Frontend + Mobile).
    -   فهم بنية المشروع وموديولاته.
    -   قراءة الكود الأساسي والوثائق.
-   **Level 1 --- Junior (شهر 1--2)**
    -   تنفيذ Features بسيطة.
    -   تعلم كتابة Unit Tests.
    -   المساهمة في إصلاح Bugs.
    -   فهم CI/CD pipeline.
-   **Level 2 --- Intermediate (شهر 3--4)**
    -   تنفيذ Features متكاملة عبر الطبقات.
    -   كتابة Integration Tests + E2E.
    -   التعامل مع DB schemas + migrations.
    -   تحسين الأداء (caching, indexing).
-   **Level 3 --- Senior (شهر 5--6)**
    -   تصميم موديولات جديدة.
    -   Security Hardening (CORS, Webhook signing).
    -   إضافة Observability metrics (Prometheus, Grafana).
    -   قيادة Code Reviews.
-   **Level 4 --- Lead / SRE / ML Engineer (مستمر)**
    -   بناء معماريات جديدة.
    -   تشغيل نماذج LLM محليًا/خارجياً.
    -   ضبط تكلفة الـ AI APIs.
    -   قيادة عمليات Incident Response.

------------------------------------------------------------------------

## 2️⃣ المسارات التدريبية (Tracks)

### A --- Backend (NestJS, Mongo/Redis, RabbitMQ)

-   **المهارات:** TypeScript, NestJS DI, DTO validation, structured
    logging, caching, async jobs.
-   **تمارين:**
    -   بناء Endpoint جديد + DTO.
    -   Flow كامل: Webhook → Save DB → Publish event.

### B --- Frontend Mobile (Flutter + Clean Arch)

-   **المهارات:** Flutter basics, Cubit state management, Clean
    Architecture layers, i18n.
-   **تمارين:** Splash → Onboarding → Login flow.

### C --- Frontend Web (React + MUI)

-   **المهارات:** React components, RTL, API integration, token refresh,
    MUI theming.
-   **تمارين:** Merchant dashboard widget لعرض Metrics.

### D --- DevOps & Infra

-   **المهارات:** Docker Compose, Nginx reverse proxy, TLS, backups
    (restic+rclone), Prometheus+Grafana.
-   **تمارين:** إعداد بيئة Staging محلية + استعادة Backup.

### E --- ML/AI & Vector Search

-   **المهارات:** sentence-transformers, FastAPI, embeddings, Qdrant.
-   **تمارين:** خدمة Embeddings → Qdrant → Search API.

### F --- QA & Testing

-   **المهارات:** Unit, Integration, Playwright E2E, k6 load tests.
-   **تمارين:** E2E لسيناريو تسجيل تاجر + إضافة منتج.

### G --- Security & Compliance

-   **المهارات:** JWT lifecycle, RBAC, CORS, CSP, Webhook signing, Audit
    logging.
-   **تمارين:** إضافة Webhook signature guard + tests.

### H --- Product / UX & Prompting

-   **المهارات:** Onboarding UX, conversational flows, i18n prompts,
    writing FAQ auto-train flows.
-   **تمارين:** مكتبة برومبتات للتصنيفات والمنتجات.

------------------------------------------------------------------------

## 3️⃣ الجدول الزمني المقترح (6 أشهر)

-   **شهر 1:** Onboarding + Junior labs.
-   **شهر 2:** مهام بسيطة + Tests.
-   **شهر 3:** Features متكاملة + Integration tests.
-   **شهر 4:** تحسين الأداء + Security basics.
-   **شهر 5:** Observability + ML basic integration.
-   **شهر 6:** قيادة صغيرة (code review, mentoring).

------------------------------------------------------------------------

## 4️⃣ المشاريع التدريبية (Capstone Projects)

1.  **Search Service:** PDF chunking → Embeddings → Qdrant → Search API
    → Flutter widget.
2.  **AI Chat Flow:** Webhook → n8n → Backend memory → Frontend chat
    widget.
3.  **CI/CD Pipeline:** GitHub Actions + Canary deployment.

------------------------------------------------------------------------

## 5️⃣ قوائم التحقق (Checklists)

### PR Checklist

-   [ ] Commit messages صحيحة.
-   [ ] Unit tests مضافة.
-   [ ] تغطية ≥ 70%.
-   [ ] Security review.

### Release Checklist

-   [ ] Backup taken.
-   [ ] Migrations جاهزة.
-   [ ] Load test تم.
-   [ ] Rollback plan.

------------------------------------------------------------------------

## 6️⃣ التقييم والأداء (KPIs)

-   \% تغطية الاختبارات (≥ 70%).
-   عدد Features المغلقة شهريًا.
-   MTTR (وقت استعادة الخدمة).
-   التزام بـ Code Review rules.

------------------------------------------------------------------------

## 7️⃣ المخرجات النهائية (Deliverables)

-   ONBOARDING.md (تم إنشاؤه).
-   TRAINING_CURRICULUM.md (هذا الملف).
-   SECURITY_CHECKLIST.md.
-   DR_RUNBOOK.md.
-   PROMPTS_LIBRARY.md.
-   N8N_WORKFLOWS.md.

------------------------------------------------------------------------

🎯 **الهدف:** بعد 6 أشهر، الفريق يجب أن يمتلك: - قدرة على بناء Features
متكاملة. - تغطية اختبارات +70%. - تشغيل واستعادة نسخ احتياطية. - نشر
وتحديث بيئات Production بأمان. - تدريب وتوسيع نماذج الذكاء الاصطناعي.

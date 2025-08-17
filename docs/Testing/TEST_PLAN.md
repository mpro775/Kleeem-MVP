# خطة الاختبار (Test Plan) — مشروع Kleem
**الإصدار:** 1.0 • **التاريخ:** 2025-08-15

> هذه الخطة عملية وقابلة للتنفيذ مباشرة في بيئة Kleem (Backend: NestJS + TypeScript، Frontend: React + MUI، Vector: Qdrant، Embeddings: FastAPI، رسائل: RabbitMQ، Cache: Redis، تخزين: MinIO).

---

## 1) النطاق والأهداف
- التحقق من صحة الوظائف، الأداء، الأمان، وتجربة المستخدم عبر الطبقات:
  - **Backend (NestJS)**: Auth/JWT/Guards، Webhooks للقنوات، سير المحادثات، تكامل LLM، Qdrant، Redis، RabbitMQ، MinIO، Prometheus.
  - **Frontend (React + MUI)**: لوحة التحكم، إعدادات القنوات، المحادثات الحية/البث، التحليلات.
  - **خدمات خارجية**: Telegram/WhatsApp/Web Chat، ومتاجر (Salla/Zid/Shopify/WooCommerce — بعضها “قريبًا”).
  - **خدمة Embeddings (FastAPI)** و **Qdrant** للفهرسة والبحث الدلالي.

## 2) هرم الاختبار
1) **وحدة** → 2) **تكامل** → 3) **عقد (Contract/OpenAPI/Pact)** → 4) **نهاية-لنهاية (E2E/Playwright)** → 5) **أداء/تحمّل (k6)** → 6) **أمان (SAST/DAST/Containers/Secrets)**.

## 3) أنواع الاختبارات وأدوات التنفيذ

### 3.1 اختبارات الوحدة (Unit)
- **Backend**: Jest + ts-jest.
  - استهداف الخدمات والـ Guards/Interceptors/Utils. محاكاة الاتصالات الخارجية (Redis/RabbitMQ/Qdrant/MinIO/LLM).
  - مثال سكريبت npm:
    ```json
    {"scripts": {
      "test": "jest --runInBand",
      "test:cov": "jest --coverage"
    }}
    ```
- **Frontend**: React Testing Library + Jest/Vitest.
  - اختبار المكوّنات (جداول/نماذج/محادثة) وحالات التفاعل وi18n.
- **بيانات اختبار**: استخدم `@faker-js/faker` أو `fishery` لتوليد البيانات.

**عتبات التغطية المقترحة (backend):**
```js
// jest.config.ts (مقتطف)
export default {
  collectCoverage: true,
  coverageThreshold: {
    global: { branches: 80, functions: 85, lines: 85, statements: 85 }
  }
};
```

### 3.2 اختبارات التكامل (Integration)
- تشغيل خدمات الطرفيات محليًا داخل الاختبارات باستخدام **Testcontainers**:
  - MongoDB، Redis، RabbitMQ، **Qdrant**، MinIO، وخدمة Embeddings (إن أمكن).
- **Supertest** للتحقق من REST/Streaming والـ Webhooks (التوقيع/إعادة المحاولة/المهلات).
- التحقق من: نشر/استهلاك الرسائل، إدراج/بحث Qdrant، رفع/جلب MinIO.

**مقتطف Testcontainers (Mongo كمثال):**
```ts
import { GenericContainer } from "testcontainers";
const mongo = await new GenericContainer("mongo:7").withExposedPorts(27017).start();
process.env.MONGO_URI = `mongodb://localhost:${mongo.getMappedPort(27017)}/kleem_test`;
```

### 3.3 اختبارات العقد (Contract)
- **OpenAPI** من NestJS (Swagger) كنقطة مرجعية.
- **Pact (Consumer-Driven)** بين Front/Back لضمان ثبات الـ payloads.
- **Schemathesis** لفحص الالتزام بالـ OpenAPI + Fuzzing.
  - مثال تشغيل:
    ```bash
    schemathesis run http://localhost:3000/docs-json --checks all --stateful=links
    ```

### 3.4 اختبارات نهاية-لنهاية (E2E)
- **Playwright** (Chromium/WebKit/Firefox، Mobile Viewports).
- سيناريو محوري:
  1) تسجيل تاجر جديد → 2) تهيئة قناة (Telegram) → 3) استقبال Webhook → 4) ظهور المحادثة بلوحة التحكم → 5) رد/تقييم → 6) التأكد من التسجيل والتحليلات.
- التحقق من الـ **streaming** (SSE/WebSocket) في الواجهة وظهور typing/partials.

### 3.5 الأداء/التحمّل (Performance & Reliability)
- **k6** مع ميزانيات:
  - Webhooks: P95 ≤ 1s (ACK سريع، المعالجة لاحقًا).
  - REST الأساسية: P95 ≤ 400ms.
  - بدء بث LLM: P95 ≤ 5s.
  - دفع الرسائل عبر SSE/WS: ≤ 100ms بعد توليدها.
- سيناريوهات: 1000 محادثة متزامنة، زيادات تدريجية، وفشل شبكي متعمد.

### 3.6 الأمان (Security)
- **SAST**: ESLint + SonarQube.
- **Dependencies**: npm audit + Snyk/OWASP Dependency-Check.
- **Secrets**: Gitleaks.
- **Containers**: Trivy/Grype لمسح صور Docker.
- **DAST**: OWASP ZAP على Staging (مصادقة + سياق).
- **AuthZ/AuthN**: مصفوفة أدوار دقيقة (أدمن/تاجر/موظف/عميل/زائر) + Multi-tenant isolation.
- **مقاومة Prompt Injection** وتطهير المدخلات/المرفقات وRate Limiting.

### 3.7 اختبارات الذكاء الاصطناعي (AI Evaluation)
- مجموعات ذهبية **عربية** (فصحى/لهجات/مزج لغوي) لسياقات خدمة/مبيعات/شكاوى.
- معيار قبول: ≥ **90%** دقة على مجموعة قياس داخلية.
- تحقق من سلامة المحتوى (سياسات الرفض/التحيّز/الخصوصية).

## 4) مؤشرات القبول (KPIs)
- تغطية: وحدات حرجة ≥ 90%، إجمالي ≥ 80%.
- أداء: وفق §3.5.
- ثبات E2E: flakiness < 1%.
- وصولية Frontend: WCAG 2.1 AA باستخدام axe-core.

## 5) إدارة بيانات الاختبار
- توليد بيانات تركيبية/إخفاء هوية.
- بذور (seeds) متكرّرة + تنظيف بيانات CI تلقائيًا.
- عينات حوارات عربية متنوعة + توثيق توقّعات الرد.

## 6) CI/CD — ترتيب المهام
1) Lint & SAST → 2) Unit (Back/Front) + تغطية → 3) Integration via Testcontainers → 4) Contract (Pact + Schemathesis) → 5) E2E (Playwright) مع traces → 6) Security (Gitleaks/Trivy/ZAP) → 7) k6 (دَخْلة قصيرة على كل دمج + موسّعة أسبوعيًا).
- تقارير بصيغة JUnit/HTML وبادجات تغطية/نجاح.

## 7) قوائم التحقق (Checklists)

### قبل الدمج (PR)
- [ ] تغطية الوحدة ≥ العتبة.
- [ ] اختبارات التكامل الحرجة خضراء.
- [ ] تحديث OpenAPI عند تغيير الواجهات.
- [ ] عقود Pact محدثة ومتحققة.
- [ ] Playwright smoke خضراء.
- [ ] فحوص الأمن (lint + gitleaks) نظيفة.

### قبل الإصدار
- [ ] k6 موسّع على Staging ضمن الميزانيات.
- [ ] ZAP لا يُظهر ثغرات عالية/حرجة غير مبررة.
- [ ] توثيق حالات الفشل المعروفة وخطة الالتفاف.

## 8) ملاحق — أمثلة تشغيل سريعة
- **Backend**: `npm run test`، `npm run test:cov`
- **Frontend**: `npm run test`
- **E2E**: `npx playwright test`
- **Performance**: `k6 run tests/k6/webhooks-smoke.js`
- **Security**: `gitleaks detect`، `trivy image <repo>:<tag>`، وتشغيل ZAP (انظر السكربت).

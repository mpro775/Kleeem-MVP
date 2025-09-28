# Testing Strategy — Kaleem AI

> هدفنا بناء ثقة تشغيلية قبل/بعد الإطلاق: اختبارات وحدة + تكامل + طرف-لطرف + أداء، مع نسب تغطية واقعية ومعايير قبول قابلة للقياس.

## 0) الملخص التنفيذي (TL;DR)
- **Backend**: Jest + Supertest (Unit/Integration/E2E) + k6 (Performance) + MongoDB Memory Server
- **Frontend**: Vitest + React Testing Library + Playwright (E2E) + MSW (API mocking)
- **Coverage**: ≥70% lines/branches (Backend), ≥75% statements/branches (Frontend)
- **CI/CD**: Automated testing pipeline مع reports + security scanning
- **Test Data**: Factories + Fixtures + Per-tenant seeding
- **Performance**: k6 scripts مع p95 < 300ms + cache hit ratio monitoring

## 1) التغطية والحدود (Coverage)
- **Backend (NestJS)**: **≥ 70%** lines/branches (حسب jest.config.js)
  - الوحدات الأساسية: auth, products, orders, cache, webhooks, channels
  - تغطية عالية للوحدات الحرجة: services, guards, interceptors
- **Frontend (React)**: **≥ 75%** statements/branches (حسب vitest.config.ts)
  - المكونات المحورية: auth, products, dashboard, forms
  - تغطية عالية للـ context و hooks
- **E2E**: تغطية المسارات الحرجة
  - User journey: signup/login → dashboard → products → checkout
  - Webhook flows: WhatsApp/Telegram message processing
  - Multi-tenant isolation: merchant A ≠ merchant B
- **لا نطارد 100%** على حساب الجدوى؛ نغطي الحالات الحرجة والإرجاعيات (regressions).

## 2) طبقات الاختبار
### Unit Tests (الوحدة)
- **أدوات**: **Jest** (+ ts-jest)، **TestingModule** في NestJS مع Mocks
- **تغطي**:
  - Services/UseCases نقية (بدون I/O حقيقي)
  - Validators, Mappers, Utils, Guards, Interceptors
  - Business logic isolation
- **أمثلة**:
  - `ProductQueriesService` logic (فلترة وفرز)
  - `CacheService` strategies (L1/L2 caching)
  - `JwtAuthGuard` authentication logic
  - `ProductPricingService` (خصومات وقسائم)

### Integration Tests (التكامل)
- **أدوات**: **Jest + Supertest** (Backend)، **MSW** (Frontend)
- **قواعد**:
  - **MongoDB Memory Server** (mongodb-memory-server) + ReplicaSet
  - **Redis mocking** عبر ioredis mock
  - **MinIO/Qdrant mocking** عبر custom mocks
  - استدعاء API حقيقي عبر HTTP داخل بيئة الاختبار
- **تغطي**:
  - DTO validation + Guards + Interceptors + Swagger schema
  - Repositories مع فهارس حقيقية (createIndex في setup)
  - Database operations + transactions
  - External service integration (webhooks, channels)

### E2E Tests (طرف-لطرف)
- **أدوات**: **Playwright** (Frontend) + **Jest + Supertest** (Backend)
- **سيناريوهات**:
  - **User Journey**: signup/login → dashboard → products → checkout
  - **Merchant Journey**: onboarding → channel setup → product management
  - **Webhook Flows**: WhatsApp/Telegram message processing
  - **Multi-tenant**: merchant A ≠ merchant B isolation
- **مخرجات**:
  - لقطات/فيديو تشغيل (screenshots/videos)
  - قياس زمن الاستجابة (p95/thresholds)
  - Lighthouse performance scores

### Performance & Load Tests
- **أدوات**: **k6** (Backend) + **Lighthouse** (Frontend)
- **سيناريوهات**:
  - `/api/products` تحت حمل 50–200 vus
  - مسارات القراءة المكثفة + cache hit ratio
  - Frontend bundle size + Core Web Vitals
- **أهداف**:
  - **p95 < 300ms** عند cold cache، **< 150ms** عند warm
  - **أخطاء < 1%** + **cache hit ratio > 70%**
  - **Lighthouse scores > 90** (Performance, Accessibility, SEO)

## 3) تنظيم الملفات
```
Backend/
├── src/modules/**/__tests__/*.spec.ts           # Unit tests
├── test/integration/**/*.integration.spec.ts   # Integration tests
├── test/e2e/**/*.e2e-spec.ts                   # E2E tests
├── test/k6/*.js                                # Performance tests
├── test/mocks/*.ts                             # Test mocks & utilities
├── test/fixtures/**/*                           # Test data factories
└── test/jest.setup.ts                          # Global test setup

Frontend/
├── src/**/__tests__/*.test.tsx                 # Unit tests (Vitest)
├── src/**/__tests__/*.test.ts                  # Unit tests (Vitest)
├── test/e2e/**/*.spec.ts                       # E2E tests (Playwright)
├── src/test/setup.ts                           # Global test setup
├── src/test/utils.ts                           # Test utilities
└── playwright.config.ts                        # Playwright config
```

## 4) بيانات وهمية (Fixtures) ومولدات
- **Factory Pattern**: `makeProduct({ overrides })`, `makeMerchant({ overrides })`
- **Per-tenant seeding**: merchant A/B لتمييز العزل (multi-tenancy tests)
- **Test Data Builders**: fluent API لإنشاء بيانات معقدة
- **Snapshots بحذر**: استخدم للـ UI components فقط، فضّل assertions الصريحة للـ logic
- **Database Fixtures**: JSON files للحالات المعقدة (seeding before tests)
- **Mock Data**: realistic data للاختبارات (عربي + إنجليزي، أرقام سعودية)

## 5) CI/CD Pipelines (الواقع الحقيقي)
### Backend Pipeline
```yaml
# GitHub Actions
- lint: eslint + prettier
- typecheck: tsc --noEmit
- test:unit: jest --selectProjects unit
- test:integration: jest --selectProjects integration
- test:e2e: jest --selectProjects e2e
- build: docker build
- security: npm audit + dependency check
```

### Frontend Pipeline
```yaml
# GitHub Actions
- lint: eslint + prettier
- typecheck: tsc --noEmit
- test: vitest run --coverage
- test:e2e: playwright test
- build: vite build
- lighthouse: lighthouse CI
- bundle-analyzer: webpack-bundle-analyzer
```

### التقارير:
- **Coverage**: lcov + HTML reports → Codecov/SonarCloud
- **E2E**: screenshots/videos → artifacts
- **Performance**: k6 reports + Lighthouse JSON
- **Security**: OWASP ZAP + npm audit reports
- **Notifications**: Slack/Discord على فشل الاختبارات

## 6) سكربتات npm (Backend - الواقع الحقيقي)
```json
{
  "scripts": {
    "lint": "eslint .",
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "test": "jest --runInBand",
    "test:unit": "jest --runInBand --selectProjects unit",
    "test:integration": "jest --runInBand --selectProjects integration",
    "test:e2e": "jest --runInBand --selectProjects e2e",
    "test:all": "npm run test:unit && npm run test:integration && npm run test:e2e",
    "test:coverage": "jest --coverage --selectProjects unit",
    "test:debug": "node --inspect-brk -r tsconfig-paths/register -r ts-node/register node_modules/.bin/jest --runInBand",
    "test:security": "powershell -ExecutionPolicy Bypass -File test/e2e/run-security-tests.ps1",
    "test:security:bash": "bash test/e2e/run-security-tests.sh",
    "test:webhooks": "jest test/e2e/webhooks --verbose",
    "test:auth": "jest test/e2e/auth --verbose"
  }
}
```

## 6.1) سكربتات npm (Frontend - الواقع الحقيقي)
```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:watch": "vitest --watch",
    "test:cov": "vitest run --coverage",
    "test:coverage": "vitest --run --coverage",
    "test:fast": "vitest --config vitest.config.fast.ts --run",
    "test:comprehensive": "vitest --config vitest.config.comprehensive.ts --run",
    "test:parallel": "vitest --config vitest.config.parallel.ts --run",
    "test:e2e": "vitest --config vitest.config.e2e.ts --run",
    "test:all": "npm run test:fast && npm run test:comprehensive && npm run test:parallel",
    "test:ci": "vitest --run --reporter=verbose --pool=forks --maxConcurrency=4",
    "test:debug": "vitest --run --reporter=verbose --pool=forks --maxConcurrency=1",
    "e2e": "playwright test"
  }
}
```

## 7) معايير قبول الاختبارات
- **كل PR يضيف/يُحدّث اختبارات** للمسارات المتأثرة
- **لا يُدمج PR إذا انخفضت التغطية** الإجمالية تحت العتبة (GitHub branch protection)
- **أخطاء E2E blocking** للإطلاق (main branch protection)
- **تقارير CI تُربط في PR**: Coverage Badge + Playwright report link + k6 results
- **Security tests** تمر قبل الدمج (OWASP ZAP + dependency scanning)
- **Performance regression** > 10% blocking للإطلاق

## 8) أفضل الممارسات
- **اجعل الاختبارات سريعة** (< 30s للوحدة، < 2min للتكامل، < 5min للـ E2E)
- **مستقلة**: كل اختبار يُشغل لوحده (no shared state)
- **قابلة للتشغيل محليًا**: `npm test` يعمل بدون إعداد إضافي
- **اكتب Given/When/Then** في الوصف (BDD style)
- **استعمل data-testids** في الواجهات المعقدة للـ E2E
- **لا تعتمد على التوقيتات** (setTimeout) — انتظر أحداث/حالات
- **Mock external dependencies** (Redis, MinIO, Qdrant, Webhook providers)
- **Test edge cases**: empty states, error states, loading states
- **Test accessibility**: ARIA labels, keyboard navigation
- **Test multi-tenancy**: merchant isolation, data separation
- **Test i18n**: Arabic/English content switching
- **Test responsive design**: mobile/tablet/desktop breakpoints

## 9) أدوات وإعدادات الاختبار

### Backend Testing Tools
```bash
# Jest Configuration
- jest.config.js: Multi-project setup (unit/integration/e2e)
- jest.setup.ts: Global mocks (Redis, MinIO, MongoDB)
- jest-extended: Additional matchers
- supertest: HTTP testing

# Test Database
- mongodb-memory-server: In-memory MongoDB with ReplicaSet
- testcontainers: للخدمات الخارجية (Redis, Qdrant)

# Performance Testing
- k6: Load testing مع scenarios واقعية
- artillery: Alternative load testing
```

### Frontend Testing Tools
```bash
# Vitest Configuration
- vitest.config.ts: Multi-config setup (fast/comprehensive/parallel)
- @testing-library/react: React component testing
- @testing-library/jest-dom: Custom Jest matchers
- @testing-library/user-event: User interaction simulation

# E2E Testing
- playwright: Browser automation + screenshots/videos
- @playwright/test: Test runner with fixtures

# API Mocking
- msw: API mocking for integration tests
- mock-service-worker: Service worker API mocking
```

### Test Utilities
```typescript
// Backend
- Test factories: makeProduct(), makeMerchant()
- Test helpers: createTestApp(), mockRedis(), mockMinIO()
- Custom matchers: toBeValidObjectId(), toHaveBeenCalledWithMerchant()

// Frontend
- Test utilities: renderWithProviders(), mockAPI(), waitForLoading()
- Custom render: renderWithRouter(), renderWithTheme()
- Mock data: realistic Arabic/English content
```

## 10) مراقبة جودة الاختبارات
- **Code Coverage**: SonarCloud/Codecov integration
- **Test Performance**: Track test execution time trends
- **Flaky Tests**: Automated detection and fixing
- **Test Debt**: Regular cleanup of unused/slow tests
- **Test Analytics**: Success rate, execution time, failure patterns
- **Test Environments**: Separate envs for unit/integration/e2e


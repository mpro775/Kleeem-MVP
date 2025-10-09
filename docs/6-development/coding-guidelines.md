# Coding Guidelines — Kaleem AI

> الهدف: توحيد أسلوب الكتابة عبر الفرق (Backend NestJS/TypeScript + Frontend React/Vite + RN/Flutter)، رفع قابليّة الصيانة، وتقليل الـ diff noise في PRs.

## 0) الملخص التنفيذي (TL;DR)

- **Conventional Commits** + **Prettier 3** + **ESLint 9 (Flat Config)** + **TypeScript ESLint 8**.
- **أسماء ملفات باك-إند**: kebab-case (products.controller.ts)، **أسماء Classes**: PascalCase (ProductsController)، **المتغيرات/الحقول**: camelCase.
- **Always validate DTOs** مع **I18nMessage** للرسائل المترجمة + **typed errors** مع business error codes.
- **Imports order** آلي (eslint-plugin-import) + ممنوع الـ default export في NestJS + **absolute imports** عبر tsconfig paths.
- **No business logic in controllers** — الخدمات فقط (Services + Repositories pattern).
- **Strict null checks**, **no implicit any** (معدل لـ false في tsconfig للمرونة)، **exactOptionalPropertyTypes**.
- **Config via @nestjs/config** مع **registerAs** functions، بدون الوصول المباشر لـ process.env داخل الخدمات.

---

## 1) نمط التسمية (Style & Naming)

### Backend (NestJS / TypeScript)

- **الملفات**: `src/modules/products/products.controller.ts` (kebab-case)
- **الأصناف**: `ProductsController`, `ProductsService`, `MongoProductsRepository`, `CreateProductDto`, `ProductSchema`
- **الرموز**: `merchantId`, `createdAt`, `updatedAt`, `isActive`, `deletedAt`, `sessionId`, `productSource`
- **الثوابت**: `UPSELL_LIMIT`, `CACHE_TTL_MS`, `RABBIT_CONFIRM_TIMEOUT_MS`
- **Enums**: `ProductStatus`, `Role`, `ChannelType`, `ChannelProvider`, `ChannelStatus`
- **DTOs**: حقول required فقط، optional بـ `?` أو `@IsOptional()` مع **I18nMessage** للرسائل المترجمة
- **الموديولات**: `products.module.ts` يجمع (controller/service/repo/schema)
- **Services**: يُقسم لـ Commands/Queries (CQRS pattern) + specialized services (Media, Sync, Public)

### Frontend (React + Vite)

- الملفات: kebab-case: `product-list.tsx`, `use-products.ts`
- المكونات: PascalCase: `ProductList`, `FiltersPanel`
- hooks داخل `/hooks` تبدأ بـ `use`
- لا يوجد default export للمكونات القابلة لإعادة الاستخدام، استخدم named exports

---

## 2) هيكلة المشروع (Back + Front)

### Backend (الواقع الحقيقي)

```
Backend/src/
├── common/ (decorators, guards, interceptors, filters, utils, services)
│   ├── cache/ (cache service + warmers)
│   ├── config/ (vars.config.ts with registerAs)
│   ├── constants/ (error codes, HTTP status)
│   ├── decorators/ (CurrentUser, Roles, Public)
│   ├── dto/ (pagination, error response)
│   ├── errors/ (business errors, domain errors)
│   ├── exceptions/ (custom exceptions)
│   ├── filters/ (all exceptions filter)
│   ├── guards/ (JWT, Roles, Merchant State, Throttler Tenant)
│   ├── interceptors/ (logging, performance, response)
│   ├── interfaces/ (request with user, webhook payload)
│   ├── locks/ (Redis distributed locks)
│   ├── outbox/ (event sourcing)
│   ├── pipes/ (validation pipes)
│   ├── services/ (translation, pagination, etc.)
│   ├── swagger/ (API documentation)
│   ├── utils/ (helpers)
│   └── validators/ (i18n validators)
├── config/ (database, redis configs)
├── modules/ (feature modules)
│   ├── products/ (منتجات)
│   │   ├── dto/ (create, update, get DTOs)
│   │   ├── enums/ (product enums)
│   │   ├── events/ (domain events)
│   │   ├── repositories/ (mongo + interface)
│   │   ├── schemas/ (mongoose schemas)
│   │   ├── services/ (commands, queries, media, sync, public)
│   │   ├── __tests__/ (unit + integration)
│   │   ├── types.ts
│   │   └── utils/ (cache keys, cron, helpers)
│   ├── categories/ (فئات المنتجات)
│   ├── orders/ (الطلبات)
│   ├── merchants/ (التجار)
│   ├── channels/ (قنوات التواصل)
│   ├── users/ (المستخدمين)
│   ├── analytics/ (التحليلات)
│   ├── webhooks/ (الويبهوكس)
│   ├── vector/ (البحث الدلالي)
│   └── [other modules]/
├── workers/ (background jobs)
├── main.ts (bootstrap)
└── polyfills.ts
```

### Frontend (React + Vite)

```
Frontend/src/
├── features/ (business features)
│   ├── products/ (منتجات)
│   ├── orders/ (طلبات)
│   ├── analytics/ (تحليلات)
│   └── [other features]/
├── shared/ (reusable components)
│   ├── ui/ (buttons, forms, etc.)
│   ├── lib/ (utilities, API client)
│   ├── hooks/ (custom hooks)
│   └── types/ (TypeScript types)
├── pages/ (route components)
├── components/ (global components)
└── [config files]
```

---

## 3) Imports & ترتيبها

- **ترتيب آلي**: **Node core** → **طرف خارجي** → **داخل المشروع** → **الأنماط/الأصول** (عبر eslint-plugin-import)
- **ممنوع `require`** في TypeScript؛ استخدم ESM/TS imports فقط
- **مسارات قصيرة** عبر `tsconfig-paths` (backend) و `vite tsconfig paths` (frontend)
- **Backend**: مسارات مطلقة مثل `@/modules/products/dto/create-product.dto`
- **Frontend**: مسارات مطلقة مثل `@/features/products/components/ProductList`
- **ممنوع default exports** في NestJS modules/services (استخدم named exports فقط)

---

## 4) الأخطاء والاستثناءات

- **فلاتر NestJS**: `AllExceptionsFilter` مخصص يُصدر شكل الخطأ الموحد مع **requestId**, **locale**, **business error codes**
- **Business Error Codes**: `PRODUCT_NOT_FOUND`, `INVALID_SLUG`, `FORBIDDEN_TENANT_ACCESS`, `MERCHANT_NOT_ACTIVE`
- **لا ترمِ `new Error()` عام**—استخدم **typed exceptions**:
  ```ts
  throw new NotFoundException({ code: 'PRODUCT_NOT_FOUND', message: 'المنتج غير موجود' })
  throw new ForbiddenException({ code: 'FORBIDDEN_TENANT_ACCESS', message: 'غير مسموح بالوصول' })
  ```
- **الرسائل قابلة للترجمة** عبر **I18nMessage** ولا تُسجّل نصوص حساسة
- **Business Errors Service**: للتحقق من صحة البيانات والأعمال

---

## 5) التسجيل والمراقبة (Logging & Observability)

- **Logger موحّد** (Pino) عبر `LoggingInterceptor`:
  - context, requestId, userId, merchantId, durationMs, endpoint, method
- **لا تسجّل payloads كاملة** لطلبات حساسة (auth tokens, personal data)
- **Metrics**: عدادات/هيستوجرام عبر **Prometheus**:
  - `mongodb_op_latency_ms_bucket` - زمن الاستعلامات
  - `cache_hits_total`, `cache_misses_total` - كفاءة الكاش
  - `qdrant_search_duration_ms` - أداء البحث الدلالي
  - **labels محدودة** لتجنب انفجار الكارديناليتي (merchantId فقط عند الضرورة)
- **Distributed Tracing**: عبر OpenTelemetry لتتبع العمليات المعقدة

---

## 6) الكاش والادخال/الاخراج

- **Cache keys**: `v1:{entity}:{scope}:${merchantId}:${hash}` (مثل `ProductsCacheKeys.list()`)
- **الكاش عبر Service واحدة** (`CacheService`) + **CacheWarmerOrchestrator** للتسخين التلقائي
- **Decorators**: `@CacheKey()`, `@CacheTTL()` للقراءة/التصفير التلقائي
- **I/O**: أي تعامل مع **MinIO/Qdrant/RabbitMQ** في service مع واجهة (interface) للـ mocking في الاختبارات
- **Event Sourcing**: `OutboxEvent` pattern للأحداث المضمونة التسليم

---

## 7) المراجعات (Code Reviews)

- PR صغير (< 400 سطر diff فعلي) + وصف واضح + لقطات/نتائج قبل/بعد عند الأداء
- قائمة فحص (Checklist):
  - [ ]  Tests مضافة/محدّثة
  - [ ]  DTO validation
  - [ ]  i18n keys
  - [ ]  لا يوجد `any` غير مبرّر
  - [ ]  القياسات/المراقبة (إذا لزم)
  - [ ]  توثيق endpoints (Swagger decorators)

---

## 8) معايير TypeScript

- **tsconfig.json**: `"strict": true`, `"noImplicitAny": false` (للمرونة)، `"exactOptionalPropertyTypes": true`
- **تفعيل**: `eslint@^9` + `typescript-eslint@^8` + `eslint-plugin-import` + `eslint-plugin-jest`
- **ESLint Config**: Flat config مع `projectService: true` للـ type checking
- **`prefer-readonly`** للخصائص/المعاملات الممكنة
- **لا تستخدم `Date.now()`** في مجال الأعمال، اعزل time provider لسهولة الاختبار
- **Utility Types**: استخدم `Partial<T>`, `Required<T>`, `Pick<T,K>`, `Omit<T,K>` بدلاً من any
- **Generic Constraints**: استخدم constraints للـ generics لضمان type safety

---

## 9) الأمن (Security)

- **عدم الوصول لمتغيرات البيئة** مباشرة في services (استخدم `ConfigService`)
- **Guards**: `JwtAuthGuard`, `RolesGuard`, `MerchantStateGuard`, `ServiceTokenGuard`
- **Webhook Security**: `WebhookSignatureGuard` للتحقق من تواقيع (WhatsApp Cloud, Telegram, Evolution)
- **CORS**: قائمة بيضاء للمنشأ مع **credentials** مفعل
- **Helmet + Rate limiting** لكل تاجر عبر `ThrottlerTenantGuard`
- **Input Sanitization**: تنقية مدخلات HTML عبر `class-sanitizer` أو مكتبة موثوقة
- **Content Security Policy**: لمنع XSS attacks
- **Trust Proxy**: مفعل لاستخراج IP الحقيقي خلف Cloudflare/Nginx

---

## 10) التوثيق (API Docs)

- **Swagger/OpenAPI** محدث مع **@nestjs/swagger** decorators
- **أمثلة responses** حقيقية + **pagination** & **cursor params**
- **API Response Types**: استخدم `@ApiResponse()` مع DTOs محددة
- **مستندات في `docs/`** ومرتبطة في README
- **Postman Collections**: تصدير تلقائي من Swagger
- **API Examples**: ملفات JSON في `docs/2-API Documentation/examples/`
- **Component Schemas**: ملفات YAML منفصلة للـ schemas المشتركة

## 11) الاختبارات (Testing)

- **Test Structure**: `describe` → `it` → `expect` (Jest + Supertest)
- **Test Files**: `*.spec.ts` أو `*.test.ts` في مجلد `__tests__`
- **Unit Tests**: للخدمات والوظائف المعزولة (mock dependencies)
- **Integration Tests**: للتدفق الكامل (controllers + services + DB)
- **E2E Tests**: للمسارات الكاملة (Frontend + Backend)
- **Test Database**: MongoDB Memory Server للاختبارات
- **Test Coverage**: > 80% للوحدات الحرجة
- **Test Data**: factories لإنشاء بيانات اختبار واقعية
- **Performance Tests**: k6 scripts لاختبار الحمل

## 12) الأداء (Performance)

- **Database Indexes**: محدثة حسب `INDEXING_STRATEGY.md`
- **Cache Strategy**: L1 (memory) + L2 (Redis) + L3 (application)
- **Query Optimization**: aggregation pipeline بدلاً من multiple queries
- **Pagination**: cursor-based للقوائم الكبيرة
- **Lazy Loading**: للصور والمحتوى الثقيل
- **CDN**: Cloudflare للأصول الثابتة
- **Compression**: gzip للاستجابات
- **Database Connection Pooling**: محدد حسب الحمل المتوقع

## 13) المراجعات (Code Reviews)

- **PR صغير** (< 400 سطر diff فعلي) + وصف واضح + لقطات/نتائج قبل/بعد عند الأداء
- **قائمة فحص**:
  - [X]  Tests مضافة/محدّثة (unit + integration)
  - [X]  DTO validation مع I18nMessage
  - [X]  i18n keys للرسائل
  - [X]  لا يوجد `any` غير مبرّر (استخدم generic types)
  - [X]  Error handling شامل (business codes + typed exceptions)
  - [X]  القياسات/المراقبة (إذا لزم)
  - [X]  توثيق endpoints (Swagger decorators)
  - [X]  Security checks (guards, input sanitization)
  - [X]  Performance considerations (indexes, caching)
  - [X]  Code style (ESLint, Prettier)

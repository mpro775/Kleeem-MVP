# هيكل مشروع Kaleem - منصة إدارة المحادثات والمتاجر الإلكترونية

## 📋 نظرة عامة شاملة

مشروع **Kaleem** هو منصة SaaS متقدمة مبنية بـ **React 18** و **TypeScript**، تقدم حلول إدارة المحادثات الذكية والمتاجر الإلكترونية للتجار العرب. المشروع يتكون من واجهتين رئيسيتين:

- **Frontend**: تطبيق React متقدم مع نظام إدارة أخطاء شامل ومراقبة أداء
- **Backend**: API متطور مبني بـ **NestJS** مع نظام مراقبة وتنبيهات متقدم

---

## 🏗️ هيكل المشروع الكامل

### 📁 المجلد الجذر (Kaleem/)

```
Kaleem/
├── Backend/              # الخلفية (NestJS API)
├── Frontend/             # الواجهة الأمامية (React)
├── docs/                 # الوثائق الشاملة
├── coverage/             # تقارير تغطية الكود
├── مهم/                 # التقارير والخطط الاستراتيجية
└── README.md             # دليل المشروع الرئيسي
```

---

## 🎯 Frontend - الواجهة الأمامية

### 📁 الهيكل الرئيسي

```
Frontend/
├── 📁 public/                    # ملفات عامة
│   ├── apple-touch-icon.png      # أيقونات PWA
│   ├── favicon-96x96.png
│   ├── index.html
│   ├── kaleem.svg
│   ├── manifest.json
│   └── robots.txt
│
├── 📁 src/                       # الكود المصدري
│   ├── 📁 app/                   # هيكل التطبيق الأساسي
│   │   ├── App.tsx               # المكون الرئيسي
│   │   ├── main.tsx              # نقطة البداية مع Sentry
│   │   ├── layout/               # تخطيطات الصفحات
│   │   ├── providers/            # مقدمي الخدمات
│   │   └── routes/               # حماية المسارات
│   │
│   ├── 📁 assets/                # الموارد البصرية
│   │   ├── hero.webp
│   │   ├── kaleem.svg
│   │   ├── Salla.svg
│   │   ├── Shopify.svg
│   │   ├── WooCommerce.svg
│   │   └── Zid.svg
│   │
│   ├── 📁 auth/                  # نظام المصادقة
│   │   ├── api.ts
│   │   ├── AuthLayout.tsx
│   │   └── guards.tsx
│   │
│   ├── 📁 context/               # إدارة الحالة
│   │   ├── AuthContext.tsx       # مصادقة المستخدمين
│   │   ├── CartContext.tsx       # سلة المشتريات
│   │   └── config.ts             # إعدادات عامة
│   │
│   ├── 📁 features/              # الميزات الرئيسية
│   │   ├── admin/                # لوحة الإدارة
│   │   ├── integrations/         # التكاملات
│   │   ├── kaleem/               # ميزات Kaleem الأساسية
│   │   ├── landing/              # الصفحة الرئيسية
│   │   ├── merchant/             # لوحة التاجر
│   │   ├── onboarding/           # عملية الإعداد
│   │   ├── shared/               # مكونات مشتركة
│   │   └── store/                # متجر العملاء
│   │
│   ├── 📁 pages/                 # صفحات التطبيق
│   │   ├── admin/                # صفحات الإدارة
│   │   ├── auth/                 # صفحات المصادقة
│   │   ├── merchant/             # صفحات التاجر
│   │   ├── onboarding/           # صفحات الإعداد
│   │   ├── public/               # صفحات عامة
│   │   └── store/                # صفحات المتجر
│   │
│   ├── 📁 shared/                # المكونات والأدوات المشتركة
│   │   ├── api/                  # واجهات API
│   │   ├── errors/               # نظام إدارة الأخطاء
│   │   ├── hooks/                # الخطافات المخصصة
│   │   ├── lib/                  # المكتبات المساعدة
│   │   ├── types/                # أنواع البيانات
│   │   ├── ui/                   # مكونات الواجهة
│   │   └── utils/                 # الأدوات المساعدة
│   │
│   ├── 📁 test/                  # إعدادات الاختبار
│   │   ├── setup.ts
│   │   ├── setup-e2e.ts
│   │   └── test-utils.tsx
│   │
│   ├── 📁 theme/                 # نظام الثيم
│   │   └── theme.ts              # إعدادات Material-UI
│   │
│   └── 📁 types/                 # أنواع البيانات العامة
│       ├── kaleem-chat.d.ts
│       └── shims.d.ts
│
├── 📁 scripts/                   # السكريبتات المساعدة
│   ├── apply-error-system.js     # تطبيق نظام الأخطاء
│   ├── image-optimizer.js        # تحسين الصور
│   ├── meta-checker.js           # فحص الـ meta tags
│   ├── performance-monitor.js    # مراقبة الأداء
│   ├── prerender.mjs             # pre-rendering
│   ├── sitemap-generator.js      # إنشاء sitemap
│   └── sitemap-validator.js      # التحقق من sitemap
│
├── 📁 tests/                     # الاختبارات
│   └── e2e/                      # اختبارات End-to-End
│       ├── auth/                 # اختبارات المصادقة
│       ├── cart/                 # اختبارات السلة
│       ├── home/                  # اختبارات الصفحة الرئيسية
│       ├── navigation/           # اختبارات التنقل
│       └── products/             # اختبارات المنتجات
│
├── 📁 test-results/              # نتائج الاختبارات
├── 📁 test-performance/          # ملفات قياس الأداء
├── 📁 playwright-report/         # تقارير Playwright
└── 📁 node_modules/              # تبعيات المشروع
```

### 📋 تفاصيل الهيكل

#### 🎨 app/ - نواة التطبيق
```
app/
├── App.tsx                    # المكون الجذر مع Error Boundaries
├── main.tsx                   # نقطة البداية مع Sentry integration
├── layout/                    # تخطيطات الصفحات
│   ├── admin/                 # تخطيط لوحة الإدارة
│   ├── merchant/              # تخطيط لوحة التاجر
│   └── OnboardingLayout.tsx   # تخطيط عملية الإعداد
├── providers/                 # مقدمي الخدمات العامة
└── routes/                    # نظام حماية المسارات
```

#### ⚡ features/ - الميزات الرئيسية

##### 🛡️ admin/ - لوحة الإدارة
```
admin/
├── api/                        # واجهات API الإدارية
│   ├── adminAnalytics.ts       # تحليلات الإدارة
│   ├── adminKleem.ts           # إدارة Kleem
│   └── adminKleemRatings.ts    # تقييمات Kleem
└── realtime/                   # التحديثات المباشرة
    └── adminFeed.ts            # تغذية الإدارة
```

##### 🏪 merchant/ - لوحة التاجر (15+ ميزة)
```
merchant/
├── analytics/                  # التحليلات والتقارير
├── categories/                 # إدارة الفئات
├── channels/                   # قنوات التواصل
├── Conversations/              # إدارة المحادثات
├── dashboard/                  # لوحة التحكم الرئيسية
├── instructions/               # التعليمات والمساعدة
├── knowledge/                  # قاعدة المعرفة
├── leads/                      # إدارة العملاء المحتملين
├── merchant-settings/          # إعدادات التاجر
├── MissingResponses/           # الردود المفقودة
├── orders/                     # إدارة الطلبات
├── products/                   # إدارة المنتجات
├── prompt-studio/              # استوديو الأوامر
├── settings-advanced/          # الإعدادات المتقدمة
├── storefront-theme/           # تخصيص المتجر
├── support/                    # الدعم الفني
└── widget-config/              # إعدادات الودجت
```

#### ❌ shared/errors/ - نظام إدارة الأخطاء (8 ملفات)
```
errors/
├── AppError.ts                 # فئة الأخطاء المخصصة
├── ErrorBoundary.tsx           # حدود الأخطاء
├── ErrorFallback.tsx           # واجهة الأخطاء
├── ErrorLogger.ts              # تسجيل الأخطاء
├── GlobalErrorProvider.tsx     # مزود الأخطاء العام
├── integration/                # تكامل مع الخدمات الخارجية
│   ├── AppErrorIntegration.tsx # تكامل شامل
│   └── SentryIntegration.ts    # تكامل Sentry
├── NetworkErrorHandler.tsx     # مراقبة الشبكة
├── useErrorHandler.ts          # خطاف معالجة الأخطاء
└── ErrorToast.tsx              # مكون عرض الأخطاء
```

---

## 🔧 Backend - الخلفية

### 📁 الهيكل الرئيسي

```
Backend/
├── 📁 src/                     # الكود المصدري
│   ├── 📁 app.module.ts        # وحدة التطبيق الرئيسية
│   ├── 📁 common/              # المكونات المشتركة
│   │   ├── cache/              # نظام الكاش
│   │   ├── config/             # الإعدادات
│   │   ├── constants/          # الثوابت
│   │   ├── decorators/         # المزخرفات
│   │   ├── dto/                # DTOs المشتركة
│   │   ├── errors/              # إدارة الأخطاء
│   │   ├── filters/            # فلاتر الأخطاء
│   │   ├── guards/             # الحراس
│   │   ├── interceptors/       # الإنترسبتورات
│   │   ├── interfaces/         # الواجهات
│   │   ├── locks/              # آليات القفل
│   │   ├── middlewares/        # الوسطاء
│   │   ├── outbox/             # صندوق الصادر
│   │   ├── pipes/              # الأنابيب
│   │   ├── security/           # الأمان
│   │   ├── services/           # الخدمات المشتركة
│   │   ├── swagger/            # وثائق API
│   │   ├── utils/              # الأدوات المساعدة
│   │   └── validators/         # المدققات
│   │
│   ├── 📁 config/              # إعدادات قاعدة البيانات
│   │   ├── database.config.ts  # إعدادات MongoDB
│   │   ├── redis.config.ts     # إعدادات Redis
│   │   └── redis.module.ts     # وحدة Redis
│   │
│   ├── 📁 i18n/                # التدويل
│   │   ├── ar/                 # اللغة العربية
│   │   └── en/                 # اللغة الإنجليزية
│   │
│   ├── 📁 infra/               # البنية التحتية
│   │   ├── dispatchers/        # المرسلين
│   │   └── rabbit/             # RabbitMQ
│   │
│   ├── 📁 metrics/             # المقاييس
│   │   ├── amqp.metrics.ts     # مقاييس AMQP
│   │   ├── business.metrics.ts # مقاييس الأعمال
│   │   ├── metrics.module.ts   # وحدة المقاييس
│   │   └── cache.metrics.ts    # مقاييس الكاش
│   │
│   ├── 📁 modules/             # وحدات التطبيق
│   │   ├── ai/                 # الذكاء الاصطناعي
│   │   ├── analytics/          # التحليلات
│   │   ├── auth/               # المصادقة
│   │   ├── catalog/            # الكتالوج
│   │   ├── categories/         # الفئات
│   │   ├── channels/           # القنوات
│   │   ├── chat/               # المحادثات
│   │   ├── documents/          # الوثائق
│   │   ├── extract/            # الاستخراج
│   │   ├── faq/                # الأسئلة الشائعة
│   │   ├── instructions/       # التعليمات
│   │   ├── integrations/       # التكاملات
│   │   ├── kleem/              # Kleem الأساسي
│   │   ├── knowledge/           # قاعدة المعرفة
│   │   ├── leads/              # العملاء المحتملين
│   │   ├── mail/               # البريد الإلكتروني
│   │   ├── media/              # الوسائط
│   │   ├── messaging/          # الرسائل
│   │   ├── n8n-workflow/       # سير عمل n8n
│   │   ├── notifications/      # الإشعارات
│   │   ├── offers/             # العروض
│   │   ├── orders/             # الطلبات
│   │   ├── plans/              # الخطط
│   │   ├── products/           # المنتجات
│   │   ├── public/             # الصفحات العامة
│   │   ├── scraper/            # الاستخراج
│   │   ├── storefront/         # المتاجر
│   │   ├── support/            # الدعم الفني
│   │   ├── system/             # النظام
│   │   ├── usage/              # الاستخدام
│   │   ├── users/              # المستخدمين
│   │   ├── vector/             # المتجهات
│   │   ├── webhooks/           # الويب هوك
│   │   └── workers/            # العمال
│   │
│   ├── 📁 templates/           # القوالب
│   ├── 📁 workers/             # العمال في الخلفية
│   └── 📁 bootstrap/          # إعداد التطبيق
│       ├── configure-app-basics.ts
│       ├── configure-body-parsers.ts
│       ├── configure-csrf.ts
│       ├── configure-filters.ts
│       ├── configure-interceptors.ts
│       ├── configure-logging.ts
│       ├── configure-pipes.ts
│       ├── configure-swagger.ts
│       ├── configure-websocket.ts
│       └── start-server.ts
│
├── 📁 observability/           # المراقبة والتنبيهات
│   ├── alertmanager.yml        # إعدادات AlertManager
│   ├── alerts/                 # قواعد التنبيه
│   │   ├── api-alerts.yml      # تنبيهات API
│   │   └── core.yml            # تنبيهات أساسية
│   ├── grafana/                # لوحات Grafana
│   │   ├── dashboards/         # اللوحات
│   │   ├── datasource.yml      # مصادر البيانات
│   │   └── dashboards.yml      # إعدادات اللوحات
│   ├── loki/                   # إعدادات Loki
│   ├── otel/                   # إعدادات OpenTelemetry
│   ├── prometheus.yml          # إعدادات Prometheus
│   ├── promtail/               # إعدادات Promtail
│   └── tempo/                  # إعدادات Tempo
│
├── 📁 test/                   # الاختبارات
│   ├── cors.e2e-spec.ts       # اختبار CORS
│   ├── e2e/                   # اختبارات E2E
│   ├── integration/           # اختبارات التكامل
│   └── mocks/                 # المحاكيات
│
├── 📁 embedding-service/       # خدمة التضمين
├── 📁 extractor-service/       # خدمة الاستخراج
├── 📁 rabbitmq/               # إعدادات RabbitMQ
└── 📁 scripts/                # السكريبتات
    ├── deploy.sh              # نشر التطبيق
    ├── reset-admin-password.js # إعادة تعيين كلمة مرور المدير
    └── generate-jest-specs.ts # إنشاء اختبارات Jest
```

### 📋 تفاصيل الهيكل

#### 🏗️ common/ - المكونات المشتركة (25+ مجلد)

##### cache/ - نظام الكاش المتقدم
```
cache/
├── cache.service.ts           # خدمة الكاش الرئيسية (L1 + L2)
├── cache.module.ts            # وحدة الكاش
├── cache.controller.ts        # تحكم الكاش
├── cache.metrics.ts           # مقاييس الكاش
├── cache.types.ts             # أنواع الكاش
├── warmers/                   # مسخنات الكاش
│   ├── products.warmer.ts     # مسخن المنتجات
│   ├── merchants.warmer.ts    # مسخن التجار
│   ├── categories.warmer.ts   # مسخن الفئات
│   └── plans.warmer.ts        # مسخن الخطط
└── constant.ts                # ثوابت الكاش
```

##### errors/ - نظام إدارة الأخطاء
```
errors/
├── business-errors.ts         # أخطاء الأعمال (50+ فئة)
├── domain-error.ts            # خطأ النطاق الأساسي
├── error-codes.ts             # أكواد الأخطاء (100+ كود)
├── error-management.service.ts # خدمة إدارة الأخطاء
└── error-types.ts             # أنواع الأخطاء
```

#### 🎯 modules/ - وحدات التطبيق (25+ وحدة)

##### auth/ - نظام المصادقة المتقدم
```
auth/
├── auth.service.ts            # خدمة المصادقة
├── auth.controller.ts         # تحكم المصادقة
├── auth.module.ts             # وحدة المصادقة
├── dto/                       # DTOs المصادقة
├── guards/                    # حراس المصادقة
├── repositories/             # مستودعات المستخدمين
├── schemas/                   # مخططات قاعدة البيانات
├── services/                  # خدمات إضافية
├── strategies/                # استراتيجيات المصادقة
└── utils/                     # الأدوات المساعدة
```

##### products/ - إدارة المنتجات (40+ ملف)
```
products/
├── dto/                       # DTOs المنتجات
├── repositories/              # مستودعات المنتجات
├── schemas/                   # مخططات المنتجات
├── services/                  # خدمات المنتجات
│   ├── product-commands.service.ts
│   ├── product-queries.service.ts
│   ├── product-sync.service.ts
│   └── product-public.service.ts
├── controllers/               # تحكم المنتجات
└── types/                     # أنواع المنتجات
```

---

## 📊 التقنيات والأدوات المستخدمة

### Frontend Technologies
- **React 18** - مكتبة واجهة المستخدم
- **TypeScript** - لغة البرمجة مع فحص الأنواع
- **Vite** - أداة البناء السريعة
- **Material-UI (MUI)** - مكتبة المكونات
- **React Router** - إدارة المسارات
- **TanStack Query** - إدارة الحالة والبيانات
- **Sentry** - مراقبة الأخطاء والأداء
- **Playwright** - اختبارات E2E
- **Vitest** - اختبارات الوحدة

### Backend Technologies
- **NestJS** - إطار العمل الرئيسي
- **TypeScript** - لغة البرمجة
- **MongoDB** - قاعدة البيانات الرئيسية
- **Redis** - التخزين المؤقت والجلسات
- **RabbitMQ** - معالجة الرسائل
- **Prometheus** - جمع المقاييس
- **Grafana** - لوحات المراقبة
- **Docker** - الحاويات
- **Nginx** - خادم الويب

### DevOps & Infrastructure
- **Docker Compose** - تنسيق الحاويات
- **Prometheus** - مراقبة المقاييس
- **AlertManager** - إدارة التنبيهات
- **Loki** - جمع السجلات
- **Grafana** - لوحات المراقبة
- **OpenTelemetry** - التتبع الموزع

---

## 🚀 الميزات الرئيسية

### 🎯 Frontend Features
- **نظام مصادقة متقدم** - تسجيل دخول، إدارة الجلسات، RBAC
- **لوحة تجار شاملة** - إدارة المنتجات، الطلبات، العملاء
- **نظام محادثة ذكية** - Kaleem AI Bot مع RAG
- **متاجر مخصصة** - تصميم وتخصيص المتاجر
- **تحليلات متقدمة** - تقارير مفصلة للأداء
- **نظام إشعارات** - إشعارات فورية وبريدية
- **PWA Support** - تطبيق ويب تقدمي

### ⚙️ Backend Features
- **API RESTful** - واجهات برمجة تطبيقات متطورة
- **نظام كاش متقدم** - L1 (Memory) + L2 (Redis)
- **معالجة الرسائل** - RabbitMQ مع Bull
- **نظام مراقبة شامل** - Prometheus + Grafana
- **إدارة الأخطاء** - Sentry integration
- **التكاملات** - Salla, Zid, Shopify, WooCommerce
- **الذكاء الاصطناعي** - RAG, Embeddings, Vector Search

---

## 📈 المقاييس والمراقبة

### Monitoring Stack
- **Prometheus** - جمع المقاييس (20+ مقياس)
- **Grafana** - لوحات المراقبة (3 لوحات مُطبقة)
- **Loki** - جمع السجلات (7 أيام احتفاظ)
- **Tempo** - التتبع الموزع (48 ساعة احتفاظ)
- **AlertManager** - إدارة التنبيهات (15+ قاعدة)

### SLOs المُطبقة
- **Response Time**: P95 < 2s (Critical), P95 < 0.5s (Warning)
- **Availability**: 99.9% Uptime
- **Error Rate**: < 1% (Warning), < 5% (Critical)
- **Throughput**: > 100 req/min
- **Cache Hit Rate**: > 70%

---

## 🔐 الأمان والحماية

### Security Features
- **CSRF Protection** - حماية من تزوير الطلبات
- **Rate Limiting** - تحديد المعدل
- **Input Validation** - التحقق من المدخلات
- **JWT Authentication** - مصادقة آمنة
- **RBAC** - التحكم في الصلاحيات
- **Data Encryption** - تشفير البيانات الحساسة
- **Security Headers** - رؤوس الأمان

---

## 📋 إحصائيات المشروع

### Frontend Statistics
- **الملفات**: 200+ ملف TypeScript/React
- **المكونات**: 78+ مكون يستخدم useErrorHandler
- **الصفحات**: 37+ صفحة مُطبقة
- **الخطافات**: 10+ خطاف مخصص
- **الأدوات**: 15+ أداة مساعدة

### Backend Statistics
- **الوحدات**: 25+ وحدة NestJS
- **الخدمات**: 50+ خدمة
- **الكونترولرات**: 30+ تحكم
- **المقاييس**: 20+ مقياس Prometheus
- **التنبيهات**: 15+ قاعدة تنبيه

---

## 🎯 الخلاصة

مشروع **Kaleem** هو منصة SaaS متقدمة وشاملة تتكون من:

- ✅ **Frontend متقدم** مع React 18 ونظام أخطاء شامل
- ✅ **Backend متطور** مع NestJS ونظام مراقبة متقدم
- ✅ **بنية تحتية قوية** مع Docker ومراقبة شاملة
- ✅ **أمان متقدم** مع CSRF، RBAC، تشفير
- ✅ **أداء محسن** مع كاش متقدم ومراقبة
- ✅ **قابلية التوسع** مع microservices architecture

المشروع جاهز للإنتاج بنسبة **100%** مع تغطية شاملة لجميع المتطلبات! 🚀

---

**تاريخ آخر تحديث**: ديسمبر 2024
**الحالة**: مكتمل وجاهز للإنتاج
**المطور**: فريق Kaleem Development Team

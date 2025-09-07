# هيكل مشروع Kaleem Frontend

## نظرة عامة

مشروع React/TypeScript لتطبيق Kaleem - منصة إدارة المحادثات والمتاجر الإلكترونية.

## هيكل المجلدات الرئيسية

### 📁 الجذر

```
Front-end/
├── dist/                    # ملفات البناء النهائية
├── node_modules/           # تبعيات المشروع
├── public/                 # ملفات عامة (أيقونات، صور)
├── scripts/                # سكريبتات مساعدة
├── src/                    # الكود المصدري الرئيسي
├── tests/                  # اختبارات E2E
├── test-results/           # نتائج الاختبارات
├── test-performance/       # ملفات قياس الأداء
├── playwright-report/      # تقارير Playwright
└── ملفات التكوين
```

### 📁 src/ - الكود المصدري

#### 🏗️ app/ - هيكل التطبيق الأساسي

```
app/
├── App.tsx                 # المكون الرئيسي
├── main.tsx               # نقطة البداية
├── layout/                # تخطيطات الصفحات
│   ├── admin/             # تخطيط لوحة الإدارة
│   ├── merchant/          # تخطيط لوحة التاجر
│   └── OnboardingLayout.tsx
├── providers/             # مقدمي الخدمات
└── routes/                # حماية المسارات
```

#### 🎨 assets/ - الموارد

```
assets/
├── hero.webp              # صور البطل
├── kaleem.svg             # شعار Kaleem
├── Salla.svg              # شعارات المنصات
├── Shopify.svg
├── WooCommerce.svg
└── Zid.svg
```

#### 🔐 auth/ - المصادقة

```
auth/
├── api.ts                 # واجهات API للمصادقة
├── AuthLayout.tsx         # تخطيط صفحات المصادقة
├── guards.tsx             # حماية المسارات
└── type.ts               # أنواع البيانات
```

#### 🌐 context/ - السياق العام

```
context/
├── AuthContext.tsx        # سياق المصادقة
├── CartContext.tsx        # سياق السلة
├── config.ts             # إعدادات عامة
└── types.ts              # أنواع البيانات
```

#### ⚡ features/ - الميزات الرئيسية

##### 🛡️ admin/ - لوحة الإدارة

```
admin/
├── api/                   # واجهات API للإدارة
│   ├── adminAnalytics.ts
│   ├── adminKleem.ts
│   └── adminKleemRatings.ts
└── realtime/              # التحديثات المباشرة
    └── adminFeed.ts
```

##### 🔗 integrations/ - التكاملات

```
integrations/
└── api/
    ├── catalogApi.ts
    └── integrationsApi.ts
```

##### 🤖 kaleem/ - ميزات Kaleem الأساسية

```
kaleem/
├── api.ts
├── axios.ts
├── helper.ts
└── type.ts
```

##### 🏠 landing/ - الصفحة الرئيسية

```
landing/
├── chatKaleem/            # نظام المحادثة
│   ├── hooks/             # خطافات المحادثة
│   ├── ui/                # واجهات المحادثة
│   └── LiveChat.tsx
├── contact/               # صفحة التواصل
├── data/                  # بيانات ثابتة
├── hooks/                 # خطافات الحركة
├── sections/              # أقسام الصفحة
├── seo/                   # تحسين محركات البحث
└── ui/                    # مكونات الواجهة
```

##### 🏪 merchant/ - لوحة التاجر

```
merchant/
├── analytics/             # التحليلات
├── categories/            # إدارة الفئات
├── channels/              # قنوات التواصل
├── Conversations/         # إدارة المحادثات
├── dashboard/             # لوحة التحكم
├── instructions/          # التعليمات
├── knowledge/             # قاعدة المعرفة
├── leads/                 # إدارة العملاء المحتملين
├── merchant-settings/     # إعدادات التاجر
├── MissingResponses/      # الردود المفقودة
├── orders/                # إدارة الطلبات
├── products/              # إدارة المنتجات
├── prompt-studio/         # استوديو الأوامر
├── settings-advanced/     # الإعدادات المتقدمة
├── storefront-theme/      # تخصيص المتجر
├── support/               # الدعم الفني
└── widget-config/         # إعدادات الودجت
```

##### 🚀 onboarding/ - عملية الإعداد الأولي

```
onboarding/
├── api.ts
└── constants.ts
```

##### 🔄 shared/ - المكونات المشتركة

```
shared/
├── allowedBrandPalette.ts
├── brandCss.ts
├── brandPalette.ts
└── ReadOnlySlugCard.tsx
```

##### 🛒 store/ - متجر العملاء

```
store/
├── about/                 # صفحة من نحن
├── home/                  # الصفحة الرئيسية للمتجر
├── order/                 # تفاصيل الطلب
├── product/               # تفاصيل المنتج
├── ui/                    # مكونات المتجر
├── api.ts
└── type.ts
```

#### 📄 pages/ - صفحات التطبيق

##### 👨‍💼 admin/ - صفحات الإدارة

```
admin/kleem/
├── AnalyticsPage.tsx
├── ChatSettingsPage.tsx
├── ConversationsPage.tsx
├── Dashboard.tsx
├── KleemMissingResponsesPage.tsx
├── KleemRatingsPage.tsx
├── KnowledgeBasePage.tsx
└── PromptsPage.tsx
```

##### 🔐 auth/ - صفحات المصادقة

```
auth/
├── ForgotPasswordPage.tsx
├── LoginPage.tsx
├── ResetPasswordPage.tsx
├── SignUpPage.tsx
└── VerifyEmailPage.tsx
```

##### 🏪 merchant/ - صفحات التاجر

```
merchant/
├── AnalyticsPage.tsx
├── BannersManagementPage.tsx
├── CategoriesPage.tsx
├── ChannelsIntegrationPage.tsx
├── ChatSettingsPage.tsx
├── ConversationsPage.tsx
├── Dashboard.tsx
├── InstructionsPage.tsx
├── KnowledgePage.tsx
├── LeadsManagerPage.tsx
├── MerchantSettingsPage.tsx
├── MissingResponsesPage.tsx
├── OrdersPage.tsx
├── ProductsPage.tsx
├── PromptStudio.tsx
├── SettingsAdvancedPage.tsx
├── StorefrontThemePage.tsx
└── SupportCenterPage.tsx
```

##### 🚀 onboarding/ - صفحات الإعداد

```
onboarding/
├── OnboardingPage.tsx
├── SourceSelectPage.tsx
└── SyncPage.tsx
```

##### 🌐 public/ - الصفحات العامة

```
public/
├── Contact.tsx
└── Home.tsx
```

##### 🛒 store/ - صفحات المتجر

```
store/
├── AboutPage.tsx
├── MyOrdersPage.tsx
├── OrderDetailsPage.tsx
├── ProductDetailsPage.tsx
└── StorePage.tsx
```

#### 🔧 shared/ - المكونات والأدوات المشتركة

##### 🌐 api/ - واجهات API

```
api/
└── axios.ts
```

##### ❌ errors/ - إدارة الأخطاء

```
errors/
├── __tests__/
├── AppError.ts
├── ErrorBoundary.tsx
├── ErrorFallback.tsx
├── ErrorLogger.ts
├── GlobalErrorProvider.tsx
├── integration/
├── NetworkErrorHandler.tsx
├── sentry.config.ts
├── SentryIntegration.ts
└── useErrorHandler.ts
```

##### 🪝 hooks/ - الخطافات المخصصة

```
hooks/
├── useAdminNotifications.ts
├── useLocalStorage.ts
└── useStoreServicesFlag.ts
```

##### 📚 lib/ - المكتبات المساعدة

```
lib/
├── errors.ts
└── NetworkBanner.tsx
```

##### 🏷️ types/ - أنواع البيانات

```
types/
└── notification.ts
```

##### 🎨 ui/ - مكونات الواجهة

```
ui/
├── GradientIcon.tsx
├── OtpInputBoxes.tsx
├── SafeText.tsx
├── SetupChecklist.tsx
└── TagsInput.tsx
```

##### 🛠️ utils/ - الأدوات المساعدة

```
utils/
├── assets.ts
├── customer.ts
├── error.ts
├── formatText.ts
├── ids.ts
├── money.ts
├── render.ts
├── session.ts
└── text.ts
```

#### 🧪 test/ - إعدادات الاختبار

```
test/
├── setup-e2e.ts
├── setup.ts
├── test-utils.tsx
└── testServer.ts
```

#### 🎨 theme/ - الثيم

```
theme/
└── theme.ts
```

#### 📝 types/ - أنواع البيانات العامة

```
types/
├── kaleem-chat.d.ts
└── shims.d.ts
```

### 📁 tests/ - الاختبارات

```
tests/e2e/
├── auth/                   # اختبارات المصادقة
├── cart/                   # اختبارات السلة
├── home/                   # اختبارات الصفحة الرئيسية
├── navigation/             # اختبارات التنقل
├── products/               # اختبارات المنتجات
└── README.md
```

### 📁 scripts/ - السكريبتات المساعدة

```
scripts/
├── apply-error-system.js
├── image-optimizer.js
├── meta-checker.js
├── performance-monitor.js
├── prerender.mjs
├── sitemap-generator.js
└── sitemap-validator.js
```

## ملفات التكوين الرئيسية

- `package.json` - تبعيات المشروع
- `vite.config.ts` - إعدادات Vite
- `tsconfig.json` - إعدادات TypeScript
- `eslint.config.js` - إعدادات ESLint
- `playwright.config.ts` - إعدادات Playwright
- `vitest.config.ts` - إعدادات Vitest
- `workbox.config.cjs` - إعدادات Service Worker

## التقنيات المستخدمة

- **React 18** - مكتبة واجهة المستخدم
- **TypeScript** - لغة البرمجة
- **Vite** - أداة البناء
- **React Router** - إدارة المسارات
- **TanStack Query** - إدارة الحالة والبيانات
- **Tailwind CSS** - تصميم الواجهة
- **Playwright** - اختبارات E2E
- **Vitest** - اختبارات الوحدة
- **Sentry** - مراقبة الأخطاء
- **PWA** - تطبيق ويب تقدمي

## هيكل البيانات

المشروع يستخدم:

- **Context API** لإدارة الحالة العامة
- **React Query** لإدارة بيانات الخادم
- **TypeScript** لضمان نوع البيانات
- **Error Boundaries** لإدارة الأخطاء
- **Service Workers** للتخزين المؤقت

---

_تم إنشاء هذا الملف تلقائياً - آخر تحديث: $(date)_

# توثيق المسارات (Routes Documentation)

## الدومين الأساسي
```
https://tan-herring-550165.hostingersite.com
```

---

## 1. المسارات العامة (Public Routes)

### 1.1 الصفحة الرئيسية
- **المسار**: `/`
- **URL الكامل**: `https://tan-herring-550165.hostingersite.com/`
- **المكون**: `Home`
- **الوصف**: الصفحة الرئيسية للتطبيق
- **الحماية**: غير محمي (عام)

### 1.2 تسجيل الدخول
- **المسار**: `/login`
- **URL الكامل**: `https://tan-herring-550165.hostingersite.com/login`
- **المكون**: `LoginPage`
- **الوصف**: صفحة تسجيل الدخول للمستخدمين
- **الحماية**: غير محمي (عام)

### 1.3 إنشاء حساب جديد
- **المسار**: `/signup`
- **URL الكامل**: `https://tan-herring-550165.hostingersite.com/signup`
- **المكون**: `SignUpPage`
- **الوصف**: صفحة إنشاء حساب جديد
- **الحماية**: غير محمي (عام)

### 1.4 التحقق من البريد الإلكتروني
- **المسار**: `/verify-email`
- **URL الكامل**: `https://tan-herring-550165.hostingersite.com/verify-email`
- **المكون**: `VerifyEmailPage`
- **الوصف**: صفحة التحقق من البريد الإلكتروني بعد التسجيل
- **الحماية**: غير محمي (عام)

### 1.5 صفحة الاتصال
- **المسار**: `/contact`
- **URL الكامل**: `https://tan-herring-550165.hostingersite.com/contact`
- **المكون**: `ContactPage`
- **الوصف**: صفحة الاتصال والدعم
- **الحماية**: غير محمي (عام)

### 1.6 صفحة اختبار الأخطاء
- **المسار**: `/error-test`
- **URL الكامل**: `https://tan-herring-550165.hostingersite.com/error-test`
- **المكون**: `ErrorTestPage`
- **الوصف**: صفحة لاختبار معالجة الأخطاء (للأغراض التطويرية)
- **الحماية**: غير محمي (عام)

---

## 2. متجر الواجهة الأمامية (Storefront Routes)

### 2.1 صفحة الدردشة
- **المسار**: `/chat/:slug`
- **URL الكامل**: `https://tan-herring-550165.hostingersite.com/chat/fatima-electronics`
- **المكون**: `ChatPage`
- **الوصف**: صفحة الدردشة التفاعلية للتاجر
- **المعاملات**: 
  - `slug` (string): معرف فريد للتاجر/المتجر
- **الحماية**: غير محمي (عام)

### 2.2 صفحة المتجر الرئيسية
- **المسار**: `/store/:slug`
- **URL الكامل**: `https://tan-herring-550165.hostingersite.com/store/demo`
- **المكون**: `StorePage`
- **الوصف**: الصفحة الرئيسية لمتجر التاجر
- **المعاملات**: 
  - `slug` (string): معرف فريد للمتجر
- **الحماية**: غير محمي (عام)

### 2.3 تفاصيل الطلب
- **المسار**: `/store/:slug/order/:orderId`
- **URL الكامل**: `https://tan-herring-550165.hostingersite.com/store/demo/order/{orderId}`
- **المكون**: `OrderDetailsPage`
- **الوصف**: صفحة عرض تفاصيل طلب معين
- **المعاملات**: 
  - `slug` (string): معرف فريد للمتجر
  - `orderId` (string): معرف الطلب
- **الحماية**: غير محمي (عام)

### 2.4 طلباتي
- **المسار**: `/store/:slug/my-orders`
- **URL الكامل**: `https://tan-herring-550165.hostingersite.com/store/demo/my-orders`
- **المكون**: `MyOrdersPage`
- **الوصف**: صفحة عرض جميع طلبات المستخدم
- **المعاملات**: 
  - `slug` (string): معرف فريد للمتجر
- **الحماية**: غير محمي (عام)

### 2.5 تفاصيل المنتج
- **المسار**: `/store/:slug/product/:idOrSlug`
- **URL الكامل**: `https://tan-herring-550165.hostingersite.com/store/demo/product/samsung-galaxy-s23`
- **المكون**: `ProductDetailsPageWithCart`
- **الوصف**: صفحة عرض تفاصيل منتج مع إمكانية إضافته للسلة
- **المعاملات**: 
  - `slug` (string): معرف فريد للمتجر
  - `idOrSlug` (string): معرف المنتج أو الرابط المختصر
- **الحماية**: غير محمي (عام)

### 2.6 صفحة من نحن
- **المسار**: `/store/:slug/about`
- **URL الكامل**: `https://tan-herring-550165.hostingersite.com/store/demo/about`
- **المكون**: `AboutPage`
- **الوصف**: صفحة معلومات عن المتجر/التاجر
- **المعاملات**: 
  - `slug` (string): معرف فريد للمتجر
- **الحماية**: غير محمي (عام)

---

## 3. مسارات الإعداد الأولي (Onboarding Routes)

جميع مسارات الإعداد الأولي محمية بـ `ProtectedRoute` وتتطلب تسجيل الدخول.

### 3.1 صفحة الإعداد الأولي الرئيسية
- **المسار**: `/onboarding`
- **URL الكامل**: `https://tan-herring-550165.hostingersite.com/onboarding`
- **المكون**: `OnboardingPage`
- **الوصف**: الصفحة الرئيسية لعملية الإعداد الأولي للتاجر الجديد
- **الحماية**: محمي (يتطلب تسجيل الدخول)

### 3.2 اختيار المصدر
- **المسار**: `/onboarding/source`
- **URL الكامل**: `https://tan-herring-550165.hostingersite.com/onboarding/source`
- **المكون**: `SourceSelectPage`
- **الوصف**: صفحة اختيار مصدر البيانات (مثل WooCommerce، Shopify، إلخ)
- **الحماية**: محمي (يتطلب تسجيل الدخول)

### 3.3 صفحة المزامنة
- **المسار**: `/onboarding/sync`
- **URL الكامل**: `https://tan-herring-550165.hostingersite.com/onboarding/sync`
- **المكون**: `SyncPage`
- **الوصف**: صفحة مزامنة البيانات من المصدر المختار
- **الحماية**: محمي (يتطلب تسجيل الدخول)

---

## 4. لوحة تحكم التاجر (Merchant Dashboard Routes)

جميع مسارات لوحة تحكم التاجر محمية بـ `ProtectedRoute` وتتطلب تسجيل الدخول. جميع المسارات الفرعية تبدأ من `/dashboard`.

### 4.1 لوحة التحكم الرئيسية
- **المسار**: `/dashboard`
- **البريد**:`merchant2@example.com`
- **كلمة المرور**:`12345678`
- **URL الكامل**: `https://tan-herring-550165.hostingersite.com/dashboard`
- **المكون**: `HomeDashboard`
- **الوصف**: الصفحة الرئيسية للوحة تحكم التاجر
- **الحماية**: محمي (يتطلب تسجيل الدخول)

### 4.2 المحادثات
- **المسار**: `/dashboard/conversations`
- **URL الكامل**: `https://tan-herring-550165.hostingersite.com/dashboard/conversations`
- **المكون**: `ConversationsPage`
- **الوصف**: صفحة إدارة المحادثات مع العملاء
- **الحماية**: محمي (يتطلب تسجيل الدخول)

### 4.3 المنتجات
- **المسار**: `/dashboard/products`
- **URL الكامل**: `https://tan-herring-550165.hostingersite.com/dashboard/products`
- **المكون**: `ProductsPage`
- **الوصف**: صفحة إدارة المنتجات
- **الحماية**: محمي (يتطلب تسجيل الدخول)

### 4.4 الكوبونات
- **المسار**: `/dashboard/coupons`
- **URL الكامل**: `https://tan-herring-550165.hostingersite.com/dashboard/coupons`
- **المكون**: `CouponsPage`
- **الوصف**: صفحة إدارة الكوبونات والخصومات
- **الحماية**: محمي (يتطلب تسجيل الدخول)

### 4.5 استوديو الـ Prompt
- **المسار**: `/dashboard/prompt`
- **URL الكامل**: `https://tan-herring-550165.hostingersite.com/dashboard/prompt`
- **المكون**: `PromptStudio`
- **الوصف**: صفحة تصميم وتعديل الـ Prompts للذكاء الاصطناعي
- **الحماية**: محمي (يتطلب تسجيل الدخول)

### 4.6 إعدادات الدردشة
- **المسار**: `/dashboard/chatsetting`
- **URL الكامل**: `https://tan-herring-550165.hostingersite.com/dashboard/chatsetting`
- **المكون**: `ChatSettingsPage`
- **الوصف**: صفحة إعدادات الدردشة والذكاء الاصطناعي
- **الحماية**: محمي (يتطلب تسجيل الدخول)

### 4.7 إدارة العملاء المحتملين
- **المسار**: `/dashboard/leads`
- **URL الكامل**: `https://tan-herring-550165.hostingersite.com/dashboard/leads`
- **المكون**: `LeadsManagerPage`
- **الوصف**: صفحة إدارة العملاء المحتملين (Leads)
- **الحماية**: محمي (يتطلب تسجيل الدخول)

### 4.8 العروض الترويجية
- **المسار**: `/dashboard/promotions`
- **URL الكامل**: `https://tan-herring-550165.hostingersite.com/dashboard/promotions`
- **المكون**: `PromotionsPage`
- **الوصف**: صفحة إدارة العروض الترويجية
- **الحماية**: محمي (يتطلب تسجيل الدخول)

### 4.9 مركز الدعم
- **المسار**: `/dashboard/support`
- **URL الكامل**: `https://tan-herring-550165.hostingersite.com/dashboard/support`
- **المكون**: `SupportPage`
- **الوصف**: صفحة مركز الدعم والمساعدة
- **الحماية**: محمي (يتطلب تسجيل الدخول)

### 4.10 الفئات
- **المسار**: `/dashboard/categories`
- **URL الكامل**: `https://tan-herring-550165.hostingersite.com/dashboard/categories`
- **المكون**: `CategoriesPage`
- **الوصف**: صفحة إدارة فئات المنتجات
- **الحماية**: محمي (يتطلب تسجيل الدخول)

### 4.11 إعدادات الحساب
- **المسار**: `/dashboard/setting`
- **URL الكامل**: `https://tan-herring-550165.hostingersite.com/dashboard/setting`
- **المكون**: `AccountSettingsPage`
- **الوصف**: صفحة إعدادات الحساب المتقدمة
- **الحماية**: محمي (يتطلب تسجيل الدخول)

### 4.12 الطلبات
- **المسار**: `/dashboard/orders`
- **URL الكامل**: `https://tan-herring-550165.hostingersite.com/dashboard/orders`
- **المكون**: `OrdersPage`
- **الوصف**: صفحة إدارة الطلبات
- **الحماية**: محمي (يتطلب تسجيل الدخول)

### 4.13 إدارة البنرات
- **المسار**: `/dashboard/banners`
- **URL الكامل**: `https://tan-herring-550165.hostingersite.com/dashboard/banners`
- **المكون**: `BannersManagementPage`
- **الوصف**: صفحة إدارة البنرات الإعلانية
- **الحماية**: محمي (يتطلب تسجيل الدخول)

### 4.14 تكامل القنوات
- **المسار**: `/dashboard/channels`
- **URL الكامل**: `https://tan-herring-550165.hostingersite.com/dashboard/channels`
- **المكون**: `ChannelsIntegrationPage`
- **الوصف**: صفحة إدارة تكامل القنوات (مثل WhatsApp، Telegram، إلخ)
- **الحماية**: محمي (يتطلب تسجيل الدخول)

### 4.15 معلومات التاجر
- **المسار**: `/dashboard/marchinfo`
- **URL الكامل**: `https://tan-herring-550165.hostingersite.com/dashboard/marchinfo`
- **المكون**: `MerchantSettingsPage`
- **الوصف**: صفحة إعدادات معلومات التاجر الأساسية
- **الحماية**: محمي (يتطلب تسجيل الدخول)

### 4.16 سمة المتجر
- **المسار**: `/dashboard/storefront-theme`
- **URL الكامل**: `https://tan-herring-550165.hostingersite.com/dashboard/storefront-theme`
- **المكون**: `StorefrontThemePage`
- **الوصف**: صفحة تخصيص سمة ومظهر المتجر
- **الحماية**: محمي (يتطلب تسجيل الدخول)

### 4.17 قاعدة المعرفة
- **المسار**: `/dashboard/knowledge`
- **URL الكامل**: `https://tan-herring-550165.hostingersite.com/dashboard/knowledge`
- **المكون**: `KnowledgePage`
- **الوصف**: صفحة إدارة قاعدة المعرفة للذكاء الاصطناعي
- **الحماية**: محمي (يتطلب تسجيل الدخول)

### 4.18 التعليمات
- **المسار**: `/dashboard/instructions`
- **URL الكامل**: `https://tan-herring-550165.hostingersite.com/dashboard/instructions`
- **المكون**: `InstructionsPage`
- **الوصف**: صفحة التعليمات والإرشادات
- **الحماية**: محمي (يتطلب تسجيل الدخول)

### 4.19 الردود المفقودة
- **المسار**: `/dashboard/missing-responses`
- **URL الكامل**: `https://tan-herring-550165.hostingersite.com/dashboard/missing-responses`
- **المكون**: `MissingResponsesPage`
- **الوصف**: صفحة عرض الردود المفقودة التي لم يتمكن الذكاء الاصطناعي من الإجابة عليها
- **الحماية**: محمي (يتطلب تسجيل الدخول)

### 4.20 التحليلات
- **المسار**: `/dashboard/analytics`
- **URL الكامل**: `https://tan-herring-550165.hostingersite.com/dashboard/analytics`
- **المكون**: `AnalyticsPage`
- **الوصف**: صفحة التحليلات والإحصائيات للتاجر
- **الحماية**: محمي (يتطلب تسجيل الدخول)

---

## 5. لوحة تحكم الإدارة (Admin/Kleem Routes)

جميع مسارات لوحة تحكم الإدارة محمية بـ `RoleRoute` مع صلاحية `ADMIN` فقط. جميع المسارات الفرعية تبدأ من `/admin/kleem`.

### 5.1 لوحة التحكم الرئيسية للإدارة
- **المسار**: `/admin/kleem`
- **البريد**:`admin@kaleem.com`
- **كلمة المرور**:`12345678`
- **URL الكامل**: `https://tan-herring-550165.hostingersite.com/admin/kleem`
- **المكون**: `KleemDashboard`

- **الوصف**: الصفحة الرئيسية للوحة تحكم إدارة Kleem
- **الحماية**: محمي (يتطلب صلاحية ADMIN)

### 5.2 الـ Prompts
- **المسار**: `/admin/kleem/prompts`
- **URL الكامل**: `https://tan-herring-550165.hostingersite.com/admin/kleem/prompts`
- **المكون**: `PromptsPage`
- **الوصف**: صفحة إدارة الـ Prompts على مستوى النظام
- **الحماية**: محمي (يتطلب صلاحية ADMIN)

### 5.3 قاعدة المعرفة
- **المسار**: `/admin/kleem/knowledge-base`
- **URL الكامل**: `https://tan-herring-550165.hostingersite.com/admin/kleem/knowledge-base`
- **المكون**: `KnowledgeBasePage`
- **الوصف**: صفحة إدارة قاعدة المعرفة على مستوى النظام
- **الحماية**: محمي (يتطلب صلاحية ADMIN)

### 5.4 المحادثات
- **المسار**: `/admin/kleem/conversations`
- **URL الكامل**: `https://tan-herring-550165.hostingersite.com/admin/kleem/conversations`
- **المكون**: `ConversationsKleemPage`
- **الوصف**: صفحة عرض جميع المحادثات على مستوى النظام
- **الحماية**: محمي (يتطلب صلاحية ADMIN)

### 5.5 عرض محادثة محددة
- **المسار**: `/admin/kleem/conversations/:sessionId`
- **URL الكامل**: `https://tan-herring-550165.hostingersite.com/admin/kleem/conversations/{sessionId}`
- **المكون**: `ConversationView`
- **الوصف**: صفحة عرض تفاصيل محادثة محددة
- **المعاملات**: 
  - `sessionId` (string): معرف جلسة المحادثة
- **الحماية**: محمي (يتطلب صلاحية ADMIN)

### 5.6 إعدادات الدردشة (الإدارة)
- **المسار**: `/admin/kleem/chat-settings`
- **URL الكامل**: `https://tan-herring-550165.hostingersite.com/admin/kleem/chat-settings`
- **المكون**: `ChatAdminSettingsPage`
- **الوصف**: صفحة إعدادات الدردشة على مستوى النظام
- **الحماية**: محمي (يتطلب صلاحية ADMIN)

### 5.7 الردود المفقودة (الإدارة)
- **المسار**: `/admin/kleem/missing-responses`
- **URL الكامل**: `https://tan-herring-550165.hostingersite.com/admin/kleem/missing-responses`
- **المكون**: `KleemMissingResponsesPage`
- **الوصف**: صفحة عرض الردود المفقودة على مستوى النظام
- **الحماية**: محمي (يتطلب صلاحية ADMIN)

### 5.8 التقييمات
- **المسار**: `/admin/kleem/ratings`
- **URL الكامل**: `https://tan-herring-550165.hostingersite.com/admin/kleem/ratings`
- **المكون**: `KleemRatingsPage`
- **الوصف**: صفحة عرض وإدارة تقييمات المستخدمين
- **الحماية**: محمي (يتطلب صلاحية ADMIN)

### 5.9 التحليلات (الإدارة)
- **المسار**: `/admin/kleem/analytics`
- **URL الكامل**: `https://tan-herring-550165.hostingersite.com/admin/kleem/analytics`
- **المكون**: `AnalyticsPageAdmin`
- **الوصف**: صفحة التحليلات والإحصائيات على مستوى النظام
- **الحماية**: محمي (يتطلب صلاحية ADMIN)

---

## 6. إعادة التوجيه (Redirects)

### 6.1 إعادة توجيه المسارات الإدارية القديمة
- **المسار**: `/admin/*`
- **URL الكامل**: `https://tan-herring-550165.hostingersite.com/admin/*`
- **الإجراء**: إعادة توجيه تلقائي إلى `/admin/kleem`
- **الوصف**: إعادة توجيه جميع المسارات الإدارية القديمة إلى المسار الجديد
- **الحماية**: غير محمي (عام)

---

## ملخص الحماية

### مسارات عامة (غير محمية)
- جميع المسارات العامة (`/`, `/login`, `/signup`, إلخ)
- جميع مسارات المتجر (`/store/*`, `/chat/*`)

### مسارات محمية (تتطلب تسجيل الدخول)
- جميع مسارات الإعداد الأولي (`/onboarding/*`)
- جميع مسارات لوحة تحكم التاجر (`/dashboard/*`)

### مسارات محمية بصلاحيات خاصة (تتطلب صلاحية ADMIN)
- جميع مسارات لوحة تحكم الإدارة (`/admin/kleem/*`)

---

## ملاحظات تقنية

1. **Lazy Loading**: جميع المكونات يتم تحميلها بشكل كسول (lazy loading) لتحسين الأداء
2. **Suspense**: يتم استخدام `Suspense` مع رسالة تحميل بالعربية "جارِ التحميل…"
3. **ProtectedRoute**: يستخدم لحماية المسارات التي تتطلب تسجيل الدخول
4. **RoleRoute**: يستخدم لحماية المسارات التي تتطلب صلاحيات محددة (مثل ADMIN)
5. **Dynamic Routes**: بعض المسارات تحتوي على معاملات ديناميكية (مثل `:slug`, `:orderId`)

---

## آخر تحديث
تم إنشاء هذا التوثيق بناءً على ملف `App.tsx` بتاريخ: 2024


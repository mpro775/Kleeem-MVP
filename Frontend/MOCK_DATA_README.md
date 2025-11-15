# نظام البيانات الوهمية للعرض والمراجعة

هذا النظام يساعدك في إنشاء بيانات وهمية تشبه البيانات الحقيقية تماماً لأغراض العرض والمراجعة والتطوير.

## 📁 الملفات المضافة

### 1. ملفات البيانات الوهمية (`data/`)
جميع ملفات JSON تحتوي على بيانات واقعية باللغة العربية:

- `mock-users.json` - بيانات المستخدمين (Admin, Merchant, Member)
- `mock-products.json` - بيانات المنتجات مع مواصفات كاملة
- `mock-conversations.json` - بيانات المحادثات والرسائل
- `mock-dashboard.json` - بيانات لوحة التحكم والإحصائيات
- `mock-categories.json` - بيانات الفئات (شجرة)
- `mock-orders.json` - بيانات الطلبات
- `mock-coupons.json` - بيانات الكوبونات
- `mock-channels.json` - بيانات القنوات المتصلة
- `mock-analytics.json` - بيانات التحليلات المتقدمة
- `mock-knowledge.json` - بيانات قاعدة المعرفة (FAQs, Documents, Links)
- `mock-merchant-settings.json` - بيانات إعدادات التاجر
- `mock-leads.json` - بيانات العملاء المحتملين
- `mock-leads-settings.json` - إعدادات جمع العملاء المحتملين
- `mock-instructions.json` - بيانات التعليمات
- `mock-missing-responses.json` - بيانات الردود المفقودة
- `mock-prompt-studio.json` - بيانات استوديو الـ Prompt
- `mock-promotions.json` - بيانات العروض الترويجية
- `mock-widget-config.json` - إعدادات الـ Widget
- `mock-storefront-theme.json` - بيانات مظهر المتجر
- `mock-integrations.json` - حالة التكاملات (Salla, Zid)
- `mock-kaleem-chat.json` - بيانات محادثة كليم
- `mock-contact-config.json` - إعدادات نموذج التواصل

### 2. خادم العرض التوضيحي (`src/mock-data/demo-server.ts`)
- خادم MSW محسن للتطوير والعرض
- يستخدم `setupWorker` من `msw/browser` للبيئة المتصفح
- يحاكي جميع endpoints الخلفية
- يدعم التصفح والفلترة
- محاكاة التأخير للواقعية

**ملاحظة مهمة**: يستخدم النظام `setupWorker` للبيئة المتصفح (Vite dev server)، بينما ملف `testServer.ts` يستخدم `setupServer` للاختبارات في Node.js.

### 3. نظام التفعيل (`src/mock-data/`)
- `index.ts` - ملف رئيسي لإدارة النظام
- `MockDataToggle.tsx` - مكون زر التفعيل في الواجهة

## 🚀 كيفية الاستخدام

### الطريقة 1: تفعيل عبر متغير البيئة

1. أنشئ ملف `.env` في مجلد `Frontend/`:
```bash
VITE_USE_MOCK_DATA=true
```

2. أعد تشغيل خادم التطوير:
```bash

```

### الطريقة 2: تفعيل عبر زر في الواجهة

1. أضف المكون في أي Layout:

**في MerchantLayout:**
```tsx
// src/app/layout/merchant/MerchantLayout.tsx
import { MockDataToggle } from "@/mock-data/MockDataToggle";

const MerchantLayout = () => {
  return (
    <>
      {/* ... باقي الكود ... */}
      <MockDataToggle /> {/* أضف هذا السطر */}
    </>
  );
};
```

**في AdminLayout:**
```tsx
// src/app/layout/admin/AdminLayout.tsx
import { MockDataToggle } from "@/mock-data/MockDataToggle";

const AdminLayout = () => {
  return (
    <>
      {/* ... باقي الكود ... */}
      <MockDataToggle /> {/* أضف هذا السطر */}
    </>
  );
};
```

**أو استخدام النسخة المبسطة في Toolbar:**
```tsx
import { MockDataToggleSimple } from "@/mock-data/MockDataToggle";

// في Toolbar أو Settings
<Toolbar>
  <MockDataToggleSimple />
</Toolbar>
```

2. سيظهر زر في الزاوية السفلية اليسرى للتبديل بين الوضع العادي والوضع الوهمي

### الطريقة 3: تفعيل برمجياً

```typescript
import { enableMockData, disableMockData, isMockDataEnabled } from "@/mock-data";

// تفعيل
enableMockData();

// إلغاء التفعيل
disableMockData();

// التحقق من الحالة
const enabled = isMockDataEnabled();
```

## 📊 البيانات الوهمية المتاحة

### بيانات تسجيل الدخول
يمكنك تسجيل الدخول باستخدام أي من الحسابات التالية:

- **Admin**: `admin@kaleem.com` (أي كلمة مرور)
- **Merchant**: `merchant@example.com` (أي كلمة مرور)
- **Member**: `member@example.com` (أي كلمة مرور)

### بيانات المنتجات
- 4 منتجات متنوعة (هواتف، لابتوب، سماعات، ملابس)
- أسعار واقعية بالريال اليمني
- صور ومواصفات مفصلة
- عروض وخصومات

### بيانات المحادثات
- 3 محادثات من قنوات مختلفة (واتساب، ويب شات، تليجرام)
- رسائل باللغة العربية
- ردود البوت والعملاء
- تقييمات وتعليقات

### بيانات لوحة التحكم
- إحصائيات واقعية (جلسات، رسائل، طلبات)
- رسوم بيانية
- مؤشرات الأداء
- تحليلات المبيعات

## 🔧 الـ Endpoints المدعومة

### Authentication
- `POST /api/auth/login` - تسجيل الدخول
- `POST /api/auth/register` - التسجيل
- `POST /api/auth/verify-email` - التحقق من البريد
- `POST /api/auth/forgot-password` - نسيان كلمة المرور
- `POST /api/auth/reset-password` - إعادة تعيين كلمة المرور
- `GET /api/auth/reset-password/validate` - التحقق من رمز إعادة التعيين
- `POST /api/auth/resend-verification` - إعادة إرسال رمز التحقق
- `POST /api/auth/ensure-merchant` - التأكد من حساب تاجر

### Products
- `GET /api/products` - قائمة المنتجات (مع pagination وفلترة)
- `GET /api/products/:id` - تفاصيل منتج
- `POST /api/products` - إنشاء منتج
- `PUT /api/products/:id` - تحديث منتج
- `DELETE /api/products/:id` - حذف منتج
- `POST /api/products/:id/images` - رفع صور منتج

### Conversations
- `GET /api/messages` - قائمة المحادثات
- `GET /api/messages/public/:slug/webchat/:sessionId` - رسائل جلسة عامة
- `PATCH /api/messages/session/:sessionId/messages/:messageId/rate` - تقييم رسالة
- `PATCH /api/messages/session/:sessionId/handover` - نقل المحادثة
- `POST /api/webhooks/chat/incoming/:slug` - إرسال رسالة

### Dashboard & Analytics
- `GET /api/analytics/overview` - نظرة عامة
- `GET /api/analytics/products-count` - عدد المنتجات
- `GET /api/analytics/messages-timeline` - مخطط زمني للرسائل
- `GET /api/analytics/top-products` - أفضل المنتجات
- `GET /api/analytics/top-keywords` - أفضل الكلمات المفتاحية
- `GET /api/analytics/missing-responses/stats` - إحصائيات الردود المفقودة
- `GET /api/analytics/missing-responses` - قائمة الردود المفقودة
- `GET /api/merchants/:merchantId/checklist` - قائمة المهام
- `POST /api/merchants/:merchantId/checklist/:itemKey/skip` - تخطي عنصر

### Categories
- `GET /api/categories` - قائمة الفئات (شجرة أو flat)
- `GET /api/categories/:id` - تفاصيل فئة
- `GET /api/categories/:id/breadcrumbs` - مسار الفئة
- `GET /api/categories/:id/subtree` - شجرة فرعية
- `POST /api/categories` - إنشاء فئة
- `PUT /api/categories/:id` - تحديث فئة
- `PATCH /api/categories/:id/move` - نقل فئة
- `DELETE /api/categories/:id` - حذف فئة
- `POST /api/categories/:id/image` - رفع صورة فئة

### Orders
- `GET /api/orders` - قائمة الطلبات (مع pagination وفلترة)
- `GET /api/orders/:id` - تفاصيل طلب
- `PATCH /api/orders/:id/status` - تحديث حالة طلب

### Coupons
- `GET /api/coupons` - قائمة الكوبونات
- `GET /api/coupons/:id` - تفاصيل كوبون
- `POST /api/coupons` - إنشاء كوبون
- `PATCH /api/coupons/:id` - تحديث كوبون
- `DELETE /api/coupons/:id` - حذف كوبون
- `POST /api/coupons/generate-codes` - توليد أكواد كوبونات

### Channels
- `GET /api/merchants/:merchantId` - بيانات التاجر والقنوات
- `PUT /api/merchants/:merchantId` - تحديث بيانات التاجر
- `PATCH /api/channels/:channelId` - تحديث قناة
- `DELETE /api/channels/:channelId` - حذف/فصل قناة

### Knowledge Base
- `GET /api/knowledge/documents` - قائمة المستندات
- `GET /api/merchants/:merchantId/faqs` - الأسئلة الشائعة
- `POST /api/merchants/:merchantId/faqs` - إضافة أسئلة شائعة
- `DELETE /api/merchants/:merchantId/faqs/:faqId` - حذف سؤال
- `GET /api/knowledge/links` - قائمة الروابط

### Merchant Settings
- `POST /api/merchants/:merchantId/logo` - رفع شعار التاجر
- `GET /api/merchants/check-public-slug` - التحقق من توفر slug
- `PATCH /api/storefronts/by-merchant/:merchantId` - تحديث slug المتجر

### Leads (العملاء المحتملين)
- `GET /api/merchants/:merchantId/leads` - قائمة العملاء المحتملين
- `GET /api/merchants/:merchantId/leads-settings` - إعدادات جمع العملاء المحتملين
- `PATCH /api/merchants/:merchantId/leads-settings` - تحديث إعدادات جمع العملاء المحتملين

### Instructions (التعليمات)
- `GET /api/instructions` - قائمة التعليمات (مع pagination وفلترة)
- `POST /api/instructions` - إنشاء تعليمات جديدة
- `PATCH /api/instructions/:id` - تحديث تعليمات
- `DELETE /api/instructions/:id` - حذف تعليمات
- `PATCH /api/instructions/:id/activate` - تفعيل تعليمات
- `PATCH /api/instructions/:id/deactivate` - إلغاء تفعيل تعليمات
- `GET /api/instructions/suggestions` - اقتراحات تعليمات
- `POST /api/instructions/auto/generate` - توليد تعليمات تلقائياً

### Missing Responses (الردود المفقودة)
- `GET /api/analytics/missing-responses` - قائمة الردود المفقودة (مع فلترة متقدمة)
- `PATCH /api/analytics/missing-responses/:id/resolve` - حل رد مفقود
- `POST /api/analytics/missing-responses/:id/add-to-knowledge` - إضافة رد مفقود لقاعدة المعرفة
- `PATCH /api/analytics/missing-responses/resolve` - حل متعدد للردود المفقودة

### Prompt Studio (استوديو الـ Prompt)
- `GET /api/merchants/:merchantId/prompt/quick-config` - إعدادات سريعة للبوت
- `PATCH /api/merchants/:merchantId/prompt/quick-config` - تحديث الإعدادات السريعة
- `GET /api/merchants/:merchantId/prompt/advanced-template` - القالب المتقدم
- `POST /api/merchants/:merchantId/prompt/advanced-template` - حفظ القالب المتقدم
- `POST /api/merchants/:merchantId/prompt/preview` - معاينة الـ prompt
- `GET /api/merchants/:merchantId/prompt/final-prompt` - الـ prompt النهائي

### Promotions (العروض الترويجية)
- `GET /api/promotions` - قائمة العروض الترويجية
- `GET /api/promotions/:id` - تفاصيل عرض ترويجي
- `POST /api/promotions` - إنشاء عرض ترويجي
- `PATCH /api/promotions/:id` - تحديث عرض ترويجي
- `DELETE /api/promotions/:id` - حذف عرض ترويجي

### Support (الدعم)
- `POST /api/support/contact/merchant` - إرسال تذكرة دعم

### Widget Config (إعدادات الـ Widget)
- `GET /api/merchants/:merchantId/widget-settings` - إعدادات الـ widget
- `PUT /api/merchants/:merchantId/widget-settings` - تحديث إعدادات الـ widget
- `POST /api/merchants/:merchantId/widget-settings/slug` - توليد slug للـ widget

### Storefront Theme (مظهر المتجر)
- `GET /api/storefront/merchant/:merchantId` - معلومات المتجر حسب merchantId
- `GET /api/storefront/:slug` - معلومات المتجر حسب slug
- `GET /api/storefront/info/:merchantId` - معلومات المتجر (للواجهة العامة)
- `PATCH /api/storefront/by-merchant/:merchantId` - تحديث معلومات المتجر
- `POST /api/storefront/by-merchant/:merchantId/banners/upload` - رفع صور البانر
- `GET /api/storefront/slug/check` - التحقق من توفر slug
- `GET /api/public/:slug/bundle` - حزمة المتجر العامة
- `GET /api/public/:target` - Resolver عام (متجر أو منتج)

### Integrations (التكاملات)
- `GET /api/integrations/status` - حالة التكاملات (Salla, Zid)
- `POST /api/catalog/:merchantId/sync` - مزامنة الكتالوج

### Kaleem Chat (محادثة كليم)
- `GET /api/kleem/chat/:sessionId` - جلب جلسة محادثة
- `POST /api/kleem/chat/:sessionId/message` - إرسال رسالة
- `POST /api/kleem/chat/:sessionId/rate` - تقييم رسالة

### Contact (التواصل)
- `GET /api/support/contact/config` - إعدادات نموذج التواصل
- `POST /api/support/contact` - إرسال نموذج التواصل

### Store Public (المتجر العام)
- `GET /api/products/public/:storeSlug/product/:productSlug` - منتج عام حسب slug
- `GET /api/offers` - قائمة العروض الترويجية
- `GET /api/storefront/demo` - صفحة الديمو (معالجة خاصة)
- `GET /api/public/demo` - Resolver للديمو
- `GET /api/public/demo/bundle` - حزمة الديمو الكاملة

**ملاحظة خاصة للديمو**: عند زيارة `/store/demo`، يتم استخدام `merchant-001` كتاجر افتراضي مع جميع منتجاته وفئاته.

## 🎯 استخدامات النظام

1. **العرض للفريق**: مشاركة نسخة كاملة من التطبيق مع بيانات واقعية
2. **التطوير**: اختبار الميزات الجديدة دون الحاجة لبيانات حقيقية
3. **الاختبار**: كتابة اختبارات تفاعلية مع بيانات متنوعة
4. **التوثيق**: عرض إمكانيات التطبيق للعملاء
5. **التدريب**: تدريب المستخدمين على استخدام النظام

## 📝 تخصيص البيانات

### إضافة بيانات جديدة

يمكنك تعديل ملفات JSON في مجلد `data/` لإضافة أو تعديل البيانات:

```json
// مثال: إضافة منتج جديد في mock-products.json
{
  "_id": "prod-005",
  "name": "منتج جديد",
  "price": 50000,
  "currency": "YER",
  // ... باقي الحقول
}
```

### إضافة endpoints جديدة

في ملف `src/mock-data/demo-server.ts`، أضف handler جديد:

```typescript
http.get("*/api/new-endpoint", async ({ request }) => {
  await delay(300);
  return createResponse({ message: "نجح!" });
}),
```

## ⚠️ ملاحظات مهمة

- جميع البيانات وهمية وآمنة للمشاركة
- البيانات تشبه البنية الحقيقية 100%
- يمكن إيقاف النظام في أي وقت
- مناسب للتطوير والعرض فقط
- **لا تستخدم في الإنتاج**

## 🔗 الربط مع الفريق

لرفع النسخة الموكاب للفريق:

1. تأكد من أن جميع الملفات مضافة للـ Git
2. شغل `npm run build` لبناء النسخة النهائية
3. ارفع الملفات إلى منصة المشاركة
4. شارك رابط التشغيل مع الفريق
5. تأكد من تفعيل `VITE_USE_MOCK_DATA=true` في بيئة العرض

## 🐛 استكشاف الأخطاء

### الخادم لا يعمل
- تأكد من تفعيل `VITE_USE_MOCK_DATA=true` في `.env`
- تحقق من console للأخطاء
- تأكد من تثبيت جميع التبعيات: `npm install`

### البيانات لا تظهر
- تحقق من أن الخادم مفعل في console
- تأكد من أن الـ endpoints صحيحة
- راجع ملف `demo-server.ts` للتأكد من الـ handlers

### زر التفعيل لا يظهر
- تأكد من إضافة `<MockDataToggle />` في Layout
- تحقق من أن المكون مستورد بشكل صحيح

---

**تم إنشاء هذا النظام بواسطة نظام البيانات الوهمية لمشروع Kleeem MVP**


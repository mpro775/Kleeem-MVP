# دليل الاختبار اليدوي — واجهة المتجر (Storefront)

> يغطي عمليات **إعدادات واجهة المتجر** من `storefront.controller.ts` — جلب، تحديث، slug، بنرات، طلباتي، وقالب CSS.  
> **ملاحظة:** إنشاء Storefront يتم عادةً خلال تهيئة التاجر (provisioning)؛ التحديث من لوحة التحكم.

---

## 1) نطاق الدليل

| البند | الوصف |
|--------|--------|
| **النطاق** | مسارات `/storefront/*` — إعدادات واجهة المتجر، بنرات، طلبات العميل |
| **غير مشمول** | عمليات الكتالوج/المنتجات/الطلبات التفصيلية (وحدات منفصلة) |
| **المراجع** | `storefront.controller.ts`, `storefront.service.ts` |

---

## 2) البيئة والحسابات

| البند | القيمة (مثال) |
|--------|---------------|
| **البيئة** | Staging / UAT |
| **Base URL API** | `https://<your-api>/api` أو `http://localhost:3000/api` |
| **حساب تاجر** | JWT مع merchantId صالح (للتحديث ورفع البنرات) |
| **معرّف تاجر للاختبار** | merchantId من user.merchantId |
| **معرّف storefront** | من findByMerchant أو getStorefront |

---

## 3) قائمة العمليات (Process List)

1. **جلب Storefront حسب التاجر** — GET merchant/:merchantId (عام).
2. **تحديث Storefront** — PATCH merchant/:id أو PATCH by-merchant/:merchantId.
3. **التحقق من slug** — GET slug/check?slug=... (عام).
4. **جلب Storefront بـ slug أو id** — GET :slugOrId (عام).
5. **إنشاء Storefront** — POST / (يتطلب JWT).
6. **رفع صور البنرات** — POST by-merchant/:merchantId/banners/upload (multipart).
7. **طلباتي** — GET merchant/:merchantId/my-orders (عام).
8. **قالب CSS المميّز** — GET public/storefront/:slug/brand.css.

---

## 4) حالات الاختبار حسب العملية

---

### العملية 1: جلب Storefront حسب التاجر

**الـ API:** `GET /storefront/merchant/:merchantId`  
**عام (لا يتطلب JWT).**

#### السيناريو السعيد

| المعرّف | SF-MERCH-001 |
|----------|--------------|
| **العنوان** | جلب إعدادات المتجر لتاجر له storefront |
| **الخطوات** | GET /storefront/merchant/:merchantId مع merchantId صالح |
| **النتيجة المتوقعة** | 200، كائن يحتوي merchant، products، categories، storefront |
| **الأولوية** | حرج |

#### سيناريوهات فشل

| المعرّف | العنوان | الخطوات | النتيجة المتوقعة | الأولوية |
|----------|---------|---------|-------------------|----------|
| SF-MERCH-002 | استدعاء GET merchant بدون معرف | GET /storefront/merchant (بدون :merchantId) | 400 (merchantId is required) | متوسط |
| SF-MERCH-003 | تاجر بدون storefront | merchantId لا يطابق أي storefront | 404 أو بيانات فارغة حسب التصميم | عالي |

---

### العملية 2: تحديث Storefront

**الـ API:**  
- `PATCH /storefront/merchant/:id` — حسب معرف الـ storefront  
- `PATCH /storefront/by-merchant/:merchantId` — حسب معرف التاجر  

**التوثيق:** Bearer JWT.  
**Body:** UpdateStorefrontDto / UpdateStorefrontByMerchantDto — primaryColor، secondaryColor، buttonStyle (rounded|square)، slug، brandDark، domain، banners، featuredProductIds.

**تحقق slug:** صيغة `^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$`، طول 3–50؛ البنرات حد أقصى 5.

#### السيناريو السعيد

| المعرّف | SF-UPD-001 |
|----------|------------|
| **العنوان** | تحديث ألوان وشكل الأزرار |
| **الخطوات** | PATCH by-merchant/:merchantId بـ `{ "primaryColor": "#4F46E5", "buttonStyle": "rounded" }` |
| **النتيجة المتوقعة** | 200، Storefront محدّث |
| **الأولوية** | حرج |

| المعرّف | SF-UPD-002 |
|----------|------------|
| **العنوان** | تحديث slug |
| **الخطوات** | PATCH بـ `{ "slug": "my-store-2025" }` |
| **النتيجة المتوقعة** | 200، slug محدّث إن كان متاحاً |
| **الأولوية** | عالي |

#### سيناريوهات فشل

| المعرّف | العنوان | الخطوات | النتيجة المتوقعة | الأولوية |
|----------|---------|---------|-------------------|----------|
| SF-UPD-003 | slug محجوز | تحديث slug مستخدم من قبل تاجر آخر | 400 (هذا الـ slug محجوز) | عالي |
| SF-UPD-004 | لون بصيغة غير HEX | primaryColor: "red" | 400 (لون HEX غير صالح) | عالي |
| SF-UPD-005 | buttonStyle غير صالح | buttonStyle: "circle" | 400 (rounded أو square فقط) | متوسط |
| SF-UPD-006 | أكثر من 5 بنرات | banners array طولها > 5 | 400 (الحد الأقصى 5) | عالي |
| SF-UPD-007 | بنر بدون text | BannerDto.text فارغ | 400 (نص البانر مطلوب) | متوسط |
| SF-UPD-008 | عدم إرسال توكن | 401 | عالي |
| SF-UPD-009 | storefront/merchant غير موجود | PATCH بـ id غير صالح | 404 | عالي |

---

### العملية 3: التحقق من slug

**الـ API:** `GET /storefront/slug/check?slug=...`  
**عام.**

#### السيناريو السعيد

| المعرّف | SF-SLUG-001 |
|----------|-------------|
| **العنوان** | slug متاح |
| **الخطوات** | GET ?slug=my-store |
| **النتيجة المتوقعة** | 200، `{ "available": true }` إن لم يكن مستخدماً |
| **الأولوية** | عالي |

#### سيناريوهات فشل

| المعرّف | العنوان | الخطوات | النتيجة المتوقعة | الأولوية |
|----------|---------|---------|-------------------|----------|
| SF-SLUG-002 | slug ناقص | GET بدون query slug | 400 (slug مطلوب) | عالي |
| SF-SLUG-003 | slug مستخدم | GET ?slug=slug-موجود | 200، `{ "available": false }` | عالي |

---

### العملية 4: جلب Storefront بـ slug أو id

**الـ API:** `GET /storefront/:slugOrId`  
**عام.** يمكن استخدام slug (مثل demo) أو ObjectId.

#### السيناريو السعيد

| المعرّف | SF-GET-001 |
|----------|------------|
| **العنوان** | جلب storefront بـ slug |
| **الخطوات** | GET /storefront/demo أو GET /storefront/my-store |
| **النتيجة المتوقعة** | 200، إعدادات المتجر |
| **الأولوية** | حرج |

| المعرّف | SF-GET-002 |
|----------|-------------|
| **العنوان** | جلب storefront بـ ObjectId |
| **الخطوات** | GET /storefront/507f1f77bcf86cd799439011 |
| **النتيجة المتوقعة** | 200، إعدادات المتجر |
| **الأولوية** | عالي |

#### سيناريوهات فشل

| المعرّف | العنوان | الخطوات | النتيجة المتوقعة | الأولوية |
|----------|---------|---------|-------------------|----------|
| SF-GET-003 | slug/id غير موجود | 404 | عالي |

---

### العملية 5: إنشاء Storefront

**الـ API:** `POST /storefront`  
**التوثيق:** Bearer JWT.  
**Body:** CreateStorefrontDto — merchant (مطلوب)، primaryColor، secondaryColor، buttonStyle، slug، brandDark، domain، banners، featuredProductIds.

#### السيناريو السعيد

| المعرّف | SF-CREATE-001 |
|----------|---------------|
| **العنوان** | إنشاء storefront جديد |
| **الخطوات** | POST بـ `{ "merchant": "<merchantId>", "primaryColor": "#4F46E5", "slug": "my-store" }` |
| **النتيجة المتوقعة** | 201، Storefront جديد |
| **الأولوية** | عالي |

#### سيناريوهات فشل

| المعرّف | العنوان | الخطوات | النتيجة المتوقعة | الأولوية |
|----------|---------|---------|-------------------|----------|
| SF-CREATE-002 | merchant ناقص | body بدون merchant | 400 | عالي |
| SF-CREATE-003 | slug غير صالح | slug يخالف الصيغة (أحرف خاصة، أقل من 3) | 400 | عالي |
| SF-CREATE-004 | عدم إرسال توكن | 401 | عالي |

---

### العملية 6: رفع صور البنرات

**الـ API:** `POST /storefront/by-merchant/:merchantId/banners/upload`  
**Content-Type:** multipart/form-data، حقل `files` (مصفوفة صور).  
**الحدود:** أقصى 5 صور في الطلب، كل صورة ≤5 ميجابكسل، PNG/JPG/WEBP.

#### السيناريو السعيد

| المعرّف | SF-BAN-001 |
|----------|------------|
| **العنوان** | رفع بنر واحد أو أكثر (إجمالي ≤5) |
| **الخطوات** | POST مع files (صور PNG/JPG/WEBP، كل منها ≤5MP) |
| **النتيجة المتوقعة** | 200، روابط الصور أو كائن البنرات المحدّث |
| **الأولوية** | حرج |

#### سيناريوهات فشل

| المعرّف | العنوان | الخطوات | النتيجة المتوقعة | الأولوية |
|----------|---------|---------|-------------------|----------|
| SF-BAN-002 | رفع أكثر من 5 صور في طلب واحد | files.length > 5 | 400 أو رفض حسب Multer/Validation | عالي |
| SF-BAN-003 | صورة أكبر من 5MP | صورة بدقة عالية جداً | 400 (لا يمكن قراءة أبعاد الصورة) أو معالجة تلقائية | متوسط |
| SF-BAN-004 | صيغة غير مدعومة | ملف PDF أو GIF | رفض أو 400 | عالي |
| SF-BAN-005 | عدم إرسال ملفات | POST بدون files | 400 | عالي |
| SF-BAN-006 | تاجر بدون storefront | merchantId لا يطابق storefront | 404 | عالي |
| SF-BAN-007 | عدم إرسال توكن | 401 | عالي |

---

### العملية 7: طلباتي (my-orders)

**الـ API:** `GET /storefront/merchant/:merchantId/my-orders?sessionId=...&phone=...&limit=...`  
**عام.**  
**المتطلبات:** merchantId و (sessionId أو phone) مطلوبان.

#### السيناريو السعيد

| المعرّف | SF-ORD-001 |
|----------|------------|
| **العنوان** | جلب طلبات العميل بـ sessionId |
| **الخطوات** | GET ?merchantId=...&sessionId=... |
| **النتيجة المتوقعة** | 200، مصفوفة الطلبات |
| **الأولوية** | حرج |

| المعرّف | SF-ORD-002 |
|----------|-------------|
| **العنوان** | جلب طلبات العميل برقم الهاتف |
| **الخطوات** | GET ?merchantId=...&phone=+966501234567 |
| **النتيجة المتوقعة** | 200، مصفوفة الطلبات |
| **الأولوية** | عالي |

#### سيناريوهات فشل

| المعرّف | العنوان | الخطوات | النتيجة المتوقعة | الأولوية |
|----------|---------|---------|-------------------|----------|
| SF-ORD-003 | نقص merchantId أو sessionId/phone | GET بدون merchantId أو بدون sessionId وبدون phone | 400 (merchantId و sessionId/phone مطلوبة) | حرج |
| SF-ORD-004 | limit أكبر من 200 | ?limit=300 | يتم تقييده إلى 200 | متوسط |

---

### العملية 8: قالب CSS المميّز (brand.css)

**الـ API:** `GET /storefront/public/storefront/:slug/brand.css`  
**ملاحظة:** المسار كما في الكود؛ قد يتطلب JWT (لا يوجد @Public على هذا المسار).

#### السيناريو السعيد

| المعرّف | SF-CSS-001 |
|----------|------------|
| **العنوان** | جلب ملف CSS المميّز للمتجر |
| **الخطوات** | GET مع slug صالح (مثل demo) |
| **النتيجة المتوقعة** | 200، Content-Type: text/css، محتوى CSS (متغيرات --brand، --brand-hover، إلخ) |
| **الأولوية** | عالي |

#### سيناريوهات فشل

| المعرّف | العنوان | الخطوات | النتيجة المتوقعة | الأولوية |
|----------|---------|---------|-------------------|----------|
| SF-CSS-002 | slug غير موجود | 404 | متوسط |
| SF-CSS-003 | يتطلب JWT إن لم يُجعل عاماً | طلب بدون توكن | 401 | متوسط |

---

## 5) ملخص الحالات وترتيب التنفيذ

| الأولوية | الحالات (أمثلة) |
|----------|-----------------|
| **حرج** | SF-MERCH-001؛ SF-UPD-001؛ SF-GET-001؛ SF-BAN-001؛ SF-ORD-001، SF-ORD-003 |
| **عالي** | SF-MERCH-003؛ SF-UPD-002–009؛ SF-SLUG-001–003؛ SF-GET-002–003؛ SF-CREATE-001–004؛ SF-BAN-002–007؛ SF-ORD-002؛ SF-CSS-001 |
| **متوسط** | SF-MERCH-002؛ SF-UPD-005، SF-UPD-007؛ SF-ORD-004؛ SF-CSS-002–003 |

**ترتيب مقترح للتنفيذ:**

1. جلب storefront (merchant، slug/id).
2. التحقق من slug.
3. تحديث storefront (ألوان، slug، بنرات).
4. إنشاء storefront (إن لزم).
5. رفع بنرات.
6. طلباتي.
7. قالب CSS المميّز.

---

## 6) قائمة التحقق السريعة (Checklist)

| المعرّف | الوصف | النتيجة | ملاحظات |
|----------|--------|---------|----------|
| SF-MERCH-001 – 003 | جلب حسب التاجر | | |
| SF-UPD-001 – 009 | تحديث Storefront | | |
| SF-SLUG-001 – 003 | التحقق من slug | | |
| SF-GET-001 – 003 | جلب بـ slug/id | | |
| SF-CREATE-001 – 004 | إنشاء Storefront | | |
| SF-BAN-001 – 007 | رفع البنرات | | |
| SF-ORD-001 – 004 | طلباتي | | |
| SF-CSS-001 – 003 | قالب CSS المميّز | | |

---

## 7) مراجع تقنية سريعة

- **Base path:** `/api/storefront`
- **عام (بدون JWT):** GET merchant/:merchantId، GET slug/check، GET :slugOrId، GET merchant/:merchantId/my-orders
- **يتطلب JWT:** PATCH merchant/:id، PATCH by-merchant/:merchantId، POST /، POST by-merchant/:merchantId/banners/upload، GET public/storefront/:slug/brand.css
- **الألوان:** تنسيق HEX (#RGB أو #RRGGBB)
- **buttonStyle:** rounded | square
- **slug:** `^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$`، 3–50 حرف
- **البنرات:** حد أقصى 5، كل صورة ≤5MP، PNG/JPG/WEBP

---

_آخر تحديث: فبراير 2025 — إصدار 1.0_

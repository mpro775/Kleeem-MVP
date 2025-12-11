# خطة إضافة نظام العملاء (متعدد التجار)

## الأهداف

- تمكين تسجيل/تسجيل دخول العملاء وربطهم بالطلبات لكل تاجر.
- توفير أساس لميزات لاحقة: أعلمني عند التوفر، التقييمات، الشرائح والتسويق.
- ضمان عزل صارم بين التجار (merchantId) مع فهارس فريدة على الهاتف/الإيميل.

## النطاق الأساسي

- دعم الهوية بالهاتف أو الإيميل (OTP كبداية؛ كلمات مرور/مزوّدات خارجية لاحقاً).
- لوحة التاجر لإدارة العملاء والبحث عنهم (اسم، هاتف، إيميل، تاجات).
- ربط الطلب بـ customerId مع الاحتفاظ بـ snapshot لحظة الشراء.

## النماذج المقترحة

- **customers**
  - merchantId, name, emailLower?, phoneNormalized?, marketingConsent, isBlocked
  - tags[], metadata, lastSeenAt, signupSource
  - stats: totalOrders, totalSpend, lastOrderId
- **customer_sessions / otp_codes** (TTL): merchantId, contact (phone/email), code, expiresAt, attempts.
- **customer_addresses** (اختياري أو embedded): label, country, city, address1/2, zip, isDefault.
- **back_in_stock_requests**: merchantId, productId|variantId, customerId?, contact, status (pending/notified), notifiedAt.
- **product_reviews**: merchantId, productId, customerId, rating, comment, status (pending/approved/rejected), orderId? للتوثيق.
- **orders** (تعديل): customerId, customerSnapshot (البيانات لحظة الشراء).

## قرار حول leads قبل الإطلاق

- بما أن المشروع لم يُطلق بعد، اجعل **customers** هو مصدر الهوية الوحيد.
- خياران:
  1. إلغاء وحدة leads كلياً.
  2. إبقاؤها كـ “صندوق تجميع” لقناة واحدة فقط (مثلاً ودجت محادثة مجهول)، ثم تحويل أي lead صالح إلى customer عند أول تحقق OTP أو توفر هاتف/إيميل.
- إن أبقيت leads:
  - عطّل بقية المسارات أو ضعها خلف Feature Flag.
  - طبّع الهاتف/الإيميل بنفس دوال customers لمنع التكرار.
  - عند نجاح OTP أو إنشاء عميل جديد: ابحث عن lead بنفس `merchantId + phoneNormalized` (أو `sessionId`) وعلّمها converted واربطها بـ `customerId`.
  - لا تجعل الفهارس في leads فريدة؛ أبقِ الفهارس الحالية للبحث فقط، مع الفهارس الفريدة في customers على الهاتف/الإيميل.
  - عند إنشاء طلب guest، إن وُجد lead بنفس `sessionId` يمكن نسخ بياناته إلى snapshot الطلب، ثم دمجها لاحقاً عندما يُنشأ العميل.

## واجهات الـ API (مبدئية)

- Auth (عملاء):
  - POST `/auth/customers/otp/send` (phone/email + merchantId)
  - POST `/auth/customers/otp/verify` → JWT مقيد بـ merchantId
  - لاحقاً: `/auth/customers/login` بكلمة مرور أو مزوّد خارجي.
- Customers (لوحة التاجر):
  - GET `/customers` (بحث/تصفية بالهاتف/الإيميل/الاسم/التاجات)
  - GET `/customers/:id`
  - POST `/customers` (إنشاء يدوي للتاجر)
  - PATCH `/customers/:id`
  - POST `/customers/:id/tags` ، POST `/customers/:id/addresses`
- Storefront:
  - POST `/customers/signup` (OTP)
  - GET `/customers/me` ، PATCH `/customers/me`
- تكامل الطلب:
  - عند إنشاء الطلب: ربط customerId إن وجد، وإلا guest + snapshot.
  - فهرس `{ merchantId, customerId, createdAt }` للبحث والتحليلات.
- Back-in-stock:
  - POST `/back-in-stock` (productId/variantId + contact أو customerId)
  - Worker/cron لإرسال الإشعارات وتحديث status/notifiedAt.
- Reviews:
  - POST `/products/:id/reviews` (يتحقق من شراء سابق إن لزم)
  - GET `/products/:id/reviews` (مصفى بالstatus=approved)
  - لوحة تاجر: approve/reject/delete.

## الفهارس والقيود

- customers:
  - `{ merchantId, phoneNormalized }` unique sparse
  - `{ merchantId, emailLower }` unique sparse
  - `{ merchantId, createdAt }`, نصي على name اختياري
- orders: `{ merchantId, customerId, createdAt }`
- back_in_stock_requests: `{ merchantId, variantId, status }`
- product_reviews: `{ merchantId, productId, status }`

## التدفقات الأساسية

1. **OTP**: إنشاء كود TTL + معدّل محاولات ➜ تحقق ➜ إصدار JWT (payload يشمل merchantId, customerId).
2. **إنشاء الطلب**: استخرج الهوية من الـ JWT إن وُجد؛ وإلا guest. خزّن snapshot للعميل في الطلب دائماً.
3. **Back-in-stock**: عند تحديث المخزون إلى >0، استعلم pending لنفس variantId + merchantId، أرسل إشعار، حدّث notifiedAt/status.
4. **التقييمات**: تحقق من سياسة السماح (يتطلب شراء؟ عدد مرات؟)، خزّن status= pending، التاجر يعتمد/يرفض.

## مراحل التنفيذ (مقترح على 3 دفعات)

1. الأساس (MVP): نماذج customers + OTP + CRUD أساسي + ربط الطلب بـ customerId + الفهارس.
2. المزايا المباشرة: back-in-stock + approvals للتقييمات + لوحة إدارة العملاء (بحث/تصفية/تاجات).
3. تحسينات: كلمات مرور/مزودات خارجية، الشرائح والتسويق، loyalty، تقارير تكرار الشراء والقيمة العمرية.

## اعتبارات أمنية وتشغيلية

- إلزام merchantId في كل استعلام وتحقق من الملكية في الخدمات.
- ضبط معدلات (rate limit) لإرسال OTP ومحاولات التحقق.
- إخفاء/تشفير الحقول الحساسة (مثلاً phone/email) في الـ logs.
- مسارات مراجعة للتقييمات لمنع الإساءة.
- تنبيهات عند فشل إرسال إشعارات back-in-stock.

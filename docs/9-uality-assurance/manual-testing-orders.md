# دليل الاختبار اليدوي — الطلبات (Orders)

> يغطي وحدة **Orders** (إنشاء الطلبات، القائمة، التحديث، جلب طلباتي، والبحث بالعميل).  
> **التركيز:** التكاملات — PricingService، Coupons، Promotions، Inventory، Leads، Customers، Storefront.  
> **ملاحظة:** الكوبونات والعروض الترويجية موثّقة في `manual-testing-coupons-promotions-offers.md` — هذا الدليل يركز على تدفق الطلبات والتكاملات.

---

## 1) نطاق الدليل

| البند | الوصف |
|--------|--------|
| **Orders** | إنشاء طلب، قائمة الطلبات، تفاصيل طلب، تحديث الحالة، طلباتي، طلبات العميل |
| **التكامل** | PricingService (خصومات، كوبونات، عروض)، Inventory (استقطاع المخزون)، Coupons/Promotions (incrementUsage)، Leads (createLeadFromOrder)، Customers (updateCustomerStats) |
| **Storefront** | GET storefront/merchant/:merchantId/my-orders — جلب طلباتي حسب sessionId/phone (مع دعم getPhoneBySession من Leads) |
| **المراجع** | `orders.controller.ts`, `orders.service.ts`, `pricing.service.ts`, `mongo-orders.repository.ts` |

---

## 2) البيئة والحسابات

| البند | القيمة (مثال) |
|--------|---------------|
| **البيئة** | Staging / UAT |
| **Base URL API** | `https://<your-api>/api` أو `http://localhost:3000/api` |
| **حساب تاجر** | JWT مع merchantId صالح (للـ GET/PATCH لوحة التاجر) |
| **عميل مسجّل** | JWT عميل (اختياري عند إنشاء الطلب — يربط الطلب بالعميل ويحدّث إحصائياته) |
| **إنشاء الطلب** | Public — لا يتطلب مصادقة |
| **طلباتي / findByCustomer** | Public |
| **قائمة الطلبات / تحديث الحالة** | JWT تاجر مطلوب |

---

## 3) مخطط التكامل

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   CreateOrder   │     │  PricingService  │     │   Inventory     │
│   (DTO)         │────►│  subtotal,       │     │  checkAvailability
│                 │     │  promotions,     │     │  deductStock     │
│                 │     │  coupon, total   │     │                 │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                        │                        │
         │                        ▼                        │
         │               ┌─────────────────┐               │
         │               │ CouponsService  │               │
         │               │ incrementUsage  │               │
         │               └─────────────────┘               │
         │                        │                        │
         │               ┌─────────────────┐               │
         │               │PromotionsService │               │
         │               │ incrementUsage   │               │
         │               └─────────────────┘               │
         │                        │                        │
         ▼                        ▼                        ▼
┌─────────────────────────────────────────────────────────────────┐
│                    OrdersService.create                          │
│  createLeadFromOrder → LeadsService.create (source: order)       │
│  updateCustomerStatsIfNeeded → CustomersService.updateCustomerStats│
└─────────────────────────────────────────────────────────────────┘

┌─────────────────┐     ┌─────────────────┐
│  Storefront     │     │  Webhooks       │
│  my-orders      │────►│  findByCustomer │
│  (sessionId →   │     │  (phone)        │
│   getPhoneBySession)  │                 │
└─────────────────┘     └─────────────────┘
```

---

## 4) قائمة العمليات (Process List)

### Orders API

1. **إنشاء طلب** — POST `/orders` (Public)
2. **قائمة طلبات التاجر** — GET `/orders` (JWT تاجر)
3. **طلباتي (حسب الجلسة)** — GET `/orders/mine/:merchantId/:sessionId` (Public)
4. **تفاصيل طلب** — GET `/orders/:id` مع `?sessionId=` أو `?phone=` (Public — يتحقق من ملكية الطلب)
5. **تحديث حالة الطلب** — PATCH `/orders/:id/status` (JWT تاجر)
6. **طلبات العميل (حسب الهاتف)** — GET `/orders/by-customer/:merchantId/:phone` (Public)

### Storefront

7. **طلباتي (متجر)** — GET `/storefront/merchant/:merchantId/my-orders?sessionId=&phone=&limit=` (Public)

---

## 5) حالات الاختبار حسب القسم

---

## 5.1 إنشاء الطلب (POST /orders)

**Body:** `CreateOrderDto` — merchantId (مطلوب)، sessionId (مطلوب)، customer (مطلوب: name، phone)، products (مطلوب: product، name، price، quantity)، couponCode؟، currency؟، source؟، metadata؟  
**ملاحظة:** يدعم `items` قديم — يُحوَّل تلقائياً إلى `products`.

### السيناريو السعيد

| المعرّف | ORD-CRE-001 |
|----------|-------------|
| **العنوان** | إنشاء طلب أساسي (ضيف) |
| **الخطوات** | POST بـ `{ merchantId, sessionId: "sess_1", customer: { name: "أحمد", phone: "+966501234567", email: "a@ex.com" }, products: [{ product: "prodId", name: "منتج", price: 100, quantity: 2 }] }` |
| **النتيجة المتوقعة** | 201، طلب مُنشأ، pricing محسوب، status: pending، source: storefront |
| **الأولوية** | حرج |

| المعرّف | ORD-CRE-002 |
|----------|-------------|
| **العنوان** | إنشاء طلب مع عميل مسجّل (JWT عميل) |
| **الخطوات** | POST مع Authorization: Bearer \<customer-jwt\> ونفس الـ body |
| **النتيجة المتوقعة** | 201، customerId مُربط، إحصائيات العميل محدثة (totalOrders، totalSpend، lastOrderId) |
| **الأولوية** | حرج |

| المعرّف | ORD-CRE-003 |
|----------|-------------|
| **العنوان** | إنشاء طلب مع كوبون صالح |
| **الخطوات** | إضافة `couponCode: "SUMMER25"` مع كوبون موجود وفعّال |
| **النتيجة المتوقعة** | 201، pricing.coupon مُعبأ، appliedCouponCode، incrementUsage للكوبون |
| **الأولوية** | حرج |

| المعرّف | ORD-CRE-004 |
|----------|-------------|
| **العنوان** | إنشاء طلب مع lead جديد |
| **الخطوات** | إنشاء طلب مع customer يحتوي name/phone/email |
| **النتيجة المتوقعة** | 201، lead جديد مُنشأ (source: order) في leads |
| **الأولوية** | عالي |

### تباينات

| المعرّف | ORD-CRE-005 |
|----------|-------------|
| **العنوان** | دعم items القديم |
| **الخطوات** | POST بـ `items: [{ productId, name, price, quantity }]` بدلاً من products |
| **النتيجة المتوقعة** | 201، تحويل تلقائي إلى products |
| **الأولوية** | متوسط |

| المعرّف | ORD-CRE-006 |
|----------|-------------|
| **العنوان** | منتج مع متغير (variantSku) |
| **الخطوات** | إضافة `variantSku: "TSHIRT-RED-L"` في المنتج |
| **النتيجة المتوقعة** | 201، استقطاع مخزون المتغير الصحيح |
| **الأولوية** | عالي |

### سيناريوهات فشل

| المعرّف | العنوان | الخطوات | النتيجة المتوقعة | الأولوية |
|----------|---------|---------|-------------------|----------|
| ORD-CRE-007 | merchantId ناقص | body بدون merchantId | 400 | حرج |
| ORD-CRE-008 | sessionId ناقص | body بدون sessionId | 400 | حرج |
| ORD-CRE-009 | customer ناقص | body بدون customer | 400 | حرج |
| ORD-CRE-010 | products فارغة | products: [] | 400 | حرج |
| ORD-CRE-011 | مخزون غير كافٍ | كمية أكبر من المتاح | 400 "Product out of stock" | حرج |
| ORD-CRE-012 | كوبون غير صالح | couponCode لكوبون منتهي/غير موجود | 201 مع pricing بدون خصم كوبون (أو 400 حسب التصميم) | عالي |

---

## 5.2 قائمة طلبات التاجر (GET /orders)

**المصادقة:** JWT تاجر (CurrentMerchantId).  
**Query:** `ListOrdersDto` — page، limit، status؟، phone؟

### السيناريو السعيد

| المعرّف | ORD-LST-001 |
|----------|-------------|
| **العنوان** | قائمة الطلبات مع ترقيم صفحات |
| **الخطوات** | GET مع Authorization: Bearer \<merchant-jwt\> و ?page=1&limit=20 |
| **النتيجة المتوقعة** | 200، `{ orders, total, page, limit }` |
| **الأولوية** | حرج |

| المعرّف | ORD-LST-002 |
|----------|-------------|
| **العنوان** | تصفية بحالة الطلب |
| **الخطوات** | GET مع ?status=pending |
| **النتيجة المتوقعة** | 200، طلبات بحالة pending فقط |
| **الأولوية** | عالي |

| المعرّف | ORD-LST-003 |
|----------|-------------|
| **العنوان** | تصفية برقم الهاتف |
| **الخطوات** | GET مع ?phone=966501234567 |
| **النتيجة المتوقعة** | 200، طلبات للعميل بهذا الرقم |
| **الأولوية** | عالي |

### سيناريوهات فشل

| المعرّف | العنوان | الخطوات | النتيجة المتوقعة | الأولوية |
|----------|---------|---------|-------------------|----------|
| ORD-LST-004 | بدون JWT تاجر | GET بدون Authorization | 401 | حرج |
| ORD-LST-005 | مستخدم بدون merchantId | JWT لمستخدم بدون تاجر | 403 "No merchant context" | عالي |

---

## 5.3 تفاصيل الطلب مع التحقق من الملكية (GET /orders/:id)

**Query:** `sessionId` و/أو `phone` — إذا مُرّر أحدهما، يتحقق النظام من ملكية الطلب قبل الإرجاع.

### السيناريو السعيد

| المعرّف | ORD-ONE-001 |
|----------|-------------|
| **العنوان** | جلب طلب مع sessionId مطابق |
| **الخطوات** | GET /orders/:id?sessionId=sess_1 حيث الطلب له sessionId=sess_1 |
| **النتيجة المتوقعة** | 200، تفاصيل الطلب |
| **الأولوية** | حرج |

| المعرّف | ORD-ONE-002 |
|----------|-------------|
| **العنوان** | جلب طلب مع phone مطابق |
| **الخطوات** | GET /orders/:id?phone=+966501234567 |
| **النتيجة المتوقعة** | 200 |
| **الأولوية** | عالي |

| المعرّف | ORD-ONE-003 |
|----------|-------------|
| **العنوان** | جلب طلب بدون sessionId/phone |
| **الخطوات** | GET /orders/:id بدون query |
| **النتيجة المتوقعة** | 200 (assertOwnership يُعيد true عند عدم تمرير أي منهما) |
| **الأولوية** | متوسط |

### سيناريوهات فشل

| المعرّف | العنوان | الخطوات | النتيجة المتوقعة | الأولوية |
|----------|---------|---------|-------------------|----------|
| ORD-ONE-004 | sessionId لا يطابق | GET بـ sessionId مختلف عن الطلب | 403 "Order access denied" | حرج |
| ORD-ONE-005 | phone لا يطابق | GET بـ phone مختلف | 403 | حرج |
| ORD-ONE-006 | طلب غير موجود | GET بـ id غير صالح | 404 أو null | عالي |

---

## 5.4 طلباتي (GET /orders/mine/:merchantId/:sessionId)

| المعرّف | ORD-MNE-001 |
|----------|-------------|
| **العنوان** | جلب طلبات الجلسة |
| **الخطوات** | GET /orders/mine/merchantId/sess_123 |
| **النتيجة المتوقعة** | 200، مصفوفة طلبات لهذا التاجر والجلسة |
| **الأولوية** | عالي |

---

## 5.5 طلبات العميل (GET /orders/by-customer/:merchantId/:phone)

| المعرّف | ORD-CUS-001 |
|----------|-------------|
| **العنوان** | جلب طلبات العميل برقم الهاتف |
| **الخطوات** | GET /orders/by-customer/merchantId/966501234567 |
| **النتيجة المتوقعة** | 200، مصفوفة طلبات للعميل بهذا الرقم |
| **الأولوية** | عالي |

---

## 5.6 طلباتي من المتجر (GET /storefront/merchant/:merchantId/my-orders)

**Query:** sessionId (مطلوب إن لم يُمرّر phone)، phone؟، limit؟ (افتراضي 50).

| المعرّف | ORD-SF-001 |
|----------|-------------|
| **العنوان** | جلب طلباتي بـ sessionId |
| **الخطوات** | GET ?sessionId=sess_1 |
| **النتيجة المتوقعة** | 200، `{ orders }` — يبحث بـ sessionId، وإن لم يُمرّر phone يستخدم getPhoneBySession من Leads |
| **الأولوية** | حرج |

| المعرّف | ORD-SF-002 |
|----------|-------------|
| **العنوان** | جلب طلباتي بـ phone مباشرة |
| **الخطوات** | GET ?phone=966501234567 |
| **النتيجة المتوقعة** | 200، طلبات مرتبطة بهذا الرقم |
| **الأولوية** | عالي |

### سيناريوهات فشل

| المعرّف | العنوان | الخطوات | النتيجة المتوقعة | الأولوية |
|----------|---------|---------|-------------------|----------|
| ORD-SF-003 | sessionId و phone ناقصان | GET بدون أي منهما | 400 "merchantId و sessionId/phone مطلوبة" | عالي |

---

## 5.7 تحديث حالة الطلب (PATCH /orders/:id/status)

**Body:** `{ status: "paid" | "canceled" | "shipped" | "delivered" | "refunded" }`  
**المصادقة:** JWT تاجر (ضمن الـ controller — لا يوجد تحقق صريح من ملكية التاجر للطلب في الـ service، يُفترض أن الـ frontend يمرّر id طلب يخص التاجر).

| المعرّف | ORD-STS-001 |
|----------|-------------|
| **العنوان** | تحديث الحالة إلى paid |
| **الخطوات** | PATCH /orders/:id/status بـ `{ status: "paid" }` |
| **النتيجة المتوقعة** | 200، الطلب محدث |
| **الأولوية** | حرج |

| المعرّف | ORD-STS-002 |
|----------|-------------|
| **العنوان** | تحديث إلى canceled |
| **الخطوات** | PATCH بـ status: "canceled" |
| **النتيجة المتوقعة** | 200 |
| **الأولوية** | عالي |

---

## 5.8 تكاملات (Integrations)

| المعرّف | INT-ORD-001 |
|----------|-------------|
| **العنوان** | استقطاع المخزون عند إنشاء الطلب |
| **المتطلبات** | منتجات ذات مخزون محدود |
| **الخطوات** | إنشاء طلب بكمية تتوفر في المخزون |
| **النتيجة المتوقعة** | deductStock يُستدعى بنجاح؛ الطلب يُنشأ |
| **الأولوية** | حرج |

| المعرّف | INT-ORD-002 |
|----------|-------------|
| **العنوان** | تحديث إحصائيات العميل |
| **المتطلبات** | طلب مع customerId (JWT عميل) |
| **الخطوات** | إنشاء طلب كعميل مسجّل |
| **النتيجة المتوقعة** | customer.stats: totalOrders+1، totalSpend محدث، lastOrderId |
| **الأولوية** | حرج |

| المعرّف | INT-ORD-003 |
|----------|-------------|
| **العنوان** | إنشاء lead من الطلب |
| **المتطلبات** | طلب يحتوي customer مع name/phone |
| **الخطوات** | إنشاء طلب |
| **النتيجة المتوقعة** | lead جديد مع source: "order" |
| **الأولوية** | عالي |

| المعرّف | INT-ORD-004 |
|----------|-------------|
| **العنوان** | getPhoneBySession في طلباتي المتجر |
| **المتطلبات** | lead سابق بنفس sessionId و phoneNormalized |
| **الخطوات** | GET storefront/.../my-orders?sessionId= دون phone — يوجد lead لهذه الجلسة |
| **النتيجة المتوقعة** | يُستخرج الهاتف من الـ lead؛ الطلبات تُجلب حسب sessionId والهاتف |
| **الأولوية** | عالي |

---

## 6) قائمة تحقق نهائية (Checklist)

### إنشاء الطلب
- [ ] ORD-CRE-001، ORD-CRE-002: طلب ضيف + طلب عميل مسجّل
- [ ] ORD-CRE-003: كوبون صالح
- [ ] ORD-CRE-004: إنشاء lead من الطلب
- [ ] ORD-CRE-011: مخزون غير كافٍ — 400

### قائمة وتفاصيل
- [ ] ORD-LST-001، ORD-LST-002، ORD-LST-003: قائمة مع فلاتر
- [ ] ORD-ONE-001، ORD-ONE-004: ملكية الطلب (sessionId/phone)
- [ ] ORD-MNE-001، ORD-CUS-001: طلباتي، طلبات العميل
- [ ] ORD-SF-001، ORD-SF-002: طلباتي من المتجر (sessionId، phone، getPhoneBySession)

### تحديث الحالة
- [ ] ORD-STS-001، ORD-STS-002: paid، canceled

### التكاملات
- [ ] INT-ORD-001 إلى INT-ORD-004: مخزون، إحصائيات العميل، lead، getPhoneBySession

---

## 7) مراجع تقنية

| الملف | الوصف |
|-------|-------|
| `Backend/src/modules/orders/orders.controller.ts` | إنشاء، قائمة، طلباتي، تفاصيل، تحديث الحالة، طلبات العميل |
| `Backend/src/modules/orders/orders.service.ts` | create، ensureStockAndDeduct، resolveOrderCustomer، handleCouponUsage، handlePromotionUsage، createLeadFromOrder، updateCustomerStatsIfNeeded |
| `Backend/src/modules/orders/services/pricing.service.ts` | calculateOrderPricing (subtotal، promotions، coupon، product discounts) |
| `Backend/src/modules/orders/schemas/order.schema.ts` | Order، OrderCustomer، OrderProduct، OrderPricing |
| `Backend/src/modules/orders/dto/create-order.dto.ts` | CreateOrderDto — products، items (legacy)، customer، couponCode |
| `Backend/src/modules/storefront/storefront.service.ts` | getMyOrdersForSession (getPhoneBySession من Leads) |
| `Backend/src/modules/storefront/storefront.controller.ts` | GET merchant/:merchantId/my-orders |

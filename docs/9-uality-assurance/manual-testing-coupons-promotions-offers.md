# دليل الاختبار اليدوي — الكوبونات، العروض الترويجية، العروض (Coupons, Promotions, Offers)

> يغطي ثلاثة أقسام مهمة: **Coupons** (كوبونات الخصم)، **Promotions** (عروض السلة الترويجية)، **Offers** (عروض على مستوى المنتج).  
> **التركيز:** التكاملات — Orders/PricingService، Products، PromotionsCron.  
> **ملاحظة:** الكوبونات والعروض الترويجية كيانات منفصلة؛ العروض (Offers) مخزّنة داخل المنتجات (`product.offer`).

---

## 1) نطاق الدليل

| البند | الوصف |
|--------|--------|
| **Coupons** | كوبونات بكود (SUMMER2025) — خصم نسبة/مبلغ/شحن مجاني؛ تُطبق يدوياً عند الدفع |
| **Promotions** | عروض ترويجية على السلة — تُطبق تلقائياً حسب الشروط (منتجات، فئات، حد أدنى) |
| **Offers** | عروض على مستوى المنتج — مخزّنة في `product.offer`؛ تُعرض في المتجر |
| **التكامل** | PricingService يحسب كل الخصومات؛ OrdersService يستدعي incrementUsage بعد تأكيد الطلب |
| **PromotionsCron** | كل 5 دقائق — تفعيل المجدولة، إيقاف المنتهية |
| **المراجع** | `coupons.service.ts`, `promotions.service.ts`, `offers.service.ts`, `pricing.service.ts`, `orders.service.ts` |

---

## 2) البيئة والحسابات

| البند | القيمة (مثال) |
|--------|---------------|
| **البيئة** | Staging / UAT |
| **Base URL API** | `https://<your-api>/api` |
| **حساب تاجر** | JWT مع merchantId صالح (لـ Promotions) |
| **Coupons** | قد تكون بدون حماية (تحقق من الـ Guards) |
| **Offers** | GET عام (Public) |

---

## 3) مخطط التكامل

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│    Coupons      │     │   Promotions    │     │     Offers      │
│  (كود خصم)     │     │  (خصم السلة)   │     │ (عرض المنتج)    │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                       │
         │ validate/apply        │ getApplicable         │ listAllOffers
         │                       │                       │ (من Products)
         ▼                       ▼                       ▼
         └───────────────────────┴───────────────────────┘
                                 │
                                 ▼
                    ┌─────────────────────────┐
                    │    PricingService        │
                    │  calculateOrderPricing  │
                    │  (جمع كل الخصومات)     │
                    └────────────┬────────────┘
                                 │
                                 ▼
                    ┌─────────────────────────┐
                    │    OrdersService        │
                    │  incrementUsage         │
                    │  (بعد تأكيد الطلب)     │
                    └─────────────────────────┘

┌─────────────────┐
│ PromotionsCron  │  كل 5 دقائق: تفعيل scheduled، إيقاف منتهية
└─────────────────┘
```

---

## 4) قائمة العمليات (Process List)

### Coupons

1. **إنشاء كوبون** — POST /coupons.
2. **قائمة الكوبونات** — GET /coupons?merchantId=... (مع status، search، page، limit).
3. **تفاصيل كوبون** — GET /coupons/:id?merchantId=... .
4. **البحث بالكود** — GET /coupons/code/:code?merchantId=... .
5. **التحقق من صلاحية** — POST /coupons/validate.
6. **تطبيق كوبون** — POST /coupons/apply.
7. **تحديث كوبون** — PATCH /coupons/:id?merchantId=... .
8. **حذف كوبون** — DELETE /coupons/:id?merchantId=... .
9. **توليد أكواد** — POST /coupons/generate-codes.

### Promotions

10. **إنشاء عرض ترويجي** — POST /promotions (يتطلب JWT).
11. **قائمة العروض** — GET /promotions (يتطلب JWT).
12. **تفاصيل عرض** — GET /promotions/:id.
13. **تحديث عرض** — PATCH /promotions/:id.
14. **حذف عرض** — DELETE /promotions/:id.
15. **العروض المطبقة على السلة** — POST /promotions/applicable (عام).

### Offers

16. **قائمة عروض المنتجات** — GET /offers?merchantId=...&limit=&offset= (عام).

---

## 5) حالات الاختبار حسب القسم

---

## 5.1 Coupons

### العملية: إنشاء كوبون (POST /coupons)

**Body:** CreateCouponDto — merchantId، code، type، value، minOrderAmount، maxDiscountAmount، usageLimit، oneTimePerCustomer، allowedCustomers، storeWide، products، categories، startDate، endDate.

#### السيناريو السعيد

| المعرّف | CPN-CRE-001 |
|----------|-------------|
| **العنوان** | إنشاء كوبون نسبة مئوية |
| **الخطوات** | POST بـ `{ merchantId, code: "SUMMER25", type: "percentage", value: 20 }` |
| **النتيجة المتوقعة** | 201، كوبون مُنشأ، code مُحوّل إلى uppercase |
| **الأولوية** | حرج |

| المعرّف | CPN-CRE-002 |
|----------|-------------|
| **العنوان** | كوبون مبلغ ثابت |
| **الخطوات** | POST بـ `{ type: "fixed_amount", value: 50 }` |
| **النتيجة المتوقعة** | 201 |
| **الأولوية** | عالي |

| المعرّف | CPN-CRE-003 |
|----------|-------------|
| **العنوان** | كوبون على منتجات/فئات محددة |
| **الخطوات** | POST بـ `{ storeWide: false, products: [...], categories: [...] }` |
| **النتيجة المتوقعة** | 201، products و categories كـ ObjectIds |
| **الأولوية** | عالي |

#### سيناريوهات فشل

| المعرّف | العنوان | الخطوات | النتيجة المتوقعة |
|----------|---------|---------|-------------------|
| CPN-CRE-F01 | كود موجود مسبقاً | 409 (ConflictException) |
| CPN-CRE-F02 | بيانات ناقصة | 400 |

---

### العملية: التحقق من صلاحية (POST /coupons/validate)

**Body:** ValidateCouponDto — code، merchantId، customerPhone، cartItems[]، totalAmount.

#### السيناريو السعيد

| المعرّف | CPN-VAL-001 |
|----------|-------------|
| **العنوان** | كوبون صالح |
| **الخطوات** | POST validate بـ بيانات سلة صحيحة |
| **النتيجة المتوقعة** | 200، `{ valid: true, coupon, discountAmount }` |
| **الأولوية** | حرج |

#### سيناريوهات التحقق (الشروط)

| المعرّف | العنوان | الشرط | النتيجة |
|----------|---------|--------|---------|
| CPN-VAL-F01 | كوبون غير موجود | كود خاطئ | `{ valid: false, message: "الكوبون غير موجود" }` |
| CPN-VAL-F02 | كوبون غير نشط | status !== active | "الكوبون غير نشط" |
| CPN-VAL-F03 | لم يبدأ بعد | now < startDate | "الكوبون لم يبدأ بعد" |
| CPN-VAL-F04 | منتهي الصلاحية | now > endDate | "الكوبون منتهي الصلاحية" |
| CPN-VAL-F05 | استنفاد الاستخدام | usedCount >= usageLimit | "تم استنفاد عدد مرات استخدام الكوبون" |
| CPN-VAL-F06 | عميل غير مسموح | allowedCustomers وليس ضمن القائمة | "هذا الكوبون غير متاح لك" |
| CPN-VAL-F07 | استخدام مسبق (oneTimePerCustomer) | usedByCustomers.includes(phone) | "لقد استخدمت هذا الكوبون مسبقاً" |
| CPN-VAL-F08 | حد أدنى للطلب | totalAmount < minOrderAmount | "الحد الأدنى للطلب هو X" |
| CPN-VAL-F09 | لا ينطبق على السلة | storeWide=false و cartItems لا تحتوي منتجات/فئات مطابقة | "الكوبون لا ينطبق على المنتجات في السلة" |

---

### العملية: تطبيق كوبون (POST /coupons/apply)

**Body:** نفس ValidateCouponDto.

#### السيناريو السعيد

| المعرّف | CPN-APP-001 |
|----------|-------------|
| **العنوان** | تطبيق كوبون صالح |
| **الخطوات** | POST apply |
| **النتيجة المتوقعة** | 200، `{ discountAmount, finalAmount, coupon }` |
| **الأولوية** | حرج |

| المعرّف | CPN-APP-002 |
|----------|-------------|
| **العنوان** | نسبة مئوية مع maxDiscountAmount |
| **التحقق** | discountAmount لا يتجاوز maxDiscountAmount |
| **الأولوية** | عالي |

| المعرّف | CPN-APP-003 |
|----------|-------------|
| **العنوان** | كوبون شحن مجاني |
| **التحقق** | type=FREE_SHIPPING → discountAmount=0 (يُعالج في Orders) |
| **الأولوية** | عالي |

---

### العملية: توليد أكواد (POST /coupons/generate-codes)

**Body:** merchantId، count، length (اختياري).

#### السيناريو السعيد

| المعرّف | CPN-GEN-001 |
|----------|-------------|
| **العنوان** | توليد أكواد فريدة |
| **الخطوات** | POST generate-codes بـ `{ merchantId, count: 5, length: 8 }` |
| **النتيجة المتوقعة** | 200، `{ codes: string[] }` — أكواد غير موجودة مسبقاً |
| **الأولوية** | عالي |

---

## 5.2 Promotions

### العملية: إنشاء عرض ترويجي (POST /promotions)

**يتطلب JWT.**  
**Body:** CreatePromotionDto — name، type، discountValue، applyTo (all|categories|products)، categoryIds، productIds، minCartAmount، maxDiscountAmount، startDate، endDate، priority، usageLimit، countdownTimer.

#### السيناريو السعيد

| المعرّف | PRM-CRE-001 |
|----------|-------------|
| **العنوان** | إنشاء عرض نسبة مئوية |
| **الخطوات** | POST بـ `{ name, type: "percentage", discountValue: 15 }` |
| **النتيجة المتوقعة** | 201، عرض مُنشأ |
| **الأولوية** | حرج |

| المعرّف | PRM-CRE-002 |
|----------|-------------|
| **العنوان** | عرض على فئات/منتجات محددة |
| **الخطوات** | POST بـ `{ applyTo: "categories", categoryIds: [...] }` |
| **النتيجة المتوقعة** | 201 |
| **الأولوية** | عالي |

| المعرّف | PRM-CRE-003 |
|----------|-------------|
| **العنوان** | عرض حد السلة (CART_THRESHOLD) |
| **الخطوات** | POST بـ `{ type: "cart_threshold", minCartAmount: 500, discountValue: 50 }` |
| **النتيجة المتوقعة** | 201 |
| **الأولوية** | عالي |

---

### العملية: العروض المطبقة على السلة (POST /promotions/applicable)

**عام (Public).**  
**Body:** merchantId، cartItems[]، cartTotal.

#### السيناريو السعيد

| المعرّف | PRM-APP-001 |
|----------|-------------|
| **العنوان** | جلب العروض المطبقة |
| **الخطوات** | POST applicable بـ سلة تحتوي منتجات مطابقة |
| **النتيجة المتوقعة** | 200، `ApplicablePromotion[]` — مرتبة حسب priority |
| **الأولوية** | حرج |

| المعرّف | PRM-APP-002 |
|----------|-------------|
| **العنوان** | تطبيق applyTo |
| **التحقق** | ApplyTo.ALL → كل cartItems؛ PRODUCTS/CATEGORIES → فلترة |
| **الأولوية** | عالي |

| المعرّف | PRM-APP-003 |
|----------|-------------|
| **العنوان** | usageLimit |
| **التحقق** | عرض تجاوز timesUsed >= usageLimit لا يظهر |
| **الأولوية** | عالي |

---

### التكامل: PromotionsCron

| المعرّف | PRM-CRON-001 |
|----------|-------------|
| **العنوان** | تفعيل العروض المجدولة |
| **التحقق** | كل 5 دقائق: status=SCHEDULED و startDate <= now → ACTIVE |
| **الأولوية** | عالي |

| المعرّف | PRM-CRON-002 |
|----------|-------------|
| **العنوان** | إيقاف العروض المنتهية |
| **التحقق** | endDate < now → EXPIRED؛ timesUsed >= usageLimit → EXPIRED |
| **الأولوية** | عالي |

---

## 5.3 Offers

### العملية: قائمة عروض المنتجات (GET /offers)

**عام (Public).**  
**Query:** merchantId (مطلوب)، limit، offset.

#### السيناريو السعيد

| المعرّف | OFR-LST-001 |
|----------|-------------|
| **العنوان** | قائمة العروض |
| **الخطوات** | GET /offers?merchantId=... |
| **النتيجة المتوقعة** | 200، مصفوفة منتجات تحتوي عرضاً مفعّلاً |
| **التحقق** | كل عنصر: id، name، priceOld، priceNew، discountPct، url، isActive، period |
| **الأولوية** | حرج |

| المعرّف | OFR-LST-002 |
|----------|-------------|
| **العنوان** | isActive حسب التاريخ والنوع |
| **التحقق** | offer.enabled + offerHasValue + offerInDateRange |
| **الأولوية** | عالي |

| المعرّف | OFR-LST-003 |
|----------|-------------|
| **العنوان** | أنواع العرض: percentage، fixed_amount |
| **التحقق** | priceNew محسوب صحيح |
| **الأولوية** | عالي |

---

### ملاحظة: العروض على مستوى المنتج

العروض (Offers) **ليست كياناً منفصلاً** — تُخزَّن في `product.offer` عند إنشاء/تحديث المنتج. واجهة Offers تعرض المنتجات التي لها عرض مفعّل فقط.

---

## 5.4 التكامل مع Orders

### PricingService

| المعرّف | INT-PRC-001 |
|----------|-------------|
| **العنوان** | حساب السعر يجمع كل الخصومات |
| **التحقق** | calculateOrderPricing: productDiscounts + promotionDiscounts + couponDiscount |
| **الأولوية** | حرج |

| المعرّف | INT-PRC-002 |
|----------|-------------|
| **العنوان** | سياسة الخصومات |
| **التحقق** | discountPolicy: highest أو stack (من إعدادات التاجر) |
| **الأولوية** | عالي |

### OrdersService

| المعرّف | INT-ORD-001 |
|----------|-------------|
| **العنوان** | incrementUsage للكوبون بعد التأكيد |
| **التحقق** | ordersService يستدعي couponsService.incrementUsage(couponId, discountAmount, customerPhone) |
| **الأولوية** | حرج |

| المعرّف | INT-ORD-002 |
|----------|-------------|
| **العنوان** | incrementUsage للعرض الترويجي |
| **التحقق** | promotionsService.incrementUsage(promotionId, discountAmount) |
| **الأولوية** | حرج |

---

## 6) قائمة التحقق النهائية

### Coupons

- [ ] CPN-CRE-001، CPN-CRE-002، CPN-CRE-003
- [ ] CPN-VAL-001
- [ ] CPN-VAL-F01 إلى CPN-VAL-F09
- [ ] CPN-APP-001، CPN-APP-002، CPN-APP-003
- [ ] CPN-GEN-001
- [ ] CPN-CRE-F01، CPN-CRE-F02

### Promotions

- [ ] PRM-CRE-001، PRM-CRE-002، PRM-CRE-003
- [ ] PRM-APP-001، PRM-APP-002، PRM-APP-003
- [ ] PRM-CRON-001، PRM-CRON-002

### Offers

- [ ] OFR-LST-001، OFR-LST-002، OFR-LST-003

### التكامل

- [ ] INT-PRC-001، INT-PRC-002
- [ ] INT-ORD-001، INT-ORD-002

---

## 7) المراجع التقنية

| الملف | الوصف |
|-------|--------|
| `coupons.service.ts` | create، validate، apply، checkCouponStatus، checkCouponUsage، checkMinOrderAmount، checkApplicability، calculateDiscount |
| `promotions.service.ts` | create، getApplicablePromotions، incrementUsage، getApplicableItems، calculateDiscount |
| `promotions.cron.ts` | refreshStatuses كل 5 دقائق |
| `offers.service.ts` | listAllOffers، computeIsActive، _transformProductToOffer، calculateMultiCurrencyOfferPrices |
| `pricing.service.ts` | calculateOrderPricing، processCouponDiscount، calculatePromotionDiscounts |
| `orders.service.ts` | incrementUsage للكوبون والعرض الترويجي |
| `product.repository.ts` (offers) | findOffersByMerchant |

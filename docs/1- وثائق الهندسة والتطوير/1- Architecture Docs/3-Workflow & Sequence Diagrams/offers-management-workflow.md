# ورك فلو إدارة العروض - نظام كليم الشامل

## نظرة عامة على النظام

نظام كليم يدعم إدارة شاملة للعروض والتخفيضات مع إمكانيات متقدمة:

- **العروض في المنتجات**: كل منتج يمكن أن يحتوي على عرض واحد
- **إدارة الحملات**: عروض موسمية ومؤقتة
- **حساب الأسعار**: السعر الأصلي والمخفض والفعال
- **التفعيل التلقائي**: بدء وانتهاء العروض حسب التواريخ
- **البحث والتصفية**: حسب التاجر والحالة والنوع
- **التحليلات**: تتبع أداء العروض والمبيعات

## 1. مخطط التدفق العام (Flowchart)

```mermaid
graph TD
    A[إنشاء عرض جديد] --> B[اختيار المنتج<br/>productId أو منتج جديد]
    B --> C[إدخال تفاصيل العرض<br/>السعر الجديد، التواريخ]
    C --> D[التحقق من البيانات<br/>السعر والتواريخ]
    D --> E[حفظ العرض<br/>في المنتج]

    E --> F[تحديث السعر الفعال<br/>priceEffective calculation]
    F --> G[إعادة فهرسة المنتج<br/>في Qdrant]
    G --> H[تسجيل العرض<br/>في التحليلات]

    I[إدارة العروض] --> J[عرض قائمة العروض<br/>النشطة والمنتهية]
    J --> K[تعديل العروض<br/>الأسعار والتواريخ]
    K --> L[تفعيل/تعطيل العروض<br/>بدون حذف]
    L --> M[حذف العروض<br/>إزالة كاملة]

    N[التفعيل التلقائي] --> O[فحص العروض اليومية<br/>كل صباح]
    O --> P[تفعيل العروض الجديدة<br/>startAt <= today]
    P --> Q[تعطيل العروض المنتهية<br/>endAt < today]
    Q --> R[تحديث الأسعار الفعالة<br/>للمنتجات]

    S[البحث في العروض] --> T[إدخال معايير البحث<br/>التاجر، الحالة، النوع]
    T --> U[تطبيق المرشحات<br/>السعر، التاريخ، النشاط]
    U --> V[ترتيب النتائج<br/>حسب الصلة أو التاريخ]
    V --> W[إرجاع النتائج<br/>مع التفاصيل الكاملة]

    X[التحليلات والتقارير] --> Y[تتبع أداء العروض<br/>المبيعات والنقرات]
    Y --> Z[تحليل فعالية العروض<br/>معدل التحويل]
    Z --> AA[اقتراح تحسينات<br/>بناء على البيانات]
    AA --> BB[تحسين العروض<br/>ضبط الأسعار والتوقيت]
```

## 2. مخطط التسلسل (Sequence Diagram)

```mermaid
sequenceDiagram
    participant A as Admin
    participant O as Offers API
    participant P as Products Service
    participant DB as Database
    participant VS as Vector Service
    participant AN as Analytics
    participant CR as Cron Jobs

    Note over A,O: إنشاء عرض جديد
    A->>O: POST /products/{id}/offer<br/>{newPrice, startAt, endAt}

    Note over O,P: تحديث المنتج بالعرض
    O->>P: تحديث عرض المنتج
    P->>DB: حفظ العرض في المنتج
    DB-->>P: تأكيد الحفظ

    Note over P: حساب السعر الفعال
    P->>P: تحديث priceEffective
    P->>DB: تحديث السعر الفعال

    Note over P,VS: إعادة فهرسة المنتج
    P->>VS: إعادة فهرسة المنتج في Qdrant
    VS-->>P: تأكيد التحديث

    Note over AN: تسجيل العرض الجديد
    P->>AN: تسجيل إنشاء العرض
    AN-->>P: تأكيد التسجيل

    O-->>A: 200 OK<br/>{offer, status: active}

    Note over CR: التفعيل التلقائي اليومي
    CR->>P: فحص العروض اليومية
    P->>DB: البحث عن العروض المؤهلة
    DB-->>P: قائمة العروض

    alt عروض جديدة للتفعيل
        P->>DB: تفعيل العروض (startAt <= today)
        P->>VS: إعادة فهرسة المنتجات
        P->>AN: تسجيل التفعيل
    end

    alt عروض منتهية للتعطيل
        P->>DB: تعطيل العروض (endAt < today)
        P->>VS: إعادة فهرسة المنتجات
        P->>AN: تسجيل التعطيل
    end

    Note over A,O: البحث في العروض
    A->>O: GET /offers?merchantId=X&status=active

    Note over O,DB: استرجاع العروض
    O->>DB: البحث عن العروض حسب المعايير
    DB-->>O: قائمة العروض مع المنتجات

    Note over O: تطبيق المرشحات
    O->>O: ترتيب حسب التاريخ والأولوية
    O->>O: تصفية حسب الحالة والسعر

    O-->>A: 200 OK<br/>{offers: [...], count: X}
```

## 3. آلة الحالات (State Machine)

```mermaid
stateDiagram-v2
    [*] --> إنشاء_عرض: طلب إنشاء جديد

    إنشاء_عرض --> فحص_البيانات: التحقق من المدخلات
    فحص_البيانات --> خطأ_إنشاء: بيانات خاطئة
    فحص_البيانات --> حفظ_العرض: بيانات صحيحة

    حفظ_العرض --> تحديث_السعر_الفعال: حساب priceEffective
    تحديث_السعر_الفعال --> إعادة_الفهرسة: تحديث Qdrant
    إعادة_الفهرسة --> عرض_نشط: جاهز للاستخدام

    عرض_نشط --> تعديل_العرض: طلب تعديل
    تعديل_العرض --> فحص_التعديل: التحقق من التغييرات
    فحص_التعديل --> حفظ_التعديل: تحديث قاعدة البيانات
    حفظ_التعديل --> إعادة_الحساب: تحديث الأسعار
    إعادة_الحساب --> عرض_نشط: محدث

    عرض_نشط --> تفعيل_تلقائي: فحص يومي
    تفعيل_تلقائي --> فحص_التاريخ: startAt <= today
    فحص_التاريخ --> تفعيل_العرض: تاريخ البداية
    فحص_التاريخ --> فحص_الانتهاء: endAt < today

    تفعيل_العرض --> تحديث_الحالة: مفعل
    فحص_الانتهاء --> تعطيل_العرض: منتهي الصلاحية
    تعطيل_العرض --> تحديث_الحالة: معطل

    تحديث_الحالة --> عرض_نشط: محدث

    عرض_نشط --> حذف_العرض: طلب حذف
    حذف_العرض --> فحص_الحذف: التحقق من الإمكانية
    فحص_الحذف --> حذف_من_قاعدة_البيانات: إزالة العرض
    حذف_من_قاعدة_البيانات --> إعادة_الفهرسة: تحديث Qdrant
    إعادة_الفهرسة --> عرض_محذوف: تم الحذف

    عرض_نشط --> البحث_في_العروض: طلب بحث
    البحث_في_العروض --> تنفيذ_البحث: في MongoDB
    تنفيذ_البحث --> تطبيق_المرشحات: الحالة والتاريخ
    تطبيق_المرشحات --> ترتيب_النتائج: حسب الأولوية
    ترتيب_النتائج --> إرجاع_النتائج: للمستخدم

    خطأ_إنشاء --> [*]: إنهاء
    فحص_التعديل --> خطأ_تعديل: بيانات خاطئة
    خطأ_تعديل --> عرض_نشط: يستمر بالحالة السابقة
    فحص_الحذف --> خطأ_حذف: لا يمكن الحذف
    خطأ_حذف --> عرض_نشط: يستمر
```

### تعريف الحالات

| الحالة               | الوصف                          | الإجراءات المسموحة          |
| -------------------- | ------------------------------ | --------------------------- |
| `إنشاء_عرض`          | بدء عملية إنشاء عرض جديد       | جمع البيانات والتحقق        |
| `فحص_البيانات`       | التحقق من صحة البيانات المدخلة | التحقق من الأسعار والتواريخ |
| `حفظ_العرض`          | حفظ العرض في المنتج            | إدراج في قاعدة البيانات     |
| `تحديث_السعر_الفعال` | حساب السعر الفعال              | priceEffective calculation  |
| `إعادة_الفهرسة`      | تحديث فهرسة المنتج             | إعادة الفهرسة في Qdrant     |
| `عرض_نشط`            | العرض جاهز ومتاح               | جميع العمليات               |
| `تعديل_العرض`        | طلب تعديل العرض                | تعديل البيانات              |
| `حذف_العرض`          | طلب حذف العرض                  | إزالة العرض                 |
| `البحث_في_العروض`    | طلب بحث في العروض              | تنفيذ الاستعلام             |

## 4. مخطط سير العمل التجاري (BPMN)

```mermaid
graph TB
    Start([بدء]) --> OfferCreation[إنشاء عرض جديد]
    OfferCreation --> DataValidation[التحقق من البيانات]

    DataValidation --> DataValid{البيانات صحيحة؟}
    DataValid -->|لا| DataError[خطأ في البيانات]
    DataValid -->|نعم| SaveOffer[حفظ العرض]

    SaveOffer --> UpdateEffectivePrice[تحديث السعر الفعال]
    UpdateEffectivePrice --> ReindexProduct[إعادة الفهرسة]
    ReindexProduct --> OfferActive[عرض نشط]

    OfferActive --> OfferModification[تعديل العرض]
    OfferModification --> ValidateModification[فحص التعديل]
    ValidateModification --> SaveModification[حفظ التعديل]
    SaveModification --> ReindexProduct

    OfferActive --> OfferDeletion[حذف العرض]
    OfferDeletion --> ValidateDeletion[فحص الحذف]
    ValidateDeletion --> DeleteOffer[حذف العرض]
    DeleteOffer --> ReindexProduct

    OfferActive --> DailyActivation[التفعيل التلقائي]
    DailyActivation --> CheckStartDate[فحص تاريخ البداية]
    CheckStartDate --> ActivateOffer[تفعيل العرض]

    DailyActivation --> CheckEndDate[فحص تاريخ النهاية]
    CheckEndDate --> DeactivateOffer[تعطيل العرض]

    ActivateOffer --> UpdateStatus[تحديث الحالة]
    DeactivateOffer --> UpdateStatus
    UpdateStatus --> OfferActive

    OfferActive --> OffersSearch[البحث في العروض]
    OffersSearch --> ExecuteSearch[تنفيذ البحث]
    ExecuteSearch --> ApplyFilters[تطبيق المرشحات]
    ApplyFilters --> SortResults[ترتيب النتائج]
    SortResults --> ReturnResults[إرجاع النتائج]

    ReturnResults --> LogAnalytics[تسجيل التحليلات]
    LogAnalytics --> ContinueOperation[استمرار العمل]

    DataError --> End([نهاية])
    OfferActive --> End
```

## 5. تفاصيل تقنية لكل مرحلة

### 5.1 مرحلة الإنشاء والإعداد

#### 5.1.1 إنشاء عرض جديد

**Endpoint**: `POST /products/{productId}/offer`

**البيانات المطلوبة**:

```typescript
interface CreateOfferDto {
  enabled: boolean; // تفعيل العرض
  oldPrice?: number; // السعر الأصلي (اختياري)
  newPrice: number; // السعر الجديد (مطلوب)
  startAt?: string; // تاريخ البداية (ISO string)
  endAt?: string; // تاريخ النهاية (ISO string)
}
```

**عملية الإنشاء**:

```typescript
async function createOffer(productId: string, offerData: CreateOfferDto) {
  // 1. العثور على المنتج
  const product = await productsRepo.findById(productId);
  if (!product) {
    throw new NotFoundException('Product not found');
  }

  // 2. إنشاء العرض
  const offer = {
    enabled: offerData.enabled,
    oldPrice: offerData.oldPrice || product.price,
    newPrice: offerData.newPrice,
    startAt: offerData.startAt ? new Date(offerData.startAt) : new Date(),
    endAt: offerData.endAt ? new Date(offerData.endAt) : null,
  };

  // 3. تحديث المنتج
  product.offer = offer;
  product.hasActiveOffer = offerData.enabled;
  product.priceEffective = offerData.enabled
    ? offerData.newPrice
    : product.price;

  await product.save();

  // 4. إعادة فهرسة المنتج
  await vectorService.upsertProducts([
    {
      ...product,
      price: product.priceEffective,
    },
  ]);

  return product;
}
```

#### 5.1.2 حساب السعر الفعال

```typescript
function calculateEffectivePrice(product: ProductDocument): number {
  const offer = product.offer;

  if (offer?.enabled && offer.newPrice != null) {
    const now = new Date();
    const startValid = !offer.startAt || now >= new Date(offer.startAt);
    const endValid = !offer.endAt || now <= new Date(offer.endAt);

    if (startValid && endValid) {
      return Number(offer.newPrice);
    }
  }

  return Number(product.price);
}
```

### 5.2 مرحلة التفعيل التلقائي

#### 5.2.1 فحص العروض اليومي

```typescript
async function processDailyOffers() {
  const now = new Date();

  // 1. تفعيل العروض الجديدة
  const offersToActivate = await productsRepo.find({
    'offer.enabled': true,
    'offer.startAt': { $lte: now },
    'offer.endAt': { $gte: now },
  });

  for (const product of offersToActivate) {
    product.hasActiveOffer = true;
    product.priceEffective = product.offer!.newPrice!;
    await product.save();
  }

  // 2. تعطيل العروض المنتهية
  const offersToDeactivate = await productsRepo.find({
    'offer.enabled': true,
    'offer.endAt': { $lt: now },
  });

  for (const product of offersToDeactivate) {
    product.offer!.enabled = false;
    product.hasActiveOffer = false;
    product.priceEffective = product.price;
    await product.save();
  }

  // 3. إعادة فهرسة المنتجات المحدثة
  const updatedProducts = [...offersToActivate, ...offersToDeactivate];
  if (updatedProducts.length > 0) {
    await vectorService.upsertProducts(updatedProducts);
  }
}
```

#### 5.2.2 جدولة المهمة اليومية

```typescript
// في cron jobs
@Cron('0 0 * * *') // كل يوم في منتصف الليل
async function dailyOffersProcessing() {
  await offersService.processDailyOffers();
}
```

### 5.3 مرحلة البحث والعرض

#### 5.3.1 عرض قائمة العروض

**Endpoint**: `GET /offers?merchantId=X`

```typescript
async function listAllOffers(
  merchantId: string,
  pagination: PaginationOptions,
) {
  const products = await productsRepo.findOffersByMerchant(
    merchantId,
    pagination,
  );

  return products.map((product) => ({
    id: product._id,
    name: product.name,
    slug: product.slug,
    originalPrice: product.price,
    offerPrice: product.offer?.newPrice,
    discountPercentage: calculateDiscount(
      product.price,
      product.offer?.newPrice,
    ),
    isActive: isOfferActive(product.offer),
    startDate: product.offer?.startAt,
    endDate: product.offer?.endAt,
    image: product.images?.[0],
    url: generateProductUrl(product),
  }));
}
```

#### 5.3.2 حساب نسبة التخفيض

```typescript
function calculateDiscount(originalPrice: number, offerPrice: number): number {
  if (!offerPrice || !originalPrice || offerPrice >= originalPrice) {
    return 0;
  }

  return Math.round(((originalPrice - offerPrice) / originalPrice) * 100);
}
```

### 5.4 مرحلة إدارة العروض

#### 5.4.1 تعديل العرض

**Endpoint**: `PATCH /products/{productId}/offer`

```typescript
async function updateOffer(productId: string, offerData: UpdateOfferDto) {
  const product = await productsRepo.findById(productId);

  // تحديث العرض
  if (offerData.enabled !== undefined) {
    product.offer!.enabled = offerData.enabled;
  }
  if (offerData.newPrice !== undefined) {
    product.offer!.newPrice = offerData.newPrice;
  }
  if (offerData.startAt !== undefined) {
    product.offer!.startAt = new Date(offerData.startAt);
  }
  if (offerData.endAt !== undefined) {
    product.offer!.endAt = new Date(offerData.endAt);
  }

  // إعادة حساب السعر الفعال
  product.hasActiveOffer = isOfferActive(product.offer!);
  product.priceEffective = calculateEffectivePrice(product);

  await product.save();
  await vectorService.upsertProducts([product]);

  return product;
}
```

#### 5.4.2 حذف العرض

**Endpoint**: `DELETE /products/{productId}/offer`

```typescript
async function removeOffer(productId: string) {
  const product = await productsRepo.findById(productId);

  // إزالة العرض
  product.offer = undefined;
  product.hasActiveOffer = false;
  product.priceEffective = product.price;

  await product.save();
  await vectorService.upsertProducts([product]);

  return { message: 'Offer removed successfully' };
}
```

### 5.5 مرحلة التحليلات والتقارير

#### 5.5.1 تتبع أداء العروض

```typescript
async function trackOfferPerformance(offerId: string) {
  const offer = await offersRepo.findById(offerId);

  // تتبع المبيعات أثناء فترة العرض
  const salesDuringOffer = await ordersRepo.countSalesDuringPeriod(
    offer.productId,
    offer.startAt,
    offer.endAt || new Date(),
  );

  // تتبع النقرات والمشاهدات
  const views = await analytics.getOfferViews(offerId);
  const clicks = await analytics.getOfferClicks(offerId);

  const conversionRate = views > 0 ? (clicks / views) * 100 : 0;

  return {
    offerId,
    sales: salesDuringOffer,
    views,
    clicks,
    conversionRate,
    revenue: salesDuringOffer * offer.newPrice,
  };
}
```

#### 5.5.2 تحليل فعالية العروض

```typescript
async function analyzeOffersEffectiveness(merchantId: string) {
  const offers = await offersRepo.findByMerchant(merchantId);

  const analysis = {
    totalOffers: offers.length,
    activeOffers: offers.filter((o) => o.enabled).length,
    expiredOffers: offers.filter((o) => o.endAt && o.endAt < new Date()).length,
    averageDiscount: calculateAverageDiscount(offers),
    topPerformingOffers: await getTopPerformingOffers(offers),
    recommendations: await generateOfferRecommendations(offers),
  };

  return analysis;
}
```

## 6. معايير الأمان والحماية

### 6.1 التحقق من الملكية

```typescript
// التحقق من صلاحية التاجر للتعديل
const product = await productsRepo.findById(productId);
const user = await getCurrentUser();

if (product.merchantId.toString() !== merchantId && user.role !== 'ADMIN') {
  throw new ForbiddenException('Access denied');
}
```

### 6.2 Rate Limiting

- **إنشاء العروض**: 20 عرض/ساعة لكل تاجر
- **تعديل العروض**: 50 تعديل/ساعة لكل تاجر
- **البحث في العروض**: 100 طلب/ساعة لكل تاجر

### 6.3 منع العمليات الخطرة

```typescript
// منع إنشاء عرض بسعر أعلى من الأصلي
if (offerData.newPrice >= product.price) {
  throw new BadRequestException(
    'Offer price must be lower than original price',
  );
}

// منع تاريخ البداية بعد تاريخ النهاية
if (
  offerData.startAt &&
  offerData.endAt &&
  new Date(offerData.startAt) >= new Date(offerData.endAt)
) {
  throw new BadRequestException('Start date must be before end date');
}
```

## 7. مسارات الخطأ والتعامل معها

### 7.1 أخطاء الإنشاء

```javascript
INVALID_OFFER_DATA; // بيانات العرض غير صحيحة
PRODUCT_NOT_FOUND; // المنتج غير موجود
OFFER_PRICE_INVALID; // السعر غير صحيح
DATE_RANGE_INVALID; // نطاق التاريخ غير صحيح
```

### 7.2 أخطاء التعديل

```javascript
OFFER_NOT_FOUND; // العرض غير موجود
INVALID_STATUS_TRANSITION; // انتقال حالة غير صحيح
MERCHANT_NOT_AUTHORIZED; // التاجر غير مخول
```

### 7.3 أخطاء التفعيل التلقائي

```javascript
AUTO_ACTIVATION_FAILED; // فشل في التفعيل التلقائي
BULK_UPDATE_FAILED; // فشل في تحديث مجموعة العروض
INDEXING_FAILED; // فشل في إعادة الفهرسة
```

## 8. خطة الاختبار والتحقق

### 8.1 اختبارات الوحدة

- اختبار إنشاء العروض بمختلف الأنواع
- اختبار حساب السعر الفعال
- اختبار التفعيل التلقائي
- اختبار البحث في العروض

### 8.2 اختبارات التكامل

- اختبار التكامل مع المنتجات
- اختبار التكامل مع Qdrant
- اختبار التكامل مع التحليلات
- اختبار معالجة الأخطاء

### 8.3 اختبارات الأداء

- اختبار التفعيل التلقائي للعروض الكثيرة
- اختبار البحث في العروض الكبيرة
- اختبار إعادة الفهرسة الجماعية
- اختبار استهلاك الذاكرة

---

_تم إنشاء هذا التوثيق بواسطة نظام كليم لإدارة المتاجر الذكية_

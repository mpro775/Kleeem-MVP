# ورك فلو إدارة المنتجات - نظام كليم الشامل

## نظرة عامة على النظام

نظام كليم يدعم إدارة شاملة للمنتجات مع تكامل متقدم للمزامنة والفهرسة:

- **مصادر المنتجات**: يدوي، API (Zid/Salla)، سكريبر
- **إدارة البيانات**: CRUD كامل مع دعم الصور والعروض
- **فهرسة ذكية**: تكامل مع Qdrant للبحث المتجهي
- **مزامنة تلقائية**: من المتاجر الخارجية
- **إدارة المخزون**: تتبع الكميات والتوفر
- **البحث المتقدم**: نصي ومتجهي مع pagination

## 1. مخطط التدفق العام (Flowchart)

```mermaid
graph TD
    A[إنشاء/تحديث منتج] --> B[تحديد المصدر<br/>يدوي/API/سكريبر]
    B --> C[جمع البيانات<br/>اسم، سعر، صور، فئة]
    C --> D[التحقق من البيانات<br/>الصحة والتنسيق]
    D --> E[حفظ المنتج<br/>في قاعدة البيانات]

    E --> F[معالجة الصور<br/>تحميل ورفع للتخزين]
    F --> G[إنشاء العروض<br/>إن وجدت]
    G --> H[توليد Slug<br/>للوصول العام]

    H --> I[فهرسة المنتج<br/>في Qdrant للبحث المتجهي]
    I --> J[تحديث المتجر<br/>إن كان مرتبطاً]
    J --> K[تسجيل التحليلات<br/>مقاييس الإنشاء]

    L[البحث والاستعلام] --> M[تحديد نوع البحث<br/>نصي/متجهي/مرشح]
    M --> N[إنشاء الاستعلام<br/>حسب المعايير]
    N --> O[تنفيذ البحث<br/>في قاعدة البيانات]
    O --> P[تطبيق المرشحات<br/>السعر، الفئة، التوفر]
    P --> Q[ترتيب النتائج<br/>حسب الصلة/السعر/التاريخ]
    Q --> R[إرجاع النتائج<br/>مع pagination]

    S[مزامنة المنتجات] --> T[جلب البيانات<br/>من Zid/Salla API]
    T --> U[معالجة الاستجابة<br/>تحويل التنسيق]
    U --> V[تحديث قاعدة البيانات<br/>upsert العناصر]
    V --> W[فهرسة المنتجات الجديدة<br/>في Qdrant]
    W --> X[تحديث حالة المزامنة<br/>نجاح/فشل]
    X --> Y[إشعار النظام<br/>بالتحديثات]

    Z[إدارة المخزون] --> AA[تحديث الكميات<br/>من المصادر الخارجية]
    AA --> BB[تحديث حالة التوفر<br/>متاح/غير متاح]
    BB --> CC[إشعار العملاء<br/>بالتغييرات]
    CC --> DD[تسجيل حركة المخزون<br/>للتقارير]

    EE[إدارة الصور] --> FF[رفع الصور<br/>للتخزين السحابي]
    FF --> GG[إنشاء thumbnails<br/>أحجام متعددة]
    GG --> HH[تحسين الصور<br/>ضغط وتنسيق]
    HH --> II[حفظ المراجع<br/>في قاعدة البيانات]
```

## 2. مخطط التسلسل (Sequence Diagram)

```mermaid
sequenceDiagram
    participant A as Admin/Integration
    participant P as Products API
    participant DB as Database
    participant VS as Vector Service
    participant MS as Media Service
    participant AN as Analytics
    participant EX as External APIs
    participant ST as Storefront

    Note over A,P: إنشاء منتج جديد
    A->>P: POST /products<br/>{name, price, category, images...}

    Note over P,DB: حفظ المنتج الأولي
    P->>DB: إنشاء وثيقة المنتج (status: pending)
    DB-->>P: معرف المنتج

    Note over P,MS: معالجة الصور
    P->>MS: رفع الصور للتخزين السحابي
    MS-->>P: روابط الصور المحسنة
    P->>DB: تحديث روابط الصور

    Note over P,VS: فهرسة للبحث المتجهي
    P->>VS: فهرسة المنتج في Qdrant
    VS-->>P: تأكيد الفهرسة

    Note over P,DB: تحديث الحالة النهائية
    P->>DB: تحديث حالة المنتج (active)
    P->>DB: حفظ slug وpublicUrl
    DB-->>P: تأكيد الحفظ

    Note over P,AN: تسجيل المقاييس
    P->>AN: تسجيل إنشاء المنتج
    AN-->>P: تأكيد التسجيل

    P-->>A: 201 Created<br/>{product, status: active}

    Note over A,P: البحث عن المنتجات
    A->>P: GET /products/search?q=laptop&category=electronics

    Note over P,DB: تنفيذ البحث
    P->>DB: بحث نصي في MongoDB
    DB-->>P: نتائج البحث الأولية

    alt لا توجد نتائج نصية كافية
        P->>VS: بحث متجهي في Qdrant
        VS-->>P: نتائج البحث المتجهي
    end

    Note over P: تطبيق المرشحات والترتيب
    P->>P: ترتيب حسب الصلة والسعر
    P->>P: تطبيق pagination

    P-->>A: 200 OK<br/>{items, meta: {count, hasMore}}

    Note over EX,P: مزامنة من مصادر خارجية
    EX->>P: Webhook من Zid/Salla API
    P->>P: تطبيع البيانات الخارجية
    P->>DB: upsert المنتج
    P->>VS: فهرسة المنتج الجديد
    P->>AN: تسجيل المزامنة
```

## 3. آلة الحالات (State Machine)

```mermaid
stateDiagram-v2
    [*] --> إنشاء_منتج: طلب إنشاء جديد

    إنشاء_منتج --> فحص_البيانات: التحقق من البيانات
    فحص_البيانات --> خطأ_إنشاء: بيانات خاطئة
    فحص_البيانات --> حفظ_أولي: بيانات صحيحة

    حفظ_أولي --> معالجة_الصور: رفع الصور للتخزين
    معالجة_الصور --> إنشاء_العروض: إعداد العروض الخاصة
    إنشاء_العروض --> توليد_slug: إنشاء رابط عام
    توليد_slug --> فهرسة_المنتج: إضافة للبحث المتجهي

    فهرسة_المنتج --> فحص_الفهرسة: التحقق من النجاح
    فحص_الفهرسة --> فهرسة_ناجحة: تم بنجاح
    فحص_الفهرسة --> خطأ_فهرسة: فشل في Qdrant

    فهرسة_ناجحة --> تحديث_الحالة: منتج نشط
    خطأ_فهرسة --> تحديث_الحالة: منتج نشط (بدون فهرسة)

    تحديث_الحالة --> منتج_نشط: جاهز للاستخدام

    منتج_نشط --> تعديل_البيانات: طلب تحديث
    تعديل_البيانات --> فحص_التحديث: التحقق من التغييرات
    فحص_التحديث --> حفظ_التحديث: تحديث قاعدة البيانات
    حفظ_التحديث --> إعادة_فهرسة: تحديث البحث المتجهي
    إعادة_فهرسة --> تحديث_الحالة

    منتج_نشط --> حذف_منتج: طلب حذف
    حذف_منتج --> فحص_الحذف: التحقق من الإمكانية
    فحص_الحذف --> حذف_من_قاعدة_البيانات: إزالة الوثيقة
    حذف_من_قاعدة_البيانات --> حذف_من_الفهرس: إزالة من Qdrant
    حذف_من_الفهرس --> إنهاء_الحذف: تم بنجاح

    منتج_نشط --> مزامنة_خارجية: استلام تحديث خارجي
    مزامنة_خارجية --> تطبيع_البيانات: تحويل التنسيق
    تطبيع_البيانات --> تحديث_المنتج: upsert في قاعدة البيانات
    تحديث_المنتج --> إعادة_فهرسة
    إعادة_فهرسة --> تسجيل_المزامنة: تحديث المقاييس

    منتج_نشط --> البحث_عن_المنتج: طلب بحث
    البحث_عن_المنتج --> تنفيذ_البحث: في MongoDB/Qdrant
    تنفيذ_البحث --> تطبيق_المرشحات: السعر، الفئة، التوفر
    تطبيق_المرشحات --> ترتيب_النتائج: حسب الصلة
    ترتيب_النتائج --> إرجاع_النتائج: مع pagination

    خطأ_إنشاء --> [*]: إنهاء
    خطأ_فهرسة --> منتج_نشط: يستمر بدون فهرسة
    خطأ_تعديل --> منتج_نشط: يستمر بالحالة السابقة
    خطأ_حذف --> منتج_نشط: يستمر
```

### تعريف الحالات


| الحالة                   | الوصف                                               | الإجراءات المسموحة           |
| ------------------------------ | -------------------------------------------------------- | --------------------------------------------- |
| `إنشاء_منتج`          | بدء عملية إنشاء منتج جديد           | جمع البيانات المطلوبة      |
| `فحص_البيانات`      | التحقق من صحة البيانات المدخلة | التحقق من الأنواع والقيم |
| `حفظ_أولي`              | حفظ المنتج في قاعدة البيانات     | إدراج الوثيقة الأولية      |
| `معالجة_الصور`      | رفع وتحسين الصور                           | تحميل للتخزين السحابي      |
| `إنشاء_العروض`      | إعداد العروض والتخفيضات             | حساب الأسعار الجديدة        |
| `توليد_slug`              | إنشاء رابط عام للمنتج                  | توليد slug فريد                      |
| `فهرسة_المنتج`      | إضافة المنتج للبحث المتجهي        | فهرسة في Qdrant                        |
| `فحص_الفهرسة`        | التحقق من نجاح الفهرسة                | اختبار الإضافة                   |
| `تحديث_الحالة`      | تحديث حالة المنتج                         | تعيين الحالة النهائية      |
| `منتج_نشط`              | المنتج جاهز ومتاح للبحث              | جميع العمليات                     |
| `تعديل_البيانات`  | طلب تحديث بيانات المنتج              | تعديل الحقول                       |
| `حذف_منتج`              | طلب حذف المنتج                               | إزالة من النظام                  |
| `مزامنة_خارجية`    | استلام تحديث من مصدر خارجي         | تحديث تلقائي                       |
| `البحث_عن_المنتج` | طلب بحث عن منتجات                          | تنفيذ الاستعلام                 |

## 4. مخطط سير العمل التجاري (BPMN)

```mermaid
graph TB
    Start([بدء]) --> ProductCreation[إنشاء منتج جديد]
    ProductCreation --> ValidateData[التحقق من البيانات]

    ValidateData --> DataValid{البيانات صحيحة؟}
    DataValid -->|لا| ErrorValidation[خطأ في التحقق]
    DataValid -->|نعم| SaveProduct[حفظ المنتج الأولي]

    SaveProduct --> ProcessImages[معالجة الصور]
    ProcessImages --> CreateOffers[إنشاء العروض]
    CreateOffers --> GenerateSlug[توليد Slug]
    GenerateSlug --> IndexProduct[فهرسة المنتج]

    IndexProduct --> IndexSuccess{نجحت الفهرسة؟}
    IndexSuccess -->|نعم| UpdateStatusActive[تحديث الحالة لنشط]
    IndexSuccess -->|لا| UpdateStatusActiveNoIndex[تحديث الحالة بدون فهرسة]

    UpdateStatusActive --> LogMetrics[تسجيل المقاييس]
    UpdateStatusActiveNoIndex --> LogMetrics

    LogMetrics --> EndSuccess([نجاح])

    ErrorValidation --> EndError([خطأ])

    subgraph "البحث والاستعلام"
        SearchRequest[طلب بحث] --> ExecuteSearch[تنفيذ البحث]
        ExecuteSearch --> ApplyFilters[تطبيق المرشحات]
        ApplyFilters --> SortResults[ترتيب النتائج]
        SortResults --> ReturnResults[إرجاع النتائج]
    end

    subgraph "المزامنة الخارجية"
        ExternalUpdate[تحديث خارجي] --> NormalizeData[تطبيع البيانات]
        NormalizeData --> UpsertProduct[تحديث/إدراج المنتج]
        UpsertProduct --> ReindexProduct[إعادة الفهرسة]
        ReindexProduct --> LogSync[تسجيل المزامنة]
    end

    subgraph "إدارة المخزون"
        StockUpdate[تحديث المخزون] --> UpdateAvailability[تحديث التوفر]
        UpdateAvailability --> NotifyCustomers[إشعار العملاء]
        NotifyCustomers --> LogStock[تسجيل حركة المخزون]
    end
```

## 5. تفاصيل تقنية لكل مرحلة

### 5.1 مرحلة الإنشاء والإعداد

#### 5.1.1 إنشاء منتج جديد

**Endpoint**: `POST /products`

**البيانات المطلوبة**:

```typescript
interface CreateProductDto {
  // البيانات الأساسية
  name: string; // اسم المنتج (مطلوب)
  price: number; // السعر (مطلوب)
  category: string; // معرف الفئة (مطلوب)
  currency?: Currency; // العملة (افتراضي: SAR)

  // البيانات الاختيارية
  description?: string; // وصف المنتج
  images?: string[]; // روابط الصور
  specsBlock?: string[]; // مواصفات المنتج
  keywords?: string[]; // كلمات مفتاحية
  isAvailable?: boolean; // حالة التوفر
  offer?: OfferDto; // معلومات العرض

  // مصدر البيانات
  source?: ProductSource; // manual/api/scraper
  originalUrl?: string; // رابط المصدر
  sourceUrl?: string; // رابط إضافي
  externalId?: string; // معرف خارجي

  // روابط عامة
  slug?: string; // رابط مخصص
  storefrontSlug?: string; // رابط المتجر
  storefrontDomain?: string; // نطاق مخصص
}
```

#### 5.1.2 حفظ المنتج الأولي

```typescript
const product = await productsRepo.create({
  merchantId: new Types.ObjectId(merchantId),
  name: dto.name,
  price: dto.price,
  category: new Types.ObjectId(dto.category),
  currency: dto.currency || Currency.SAR,
  description: dto.description || '',
  images: dto.images || [],
  specsBlock: dto.specsBlock || [],
  keywords: dto.keywords || [],
  isAvailable: dto.isAvailable ?? true,
  source: mapSource(dto.source),
  status: 'active',
  syncStatus: dto.source === ProductSource.API ? 'pending' : 'ok',
});
```

#### 5.1.3 معالجة الصور

```typescript
// رفع الصور للتخزين السحابي
const uploadResult = await productMediaService.uploadProductImagesToMinio(
  productId,
  merchantId,
  files,
);

// تحديث قاعدة البيانات
product.images = uploadResult.urls;
await product.save();
```

#### 5.1.4 إنشاء العروض

```typescript
// إنشاء عرض جديد
const offer = {
  enabled: true,
  oldPrice: product.price,
  newPrice: dto.offer.newPrice,
  startAt: new Date(dto.offer.startAt),
  endAt: new Date(dto.offer.endAt),
};

product.offer = offer;
product.hasActiveOffer = true;
product.priceEffective = offer.newPrice;
```

### 5.2 مرحلة الفهرسة والبحث

#### 5.2.1 فهرسة المنتج في Qdrant

```typescript
// تحويل المنتج للتنسيق المناسب للفهرسة
const embeddableProduct = toEmbeddable(product, storefront, categoryName);

// إضافة لقاعدة البيانات المتجهية
await vectorService.upsertProducts([embeddableProduct]);
```

#### 5.2.2 البحث النصي في MongoDB

```typescript
// بحث بسيط في MongoDB
const textResults = await productsRepo.searchText(merchantId, query, limit);

// بحث متقدم مع المرشحات
const filteredResults = await productsRepo.list(merchantId, {
  category: categoryId,
  minPrice: minPrice,
  maxPrice: maxPrice,
  isAvailable: true,
  limit: 20,
  cursor: cursor,
});
```

#### 5.2.3 البحث المتجهي في Qdrant

```typescript
// البحث المتجهي للمنتجات المشابهة
const vectorResults = await vectorService.searchProducts({
  query,
  merchantId,
  topK: 10,
  filters: {
    category: categoryId,
    isAvailable: true,
  },
});
```

### 5.3 مرحلة المزامنة الخارجية

#### 5.3.1 مزامنة من Zid API

```typescript
// استلام webhook من Zid
async function handleZidWebhook(payload: ZidWebhookPayload) {
  const externalProduct: ExternalProduct = {
    externalId: payload.id,
    name: payload.name,
    price: payload.price,
    images: payload.images,
    category: payload.category,
    stock: payload.stock,
    raw: payload,
  };

  // تحديث أو إنشاء المنتج
  await productsSyncService.upsertExternalProduct(
    payload.merchantId,
    'zid',
    externalProduct,
  );
}
```

#### 5.3.2 مزامنة من Salla API

```typescript
// معالجة webhook من Salla
async function handleSallaWebhook(payload: SallaWebhookPayload) {
  const externalProduct: ExternalProduct = {
    externalId: payload.data.id,
    name: payload.data.name,
    price: payload.data.price,
    images: payload.data.images,
    category: payload.data.category_id,
    stock: payload.data.stock_quantity,
    raw: payload.data,
  };

  await productsSyncService.upsertExternalProduct(
    payload.merchant_id,
    'salla',
    externalProduct,
  );
}
```

### 5.4 مرحلة إدارة المخزون

#### 5.4.1 تحديث حالة التوفر

```typescript
// تحديث تلقائي من المصادر الخارجية
async function updateProductAvailability(productId: string, stock: number) {
  const isAvailable = stock > 0;

  await productsRepo.updateOne(
    { _id: new Types.ObjectId(productId) },
    {
      $set: {
        isAvailable,
        lowQuantity: stock <= 10 ? 'نفد قريباً' : undefined,
        lastSync: new Date(),
      },
    },
  );
}
```

#### 5.4.2 إشعارات المخزون

```typescript
// إشعار العملاء بانخفاض المخزون
async function notifyLowStock(productId: string) {
  const product = await productsRepo.findById(productId);

  if (product?.lowQuantity) {
    await notificationService.sendToCustomers({
      type: 'low_stock',
      productId,
      productName: product.name,
      message: `المنتج ${product.name} نفد قريباً من المخزون`,
    });
  }
}
```

## 6. معايير الأمان والحماية

### 6.1 التحقق من الملكية

```typescript
// التحقق من صلاحية التاجر
const product = await productsService.findOne(productId);
if (String(product.merchantId) !== String(jwtMerchantId)) {
  throw new ForbiddenException('Access denied');
}
```

### 6.2 تشفير الصور

```typescript
// تشفير أسماء الملفات
const encryptedFileName = encryptFileName(originalName);
const presignedUrl = await minioService.getPresignedUrl(encryptedFileName);
```

### 6.3 Rate Limiting

- **إنشاء المنتجات**: 50 منتج/ساعة لكل تاجر
- **رفع الصور**: 100 صورة/ساعة
- **البحث**: 1000 طلب/ساعة

## 7. مسارات الخطأ والتعامل معها

### 7.1 أخطاء الإنشاء

```javascript
INVALID_PRODUCT_DATA; // بيانات المنتج غير صحيحة
DUPLICATE_EXTERNAL_ID; // معرف خارجي مكرر
MERCHANT_NOT_FOUND; // التاجر غير موجود
CATEGORY_NOT_FOUND; // الفئة غير موجودة
```

### 7.2 أخطاء الفهرسة

```javascript
VECTOR_INDEX_FAILED; // فشل في فهرسة Qdrant
INVALID_EMBEDDING; // بيانات غير مناسبة للفهرسة
QDRANT_CONNECTION_ERROR; // مشكلة في الاتصال بـ Qdrant
```

### 7.3 أخطاء المزامنة

```javascript
EXTERNAL_API_ERROR; // خطأ في API المصدر
INVALID_WEBHOOK_DATA; // بيانات webhook غير صحيحة
SYNC_TIMEOUT; // انتهت مهلة المزامنة
```

## 8. خطة الاختبار والتحقق

### 8.1 اختبارات الوحدة

- اختبار إنشاء المنتجات بمختلف المصادر
- اختبار فهرسة المنتجات في Qdrant
- اختبار البحث النصي والمتجهي
- اختبار رفع ومعالجة الصور

### 8.2 اختبارات التكامل

- اختبار المزامنة من Zid/Salla
- اختبار webhook endpoints
- اختبار تكامل مع المتاجر
- اختبار معالجة الأخطاء

### 8.3 اختبارات الأداء

- اختبار الحمل على البحث
- اختبار فهرسة المنتجات بالجملة
- اختبار رفع الصور المتعددة
- اختبار استهلاك الذاكرة

---

_تم إنشاء هذا التوثيق بواسطة نظام كليم لإدارة المتاجر الذكية_

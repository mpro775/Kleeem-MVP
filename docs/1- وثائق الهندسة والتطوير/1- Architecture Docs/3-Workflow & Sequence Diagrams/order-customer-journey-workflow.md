# ورك فلو رحلة الطلب مع تسجيل العميل - نظام كليم الشامل

## نظرة عامة على النظام

نظام كليم يدعم رحلة طلب متكاملة مع تسجيل العملاء وتتبع شامل:

- **تسجيل العميل**: إنشاء سجل عميل محتمل مع بياناته
- **إنشاء الطلب**: ربط العميل بالطلب من خلال sessionId
- **تتبع الطلبات**: للعميل من خلال رقم الهاتف
- **إدارة الحالات**: تحديث حالة الطلب (pending/paid/shipped)
- **التكامل الخارجي**: مع منصات التجارة الإلكترونية
- **الإشعارات**: للعميل والتاجر حول الطلب

## 1. مخطط التدفق العام (Flowchart)

```mermaid
graph TD
    A[بدء رحلة العميل] --> B[تسجيل العميل المحتمل<br/>جمع البيانات الأساسية]
    B --> C[تصفح المنتجات<br/>إضافة للسلة]
    C --> D[إدخال بيانات الطلب<br/>العنوان والدفع]

    D --> E{نوع الطلب}
    E -->|طلب عادي| F[إنشاء الطلب<br/>ربط بالعميل]
    E -->|طلب سريع| G[إنشاء طلب مؤقت<br/>بدون تسجيل]

    F --> H[حفظ بيانات العميل<br/>في قاعدة البيانات]
    H --> I[إنشاء سجل الطلب<br/>مع المنتجات]
    I --> J[حساب الإجمالي<br/>مع الضرائب والشحن]

    J --> K[إرسال تأكيد الطلب<br/>للعميل والتاجر]
    K --> L[تحديث حالة الطلب<br/>pending أو paid]

    M[إدارة الطلب] --> N[عرض تفاصيل الطلب<br/>للعميل والتاجر]
    N --> O[تحديث حالة الطلب<br/>paid/shipped/delivered]
    O --> P[إرسال إشعارات<br/>للعميل]

    Q[تتبع الطلبات] --> R[البحث بالهاتف<br/>عرض جميع الطلبات]
    R --> S[عرض تفاصيل كل طلب<br/>مع الحالة والمنتجات]
    S --> T[إمكانية إلغاء الطلب<br/>إذا كان pending]

    U[تكامل خارجي] --> V[استلام طلب من Zid/Salla<br/>تحديث الحالة]
    V --> W[مزامنة البيانات<br/>مع النظام الخارجي]
    W --> X[إشعار العميل<br/>بالتحديثات]

    Y[تحليلات العملاء] --> Z[تتبع سلوك العميل<br/>المنتجات المفضلة]
    Z --> AA[اقتراحات مخصصة<br/>عروض ومنتجات]
    AA --> BB[تحسين الخدمة<br/>بناء على البيانات]
```

## 2. مخطط التسلسل (Sequence Diagram)

```mermaid
sequenceDiagram
    participant C as Customer
    participant W as Website/Widget
    participant A as Auth System
    participant LS as Leads Service
    participant OS as Orders Service
    participant DB as Database
    participant PM as Payment Gateway
    participant AN as Analytics
    participant EX as External APIs

    Note over C,W: بدء رحلة العميل
    C->>W: زيارة المتجر/الودجت
    W->>A: التحقق من الجلسة
    A-->>W: sessionId جديد أو موجود

    Note over C,W: تسجيل العميل
    C->>W: إدخال البيانات (اسم، هاتف، بريد)
    W->>LS: إنشاء سجل عميل محتمل
    LS->>DB: حفظ بيانات العميل
    DB-->>LS: تأكيد الحفظ
    LS-->>W: معرف العميل

    Note over C,W: تصفح وإضافة منتجات
    C->>W: تصفح المنتجات
    C->>W: إضافة منتجات للسلة
    W->>DB: تحديث السلة مؤقتاً

    Note over C,W: إتمام الطلب
    C->>W: تأكيد الطلب
    W->>W: التحقق من السلة
    W->>OS: إنشاء الطلب
    OS->>DB: حفظ الطلب (pending)
    OS->>LS: ربط الطلب بالعميل
    LS->>DB: تحديث سجل العميل

    Note over OS,PM: معالجة الدفع
    alt طلب مدفوع
        OS->>PM: طلب الدفع
        PM-->>OS: تأكيد الدفع
        OS->>DB: تحديث حالة الطلب (paid)
    else طلب مجاني
        OS->>DB: تحديث حالة الطلب (confirmed)
    end

    Note over OS,DB: إشعارات الطلب
    OS->>DB: حفظ تفاصيل الطلب
    OS->>W: إرسال تأكيد الطلب
    W-->>C: عرض تأكيد الطلب

    Note over AN: تسجيل المقاييس
    OS->>AN: تسجيل إنشاء الطلب
    AN-->>OS: تأكيد التسجيل

    Note over C,W: تتبع الطلب
    C->>W: طلب تتبع الطلبات
    W->>OS: جلب طلبات العميل
    OS->>DB: البحث بالهاتف/الجلسة
    DB-->>OS: قائمة الطلبات
    OS-->>W: تفاصيل الطلبات
    W-->>C: عرض تاريخ الطلبات

    Note over EX,OS: تحديث من مصادر خارجية
    EX->>OS: webhook من Zid/Salla
    OS->>OS: تطبيع البيانات
    OS->>DB: تحديث الطلب
    OS->>W: إشعار العميل بالتحديث
```

## 3. آلة الحالات (State Machine)

```mermaid
stateDiagram-v2
    [*] --> زيارة_المتجر: دخول العميل

    زيارة_المتجر --> فحص_الجلسة: التحقق من الجلسة
    فحص_الجلسة --> جلسة_جديدة: لا توجد جلسة
    فحص_الجلسة --> جلسة_موجودة: جلسة نشطة

    جلسة_جديدة --> تسجيل_العميل: إدخال البيانات
    جلسة_موجودة --> تسجيل_العميل: تحديث البيانات

    تسجيل_العميل --> فحص_البيانات: التحقق من الصحة
    فحص_البيانات --> بيانات_صحيحة: بيانات مقبولة
    فحص_البيانات --> خطأ_البيانات: بيانات خاطئة

    بيانات_صحيحة --> حفظ_العميل: في قاعدة البيانات
    خطأ_البيانات --> إعادة_إدخال_البيانات: تصحيح الأخطاء

    حفظ_العميل --> تصفح_المنتجات: استعراض الكتالوج
    تصفح_المنتجات --> إضافة_للسلة: اختيار منتجات
    إضافة_للسلة --> مراجعة_الطلب: فحص المنتجات
    مراجعة_الطلب --> إتمام_الطلب: تأكيد الشراء

    إتمام_الطلب --> إنشاء_الطلب: حفظ الطلب
    إنشاء_الطلب --> ربط_بالعميل: ربط الطلب بالعميل
    ربط_بالعميل --> حساب_الإجمالي: السعر النهائي
    حساب_الإجمالي --> معالجة_الدفع: دفع أو تأكيد

    معالجة_الدفع --> دفع_ناجح: تم الدفع
    معالجة_الدفع --> دفع_فاشل: مشكلة في الدفع
    معالجة_الدفع --> طلب_مجاني: بدون دفع

    دفع_ناجح --> تحديث_الحالة: مدفوع
    دفع_فاشل --> إعادة_الدفع: محاولة أخرى
    طلب_مجاني --> تحديث_الحالة: مؤكد

    تحديث_الحالة --> إرسال_التأكيد: للعميل والتاجر
    إرسال_التأكيد --> طلب_نشط: جاهز للمعالجة

    طلب_نشط --> تتبع_الطلب: عرض التفاصيل
    تتبع_الطلب --> تحديث_الحالة_الجديدة: تغيير الحالة
    تحديث_الحالة_الجديدة --> إشعار_العميل: بالتحديث

    تحديث_الحالة_الجديدة --> مُشحون: تم الشحن
    تحديث_الحالة_الجديدة --> مُسلم: تم التسليم
    تحديث_الحالة_الجديدة --> مُلغي: تم الإلغاء

    مُشحون --> إشعار_العميل
    مُسلم --> إشعار_العميل
    مُلغي --> إشعار_العميل

    إعادة_الدفع --> معالجة_الدفع: محاولة أخرى
    خطأ_البيانات --> تسجيل_العميل: إعادة المحاولة
```

### تعريف الحالات

| الحالة                 | الوصف                    | الإجراءات المسموحة        |
| ---------------------- | ------------------------ | ------------------------- |
| `زيارة_المتجر`         | دخول العميل للمتجر       | بدء الجلسة                |
| `فحص_الجلسة`           | التحقق من وجود جلسة نشطة | إنشاء أو استرجاع الجلسة   |
| `تسجيل_العميل`         | إدخال بيانات العميل      | جمع الاسم، الهاتف، البريد |
| `فحص_البيانات`         | التحقق من صحة البيانات   | التحقق من التنسيق والقيم  |
| `حفظ_العميل`           | حفظ بيانات العميل        | إدراج في قاعدة البيانات   |
| `تصفح_المنتجات`        | استعراض الكتالوج         | البحث والتصفية            |
| `إضافة_للسلة`          | إضافة منتجات للسلة       | تحديث السلة               |
| `مراجعة_الطلب`         | فحص المنتجات والأسعار    | التأكد من الطلب           |
| `إتمام_الطلب`          | تأكيد الشراء             | إنشاء الطلب               |
| `إنشاء_الطلب`          | حفظ الطلب في النظام      | إدراج الطلب               |
| `ربط_بالعميل`          | ربط الطلب بالعميل        | تحديث سجل العميل          |
| `حساب_الإجمالي`        | حساب السعر النهائي       | الضرائب والشحن            |
| `معالجة_الدفع`         | معالجة عملية الدفع       | دفع أو تأكيد              |
| `إرسال_التأكيد`        | إرسال تأكيد الطلب        | للعميل والتاجر            |
| `طلب_نشط`              | الطلب جاهز للمعالجة      | تتبع وتحديث               |
| `تتبع_الطلب`           | عرض تفاصيل الطلب         | للعميل والتاجر            |
| `تحديث_الحالة_الجديدة` | تغيير حالة الطلب         | من قبل التاجر             |

## 4. مخطط سير العمل التجاري (BPMN)

```mermaid
graph TB
    Start([بدء]) --> CustomerVisit[زيارة المتجر]
    CustomerVisit --> SessionCheck[فحص الجلسة]

    SessionCheck --> SessionValid{جلسة نشطة؟}
    SessionValid -->|نعم| CustomerRegistration[تسجيل العميل]
    SessionValid -->|لا| NewSession[إنشاء جلسة جديدة]

    NewSession --> CustomerRegistration
    CustomerRegistration --> DataValidation[فحص البيانات]

    DataValidation --> DataValid{البيانات صحيحة؟}
    DataValid -->|نعم| SaveCustomer[حفظ العميل]
    DataValid -->|لا| DataError[خطأ في البيانات]

    SaveCustomer --> ProductBrowsing[تصفح المنتجات]
    ProductBrowsing --> AddToCart[إضافة للسلة]
    AddToCart --> OrderReview[مراجعة الطلب]
    OrderReview --> OrderConfirmation[تأكيد الطلب]

    OrderConfirmation --> OrderCreation[إنشاء الطلب]
    OrderCreation --> CustomerLinking[ربط بالعميل]
    CustomerLinking --> TotalCalculation[حساب الإجمالي]
    TotalCalculation --> PaymentProcessing[معالجة الدفع]

    PaymentProcessing --> PaymentResult{الدفع ناجح؟}
    PaymentResult -->|نعم| StatusUpdatePaid[تحديث الحالة: مدفوع]
    PaymentResult -->|لا| PaymentRetry[إعادة الدفع]

    StatusUpdatePaid --> SendConfirmation[إرسال التأكيد]
    PaymentRetry --> PaymentProcessing

    SendConfirmation --> OrderActive[طلب نشط]

    OrderActive --> OrderTracking[تتبع الطلب]
    OrderTracking --> StatusUpdate[تحديث الحالة]
    StatusUpdate --> CustomerNotification[إشعار العميل]

    StatusUpdate --> OrderStatus{الحالة الجديدة}
    OrderStatus -->|مشحون| ShippingUpdate[تحديث الشحن]
    OrderStatus -->|مسلم| DeliveryUpdate[تحديث التسليم]
    OrderStatus -->|ملغي| CancellationUpdate[تحديث الإلغاء]

    ShippingUpdate --> CustomerNotification
    DeliveryUpdate --> CustomerNotification
    CancellationUpdate --> CustomerNotification

    DataError --> CustomerRegistration[إعادة المحاولة]

    subgraph "التكامل الخارجي"
        ExternalUpdate[تحديث خارجي] --> DataNormalization[تطبيع البيانات]
        DataNormalization --> OrderUpdate[تحديث الطلب]
        OrderUpdate --> StatusSync[مزامنة الحالة]
        StatusSync --> CustomerNotification
    end

    subgraph "تحليلات العملاء"
        CustomerBehavior[سلوك العميل] --> PreferenceAnalysis[تحليل التفضيلات]
        PreferenceAnalysis --> PersonalizedOffers[عروض مخصصة]
        PersonalizedOffers --> ServiceImprovement[تحسين الخدمة]
    end
```

## 5. تفاصيل تقنية لكل مرحلة

### 5.1 مرحلة تسجيل العميل

#### 5.1.1 تسجيل العميل المحتمل

**Endpoint**: `POST /merchants/{merchantId}/leads`

**البيانات المطلوبة**:

```typescript
interface CreateLeadDto {
  sessionId: string; // معرف الجلسة
  data: {
    // بيانات العميل
    name: string; // الاسم
    phone: string; // رقم الهاتف
    email?: string; // البريد الإلكتروني (اختياري)
    address?: object; // العنوان (اختياري)
  };
  source?: string; // مصدر التسجيل
}
```

**عملية المعالجة**:

```typescript
async function createLead(merchantId: string, leadData: CreateLeadDto) {
  // 1. تطبيع رقم الهاتف
  const phoneNormalized = normalizePhone(leadData.data.phone);

  // 2. إنشاء سجل العميل
  const lead = await leadsRepo.create({
    merchantId,
    sessionId: leadData.sessionId,
    data: leadData.data,
    phoneNormalized,
    source: leadData.source || 'manual',
  });

  // 3. إشعار النظام
  await notifications.notifyAdmin({
    type: 'new_lead',
    leadId: lead._id,
    merchantId,
    customerName: leadData.data.name,
    customerPhone: leadData.data.phone,
  });

  return lead;
}
```

#### 5.1.2 تطبيع رقم الهاتف

```typescript
function normalizePhone(phone: string): string {
  // إزالة جميع الرموز غير الرقمية
  let normalized = phone.replace(/[^\d]/g, '');

  // إضافة رمز الدولة إذا كان مفقوداً
  if (normalized.length === 9) {
    normalized = '966' + normalized; // السعودية
  } else if (normalized.length === 10 && normalized.startsWith('0')) {
    normalized = '966' + normalized.slice(1);
  }

  return normalized;
}
```

### 5.2 مرحلة إنشاء الطلب

#### 5.2.1 إنشاء الطلب

**Endpoint**: `POST /orders`

**البيانات المطلوبة**:

```typescript
interface CreateOrderDto {
  merchantId: string; // معرف التاجر
  sessionId: string; // معرف الجلسة
  customer: {
    // بيانات العميل
    name: string; // الاسم
    phone: string; // رقم الهاتف
    email?: string; // البريد (اختياري)
    address?: object; // العنوان (اختياري)
  };
  products: [
    {
      // منتجات الطلب
      product?: string; // معرف المنتج (اختياري)
      name: string; // اسم المنتج
      price: number; // السعر
      quantity: number; // الكمية
    },
  ];
  source?: string; // مصدر الطلب
  metadata?: object; // بيانات إضافية
}
```

**عملية المعالجة**:

```typescript
async function createOrder(orderData: CreateOrderDto) {
  // 1. تطبيع رقم الهاتف
  const phoneNormalized = normalizePhone(orderData.customer.phone);

  // 2. إنشاء الطلب
  const order = await ordersRepo.create({
    merchantId: orderData.merchantId,
    sessionId: orderData.sessionId,
    customer: {
      ...orderData.customer,
      phoneNormalized,
    },
    products: orderData.products,
    source: orderData.source || 'manual',
    status: 'pending',
  });

  // 3. ربط العميل بالطلب
  try {
    await leadsService.create(orderData.merchantId, {
      sessionId: orderData.sessionId,
      data: orderData.customer,
      source: 'order',
    });
  } catch (error) {
    // لا نفشل إنشاء الطلب إذا فشل تسجيل العميل
    logger.warn('Failed to create lead for order', error);
  }

  // 4. إشعار التاجر
  await notifications.notifyMerchant(orderData.merchantId, {
    type: 'new_order',
    orderId: order._id,
    customerName: orderData.customer.name,
    totalAmount: calculateTotal(orderData.products),
  });

  return order;
}
```

#### 5.2.2 حساب الإجمالي

```typescript
function calculateTotal(products: OrderProduct[]): number {
  return products.reduce((total, product) => {
    return total + product.price * product.quantity;
  }, 0);
}
```

### 5.3 مرحلة تتبع الطلبات

#### 5.3.1 البحث عن طلبات العميل

**Endpoint**: `GET /orders/by-customer/{merchantId}/{phone}`

```typescript
async function findByCustomer(merchantId: string, phone: string) {
  // تطبيع رقم الهاتف
  const phoneNormalized = normalizePhone(phone);

  // البحث في الطلبات
  const orders = await ordersRepo
    .find({
      merchantId,
      'customer.phoneNormalized': phoneNormalized,
    })
    .sort({ createdAt: -1 });

  return orders;
}
```

#### 5.3.2 عرض تفاصيل الطلب

**Endpoint**: `GET /orders/{orderId}`

```typescript
async function getOrderDetails(orderId: string) {
  const order = await ordersRepo.findById(orderId);

  if (!order) {
    throw new NotFoundException('Order not found');
  }

  // إضافة معلومات إضافية
  const orderWithDetails = {
    ...order.toObject(),
    customerInfo: await getCustomerInfo(order.customer.phoneNormalized),
    totalAmount: calculateTotal(order.products),
    estimatedDelivery: calculateEstimatedDelivery(
      order.createdAt,
      order.merchantId,
    ),
  };

  return orderWithDetails;
}
```

### 5.4 مرحلة إدارة حالة الطلب

#### 5.4.1 تحديث حالة الطلب

**Endpoint**: `PATCH /orders/{orderId}/status`

```typescript
async function updateOrderStatus(orderId: string, newStatus: OrderStatus) {
  const order = await ordersRepo.findById(orderId);

  if (!order) {
    throw new NotFoundException('Order not found');
  }

  // التحقق من الانتقال الصحيح للحالة
  const validTransitions = getValidStatusTransitions(order.status);
  if (!validTransitions.includes(newStatus)) {
    throw new BadRequestException('Invalid status transition');
  }

  // تحديث الحالة
  order.status = newStatus;
  if (newStatus === 'paid') order.paidAt = new Date();
  if (newStatus === 'shipped') order.shippedAt = new Date();
  if (newStatus === 'delivered') order.deliveredAt = new Date();

  await order.save();

  // إشعار العميل
  await notifications.notifyCustomer(order.customer.phoneNormalized, {
    type: 'order_status_updated',
    orderId: order._id,
    newStatus,
    merchantId: order.merchantId,
  });

  return order;
}
```

#### 5.4.2 الانتقالات الصحيحة للحالات

```typescript
function getValidStatusTransitions(currentStatus: OrderStatus): OrderStatus[] {
  const transitions: Record<OrderStatus, OrderStatus[]> = {
    pending: ['paid', 'canceled'],
    paid: ['shipped', 'canceled', 'refunded'],
    shipped: ['delivered', 'canceled'],
    delivered: ['refunded'],
    canceled: [], // لا يمكن تغيير حالة الطلب الملغي
    refunded: [], // لا يمكن تغيير حالة الطلب المسترد
  };

  return transitions[currentStatus] || [];
}
```

### 5.5 مرحلة التكامل الخارجي

#### 5.5.1 استلام طلب من Zid

```typescript
async function handleZidOrder(zidOrder: ZidOrderWebhook) {
  const orderData = {
    merchantId: zidOrder.merchantId,
    sessionId: generateSessionId(),
    customer: {
      name: zidOrder.customer.name,
      phone: zidOrder.customer.phone,
      email: zidOrder.customer.email,
    },
    products: zidOrder.items.map((item) => ({
      name: item.name,
      price: item.price,
      quantity: item.quantity,
    })),
    externalId: zidOrder.id,
    source: 'zid',
  };

  const order = await ordersService.create(orderData);

  // تحديث حالة الطلب حسب حالة Zid
  if (zidOrder.status === 'paid') {
    await ordersService.updateStatus(order._id, 'paid');
  }

  return order;
}
```

#### 5.5.2 مزامنة مع Salla

```typescript
async function handleSallaOrder(sallaOrder: SallaOrderWebhook) {
  const orderData = {
    merchantId: sallaOrder.merchant_id,
    sessionId: generateSessionId(),
    customer: {
      name: sallaOrder.customer.name,
      phone: sallaOrder.customer.mobile,
      email: sallaOrder.customer.email,
    },
    products: sallaOrder.items.map((item) => ({
      name: item.name,
      price: item.price,
      quantity: item.quantity,
    })),
    externalId: sallaOrder.id,
    source: 'salla',
  };

  return await ordersService.create(orderData);
}
```

## 6. معايير الأمان والحماية

### 6.1 التحقق من الملكية

```typescript
// التحقق من صلاحية التاجر للوصول للطلب
const order = await ordersService.findOne(orderId);
const user = await getCurrentUser();

if (order.merchantId !== user.merchantId && user.role !== 'ADMIN') {
  throw new ForbiddenException('Access denied');
}
```

### 6.2 Rate Limiting

- **إنشاء الطلبات**: 10 طلبات/دقيقة لكل عميل
- **عرض الطلبات**: 50 طلب/دقيقة لكل عميل
- **تحديث الحالة**: 20 تحديث/دقيقة لكل تاجر

### 6.3 منع الاحتيال

```typescript
// فحص الطلبات المشبوهة
async function detectSuspiciousOrder(order: Order) {
  const recentOrders = await ordersRepo.findRecentByPhone(
    order.customer.phoneNormalized,
    24 * 60 * 60 * 1000, // آخر 24 ساعة
  );

  if (recentOrders.length > 10) {
    // طلب مراجعة يدوية
    order.status = 'under_review';
    await notifications.alertAdmin('suspicious_activity', {
      customerPhone: order.customer.phoneNormalized,
      orderCount: recentOrders.length,
    });
  }
}
```

## 7. مسارات الخطأ والتعامل معها

### 7.1 أخطاء التسجيل

```javascript
INVALID_CUSTOMER_DATA; // بيانات العميل غير صحيحة
DUPLICATE_PHONE; // رقم هاتف موجود مسبقاً
SESSION_EXPIRED; // انتهت صلاحية الجلسة
MERCHANT_NOT_FOUND; // التاجر غير موجود
```

### 7.2 أخطاء الطلب

```javascript
INVALID_ORDER_DATA; // بيانات الطلب غير صحيحة
PRODUCT_NOT_FOUND; // منتج غير موجود
INSUFFICIENT_STOCK; // كمية غير كافية
PAYMENT_FAILED; // فشل في الدفع
```

### 7.3 أخطاء التتبع

```javascript
ORDER_NOT_FOUND; // الطلب غير موجود
CUSTOMER_NOT_AUTHORIZED; // العميل غير مخول
INVALID_STATUS_TRANSITION; // انتقال حالة غير صحيح
```

## 8. خطة الاختبار والتحقق

### 8.1 اختبارات الوحدة

- اختبار إنشاء العملاء والطلبات
- اختبار تطبيع أرقام الهواتف
- اختبار حساب الإجمالي
- اختبار تحديث حالة الطلب

### 8.2 اختبارات التكامل

- اختبار التكامل مع منصات التجارة
- اختبار webhook endpoints
- اختبار إشعارات العملاء
- اختبار معالجة الأخطاء

### 8.3 اختبارات الأداء

- اختبار الحمل على إنشاء الطلبات
- اختبار البحث في الطلبات
- اختبار إشعارات التحديثات
- اختبار استهلاك الذاكرة

---

_تم إنشاء هذا التوثيق بواسطة نظام كليم لإدارة المتاجر الذكية_

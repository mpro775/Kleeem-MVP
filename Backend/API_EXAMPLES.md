# أمثلة استخدام API - نظام العروض والكوبونات

## 📌 معلومات أساسية

**Base URL:** `http://localhost:3000/api`  
**Authentication:** Bearer Token (حسب نظامك الحالي)

---

## 🎫 Coupons API

### 1. إنشاء كوبون خصم نسبة مئوية

```http
POST /coupons
Content-Type: application/json

{
  "merchantId": "507f1f77bcf86cd799439011",
  "code": "WELCOME10",
  "description": "خصم ترحيبي 10% للعملاء الجدد",
  "type": "percentage",
  "value": 10,
  "minOrderAmount": 100,
  "maxDiscountAmount": 50,
  "oneTimePerCustomer": true,
  "storeWide": true,
  "startDate": "2025-01-01T00:00:00Z",
  "endDate": "2025-12-31T23:59:59Z"
}
```

**الاستجابة:**
```json
{
  "_id": "67890...",
  "code": "WELCOME10",
  "type": "percentage",
  "value": 10,
  "status": "active",
  "usedCount": 0,
  "createdAt": "2025-11-06T..."
}
```

---

### 2. إنشاء كوبون مبلغ ثابت

```http
POST /coupons

{
  "merchantId": "507f1f77bcf86cd799439011",
  "code": "SAVE50",
  "description": "وفر 50 ريال على طلبك",
  "type": "fixed_amount",
  "value": 50,
  "minOrderAmount": 200,
  "usageLimit": 100,
  "storeWide": true
}
```

---

### 3. إنشاء كوبون شحن مجاني

```http
POST /coupons

{
  "merchantId": "507f1f77bcf86cd799439011",
  "code": "FREESHIP",
  "description": "شحن مجاني",
  "type": "free_shipping",
  "value": 0,
  "minOrderAmount": 150,
  "storeWide": true
}
```

---

### 4. إنشاء كوبون لعملاء محددين

```http
POST /coupons

{
  "merchantId": "507f1f77bcf86cd799439011",
  "code": "VIP20",
  "description": "كوبون VIP خاص",
  "type": "percentage",
  "value": 20,
  "allowedCustomers": [
    "+966501234567",
    "+966509876543"
  ],
  "storeWide": true
}
```

---

### 5. إنشاء كوبون لمنتجات محددة

```http
POST /coupons

{
  "merchantId": "507f1f77bcf86cd799439011",
  "code": "ELECTRONICS15",
  "description": "15% على الإلكترونيات",
  "type": "percentage",
  "value": 15,
  "storeWide": false,
  "products": [
    "507f1f77bcf86cd799439012",
    "507f1f77bcf86cd799439013"
  ]
}
```

---

### 6. إنشاء كوبون لفئات محددة

```http
POST /coupons

{
  "merchantId": "507f1f77bcf86cd799439011",
  "code": "FASHION25",
  "description": "25% على الأزياء",
  "type": "percentage",
  "value": 25,
  "storeWide": false,
  "categories": [
    "507f1f77bcf86cd799439014"
  ]
}
```

---

### 7. التحقق من صلاحية كوبون

```http
POST /coupons/validate
Content-Type: application/json

{
  "code": "WELCOME10",
  "merchantId": "507f1f77bcf86cd799439011",
  "customerPhone": "+966501234567",
  "cartItems": [
    {
      "productId": "507f1f77bcf86cd799439012",
      "price": 300,
      "quantity": 2
    },
    {
      "productId": "507f1f77bcf86cd799439013",
      "price": 150,
      "quantity": 1
    }
  ],
  "totalAmount": 750
}
```

**الاستجابة:**
```json
{
  "valid": true,
  "coupon": {
    "_id": "...",
    "code": "WELCOME10",
    "type": "percentage",
    "value": 10
  },
  "discountAmount": 75
}
```

**استجابة خطأ:**
```json
{
  "valid": false,
  "message": "الكوبون منتهي الصلاحية"
}
```

---

### 8. الحصول على قائمة الكوبونات

```http
GET /coupons?merchantId=507f1f77bcf86cd799439011&status=active&limit=20&page=1
```

**الاستجابة:**
```json
{
  "coupons": [
    {
      "_id": "...",
      "code": "WELCOME10",
      "type": "percentage",
      "value": 10,
      "usedCount": 15,
      "usageLimit": 100,
      "status": "active"
    }
  ],
  "total": 45,
  "page": 1,
  "limit": 20
}
```

---

### 9. توليد كوبونات عشوائية

```http
POST /coupons/generate-codes
Content-Type: application/json

{
  "merchantId": "507f1f77bcf86cd799439011",
  "count": 50,
  "length": 8
}
```

**الاستجابة:**
```json
{
  "codes": [
    "A1B2C3D4",
    "E5F6G7H8",
    "I9J0K1L2",
    ...
  ]
}
```

---

### 10. تحديث كوبون

```http
PATCH /coupons/67890...?merchantId=507f1f77bcf86cd799439011
Content-Type: application/json

{
  "value": 15,
  "maxDiscountAmount": 75,
  "status": "inactive"
}
```

---

## 🎉 Promotions API

### 1. إنشاء عرض ترويجي على المتجر كامل

```http
POST /promotions
Content-Type: application/json

{
  "merchantId": "507f1f77bcf86cd799439011",
  "name": "الجمعة البيضاء",
  "description": "خصم 30% على كل شيء",
  "type": "percentage",
  "discountValue": 30,
  "maxDiscountAmount": 500,
  "minCartAmount": 300,
  "applyTo": "all",
  "priority": 100,
  "countdownTimer": true,
  "startDate": "2025-11-20T00:00:00Z",
  "endDate": "2025-11-27T23:59:59Z"
}
```

---

### 2. عرض ترويجي على فئة محددة

```http
POST /promotions

{
  "merchantId": "507f1f77bcf86cd799439011",
  "name": "خصم الإلكترونيات",
  "description": "20% على جميع الأجهزة الإلكترونية",
  "type": "percentage",
  "discountValue": 20,
  "applyTo": "categories",
  "categoryIds": [
    "507f1f77bcf86cd799439014"
  ],
  "priority": 50,
  "startDate": "2025-11-01T00:00:00Z",
  "endDate": "2025-11-30T23:59:59Z"
}
```

---

### 3. عرض "خصم تلقائي عند التجاوز"

```http
POST /promotions

{
  "merchantId": "507f1f77bcf86cd799439011",
  "name": "اشتري بـ 500 واحصل على خصم 100",
  "type": "cart_threshold",
  "discountValue": 100,
  "minCartAmount": 500,
  "applyTo": "all",
  "priority": 75
}
```

---

### 4. عرض مبلغ ثابت على منتجات محددة

```http
POST /promotions

{
  "merchantId": "507f1f77bcf86cd799439011",
  "name": "خصم 50 ريال على الهواتف",
  "type": "fixed_amount",
  "discountValue": 50,
  "applyTo": "products",
  "productIds": [
    "507f1f77bcf86cd799439012",
    "507f1f77bcf86cd799439013"
  ],
  "priority": 60
}
```

---

### 5. الحصول على العروض المطبقة على سلة

```http
POST /promotions/applicable
Content-Type: application/json

{
  "merchantId": "507f1f77bcf86cd799439011",
  "cartItems": [
    {
      "productId": "507f1f77bcf86cd799439012",
      "categoryId": "507f1f77bcf86cd799439014",
      "price": 400,
      "quantity": 2
    }
  ],
  "cartTotal": 800
}
```

**الاستجابة:**
```json
[
  {
    "promotion": {
      "_id": "...",
      "name": "خصم الإلكترونيات",
      "priority": 50
    },
    "discountAmount": 160,
    "applicableItems": [...]
  },
  {
    "promotion": {
      "_id": "...",
      "name": "الجمعة البيضاء",
      "priority": 100
    },
    "discountAmount": 240,
    "applicableItems": [...]
  }
]
```

---

## 🛍️ Products API (العروض)

### 1. تحديث منتج بعرض Buy X Get Y

```http
PATCH /products/507f1f77bcf86cd799439012
Content-Type: application/json

{
  "offer": {
    "enabled": true,
    "type": "buy_x_get_y",
    "buyQuantity": 2,
    "getQuantity": 1,
    "getProductId": null,
    "getDiscount": 100,
    "startAt": "2025-11-01T00:00:00Z",
    "endAt": "2025-11-30T23:59:59Z"
  }
}
```

---

### 2. تحديث منتج بعرض كمية

```http
PATCH /products/507f1f77bcf86cd799439012

{
  "offer": {
    "enabled": true,
    "type": "quantity_based",
    "quantityThreshold": 5,
    "quantityDiscount": 25,
    "startAt": "2025-11-01T00:00:00Z",
    "endAt": "2025-11-30T23:59:59Z"
  }
}
```

---

### 3. تحديث منتج بخصم نسبة

```http
PATCH /products/507f1f77bcf86cd799439012

{
  "offer": {
    "enabled": true,
    "type": "percentage",
    "discountValue": 30,
    "oldPrice": 500,
    "newPrice": 350,
    "startAt": "2025-11-01T00:00:00Z",
    "endAt": "2025-11-30T23:59:59Z"
  }
}
```

---

### 4. إضافة أسعار بعملات متعددة للمنتج

```http
PATCH /products/507f1f77bcf86cd799439012

{
  "price": 100,
  "currency": "SAR",
  "prices": {
    "SAR": 100,
    "USD": 27,
    "YER": 6500
  }
}
```

---

## 💱 Currency API

### 1. تحديث إعدادات العملات للتاجر

```http
PATCH /merchants/507f1f77bcf86cd799439011
Content-Type: application/json

{
  "currencySettings": {
    "baseCurrency": "SAR",
    "supportedCurrencies": ["SAR", "USD", "YER", "EUR"],
    "exchangeRates": {
      "USD": 3.75,
      "YER": 0.015,
      "EUR": 4.10
    },
    "roundingStrategy": "round",
    "roundToNearest": 5
  }
}
```

---

### 2. تحديث سياسة الخصومات

```http
PATCH /merchants/507f1f77bcf86cd799439011

{
  "discountPolicy": {
    "stackCouponsWithPromotions": true,
    "applyOrder": "product_first"
  }
}
```

---

## 📦 Orders API

### 1. إنشاء طلب مع كوبون وعملة محددة

```http
POST /orders
Content-Type: application/json

{
  "merchantId": "507f1f77bcf86cd799439011",
  "sessionId": "sess-abc123",
  "customer": {
    "name": "أحمد محمد",
    "phone": "+966501234567",
    "address": {
      "line1": "شارع الملك فهد",
      "city": "الرياض",
      "postalCode": "12345"
    }
  },
  "products": [
    {
      "product": "507f1f77bcf86cd799439012",
      "name": "منتج 1",
      "price": 300,
      "quantity": 2
    },
    {
      "product": "507f1f77bcf86cd799439013",
      "name": "منتج 2",
      "price": 150,
      "quantity": 1
    }
  ],
  "couponCode": "WELCOME10",
  "currency": "SAR",
  "source": "storefront"
}
```

**الاستجابة:**
```json
{
  "_id": "...",
  "merchantId": "507f1f77bcf86cd799439011",
  "customer": {...},
  "products": [...],
  "pricing": {
    "subtotal": 750,
    "promotions": [
      {
        "id": "...",
        "name": "خصم الإلكترونيات",
        "amount": 60
      }
    ],
    "coupon": {
      "code": "WELCOME10",
      "amount": 75
    },
    "products": [
      {
        "id": "...",
        "name": "منتج 1",
        "amount": 30
      }
    ],
    "totalDiscount": 165,
    "shippingCost": 0,
    "shippingDiscount": 0,
    "total": 585
  },
  "currency": "SAR",
  "discountPolicy": "stack",
  "appliedCouponCode": "WELCOME10",
  "status": "pending",
  "createdAt": "2025-11-06T..."
}
```

---

### 2. إنشاء طلب بدون كوبون

```http
POST /orders

{
  "merchantId": "507f1f77bcf86cd799439011",
  "sessionId": "sess-xyz789",
  "customer": {
    "name": "فاطمة علي",
    "phone": "+966509876543",
    "address": "شارع العليا، الرياض"
  },
  "products": [
    {
      "product": "507f1f77bcf86cd799439012",
      "name": "منتج",
      "price": 500,
      "quantity": 1
    }
  ],
  "currency": "USD"
}
```

---

## 🧪 سيناريوهات الاختبار

### السيناريو 1: تراكم جميع الخصومات

```bash
# 1. إنشاء منتج بعرض 10%
PATCH /products/123
{
  "price": 1000,
  "offer": {
    "enabled": true,
    "type": "percentage",
    "discountValue": 10
  }
}

# 2. إنشاء عرض ترويجي 15%
POST /promotions
{
  "merchantId": "xxx",
  "name": "عرض 15%",
  "type": "percentage",
  "discountValue": 15,
  "applyTo": "all"
}

# 3. إنشاء كوبون 20%
POST /coupons
{
  "merchantId": "xxx",
  "code": "SAVE20",
  "type": "percentage",
  "value": 20,
  "storeWide": true
}

# 4. إنشاء طلب
POST /orders
{
  "merchantId": "xxx",
  "products": [{ "product": "123", "price": 1000, "quantity": 1 }],
  "couponCode": "SAVE20"
}

# النتيجة المتوقعة:
# - خصم المنتج: 100 (10%)
# - خصم العرض: 150 (15%)
# - خصم الكوبون: 200 (20%)
# - الإجمالي: 1000 - 450 = 550 ريال
```

---

### السيناريو 2: تطبيق أعلى خصم فقط

```bash
# 1. تحديث سياسة التاجر
PATCH /merchants/xxx
{
  "discountPolicy": {
    "stackCouponsWithPromotions": false
  }
}

# 2. إنشاء طلب (نفس السيناريو السابق)
POST /orders {...}

# النتيجة المتوقعة:
# - أعلى خصم: 200 (الكوبون 20%)
# - الإجمالي: 1000 - 200 = 800 ريال
```

---

### السيناريو 3: Buy 2 Get 1 Free

```bash
# 1. تحديث منتج
PATCH /products/123
{
  "price": 100,
  "offer": {
    "enabled": true,
    "type": "buy_x_get_y",
    "buyQuantity": 2,
    "getQuantity": 1,
    "getDiscount": 100
  }
}

# 2. إنشاء طلب بـ 3 قطع
POST /orders
{
  "products": [{ "product": "123", "price": 100, "quantity": 3 }]
}

# النتيجة المتوقعة:
# - خصم: 100 (قطعة واحدة مجاناً)
# - الإجمالي: 300 - 100 = 200 ريال
```

---

### السيناريو 4: تحويل عملات

```bash
# 1. إعداد أسعار الصرف
PATCH /merchants/xxx
{
  "currencySettings": {
    "baseCurrency": "SAR",
    "exchangeRates": {
      "USD": 3.75
    }
  }
}

# 2. إنشاء طلب بالدولار
POST /orders
{
  "products": [{ "product": "123", "price": 100, "quantity": 1 }],
  "currency": "USD"
}

# النتيجة المتوقعة:
# - السعر بالدولار: 100 ÷ 3.75 = 26.67 USD
```

---

## 🔍 استعلامات مفيدة

### 1. الحصول على الكوبونات النشطة فقط

```http
GET /coupons?merchantId=xxx&status=active
```

---

### 2. الحصول على الكوبونات المنتهية

```http
GET /coupons?merchantId=xxx&status=expired
```

---

### 3. البحث عن كوبون بالكود

```http
GET /coupons/code/WELCOME10?merchantId=xxx
```

---

### 4. الحصول على العروض حسب الأولوية

```http
GET /promotions?merchantId=xxx&status=active
# النتيجة ستكون مرتبة حسب priority تنازلياً
```

---

## ⚠️ رموز الأخطاء

| الكود | الرسالة | السبب |
|------|---------|-------|
| 400 | البيانات غير صالحة | بيانات الإدخال غير صحيحة |
| 404 | الكوبون غير موجود | الكود غير موجود في النظام |
| 409 | الكود موجود مسبقاً | محاولة إنشاء كوبون بكود مكرر |
| 400 | الكوبون غير نشط | الكوبون معطل أو منتهي |
| 400 | تم استنفاد عدد مرات الاستخدام | الكوبون وصل للحد الأقصى |
| 400 | الحد الأدنى للطلب هو X | قيمة الطلب أقل من المطلوب |
| 400 | الكوبون لا ينطبق على المنتجات | المنتجات غير مشمولة بالكوبون |

---

## 📝 ملاحظات

1. **جميع التواريخ** بصيغة ISO 8601 UTC
2. **الأسعار** بالعملة الأساسية للمتجر ما لم يُحدد غير ذلك
3. **أكواد الكوبونات** تُحوّل تلقائياً لأحرف كبيرة
4. **الأولوية** للعروض: الأعلى رقماً يُطبق أولاً
5. **التحقق من الكوبونات** لا يزيد عداد الاستخدام، فقط `apply` أو إنشاء طلب

---

تاريخ التحديث: 6 نوفمبر 2025


# نظام إدارة العروض والكوبونات وتعدد العملات - ملخص شامل

## 📋 نظرة عامة

تم تطوير نظام متكامل لإدارة:
- ✅ **الكوبونات** (Coupons) - خصومات برموز للعملاء
- ✅ **العروض الترويجية** (Promotions) - عروض على مستوى المتجر/الفئات
- ✅ **عروض المنتجات المتقدمة** - Buy X Get Y، عروض الكمية
- ✅ **تعدد العملات** - دعم عملات متعددة مع تحويل تلقائي
- ✅ **حساب أسعار ذكي** - تطبيق جميع الخصومات بشكل صحيح

---

## 🎯 الميزات الرئيسية المنفذة

### 1️⃣ نظام الكوبونات (Coupons Module)

#### المسار: `Backend/src/modules/coupons/`

#### الملفات المنشأة:
```
coupons/
├── schemas/
│   └── coupon.schema.ts          # نموذج البيانات
├── dto/
│   ├── create-coupon.dto.ts      # DTO للإنشاء
│   ├── update-coupon.dto.ts      # DTO للتحديث
│   ├── validate-coupon.dto.ts    # DTO للتحقق
│   └── get-coupons.dto.ts        # DTO للاستعلام
├── repositories/
│   ├── coupons.repository.ts     # Interface
│   └── mongo-coupons.repository.ts # MongoDB Implementation
├── coupons.service.ts            # منطق الأعمال
├── coupons.controller.ts         # API Endpoints
└── coupons.module.ts             # NestJS Module
```

#### أنواع الكوبونات المدعومة:
- **PERCENTAGE** - خصم نسبة مئوية (مثال: 20%)
- **FIXED_AMOUNT** - خصم مبلغ ثابت (مثال: 50 ريال)
- **FREE_SHIPPING** - شحن مجاني

#### الشروط والقيود:
- ✅ حد أدنى لمبلغ الطلب (`minOrderAmount`)
- ✅ حد أقصى لمبلغ الخصم (`maxDiscountAmount`)
- ✅ عدد مرات استخدام محدود (`usageLimit`)
- ✅ استخدام واحد لكل عميل (`oneTimePerCustomer`)
- ✅ قائمة عملاء مسموح لهم (`allowedCustomers`)
- ✅ تواريخ بداية ونهاية

#### نطاق التطبيق:
- على المتجر كامل (`storeWide: true`)
- منتجات محددة (`products: [ObjectId]`)
- فئات محددة (`categories: [ObjectId]`)

#### API Endpoints:
```
POST   /coupons                    # إنشاء كوبون
GET    /coupons?merchantId=xxx     # قائمة الكوبونات
GET    /coupons/:id                # تفاصيل كوبون
GET    /coupons/code/:code         # البحث بالكود
POST   /coupons/validate           # التحقق من صلاحية
POST   /coupons/apply              # تطبيق على سلة
PATCH  /coupons/:id                # تحديث
DELETE /coupons/:id                # حذف
POST   /coupons/generate-codes     # توليد كوبونات عشوائية
```

#### مثال استخدام - إنشاء كوبون:
```json
POST /coupons
{
  "merchantId": "507f1f77bcf86cd799439011",
  "code": "SUMMER2025",
  "description": "خصم الصيف 30%",
  "type": "percentage",
  "value": 30,
  "minOrderAmount": 200,
  "maxDiscountAmount": 500,
  "usageLimit": 100,
  "oneTimePerCustomer": true,
  "storeWide": true,
  "startDate": "2025-06-01T00:00:00Z",
  "endDate": "2025-09-01T23:59:59Z"
}
```

#### مثال استخدام - التحقق من كوبون:
```json
POST /coupons/validate
{
  "code": "SUMMER2025",
  "merchantId": "507f1f77bcf86cd799439011",
  "customerPhone": "+966501234567",
  "cartItems": [
    {
      "productId": "507f1f77bcf86cd799439012",
      "price": 300,
      "quantity": 2
    }
  ],
  "totalAmount": 600
}
```

#### الاستجابة:
```json
{
  "valid": true,
  "coupon": { ... },
  "discountAmount": 180
}
```

---

### 2️⃣ نظام العروض الترويجية (Promotions Module)

#### المسار: `Backend/src/modules/promotions/`

#### الملفات المنشأة:
```
promotions/
├── schemas/
│   └── promotion.schema.ts
├── dto/
│   ├── create-promotion.dto.ts
│   ├── update-promotion.dto.ts
│   └── get-promotions.dto.ts
├── repositories/
│   ├── promotions.repository.ts
│   └── mongo-promotions.repository.ts
├── promotions.service.ts
├── promotions.controller.ts
└── promotions.module.ts
```

#### أنواع العروض:
- **PERCENTAGE** - خصم نسبة مئوية
- **FIXED_AMOUNT** - خصم مبلغ ثابت
- **CART_THRESHOLD** - خصم تلقائي عند تجاوز مبلغ معين

#### نطاق التطبيق:
- **ALL** - جميع المنتجات
- **CATEGORIES** - فئات محددة
- **PRODUCTS** - منتجات محددة

#### الميزات:
- ✅ الأولوية (`priority`) - لترتيب تطبيق العروض
- ✅ عداد تنازلي (`countdownTimer`) - لعرض في الواجهة
- ✅ حد استخدام (`usageLimit`)
- ✅ إحصائيات الاستخدام

#### API Endpoints:
```
POST   /promotions                 # إنشاء عرض
GET    /promotions?merchantId=xxx  # قائمة العروض
GET    /promotions/:id             # تفاصيل عرض
PATCH  /promotions/:id             # تحديث
DELETE /promotions/:id             # حذف
POST   /promotions/applicable      # الحصول على العروض المطبقة
```

#### مثال - عرض "خصم 20% على الإلكترونيات عند شراء بأكثر من 500 ريال":
```json
POST /promotions
{
  "merchantId": "507f1f77bcf86cd799439011",
  "name": "خصم الإلكترونيات",
  "description": "20% على جميع الإلكترونيات",
  "type": "percentage",
  "discountValue": 20,
  "maxDiscountAmount": 300,
  "minCartAmount": 500,
  "applyTo": "categories",
  "categoryIds": ["507f1f77bcf86cd799439013"],
  "priority": 10,
  "countdownTimer": true,
  "startDate": "2025-06-01T00:00:00Z",
  "endDate": "2025-06-30T23:59:59Z"
}
```

---

### 3️⃣ عروض المنتجات المتقدمة (Product Offers)

#### التحديثات على: `Backend/src/modules/products/`

#### الملفات المحدثة:
- `schemas/product.schema.ts` - حقل `offer` موسع
- `dto/offer.dto.ts` - DTO محدث

#### أنواع العروض الجديدة:

##### 1. Buy X Get Y:
```typescript
offer: {
  enabled: true,
  type: 'buy_x_get_y',
  buyQuantity: 2,        // اشتري 2
  getQuantity: 1,        // خذ 1
  getProductId: null,    // null = نفس المنتج، أو ID منتج آخر
  getDiscount: 100,      // 100% = مجاناً، 50% = نصف السعر
  startAt: "2025-06-01",
  endAt: "2025-06-30"
}
```

##### 2. Quantity Based:
```typescript
offer: {
  enabled: true,
  type: 'quantity_based',
  quantityThreshold: 3,  // اشتري 3
  quantityDiscount: 20,  // خذ خصم 20%
  startAt: "2025-06-01",
  endAt: "2025-06-30"
}
```

##### 3. Percentage/Fixed (الطريقة الجديدة):
```typescript
offer: {
  enabled: true,
  type: 'percentage',
  discountValue: 25,     // 25%
  oldPrice: 200,
  newPrice: 150,
  startAt: "2025-06-01",
  endAt: "2025-06-30"
}
```

---

### 4️⃣ نظام تعدد العملات (Multi-Currency)

#### التحديثات على Merchant Schema:

```typescript
currencySettings: {
  baseCurrency: 'SAR',                    // العملة الأساسية
  supportedCurrencies: ['SAR', 'USD', 'YER'], // العملات المدعومة
  exchangeRates: {                        // أسعار الصرف
    'USD': 3.75,
    'YER': 0.015,
    'EUR': 4.10
  },
  roundingStrategy: 'round',              // none, ceil, floor, round
  roundToNearest: 5                       // تقريب لأقرب 5
}
```

#### Currency Service - المسار: `Backend/src/modules/merchants/services/currency.service.ts`

#### الوظائف الرئيسية:

##### 1. تحويل العملات:
```typescript
await currencyService.convertPrice(amount, {
  fromCurrency: 'SAR',
  toCurrency: 'USD',
  merchantId: 'xxx'
});
```

##### 2. تقريب الأسعار:
```typescript
currencyService.roundPrice(
  price: 123.7,
  strategy: 'round',
  roundTo: 5
); // النتيجة: 125
```

##### 3. الحصول على السعر للعرض:
```typescript
await currencyService.getDisplayPrice({
  productPrice: 100,
  productCurrency: 'SAR',
  targetCurrency: 'USD',
  merchantId: 'xxx',
  customPrices: { 'USD': 27 } // اختياري
});
```

##### 4. تحديث أسعار الصرف:
```typescript
await currencyService.updateExchangeRates(merchantId, {
  'USD': 3.75,
  'EUR': 4.10,
  'YER': 0.015
});
```

#### التحديثات على Product Schema:
```typescript
prices: {
  'SAR': 100,
  'USD': 27,
  'YER': 6000
}
```

---

### 5️⃣ سياسة الخصومات (Discount Policy)

#### التحديثات على Merchant Schema:

```typescript
discountPolicy: {
  stackCouponsWithPromotions: true,      // تراكم أم لا
  applyOrder: 'product_first'            // ترتيب التطبيق
}
```

#### خيارات ترتيب التطبيق:
- **product_first** - خصومات المنتجات أولاً، ثم العروض، ثم الكوبونات
- **promotion_first** - العروض الترويجية أولاً
- **coupon_first** - الكوبونات أولاً

#### خيارات سياسة التطبيق:
- **stack** - تراكم جميع الخصومات
- **highest** - تطبيق الخصم الأعلى فقط

---

### 6️⃣ نظام حساب الأسعار (Pricing Service)

#### المسار: `Backend/src/modules/orders/services/pricing.service.ts`

#### الوظيفة الرئيسية: `calculateOrderPricing()`

#### خطوات الحساب:
```
1. حساب Subtotal (مجموع المنتجات)
   ↓
2. جمع خصومات المنتجات (من Product.offer)
   ↓
3. جمع العروض الترويجية المطبقة
   ↓
4. التحقق من الكوبون وحساب خصمه
   ↓
5. تطبيق سياسة الخصومات (stack أو highest)
   ↓
6. حساب الشحن والخصم على الشحن
   ↓
7. تحويل العملة (إن لزم)
   ↓
8. حساب الإجمالي النهائي
```

#### مثال استخدام:
```typescript
const result = await pricingService.calculateOrderPricing({
  merchantId: '507f1f77bcf86cd799439011',
  cartItems: [
    {
      productId: '507f1f77bcf86cd799439012',
      categoryId: '507f1f77bcf86cd799439013',
      price: 200,
      quantity: 2,
      name: 'منتج 1'
    }
  ],
  couponCode: 'SUMMER2025',
  customerPhone: '+966501234567',
  currency: 'SAR',
  shippingCost: 50
});
```

#### النتيجة:
```typescript
{
  pricing: {
    subtotal: 400,
    promotions: [
      { id: 'xxx', name: 'خصم الإلكترونيات', amount: 80 }
    ],
    coupon: { code: 'SUMMER2025', amount: 96 },
    products: [
      { id: 'yyy', name: 'منتج 1', amount: 40 }
    ],
    totalDiscount: 216,
    shippingCost: 50,
    shippingDiscount: 0,
    total: 234
  },
  currency: 'SAR',
  exchangeRate: undefined,
  discountPolicy: 'stack',
  appliedCouponCode: 'SUMMER2025'
}
```

---

### 7️⃣ Order Schema المحدث

#### المسار: `Backend/src/modules/orders/schemas/order.schema.ts`

#### الحقول الجديدة:

```typescript
pricing: {
  subtotal: number;
  promotions: [{ id, name, amount }];
  coupon: { code, amount } | null;
  products: [{ id, name, amount }];
  totalDiscount: number;
  shippingCost: number;
  shippingDiscount: number;
  total: number;
}

currency: string;              // 'SAR', 'USD', 'YER'
exchangeRate?: number;         // سعر التحويل وقت الطلب
discountPolicy: string;        // 'stack' أو 'highest'
appliedCouponCode?: string;    // الكود المستخدم
```

#### CreateOrderDto المحدث:
```typescript
{
  merchantId: string;
  sessionId: string;
  customer: {...};
  products: [...];
  couponCode?: string;        // جديد
  currency?: string;          // جديد
}
```

---

### 8️⃣ Orders Service المحدث

#### المسار: `Backend/src/modules/orders/orders.service.ts`

#### التحديثات في `create()`:
1. ✅ استدعاء `PricingService.calculateOrderPricing()`
2. ✅ حفظ تفاصيل الأسعار والخصومات في الطلب
3. ✅ تحديث عداد استخدامات الكوبون
4. ✅ تحديث عداد استخدامات العروض الترويجية
5. ✅ تسجيل العميل كـ Lead

---

## 🔗 العلاقات بين الأنظمة

```
┌─────────────────┐
│   CartDialog    │ Frontend
│   (العميل)      │
└────────┬────────┘
         │ POST /orders
         │ { couponCode, currency, products }
         ↓
┌─────────────────┐
│ Orders Service  │
└────────┬────────┘
         │
         ↓
┌─────────────────────────────────────┐
│      Pricing Service                │
│  ┌─────────────────────────────┐   │
│  │ 1. Product Offers           │   │
│  │ 2. Promotions               │   │
│  │ 3. Coupons                  │   │
│  │ 4. Currency Conversion      │   │
│  │ 5. Discount Policy          │   │
│  └─────────────────────────────┘   │
└────────┬────────────────────────────┘
         │
         ↓
┌─────────────────┐
│  Order Created  │
│  مع تفاصيل      │
│  الأسعار كاملة  │
└─────────────────┘
```

---

## 📊 أمثلة سيناريوهات كاملة

### السيناريو 1: عميل يستخدم كوبون مع عرض ترويجي

#### البيانات:
- منتج سعره 500 ريال، عليه عرض منتج 10%
- عرض ترويجي على الفئة 15%
- كوبون SUMMER2025 بخصم 20%
- سياسة التاجر: تراكم الخصومات

#### الحساب:
```
1. Subtotal: 500 ريال

2. خصم المنتج (10%): 50 ريال
   السعر بعد: 450 ريال

3. العرض الترويجي (15% من 500): 75 ريال
   
4. الكوبون (20% من 500): 100 ريال

5. إجمالي الخصم (تراكم): 50 + 75 + 100 = 225 ريال

6. المجموع النهائي: 500 - 225 = 275 ريال
```

---

### السيناريو 2: Buy 2 Get 1 Free

#### البيانات:
- منتج سعره 100 ريال
- العرض: اشتري 2 واحصل على 1 مجاناً
- العميل يشتري 3 قطع

#### الحساب:
```
1. السعر الأصلي: 100 × 3 = 300 ريال

2. العرض:
   - يدفع ثمن 2 = 200 ريال
   - يحصل على 1 مجاناً
   
3. الخصم: 100 ريال

4. المجموع النهائي: 200 ريال
```

---

### السيناريو 3: عروض الكمية

#### البيانات:
- منتج سعره 50 ريال
- العرض: اشتري 5 قطع واحصل على خصم 25%
- العميل يشتري 6 قطع

#### الحساب:
```
1. السعر الأصلي: 50 × 6 = 300 ريال

2. العرض ينطبق على 5 قطع:
   - 5 × 50 = 250 ريال
   - خصم 25% = 62.5 ريال
   - السعر بعد الخصم: 187.5 ريال
   
3. القطعة السادسة: 50 ريال (بدون خصم)

4. المجموع النهائي: 187.5 + 50 = 237.5 ريال
```

---

## 🔄 تدفق العمل الكامل

### 1. إعداد التاجر:

```typescript
// 1. إنشاء كوبونات
POST /coupons
{
  code: "WELCOME10",
  type: "percentage",
  value: 10,
  ...
}

// 2. إنشاء عروض ترويجية
POST /promotions
{
  name: "خصم الجمعة البيضاء",
  type: "cart_threshold",
  minCartAmount: 500,
  discountValue: 100,
  ...
}

// 3. إعداد أسعار الصرف
PATCH /merchants/:id
{
  currencySettings: {
    baseCurrency: "SAR",
    exchangeRates: {
      "USD": 3.75,
      "YER": 0.015
    }
  }
}

// 4. تحديث عروض المنتجات
PATCH /products/:id
{
  offer: {
    enabled: true,
    type: "buy_x_get_y",
    buyQuantity: 2,
    getQuantity: 1
  }
}
```

### 2. رحلة العميل:

```typescript
// 1. العميل يتصفح المنتجات
GET /products?merchantId=xxx
// النتيجة تتضمن: العروض النشطة، الأسعار بالعملة المطلوبة

// 2. يضيف منتجات للسلة (في Frontend)
// Cart Context يحتفظ بالمنتجات محلياً

// 3. يطبق كوبون
POST /coupons/validate
{
  code: "WELCOME10",
  cartItems: [...],
  totalAmount: 600
}
// النتيجة: { valid: true, discountAmount: 60 }

// 4. إنشاء الطلب
POST /orders
{
  merchantId: "xxx",
  products: [...],
  couponCode: "WELCOME10",
  currency: "SAR",
  customer: {...}
}

// النتيجة: طلب كامل مع جميع التفاصيل
{
  _id: "...",
  pricing: {
    subtotal: 600,
    totalDiscount: 135,
    total: 465
  },
  appliedCouponCode: "WELCOME10",
  ...
}
```

---

## 🎨 الخطوات التالية - Frontend

### 1. Cart Context (Frontend/src/context/CartContext.tsx)

#### التحديثات المطلوبة:
```typescript
// إضافة state للكوبون
const [appliedCoupon, setAppliedCoupon] = useState(null);
const [couponDiscount, setCouponDiscount] = useState(0);
const [selectedCurrency, setSelectedCurrency] = useState('SAR');

// دالة تطبيق الكوبون
const applyCoupon = async (code) => {
  const result = await axios.post('/coupons/validate', {
    code,
    merchantId,
    cartItems: items.map(i => ({
      productId: i.product._id,
      price: i.product.price,
      quantity: i.quantity
    })),
    totalAmount: getTotal()
  });
  
  if (result.data.valid) {
    setAppliedCoupon(result.data.coupon);
    setCouponDiscount(result.data.discountAmount);
  }
};

// دالة إزالة الكوبون
const removeCoupon = () => {
  setAppliedCoupon(null);
  setCouponDiscount(0);
};

// تحديث حساب الإجمالي
const getTotal = () => {
  const subtotal = items.reduce((sum, item) => 
    sum + item.product.price * item.quantity, 0
  );
  return subtotal - couponDiscount;
};
```

---

### 2. CartDialog - واجهة السلة

#### التحديثات المطلوبة:
```tsx
// حقل إدخال الكوبون
<TextField
  label="كود الخصم"
  value={couponCode}
  onChange={(e) => setCouponCode(e.target.value)}
/>
<Button onClick={() => applyCoupon(couponCode)}>
  تطبيق
</Button>

// عرض الكوبون المطبق
{appliedCoupon && (
  <Box>
    <Chip 
      label={`${appliedCoupon.code} - خصم ${couponDiscount} ريال`}
      onDelete={removeCoupon}
    />
  </Box>
)}

// ملخص السعر
<Box>
  <Typography>المجموع الفرعي: {subtotal} ريال</Typography>
  {couponDiscount > 0 && (
    <Typography color="success">
      خصم الكوبون: -{couponDiscount} ريال
    </Typography>
  )}
  <Typography variant="h6">
    الإجمالي: {total} ريال
  </Typography>
</Box>

// إرسال الكوبون مع الطلب
const handleOrder = async () => {
  await axios.post('/orders', {
    ...orderData,
    couponCode: appliedCoupon?.code,
    currency: selectedCurrency
  });
};
```

---

### 3. ProductCard - بطاقة المنتج

#### عرض العروض:
```tsx
{product.offer?.enabled && (
  <>
    {/* نوع العرض */}
    {product.offer.type === 'buy_x_get_y' && (
      <Chip 
        label={`اشتري ${product.offer.buyQuantity} واحصل على ${product.offer.getQuantity} مجاناً`}
        color="success"
      />
    )}
    
    {product.offer.type === 'quantity_based' && (
      <Chip 
        label={`اشتري ${product.offer.quantityThreshold} واحصل على خصم ${product.offer.quantityDiscount}%`}
        color="primary"
      />
    )}
    
    {product.offer.type === 'percentage' && (
      <Chip 
        label={`خصم ${product.offer.discountValue}%`}
        color="error"
      />
    )}
    
    {/* عداد تنازلي */}
    {product.offer.endAt && (
      <CountdownTimer endDate={product.offer.endAt} />
    )}
  </>
)}
```

---

### 4. CurrencySwitcher - مبدل العملات

```tsx
import { useState, useEffect } from 'react';
import { Select, MenuItem } from '@mui/material';

export function CurrencySwitcher({ merchantId }) {
  const [currencies, setCurrencies] = useState([]);
  const [selected, setSelected] = useState('SAR');
  
  useEffect(() => {
    // جلب العملات المدعومة
    fetch(`/merchants/${merchantId}/currency-settings`)
      .then(res => res.json())
      .then(data => {
        setCurrencies(data.supportedCurrencies);
        setSelected(data.baseCurrency);
      });
  }, [merchantId]);
  
  const handleChange = (currency) => {
    setSelected(currency);
    localStorage.setItem('selectedCurrency', currency);
    window.location.reload(); // إعادة تحميل لتحديث الأسعار
  };
  
  return (
    <Select value={selected} onChange={(e) => handleChange(e.target.value)}>
      {currencies.map(c => (
        <MenuItem key={c} value={c}>{c}</MenuItem>
      ))}
    </Select>
  );
}
```

---

### 5. CountdownTimer - العداد التنازلي

```tsx
import { useState, useEffect } from 'react';
import { Box, Typography } from '@mui/material';

export function CountdownTimer({ endDate }) {
  const [timeLeft, setTimeLeft] = useState('');
  
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date().getTime();
      const end = new Date(endDate).getTime();
      const distance = end - now;
      
      if (distance < 0) {
        setTimeLeft('انتهى العرض');
        clearInterval(timer);
        return;
      }
      
      const days = Math.floor(distance / (1000 * 60 * 60 * 24));
      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);
      
      setTimeLeft(`${days}يوم ${hours}س ${minutes}د ${seconds}ث`);
    }, 1000);
    
    return () => clearInterval(timer);
  }, [endDate]);
  
  return (
    <Box sx={{ color: 'error.main', fontWeight: 'bold' }}>
      ⏰ {timeLeft}
    </Box>
  );
}
```

---

## 📱 صفحات Dashboard للتاجر

### 1. صفحة إدارة الكوبونات

**المسار المقترح:** `Frontend/src/pages/dashboard/coupons/`

```
coupons/
├── CouponsListPage.tsx      # قائمة الكوبونات
├── CreateCouponPage.tsx     # إنشاء كوبون
├── EditCouponPage.tsx       # تعديل كوبون
└── components/
    ├── CouponCard.tsx       # بطاقة عرض كوبون
    ├── CouponForm.tsx       # نموذج إنشاء/تعديل
    └── CouponStats.tsx      # إحصائيات الاستخدام
```

#### الميزات المطلوبة:
- ✅ عرض قائمة الكوبونات (نشط، منتهي، معطل)
- ✅ إنشاء كوبون جديد
- ✅ تعديل كوبون موجود
- ✅ تعطيل/تفعيل كوبون
- ✅ عرض إحصائيات (عدد الاستخدامات، إجمالي الخصم الممنوح)
- ✅ توليد كوبونات عشوائية للحملات
- ✅ تصدير قائمة الكوبونات

---

### 2. صفحة إدارة العروض الترويجية

**المسار المقترح:** `Frontend/src/pages/dashboard/promotions/`

```
promotions/
├── PromotionsListPage.tsx
├── CreatePromotionPage.tsx
├── EditPromotionPage.tsx
└── components/
    ├── PromotionCard.tsx
    ├── PromotionForm.tsx
    └── PromotionStats.tsx
```

#### الميزات المطلوبة:
- ✅ عرض قائمة العروض حسب الأولوية
- ✅ إنشاء عرض جديد
- ✅ تحديد نطاق التطبيق (منتجات/فئات/الكل)
- ✅ تفعيل عداد تنازلي
- ✅ إحصائيات الاستخدام

---

### 3. صفحة إعدادات العملات

**المسار المقترح:** `Frontend/src/pages/dashboard/settings/CurrencySettings.tsx`

#### الميزات المطلوبة:
```tsx
// اختيار العملة الأساسية
<Select label="العملة الأساسية">
  <MenuItem value="SAR">ريال سعودي</MenuItem>
  <MenuItem value="USD">دولار أمريكي</MenuItem>
  <MenuItem value="YER">ريال يمني</MenuItem>
</Select>

// إضافة عملات مدعومة
<Autocomplete
  multiple
  options={['SAR', 'USD', 'YER', 'EUR', 'GBP', 'AED']}
  value={supportedCurrencies}
  onChange={(e, val) => setSupportedCurrencies(val)}
/>

// إدخال أسعار الصرف
{supportedCurrencies.map(currency => (
  <TextField
    key={currency}
    label={`سعر الصرف ${currency}`}
    type="number"
    value={exchangeRates[currency]}
    onChange={(e) => setExchangeRates({
      ...exchangeRates,
      [currency]: parseFloat(e.target.value)
    })}
  />
))}

// استراتيجية التقريب
<Select label="استراتيجية التقريب">
  <MenuItem value="none">بدون تقريب</MenuItem>
  <MenuItem value="round">تقريب عادي</MenuItem>
  <MenuItem value="ceil">تقريب لأعلى</MenuItem>
  <MenuItem value="floor">تقريب لأسفل</MenuItem>
</Select>

<TextField
  label="التقريب لأقرب"
  type="number"
  value={roundToNearest}
  helperText="مثال: 5 = تقريب لأقرب 5 ريال"
/>

// سياسة الخصومات
<FormControlLabel
  control={<Switch />}
  label="السماح بتراكم الكوبونات مع العروض"
/>

<Select label="ترتيب تطبيق الخصومات">
  <MenuItem value="product_first">خصومات المنتجات أولاً</MenuItem>
  <MenuItem value="promotion_first">العروض الترويجية أولاً</MenuItem>
  <MenuItem value="coupon_first">الكوبونات أولاً</MenuItem>
</Select>
```

---

## 🧪 الاختبارات (Tests)

### Unit Tests للكوبونات:

```typescript
// Backend/src/modules/coupons/__tests__/coupons.service.spec.ts

describe('CouponsService', () => {
  describe('validate', () => {
    it('should validate a valid coupon', async () => {
      const result = await service.validate({
        code: 'SUMMER2025',
        merchantId: 'xxx',
        cartItems: [...],
        totalAmount: 500
      });
      
      expect(result.valid).toBe(true);
      expect(result.discountAmount).toBeGreaterThan(0);
    });
    
    it('should reject expired coupon', async () => {
      const result = await service.validate({...});
      expect(result.valid).toBe(false);
      expect(result.message).toContain('منتهي');
    });
    
    it('should respect usage limit', async () => {
      // Test usage limit logic
    });
    
    it('should apply min order amount', async () => {
      // Test min order validation
    });
  });
  
  describe('calculateDiscount', () => {
    it('should calculate percentage discount correctly', () => {
      // Test percentage calculation
    });
    
    it('should apply max discount cap', () => {
      // Test max discount limit
    });
  });
});
```

---

### Integration Tests للأسعار:

```typescript
// Backend/src/modules/orders/__tests__/pricing.integration.spec.ts

describe('Pricing Integration', () => {
  it('should apply product offer, promotion, and coupon correctly', async () => {
    // Setup
    const product = await createProduct({
      price: 500,
      offer: { enabled: true, type: 'percentage', discountValue: 10 }
    });
    
    const promotion = await createPromotion({
      type: 'percentage',
      discountValue: 15,
      applyTo: 'all'
    });
    
    const coupon = await createCoupon({
      code: 'TEST20',
      type: 'percentage',
      value: 20
    });
    
    // Execute
    const result = await pricingService.calculateOrderPricing({
      merchantId: 'xxx',
      cartItems: [{ productId: product._id, price: 500, quantity: 1 }],
      couponCode: 'TEST20'
    });
    
    // Assert
    expect(result.pricing.products[0].amount).toBe(50);  // 10%
    expect(result.pricing.promotions[0].amount).toBe(75); // 15%
    expect(result.pricing.coupon.amount).toBe(100);      // 20%
    expect(result.pricing.totalDiscount).toBe(225);
    expect(result.pricing.total).toBe(275);
  });
});
```

---

## ⚠️ ملاحظات مهمة

### 1. الأمان والتحقق:
- ✅ جميع endpoints تتحقق من merchantId
- ✅ الكوبونات محمية من الاستخدام المتكرر
- ✅ التحقق من صلاحية التواريخ في كل استخدام
- ⚠️ يجب إضافة Authentication Guards على endpoints الإدارة

### 2. الأداء:
- ✅ Indexes مُضافة على جميع الحقول المستخدمة في البحث
- ✅ Lean queries في المستودعات
- ⚠️ يجب إضافة Caching لأسعار الصرف
- ⚠️ يجب إضافة Rate Limiting على validate endpoints

### 3. التوافقية:
- ✅ الطلبات القديمة ستعمل بدون مشاكل
- ✅ الحقول الجديدة اختيارية مع قيم افتراضية
- ⚠️ يجب تشغيل Migration للطلبات الموجودة (اختياري)

### 4. الصيانة:
- ✅ كود منظم في Modules منفصلة
- ✅ Repository Pattern للمرونة
- ✅ DTOs للتحقق
- ⚠️ يجب إضافة Logging شامل
- ⚠️ يجب إضافة Monitoring للاستخدامات

---

## 🔧 الإعداد والتشغيل

### 1. تحديث app.module.ts:

```typescript
import { CouponsModule } from './modules/coupons/coupons.module';
import { PromotionsModule } from './modules/promotions/promotions.module';

@Module({
  imports: [
    // ... الموجود
    CouponsModule,
    PromotionsModule,
    // ...
  ],
})
export class AppModule {}
```

### 2. تشغيل Migrations (اختياري):

```typescript
// scripts/migrate-merchant-settings.ts
// إضافة الإعدادات الافتراضية للتجار الموجودين

await MerchantModel.updateMany(
  { currencySettings: { $exists: false } },
  {
    $set: {
      currencySettings: {
        baseCurrency: 'SAR',
        supportedCurrencies: ['SAR'],
        exchangeRates: new Map(),
        roundingStrategy: 'round',
        roundToNearest: 1
      },
      discountPolicy: {
        stackCouponsWithPromotions: true,
        applyOrder: 'product_first'
      }
    }
  }
);
```

### 3. المتغيرات البيئية:

لا توجد متغيرات جديدة مطلوبة، كل شيء يعمل مع الإعدادات الحالية.

---

## 📈 مقاييس النجاح

بعد التطبيق الكامل، يجب قياس:

1. **معدل استخدام الكوبونات** - كم عميل يستخدم الكوبونات؟
2. **متوسط قيمة الخصم** - كم الخصم المتوسط للطلب؟
3. **معدل التحويل** - هل الكوبونات تزيد المبيعات؟
4. **العملات الأكثر استخداماً** - ما العملات المفضلة للعملاء؟
5. **العروض الأكثر نجاحاً** - أي نوع عرض يحقق أكبر مبيعات؟

---

## 🎯 الخلاصة

تم بناء نظام متكامل وقوي لإدارة التسعير والعروض:

✅ **7 Modules جديدة/محدثة**
✅ **15+ API Endpoints**
✅ **4 أنواع خصومات مختلفة**
✅ **دعم عملات متعددة**
✅ **حساب تسعير ذكي**
✅ **سياسات مرنة**

النظام جاهز للاستخدام في Backend، ويحتاج فقط إلى:
1. واجهات Frontend للعملاء
2. صفحات Dashboard للتجار
3. Tsting شامل

---

## 📞 الدعم

للأسئلة أو المساعدة:
- راجع التوثيق أعلاه
- اختبر الـ API Endpoints باستخدام Postman
- تحقق من الأمثلة في الملف

**تم إنشاء هذا الملخص بتاريخ:** 6 نوفمبر 2025
**الإصدار:** 1.0 MVP


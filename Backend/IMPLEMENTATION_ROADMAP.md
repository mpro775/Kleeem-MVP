# خطة التطبيق التفصيلية - Frontend & Testing

## 📅 الجدول الزمني المقترح

| المرحلة | المدة المقدرة | الأولوية |
|---------|---------------|----------|
| Frontend - Cart & Coupons | 3-4 أيام | عالية جداً |
| Frontend - Product Offers Display | 2-3 أيام | عالية |
| Frontend - Currency Switcher | 1-2 يوم | متوسطة |
| Merchant Dashboard - Coupons | 3-4 أيام | عالية |
| Merchant Dashboard - Promotions | 3-4 أيام | عالية |
| Merchant Dashboard - Currency | 2 يوم | متوسطة |
| Backend Tests | 2-3 أيام | عالية |
| E2E Testing | 2-3 أيام | عالية |
| **الإجمالي** | **18-25 يوم** | |

---

## 🎯 المرحلة 1: Frontend - Cart & Coupons (أولوية عالية)

### الهدف
تمكين العملاء من استخدام الكوبونات في السلة ورؤية تفاصيل الخصومات

### الملفات المطلوبة

#### 1. تحديث Cart Context

**الملف:** `Frontend/src/context/CartContext.tsx`

**التغييرات:**
```typescript
// إضافة types جديدة
interface CouponInfo {
  code: string;
  discount: number;
  type: string;
}

interface CartContextValue {
  items: CartItem[];
  appliedCoupon: CouponInfo | null;
  selectedCurrency: string;
  
  // الدوال الموجودة
  addItem: (product: ProductResponse, quantity: number) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  
  // دوال جديدة
  applyCoupon: (code: string, merchantId: string) => Promise<boolean>;
  removeCoupon: () => void;
  setSelectedCurrency: (currency: string) => void;
  getSubtotal: () => number;
  getCouponDiscount: () => number;
  getTotal: () => number;
}

// التطبيق
const applyCoupon = async (code: string, merchantId: string) => {
  try {
    const response = await axios.post('/coupons/validate', {
      code,
      merchantId,
      cartItems: items.map(item => ({
        productId: item.product._id,
        categoryId: item.product.category,
        price: item.product.price,
        quantity: item.quantity
      })),
      totalAmount: getSubtotal()
    });
    
    if (response.data.valid) {
      setAppliedCoupon({
        code,
        discount: response.data.discountAmount,
        type: response.data.coupon.type
      });
      return true;
    }
    return false;
  } catch (error) {
    console.error('Coupon validation failed:', error);
    return false;
  }
};
```

**المدة المقدرة:** 4-6 ساعات

---

#### 2. تحديث CartDialog

**الملف:** `Frontend/src/features/store/ui/CartDialog.tsx`

**الإضافات:**
1. حقل إدخال الكوبون
2. زر التطبيق مع حالة loading
3. عرض الكوبون المطبق
4. ملخص الأسعار التفصيلي
5. رسائل الخطأ/النجاح

**التصميم المقترح:**
```tsx
// قسم الكوبون
<Box sx={{ mt: 2, mb: 2 }}>
  <Typography variant="subtitle2" gutterBottom>
    هل لديك كود خصم؟
  </Typography>
  
  {!appliedCoupon ? (
    <Stack direction="row" spacing={1}>
      <TextField
        size="small"
        placeholder="أدخل الكود"
        value={couponCode}
        onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
        disabled={applyingCoupon}
        fullWidth
      />
      <Button
        variant="contained"
        onClick={handleApplyCoupon}
        disabled={!couponCode || applyingCoupon}
      >
        {applyingCoupon ? <CircularProgress size={20} /> : 'تطبيق'}
      </Button>
    </Stack>
  ) : (
    <Chip
      label={`${appliedCoupon.code} - خصم ${appliedCoupon.discount.toFixed(2)} ريال`}
      onDelete={handleRemoveCoupon}
      color="success"
      icon={<LocalOfferIcon />}
    />
  )}
  
  {couponError && (
    <Alert severity="error" sx={{ mt: 1 }}>
      {couponError}
    </Alert>
  )}
</Box>

// ملخص الأسعار
<Box sx={{ borderTop: 1, borderColor: 'divider', pt: 2, mt: 2 }}>
  <Stack spacing={1}>
    <Box display="flex" justifyContent="space-between">
      <Typography>المجموع الفرعي:</Typography>
      <Typography>{getSubtotal().toFixed(2)} ريال</Typography>
    </Box>
    
    {appliedCoupon && (
      <Box display="flex" justifyContent="space-between" color="success.main">
        <Typography>خصم الكوبون ({appliedCoupon.code}):</Typography>
        <Typography>-{appliedCoupon.discount.toFixed(2)} ريال</Typography>
      </Box>
    )}
    
    <Box display="flex" justifyContent="space-between">
      <Typography>الشحن:</Typography>
      <Typography>
        {appliedCoupon?.type === 'free_shipping' ? (
          <Chip label="مجاني" size="small" color="success" />
        ) : (
          '0 ريال'
        )}
      </Typography>
    </Box>
    
    <Divider />
    
    <Box display="flex" justifyContent="space-between">
      <Typography variant="h6">الإجمالي:</Typography>
      <Typography variant="h6" color="primary">
        {getTotal().toFixed(2)} ريال
      </Typography>
    </Box>
  </Stack>
</Box>
```

**المدة المقدرة:** 6-8 ساعات

---

#### 3. تحديث handleOrder في CartDialog

```typescript
const handleOrder = async () => {
  setLoading(true);
  
  try {
    const response = await axiosInstance.post('/orders', {
      merchantId,
      sessionId,
      source: 'storefront',
      customer: {
        name: customer.name,
        phone: customer.phone,
        address: customer.address
      },
      products: items.map(({ product, quantity }) => ({
        product: product._id,
        name: product.name,
        price: product.price,
        quantity
      })),
      couponCode: appliedCoupon?.code, // جديد
      currency: selectedCurrency // جديد
    });
    
    const orderId = response.data._id;
    
    clearCart();
    removeCoupon(); // جديد
    onOrderSuccess(orderId);
    onClose();
  } catch (error) {
    console.error('Order creation failed:', error);
    // عرض رسالة خطأ
  } finally {
    setLoading(false);
  }
};
```

**المدة المقدرة:** 2-3 ساعات

---

### الاختبارات المطلوبة

1. ✅ تطبيق كوبون صالح
2. ✅ رفض كوبون غير صالح
3. ✅ عرض رسالة خطأ واضحة
4. ✅ إزالة الكوبون
5. ✅ حساب الإجمالي الصحيح
6. ✅ إرسال الكوبون مع الطلب
7. ✅ مسح الكوبون بعد الطلب

**المدة المقدرة للاختبار:** 2-3 ساعات

---

## 🎨 المرحلة 2: Frontend - Product Offers Display

### الهدف
عرض العروض المختلفة على المنتجات بشكل واضح وجذاب

### الملفات المطلوبة

#### 1. مكون OfferBadge

**الملف:** `Frontend/src/features/store/components/OfferBadge.tsx`

```tsx
import { Chip, Box, Typography } from '@mui/material';
import { LocalOffer, CardGiftcard, Inventory } from '@mui/icons-material';

interface OfferBadgeProps {
  offer: {
    type: string;
    enabled: boolean;
    discountValue?: number;
    buyQuantity?: number;
    getQuantity?: number;
    quantityThreshold?: number;
    quantityDiscount?: number;
  };
}

export function OfferBadge({ offer }: OfferBadgeProps) {
  if (!offer?.enabled) return null;
  
  const getOfferText = () => {
    switch (offer.type) {
      case 'percentage':
        return `خصم ${offer.discountValue}%`;
      
      case 'fixed_amount':
        return `خصم ${offer.discountValue} ريال`;
      
      case 'buy_x_get_y':
        return `اشتري ${offer.buyQuantity} واحصل على ${offer.getQuantity} مجاناً`;
      
      case 'quantity_based':
        return `اشتري ${offer.quantityThreshold} واحصل على خصم ${offer.quantityDiscount}%`;
      
      default:
        return 'عرض خاص';
    }
  };
  
  const getIcon = () => {
    switch (offer.type) {
      case 'buy_x_get_y':
        return <CardGiftcard />;
      case 'quantity_based':
        return <Inventory />;
      default:
        return <LocalOffer />;
    }
  };
  
  return (
    <Chip
      icon={getIcon()}
      label={getOfferText()}
      color="error"
      size="small"
      sx={{
        fontWeight: 'bold',
        animation: 'pulse 2s infinite'
      }}
    />
  );
}
```

**المدة المقدرة:** 3-4 ساعات

---

#### 2. مكون CountdownTimer

**الملف:** `Frontend/src/features/store/components/CountdownTimer.tsx`

```tsx
import { useState, useEffect } from 'react';
import { Box, Typography } from '@mui/material';
import { AccessTime } from '@mui/icons-material';

interface CountdownTimerProps {
  endDate: string | Date;
  showIcon?: boolean;
}

export function CountdownTimer({ endDate, showIcon = true }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState('');
  const [expired, setExpired] = useState(false);
  
  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const end = new Date(endDate).getTime();
      const distance = end - now;
      
      if (distance < 0) {
        setExpired(true);
        setTimeLeft('انتهى العرض');
        return;
      }
      
      const days = Math.floor(distance / (1000 * 60 * 60 * 24));
      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);
      
      if (days > 0) {
        setTimeLeft(`${days} يوم ${hours} ساعة`);
      } else if (hours > 0) {
        setTimeLeft(`${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
      } else {
        setTimeLeft(`${minutes}:${seconds.toString().padStart(2, '0')}`);
      }
    };
    
    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);
    
    return () => clearInterval(timer);
  }, [endDate]);
  
  return (
    <Box
      display="flex"
      alignItems="center"
      gap={0.5}
      sx={{
        color: expired ? 'text.disabled' : 'error.main',
        fontWeight: 'bold',
        fontSize: '0.9rem'
      }}
    >
      {showIcon && <AccessTime fontSize="small" />}
      <Typography variant="body2" component="span">
        {timeLeft}
      </Typography>
    </Box>
  );
}
```

**المدة المقدرة:** 2-3 ساعات

---

#### 3. تحديث ProductCard

**الملف:** `Frontend/src/features/store/components/ProductCard.tsx`

```tsx
import { OfferBadge } from './OfferBadge';
import { CountdownTimer } from './CountdownTimer';

export function ProductCard({ product }) {
  const hasActiveOffer = product.offer?.enabled && 
    (!product.offer.endAt || new Date(product.offer.endAt) > new Date());
  
  return (
    <Card>
      <CardMedia
        component="img"
        image={product.images[0]}
        alt={product.name}
      />
      
      {hasActiveOffer && (
        <Box sx={{ position: 'absolute', top: 8, right: 8 }}>
          <OfferBadge offer={product.offer} />
        </Box>
      )}
      
      <CardContent>
        <Typography variant="h6">{product.name}</Typography>
        
        {/* السعر */}
        <Box display="flex" alignItems="center" gap={1} mt={1}>
          {hasActiveOffer && product.offer.oldPrice && (
            <Typography
              variant="body2"
              sx={{ textDecoration: 'line-through', color: 'text.secondary' }}
            >
              {product.offer.oldPrice} ريال
            </Typography>
          )}
          <Typography
            variant="h6"
            color={hasActiveOffer ? 'error' : 'primary'}
          >
            {product.price} ريال
          </Typography>
          {hasActiveOffer && product.offer.discountValue && (
            <Chip
              label={`-${product.offer.discountValue}%`}
              color="error"
              size="small"
            />
          )}
        </Box>
        
        {/* العداد التنازلي */}
        {hasActiveOffer && product.offer.endAt && (
          <Box mt={1}>
            <CountdownTimer endDate={product.offer.endAt} />
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
```

**المدة المقدرة:** 4-5 ساعات

---

## 💱 المرحلة 3: Frontend - Currency Switcher

### الهدف
السماح للعملاء باختيار العملة المفضلة

### الملفات المطلوبة

#### 1. مكون CurrencySwitcher

**الملف:** `Frontend/src/features/store/components/CurrencySwitcher.tsx`

```tsx
import { useState, useEffect } from 'react';
import { Select, MenuItem, FormControl, InputLabel } from '@mui/material';
import axios from 'axios';

interface CurrencySwitcherProps {
  merchantId: string;
  onChange?: (currency: string) => void;
}

export function CurrencySwitcher({ merchantId, onChange }: CurrencySwitcherProps) {
  const [currencies, setCurrencies] = useState<string[]>(['SAR']);
  const [selected, setSelected] = useState('SAR');
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    loadCurrencies();
    loadSavedCurrency();
  }, [merchantId]);
  
  const loadCurrencies = async () => {
    try {
      const response = await axios.get(`/merchants/${merchantId}`);
      const supported = response.data.currencySettings?.supportedCurrencies || ['SAR'];
      setCurrencies(supported);
    } catch (error) {
      console.error('Failed to load currencies:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const loadSavedCurrency = () => {
    const saved = localStorage.getItem(`currency_${merchantId}`);
    if (saved) {
      setSelected(saved);
      onChange?.(saved);
    }
  };
  
  const handleChange = (currency: string) => {
    setSelected(currency);
    localStorage.setItem(`currency_${merchantId}`, currency);
    onChange?.(currency);
    // يمكن إعادة تحميل الصفحة أو تحديث الأسعار ديناميكياً
  };
  
  if (loading || currencies.length <= 1) return null;
  
  return (
    <FormControl size="small" sx={{ minWidth: 100 }}>
      <InputLabel>العملة</InputLabel>
      <Select
        value={selected}
        label="العملة"
        onChange={(e) => handleChange(e.target.value)}
      >
        {currencies.map(currency => (
          <MenuItem key={currency} value={currency}>
            {currency}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}
```

**المدة المقدرة:** 3-4 ساعات

---

#### 2. دمج CurrencySwitcher في StoreNavbar

```tsx
import { CurrencySwitcher } from '../components/CurrencySwitcher';

export function StoreNavbar({ merchant }) {
  const handleCurrencyChange = (currency: string) => {
    // تحديث السياق أو إعادة تحميل المنتجات
    window.location.reload(); // حل بسيط
  };
  
  return (
    <AppBar>
      <Toolbar>
        {/* ... محتوى موجود */}
        
        <CurrencySwitcher
          merchantId={merchant._id}
          onChange={handleCurrencyChange}
        />
      </Toolbar>
    </AppBar>
  );
}
```

**المدة المقدرة:** 2 ساعة

---

## 🎛️ المرحلة 4: Merchant Dashboard - Coupons

### الملفات المطلوبة

#### 1. صفحة قائمة الكوبونات

**الملف:** `Frontend/src/pages/dashboard/coupons/CouponsListPage.tsx`

**الميزات:**
- عرض الكوبونات في جدول/بطاقات
- فلترة (نشط، منتهي، الكل)
- بحث بالكود
- إحصائيات سريعة (عدد المستخدمة، الخصم الممنوح)
- أزرار تعديل وحذف

**المدة المقدرة:** 6-8 ساعات

---

#### 2. صفحة إنشاء/تعديل كوبون

**الملف:** `Frontend/src/pages/dashboard/coupons/CouponFormPage.tsx`

**الحقول:**
- الكود
- النوع (نسبة، مبلغ ثابت، شحن مجاني)
- القيمة
- الحد الأدنى للطلب
- الحد الأقصى للخصم
- عدد مرات الاستخدام
- استخدام واحد لكل عميل
- نطاق التطبيق (متجر كامل، منتجات، فئات)
- التواريخ

**المدة المقدرة:** 8-10 ساعات

---

## 📊 المرحلة 5: Merchant Dashboard - Promotions

مشابه لصفحات الكوبونات

**المدة المقدرة:** 12-14 ساعة

---

## ⚙️ المرحلة 6: Merchant Dashboard - Currency Settings

**الملف:** `Frontend/src/pages/dashboard/settings/CurrencySettingsPage.tsx`

**الميزات:**
- اختيار العملة الأساسية
- إضافة عملات مدعومة
- إدخال أسعار الصرف
- اختيار استراتيجية التقريب
- تحديد سياسة الخصومات

**المدة المقدرة:** 6-8 ساعات

---

## 🧪 المرحلة 7: Backend Testing

### Unit Tests

**الملفات:**
- `coupons.service.spec.ts`
- `promotions.service.spec.ts`
- `pricing.service.spec.ts`
- `currency.service.spec.ts`

**الحالات المطلوبة:**
- ✅ التحقق من الكوبونات الصالحة/غير الصالحة
- ✅ حساب الخصومات بشكل صحيح
- ✅ تطبيق حدود الاستخدام
- ✅ تحويل العملات
- ✅ تقريب الأسعار
- ✅ تراكم الخصومات
- ✅ تطبيق أعلى خصم

**المدة المقدرة:** 8-10 ساعات

---

### Integration Tests

**الملفات:**
- `pricing.integration.spec.ts`
- `orders.integration.spec.ts`

**السيناريوهات:**
- ✅ طلب مع كوبون + عرض + عرض منتج
- ✅ تحويل عملة مع خصومات
- ✅ Buy X Get Y
- ✅ عروض الكمية

**المدة المقدرة:** 6-8 ساعات

---

## 🎭 المرحلة 8: E2E Testing

**الأدوات:** Playwright / Cypress

**السيناريوهات:**
1. ✅ العميل يتصفح → يضيف للسلة → يطبق كوبون → يطلب
2. ✅ العميل يختار عملة مختلفة → يتحقق من الأسعار
3. ✅ التاجر ينشئ كوبون → العميل يستخدمه
4. ✅ التاجر ينشئ عرض → يظهر للعميل

**المدة المقدرة:** 8-10 ساعات

---

## 📋 Checklist النهائي

### Backend ✅
- [x] Coupons Module
- [x] Promotions Module
- [x] Product Offers Schema
- [x] Currency Service
- [x] Pricing Service
- [x] Order Schema Updates
- [x] Orders Service Integration

### Frontend (العميل) - قيد التنفيذ
- [ ] Cart Context - Coupons
- [ ] CartDialog - UI Updates
- [ ] OfferBadge Component
- [ ] CountdownTimer Component
- [ ] ProductCard Updates
- [ ] CurrencySwitcher Component

### Frontend (التاجر) - لم يبدأ
- [ ] Coupons List Page
- [ ] Coupon Form Page
- [ ] Promotions List Page
- [ ] Promotion Form Page
- [ ] Currency Settings Page

### Testing - لم يبدأ
- [ ] Unit Tests
- [ ] Integration Tests
- [ ] E2E Tests

---

## 🚀 خطوات البدء

### للمطور Frontend:

1. **ابدأ بـ Cart Context:**
   ```bash
   cd Frontend/src/context
   # افتح CartContext.tsx
   # أضف الدوال والـ state المطلوبة
   ```

2. **ثم CartDialog:**
   ```bash
   cd Frontend/src/features/store/ui
   # افتح CartDialog.tsx
   # أضف UI الكوبونات
   ```

3. **ثم المكونات:**
   ```bash
   cd Frontend/src/features/store/components
   # أنشئ OfferBadge.tsx
   # أنشئ CountdownTimer.tsx
   # أنشئ CurrencySwitcher.tsx
   ```

### للمطور Backend Tests:

1. **ابدأ بـ Unit Tests:**
   ```bash
   cd Backend/src/modules/coupons/__tests__
   # أنشئ الاختبارات
   npm run test -- coupons
   ```

2. **ثم Integration:**
   ```bash
   cd Backend/src/modules/orders/__tests__
   # أنشئ pricing.integration.spec.ts
   ```

---

## 💡 نصائح التطوير

1. **استخدم TypeScript** - جميع الـ Types موجودة
2. **اختبر كل خطوة** - لا تنتقل حتى تتأكد
3. **ارجع للملف الرئيسي** - `PRICING_SYSTEM_SUMMARY.md`
4. **استخدم API Examples** - `API_EXAMPLES.md`
5. **لا تتردد** - البنية التحتية جاهزة 100%

---

تاريخ الإنشاء: 6 نوفمبر 2025
آخر تحديث: 6 نوفمبر 2025


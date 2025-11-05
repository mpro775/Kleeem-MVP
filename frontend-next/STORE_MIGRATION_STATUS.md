# 🏪 Store/Storefront Migration Status

## ✅ ما تم إنجازه (40%)

### 1. الأساسيات (مكتمل)
```
✅ frontend-next/src/contexts/CartContext.tsx
✅ frontend-next/src/features/store/types.ts
✅ frontend-next/src/features/store/api.ts
```

**التعديلات:**
- ✅ CartContext مع SSR safety (hydration fix)
- ✅ إضافة `totalItems` و `totalPrice`
- ✅ جميع الـ types الأساسية
- ✅ API endpoints الأساسية

---

## ⚠️ ما يجب إكماله (60%)

### المرحلة 1: UI Components الأساسية (مهمة جداً ⭐⭐⭐)

#### 1. CartDialog (أهم مكون)
```
Frontend/src/features/store/ui/CartDialog.tsx (700 سطر)
  ↓
frontend-next/src/features/store/components/CartDialog.tsx
```

**التعديلات المطلوبة:**
- إضافة `'use client';`
- تغيير: `import { useCart } from '@/context/CartContext'` → `import { useCart } from '@/contexts/CartContext'`
- تغيير: `@/shared/api/axios` → `@/lib/axios`
- تغيير: `@/shared/utils/customer` → `@/lib/utils/customer` (إنشاء)
- تحديث الترجمة

---

#### 2. ProductCard
```
Frontend/src/features/store/ui/ProductCard.tsx
  ↓
frontend-next/src/features/store/components/ProductCard.tsx
```

**التعديلات المطلوبة:**
- إضافة `'use client';`
- تغيير: `@/features/mechant/products/type` → `@/features/merchant/products/types`
- إضافة `useTranslations('store')`

---

#### 3. ProductGrid
```
Frontend/src/features/store/ui/ProductGrid.tsx
  ↓
frontend-next/src/features/store/components/ProductGrid.tsx
```

---

#### 4. StoreHeader & StoreNavbar
```
Frontend/src/features/store/ui/StoreHeader.tsx
Frontend/src/features/store/ui/StoreNavbar.tsx
  ↓
frontend-next/src/features/store/components/
```

**مهمة:** يحتاجان لنقل CartDialog أولاً

---

#### 5. Footer
```
Frontend/src/features/store/ui/Footer.tsx
  ↓
frontend-next/src/features/store/components/Footer.tsx
```

---

#### 6. باقي الـ UI Components
```
❌ CategoryFilter.tsx
❌ CustomerInfoForm.tsx
❌ LiteIdentityCard.tsx
❌ BannersEditor.tsx
```

---

### المرحلة 2: Store Features (متوسطة الأهمية ⭐⭐)

#### A. Home Feature
```
Frontend/src/features/store/home/
  ├── api.ts
  ├── types.ts
  ├── hooks/
  │   ├── useKleemWidget.ts
  │   ├── useNoIndexWhenDemo.ts
  │   └── useStoreData.ts
  └── ui/
      ├── BannerCarousel.tsx
      ├── ControlsBar.tsx
      ├── CustomerInfoDialog.tsx
      ├── FloatingCartButton.tsx
      ├── MobileFiltersDrawer.tsx
      ├── OffersSection.tsx
      └── SidebarCategories.tsx

  ↓
frontend-next/src/features/store/home/
```

**الخطوات:**
1. نقل `api.ts` و `types.ts` بتحديث المسارات
2. نقل الـ hooks مع إضافة `'use client';`
3. نقل الـ UI components مع التعديلات القياسية

---

#### B. Product Feature
```
Frontend/src/features/store/product/
  ├── api.ts
  ├── hooks/useProductDetails.ts
  └── ui/
      ├── ActionBar.tsx
      ├── AttributesSection.tsx
      ├── DetailsTabs.tsx
      ├── Gallery.tsx
      ├── PriceSection.tsx
      ├── QuantityPicker.tsx
      └── RelatedSkeleton.tsx

  ↓
frontend-next/src/features/store/product/
```

---

#### C. Order Feature
```
Frontend/src/features/store/order/
  ├── api.ts
  ├── hooks/useOrderDetails.ts
  └── ui/
      ├── CustomerInfoCard.tsx
      ├── ItemsList.tsx
      ├── OrderDetailsSkeleton.tsx
      ├── OrderHeader.tsx
      ├── OrderInfoCard.tsx
      ├── StatusTimeline.tsx
      └── SummaryCard.tsx

  ↓
frontend-next/src/features/store/order/
```

---

#### D. About Feature
```
Frontend/src/features/store/about/
  ├── api.ts
  ├── type.ts
  ├── hooks/useAboutData.ts
  └── ui/
      ├── AboutHero.tsx
      ├── AboutSkeleton.tsx
      ├── ContactCard.tsx
      ├── HoursCard.tsx
      └── PoliciesSection.tsx

  ↓
frontend-next/src/features/store/about/
```

---

### المرحلة 3: Store Pages (سهلة ⭐)

#### الصفحات المطلوبة:

```
✅ frontend-next/src/app/[locale]/store/[slug]/page.tsx (موجود - يحتاج تحسين)
❌ frontend-next/src/app/[locale]/store/[slug]/product/[idOrSlug]/page.tsx
❌ frontend-next/src/app/[locale]/store/[slug]/about/page.tsx
❌ frontend-next/src/app/[locale]/store/[slug]/my-orders/page.tsx
❌ frontend-next/src/app/[locale]/store/[slug]/order/[orderId]/page.tsx
```

---

## 📝 دليل النقل السريع

### مثال: نقل CartDialog

#### الخطوة 1: نسخ الملف
```bash
# من
Frontend/src/features/store/ui/CartDialog.tsx

# إلى
frontend-next/src/features/store/components/CartDialog.tsx
```

#### الخطوة 2: التعديلات
```typescript
// إضافة في أول الملف
'use client';

// تغيير الـ imports
import { useCart } from '@/contexts/CartContext'; // ✅
import axiosInstance from '@/lib/axios'; // ✅
import type { CustomerInfo } from '../types'; // ✅
import { saveLocalCustomer } from '@/lib/utils/customer'; // ⚠️ إنشاء

// إضافة الترجمة
import { useTranslations } from 'next-intl';
const t = useTranslations('store');

// تغيير النصوص
<Typography>{t('cart.title')}</Typography>
```

#### الخطوة 3: إنشاء utility مفقودة
```typescript
// frontend-next/src/lib/utils/customer.ts
export function saveLocalCustomer(data: {
  name: string;
  phone: string;
  address: string;
}) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('customer', JSON.stringify(data));
}

export function getLocalCustomer() {
  if (typeof window === 'undefined') return null;
  const data = localStorage.getItem('customer');
  return data ? JSON.parse(data) : null;
}
```

---

## 🎯 خطة التنفيذ المقترحة

### اليوم 1: UI Components الأساسية (4-6 ساعات)
```
1. ⏰ [1 ساعة] CartDialog
2. ⏰ [30 دقيقة] ProductCard
3. ⏰ [30 دقيقة] ProductGrid
4. ⏰ [1 ساعة] StoreHeader & StoreNavbar
5. ⏰ [30 دقيقة] Footer
6. ⏰ [1 ساعة] باقي الـ UI Components
```

### اليوم 2: Features (4-6 ساعات)
```
1. ⏰ [1.5 ساعة] Home Feature
2. ⏰ [1.5 ساعة] Product Feature
3. ⏰ [1.5 ساعة] Order Feature
4. ⏰ [1 ساعة] About Feature
```

### اليوم 3: Pages والترجمة (2-3 ساعات)
```
1. ⏰ [1 ساعة] تحديث/إنشاء الصفحات
2. ⏰ [1 ساعة] ملفات الترجمة
3. ⏰ [1 ساعة] الاختبار
```

---

## 🔧 Dependencies الإضافية المطلوبة

تأكد من وجود هذه في `package.json`:

```json
{
  "dependencies": {
    "swiper": "^11.2.10",
    "embla-carousel-react": "^8.6.0",
    "react-color": "^2.19.3"
  },
  "devDependencies": {
    "@types/react-color": "^3.0.13"
  }
}
```

---

## ⚠️ ملاحظات مهمة

### 1. CartContext Provider
يجب إضافة CartProvider في الـ layout:

```typescript
// frontend-next/src/app/[locale]/layout.tsx
import { CartProvider } from '@/contexts/CartContext';

export default function LocaleLayout({ children }) {
  return (
    <ThemeProvider locale={locale}>
      <ReactQueryProvider>
        <NotificationProvider>
          <CartProvider> {/* ⬅️ أضف هنا */}
            {children}
          </CartProvider>
        </NotificationProvider>
      </ReactQueryProvider>
    </ThemeProvider>
  );
}
```

### 2. Shared Utilities المفقودة
إنشاء هذه الملفات:

```
❌ frontend-next/src/lib/utils/customer.ts
❌ frontend-next/src/lib/utils/format.ts (للتنسيقات)
❌ frontend-next/src/lib/utils/validation.ts (للتحقق)
```

### 3. Assets
تأكد من نقل الصور المطلوبة:
```
Frontend/src/assets/empty-chat.png
  ↓
frontend-next/public/assets/empty-chat.png
```

---

## 📊 التقدم الحالي

```
الإجمالي: 100%
├── مكتمل: 40%
│   ├── CartContext ✅
│   ├── Store API ✅
│   └── Store Types ✅
└── متبقي: 60%
    ├── UI Components (20%)
    ├── Features (30%)
    └── Pages & Translations (10%)
```

---

## 📚 ملفات مرجعية

للاستعانة بها:
- `MIGRATION_GUIDE.md` - الدليل الشامل
- `ONBOARDING_MIGRATION_COMPLETE.md` - مثال مكتمل

---

**آخر تحديث:** ${new Date().toISOString().split('T')[0]}


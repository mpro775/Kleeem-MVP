# معمارية Frontend - مشروع كليم (Kaleem)

<div dir="rtl">

## 📋 نظرة عامة

هذا المستند يوثق المعمارية العامة لمشروع **كليم Frontend**، القواعد المعمارية، معايير التصميم والتطوير المستخدمة في بناء التطبيق.

---

## 🏗️ المعمارية العامة

### نوع التطبيق
- **Single Page Application (SPA)** مبني باستخدام React 19
- **Client-Side Routing** باستخدام React Router v7
- **State Management** موزع بين Context API و TanStack Query
- **UI Framework**: Material-UI (MUI) v7

### التقنيات الأساسية

```json
{
  "Framework": "React 19.1.0",
  "Build Tool": "Vite 6.3.5",
  "Language": "TypeScript 5.8.3",
  "UI Library": "Material-UI 7.3.1",
  "Routing": "React Router DOM 7.6.1",
  "State Management": "TanStack Query 5.85.3",
  "Styling": "Emotion (CSS-in-JS)",
  "Icons": "Lucide React + MUI Icons",
  "Forms": "React Hook Form 7.58.1",
  "Validation": "Zod 3.25.76",
  "HTTP Client": "Axios 1.9.0",
  "Testing": "Vitest 3.2.4 + Playwright 1.55.0",
  "Animations": "Framer Motion 12.15.0 + GSAP 3.13.0"
}
```

---

## 📁 هيكل المجلدات (Folder Structure)

```
Frontend/
├── public/                    # الملفات الثابتة (Static Assets)
├── src/
│   ├── app/                   # نواة التطبيق
│   │   ├── layout/           # مكونات التخطيط (Layouts)
│   │   ├── providers/        # مزودو السياق العام
│   │   ├── routes/           # إعدادات التوجيه
│   │   ├── App.tsx           # المكون الرئيسي
│   │   └── main.tsx          # نقطة الدخول
│   │
│   ├── features/              # الميزات (Feature-based)
│   │   ├── admin/            # ميزات لوحة المدير
│   │   ├── landing/          # صفحة الهبوط الرئيسية
│   │   ├── mechant/          # ميزات لوحة التاجر
│   │   ├── store/            # ميزات المتجر الإلكتروني
│   │   ├── onboarding/       # عملية التسجيل
│   │   ├── integrations/     # التكاملات الخارجية
│   │   └── shared/           # مكونات مشتركة بين الميزات
│   │
│   ├── pages/                 # الصفحات (Page Components)
│   │   ├── public/           # صفحات عامة
│   │   ├── auth/             # صفحات المصادقة
│   │   ├── merchant/         # صفحات التاجر
│   │   ├── admin/            # صفحات المدير
│   │   └── store/            # صفحات المتجر
│   │
│   ├── shared/                # موارد مشتركة عالمية
│   │   ├── api/              # إعدادات الـ API
│   │   ├── hooks/            # React Hooks مشتركة
│   │   ├── ui/               # مكونات UI عامة
│   │   ├── utils/            # وظائف مساعدة
│   │   ├── types/            # أنواع TypeScript
│   │   ├── lib/              # مكتبات خارجية مخصصة
│   │   └── errors/           # نظام معالجة الأخطاء
│   │
│   ├── context/               # Context Providers
│   │   ├── AuthContext.tsx   # سياق المصادقة
│   │   └── CartContext.tsx   # سياق سلة التسوق
│   │
│   ├── theme/                 # إعدادات الثيم والتصميم
│   │   └── theme.ts          # MUI Theme Configuration
│   │
│   ├── assets/                # الأصول الثابتة
│   ├── mock-data/             # بيانات وهمية للتطوير
│   ├── monitor/               # مراقبة الأداء
│   ├── test/                  # إعدادات الاختبار
│   └── types/                 # تعريفات الأنواع العامة
│
├── tests/                     # ملفات الاختبار E2E
├── scripts/                   # نصوص الأتمتة
├── data/                      # ملفات البيانات
├── vite.config.ts            # إعدادات Vite
├── tsconfig.json             # إعدادات TypeScript
├── eslint.config.js          # إعدادات ESLint
└── vitest.config.ts          # إعدادات Vitest
```

---

## 🎯 المبادئ المعمارية

### 1. **Feature-Based Architecture** (المعمارية القائمة على الميزات)

كل ميزة (Feature) لها مجلد مستقل يحتوي على:
- المكونات الخاصة بها
- Hooks مخصصة
- الأنماط
- أنواع TypeScript
- ملفات البيانات والثوابت

**مثال:**
```
features/mechant/products/
├── components/
│   ├── ProductForm.tsx
│   ├── ProductList.tsx
│   └── ProductCard.tsx
├── hooks/
│   ├── useProducts.ts
│   └── useProductMutations.ts
├── types/
│   └── product.types.ts
└── index.ts  # Barrel Export
```

### 2. **Separation of Concerns** (فصل المسؤوليات)

- **Pages**: مسؤولة فقط عن تجميع المكونات وإدارة المسار
- **Features**: تحتوي على منطق الأعمال والمكونات المعقدة
- **Shared**: موارد قابلة لإعادة الاستخدام عبر كامل التطبيق
- **Context**: إدارة الحالة العامة فقط

### 3. **Composition Over Inheritance** (التركيب على الوراثة)

نستخدم تركيب المكونات بدلاً من الوراثة:
```tsx
// ✅ جيد
<Card>
  <CardHeader />
  <CardContent />
  <CardActions />
</Card>

// ❌ تجنب
class ExtendedCard extends Card { ... }
```

### 4. **Dependency Injection** (حقن التبعيات)

- استخدام **Context API** للتبعيات العامة
- استخدام **Props** لتمرير التبعيات المحلية
- تجنب الـ Singletons والـ Global State غير المبرر

---

## 🎨 قواعد التصميم (Design Principles)

### نظام التصميم (Design System)

#### الألوان (Color Palette)
```typescript
palette: {
  primary: {
    main: "#7E66AC",
    dark: "#502e91",
    contrastText: "#fff"
  },
  secondary: {
    main: "#8F00FF"
  },
  background: {
    default: "#ffffff",
    paper: "#fff"
  }
}
```

#### الخطوط (Typography)
- **الخط الرئيسي**: Cairo (خط عربي احترافي)
- **المصدر**: `@fontsource/cairo`
- **الاتجاه**: RTL (من اليمين لليسار)

#### الأشكال (Shape)
- **Border Radius**: 
  - Cards: `24px`
  - Buttons: `14px`
  - Text Fields: `12px`
  - General: `10px`

#### الظلال (Shadows)
```css
box-shadow: 0 15px 35px rgba(50, 50, 93, 0.13), 
            0 5px 15px rgba(0, 0, 0, 0.09);
```

### المكونات المخصصة (Component Customization)

كل المكونات مخصصة لتتبع نظام التصميم:
- **MuiButton**: تدرجات لونية، زوايا دائرية، بدون تحويل لأحرف كبيرة
- **MuiPaper**: زوايا دائرية أكبر، ظلال احترافية
- **MuiTextField**: خلفية ملونة، حدود ملونة عند التركيز

---

## 💻 قواعد كتابة الكود (Coding Standards)

### 1. **تسمية الملفات والمجلدات**

```
✅ الصحيح:
- PascalCase للمكونات: ProductCard.tsx
- camelCase للـ Hooks: useProducts.ts
- kebab-case للمجلدات: merchant-settings/
- camelCase للـ Utils: formatPrice.ts

❌ الخطأ:
- product-card.tsx
- UseProducts.ts
- MerchantSettings/
```

### 2. **بنية الملف النموذجية**

```tsx
// 1. الاستيرادات (Imports) - مرتبة حسب ESLint
import { useState, useEffect } from 'react';  // React
import { Box, Typography } from '@mui/material';  // External
import { useProducts } from '@/features/merchant/products';  // Internal
import type { Product } from './types';  // Types

// 2. الأنواع والواجهات
interface ProductCardProps {
  product: Product;
  onEdit?: (id: string) => void;
}

// 3. المكون
export default function ProductCard({ product, onEdit }: ProductCardProps) {
  // 3.1 الحالة (State)
  const [isLoading, setIsLoading] = useState(false);
  
  // 3.2 الـ Hooks المخصصة
  const { mutate } = useProductMutations();
  
  // 3.3 التأثيرات (Effects)
  useEffect(() => {
    // ...
  }, []);
  
  // 3.4 المعالجات (Handlers)
  const handleEdit = () => {
    onEdit?.(product.id);
  };
  
  // 3.5 الرندر (Render)
  return (
    <Box>
      <Typography>{product.name}</Typography>
    </Box>
  );
}

// 4. التصديرات الإضافية (إن وجدت)
export { type ProductCardProps };
```

### 3. **TypeScript - قواعد الأنواع**

```typescript
// ✅ استخدم Interfaces للكائنات
interface User {
  id: string;
  name: string;
  email: string;
}

// ✅ استخدم Types للدوال والتركيبات المعقدة
type UserTransformer = (user: User) => FormattedUser;
type Status = 'pending' | 'approved' | 'rejected';

// ✅ استخدم Generics للمكونات القابلة لإعادة الاستخدام
interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
}

// ❌ تجنب any
const data: any = fetchData();  // خطأ

// ✅ استخدم unknown أو الأنواع المحددة
const data: unknown = fetchData();
const user: User = fetchData();
```

### 4. **React Hooks - القواعد**

```typescript
// ✅ Hooks مخصصة - تبدأ بـ use
export function useProducts() {
  const { data, isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: fetchProducts,
  });
  
  return { products: data, isLoading };
}

// ✅ استخدم useCallback للدوال التي تُمرر كـ props
const handleSubmit = useCallback((data: FormData) => {
  submitForm(data);
}, []);

// ✅ استخدم useMemo للحسابات الثقيلة
const filteredProducts = useMemo(() => {
  return products.filter(p => p.isActive);
}, [products]);
```

### 5. **Error Handling - معالجة الأخطاء**

```typescript
// ✅ استخدم Error Boundaries
<AppErrorIntegration>
  <App />
</AppErrorIntegration>

// ✅ استخدم try-catch في الـ Async Functions
async function fetchData() {
  try {
    const response = await api.get('/data');
    return response.data;
  } catch (error) {
    console.error('Failed to fetch data:', error);
    throw error;  // أعد رمي الخطأ للمعالجة في المستوى الأعلى
  }
}

// ✅ استخدم التحقق من الأنواع
if (error instanceof AxiosError) {
  // معالجة أخطاء Axios
}
```

### 6. **Forms - التعامل مع النماذج**

```typescript
// ✅ استخدم React Hook Form + Zod
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const schema = z.object({
  name: z.string().min(3, 'الاسم يجب أن يكون 3 أحرف على الأقل'),
  email: z.string().email('البريد الإلكتروني غير صحيح'),
});

type FormData = z.infer<typeof schema>;

function MyForm() {
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });
  
  const onSubmit = (data: FormData) => {
    // معالجة البيانات
  };
  
  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register('name')} />
      {errors.name && <span>{errors.name.message}</span>}
    </form>
  );
}
```

### 7. **API Calls - استدعاءات الـ API**

```typescript
// ✅ استخدم TanStack Query
import { useQuery, useMutation } from '@tanstack/react-query';

// للقراءة (GET)
export function useProducts() {
  return useQuery({
    queryKey: ['products'],
    queryFn: () => api.get('/products').then(res => res.data),
    staleTime: 5 * 60 * 1000,  // 5 دقائق
  });
}

// للكتابة (POST/PUT/DELETE)
export function useCreateProduct() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: ProductInput) => api.post('/products', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}
```

### 8. **Code Splitting - تقسيم الكود**

```typescript
// ✅ استخدم lazy loading للصفحات
import { lazy, Suspense } from 'react';

const Dashboard = lazy(() => import('@/pages/merchant/Dashboard'));

function App() {
  return (
    <Suspense fallback={<div>جارٍ التحميل...</div>}>
      <Dashboard />
    </Suspense>
  );
}

// ✅ تقسيم الـ chunks في Vite Config
output: {
  manualChunks: {
    react: ['react', 'react-dom', 'react-router-dom'],
    mui: ['@mui/material', '@emotion/react', '@emotion/styled'],
    charts: ['recharts', 'chart.js'],
  },
}
```

---

## 🧪 الاختبارات (Testing Standards)

### أنواع الاختبارات

1. **Unit Tests** - Vitest
   ```bash
   npm run test
   npm run test:watch
   npm run test:cov
   ```

2. **E2E Tests** - Playwright
   ```bash
   npm run e2e
   ```

3. **Performance Tests**
   ```bash
   npm run test:performance
   ```

### بنية ملف الاختبار

```typescript
// ProductCard.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProductCard } from './ProductCard';

describe('ProductCard', () => {
  it('should render product name', () => {
    const product = { id: '1', name: 'Test Product' };
    render(<ProductCard product={product} />);
    
    expect(screen.getByText('Test Product')).toBeInTheDocument();
  });
  
  it('should call onEdit when edit button is clicked', async () => {
    const onEdit = vi.fn();
    const product = { id: '1', name: 'Test Product' };
    
    render(<ProductCard product={product} onEdit={onEdit} />);
    
    await userEvent.click(screen.getByRole('button', { name: /تعديل/i }));
    
    expect(onEdit).toHaveBeenCalledWith('1');
  });
});
```

---

## 🚀 الأداء والتحسين (Performance)

### استراتيجيات التحسين

1. **Lazy Loading**
   - جميع الصفحات تُحمل بشكل كسول
   - استخدام `React.lazy()` و `Suspense`

2. **Code Splitting**
   - تقسيم المكتبات الكبيرة (React, MUI, Charts)
   - تحسين حجم الـ Bundle

3. **Memoization**
   - استخدام `useMemo` للحسابات المعقدة
   - استخدام `useCallback` للدوال

4. **Image Optimization**
   - ضغط الصور قبل الاستخدام
   - استخدام WebP عند الإمكان
   - Lazy loading للصور

5. **Bundle Optimization**
   ```typescript
   // vite.config.ts
   build: {
     sourcemap: false,
     cssCodeSplit: true,
     assetsInlineLimit: 4096,
     chunkSizeWarningLimit: 1200,
   }
   ```

---

## 🔒 الأمان (Security)

### ممارسات الأمان

1. **XSS Protection**
   - React تقوم بالـ escaping تلقائياً
   - استخدام `dangerouslySetInnerHTML` فقط عند الضرورة

2. **Authentication**
   - JWT Tokens مخزنة بشكل آمن
   - Protected Routes باستخدام `ProtectedRoute`

3. **Authorization**
   - Role-based access control
   - استخدام `RoleRoute` للصفحات الخاصة

4. **Environment Variables**
   - عدم تخزين أسرار في الكود
   - استخدام `.env` لا يتم رفعه للـ Git

---

## 📦 إدارة الحالة (State Management)

### التوزيع

1. **Local State** - `useState`, `useReducer`
   - للحالة المحلية داخل المكون

2. **Context API** - `AuthContext`, `CartContext`
   - للحالة المشتركة بين عدة مكونات
   - المصادقة، السلة، الإعدادات

3. **Server State** - TanStack Query
   - لبيانات الـ API
   - التخزين المؤقت (Caching)
   - التزامن (Synchronization)

4. **URL State** - React Router
   - للحالة المتعلقة بالمسار
   - المعاملات (Query Params)

---

## 🌍 الدعم متعدد اللغات (i18n/RTL)

### إعدادات RTL

```typescript
// main.tsx
import createCache from '@emotion/cache';
import stylisRTLPlugin from 'stylis-plugin-rtl';

const cacheRtl = createCache({
  key: 'muirtl',
  stylisPlugins: [stylisRTLPlugin],
  prepend: true,
});

// theme.ts
const theme = createTheme({
  direction: 'rtl',
  typography: {
    fontFamily: 'Cairo, sans-serif',
  },
}, arSD);
```

---

## 📝 التوثيق (Documentation)

### التعليقات في الكود

```typescript
// ✅ اكتب تعليقات واضحة بالعربية أو الإنجليزية
/**
 * يجلب قائمة المنتجات من الخادم
 * @param filters - معايير التصفية
 * @returns قائمة المنتجات المفلترة
 */
async function fetchProducts(filters: ProductFilters) {
  // ...
}

// ❌ لا تكتب تعليقات واضحة من الكود
// هذه الدالة تجلب المنتجات
function fetchProducts() { ... }  // واضح من اسم الدالة
```

---

## 🛠️ الأدوات والإضافات (Tools & Plugins)

### الأدوات المستخدمة

1. **ESLint** - فحص الكود
2. **Prettier** - تنسيق الكود
3. **TypeScript** - فحص الأنواع
4. **Vite** - أداة البناء
5. **Vitest** - الاختبارات
6. **Playwright** - الاختبارات الشاملة
7. **MSW** - محاكاة الـ API

### الإضافات المفيدة

- **Rollup Visualizer** - تحليل حجم الـ Bundle
- **Vite Compression** - ضغط الملفات (Gzip, Brotli)
- **Sentry** - مراقبة الأخطاء
- **OpenTelemetry** - مراقبة الأداء

---

## 🎯 أفضل الممارسات (Best Practices)

### القواعد العامة

1. ✅ **اكتب كود نظيف وقابل للقراءة**
   - أسماء متغيرات واضحة
   - دوال صغيرة ومركزة
   - تجنب التعقيد الزائد

2. ✅ **اتبع مبدأ DRY** (Don't Repeat Yourself)
   - استخرج الكود المكرر لمكونات/دوال مشتركة

3. ✅ **اكتب اختبارات**
   - كل مكون يجب أن يكون له اختبار
   - اختبر الحالات الحرجة

4. ✅ **استخدم TypeScript بشكل صحيح**
   - تجنب `any`
   - اكتب أنواع واضحة

5. ✅ **راجع الكود قبل الدفع**
   - تأكد من عدم وجود console.log
   - تأكد من عدم وجود أكواد معلقة
   - تأكد من مرور الاختبارات

6. ✅ **حافظ على الأداء**
   - استخدم React DevTools Profiler
   - راقب حجم الـ Bundle
   - استخدم Lazy Loading

7. ✅ **اتبع معايير الوصولية (Accessibility)**
   - استخدم Semantic HTML
   - أضف ARIA labels عند الحاجة
   - تأكد من دعم لوحة المفاتيح

---

## 📊 السكريبتات المتاحة (Available Scripts)

```bash
# التطوير
npm run dev                    # تشغيل السيرفر المحلي

# البناء
npm run build                  # بناء للإنتاج
npm run preview                # معاينة البناء

# الاختبارات
npm run test                   # اختبارات الوحدات
npm run test:watch             # مراقبة الاختبارات
npm run test:cov               # تقرير التغطية
npm run e2e                    # اختبارات شاملة

# الجودة
npm run lint                   # فحص الكود
npm run prettier               # تنسيق الكود

# الأداء
npm run test:performance       # اختبارات الأداء

# SEO
npm run seo:audit              # فحص SEO شامل
```

---

## 🔄 سير العمل (Workflow)

### عملية التطوير

1. **إنشاء فرع جديد**
   ```bash
   git checkout -b feature/product-management
   ```

2. **التطوير**
   - اكتب الكود
   - اكتب الاختبارات
   - تأكد من مرور الاختبارات

3. **الفحص**
   ```bash
   npm run lint
   npm run test
   npm run build  # تأكد من نجاح البناء
   ```

4. **الدفع والمراجعة**
   ```bash
   git add .
   git commit -m "feat: add product management feature"
   git push origin feature/product-management
   ```

5. **Merge Request**
   - أنشئ MR
   - اطلب مراجعة الكود
   - انتظر الموافقة

---

## 📚 موارد إضافية

### الوثائق الرسمية

- [React Documentation](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Material-UI](https://mui.com)
- [React Router](https://reactrouter.com)
- [TanStack Query](https://tanstack.com/query)
- [Vite Guide](https://vitejs.dev/guide/)

### الأنماط والممارسات

- [React TypeScript Cheatsheet](https://react-typescript-cheatsheet.netlify.app/)
- [Clean Code JavaScript](https://github.com/ryanmcdermott/clean-code-javascript)

---

## 🤝 المساهمة

عند المساهمة في المشروع:

1. اقرأ هذا المستند بالكامل
2. اتبع القواعد المذكورة
3. اكتب كود نظيف ومختبر
4. وثق التغييرات الكبيرة
5. احترم مراجعات الكود

---

## 📝 الخاتمة

هذا المستند حي ويتم تحديثه بشكل مستمر. إذا وجدت أي شيء غير واضح أو تريد إضافة معلومات جديدة، لا تتردد في المساهمة بتحديث هذا الملف.

**نسخة المستند**: 1.0  
**آخر تحديث**: ديسمبر 2025  
**المسؤول**: فريق كليم للتطوير

</div>

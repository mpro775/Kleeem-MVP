# دليل استخدام AuthContext

## نظرة عامة

تم إعادة بناء `AuthContext` ليتوافق مع Next.js App Router مع فصل كامل بين:
- **Server State**: يتم إدارته عبر Server Actions والـ Cookies
- **Client State**: يتم إدارته عبر Context API للـ React

## الهيكل العام

```
frontend-next/src/
├── contexts/
│   ├── AuthContext.tsx       # Client Context
│   └── types.ts              # Types المشتركة
├── lib/
│   ├── auth.ts               # Server-side auth utilities
│   └── actions/
│       └── auth.ts           # Server Actions
└── app/
    └── api/
        └── auth/
            └── me/
                └── route.ts  # API للحصول على المستخدم الحالي
```

## 1. إضافة AuthProvider إلى التطبيق

في ملف layout الرئيسي (مثل `app/[locale]/layout.tsx`):

```typescript
import { AuthProvider } from '@/contexts/AuthContext';
import { getCurrentUser } from '@/lib/auth';

export default async function RootLayout({ children }) {
  // احصل على المستخدم من Server Side
  const user = await getCurrentUser();

  return (
    <html>
      <body>
        <AuthProvider initialUser={user}>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
```

## 2. استخدام useAuth في Client Components

```typescript
'use client';

import { useAuth } from '@/contexts/AuthContext';

export function ProfileComponent() {
  const { user, isAuthenticated, isAdmin, isLoading } = useAuth();

  if (isLoading) {
    return <div>جاري التحميل...</div>;
  }

  if (!isAuthenticated) {
    return <div>يرجى تسجيل الدخول</div>;
  }

  return (
    <div>
      <h1>مرحباً {user.name}</h1>
      <p>البريد الإلكتروني: {user.email}</p>
      {isAdmin && <p>أنت مدير</p>}
    </div>
  );
}
```

## 3. استخدام Server Actions للمصادقة

### تسجيل الدخول

```typescript
'use client';

import { loginAction } from '@/lib/actions/auth';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

export function LoginForm() {
  const { refetch } = useAuth();
  const router = useRouter();

  async function handleSubmit(formData: FormData) {
    const result = await loginAction(formData);
    
    if (result.success) {
      // إعادة جلب بيانات المستخدم من Context
      await refetch();
      router.push('/dashboard');
    } else {
      alert(result.error);
    }
  }

  return (
    <form action={handleSubmit}>
      <input name="email" type="email" required />
      <input name="password" type="password" required />
      <button type="submit">تسجيل الدخول</button>
    </form>
  );
}
```

### تسجيل الخروج

```typescript
'use client';

import { logoutAction } from '@/lib/actions/auth';

export function LogoutButton() {
  return (
    <form action={logoutAction}>
      <button type="submit">تسجيل الخروج</button>
    </form>
  );
}
```

## 4. التحقق من الصلاحيات

```typescript
'use client';

import { useAuth } from '@/contexts/AuthContext';

export function AdminOnlyComponent() {
  const { hasRole } = useAuth();

  if (!hasRole('ADMIN')) {
    return <div>غير مصرح</div>;
  }

  return <div>محتوى خاص بالمدراء</div>;
}
```

## 5. تحديث بيانات المستخدم

```typescript
'use client';

import { useAuth } from '@/contexts/AuthContext';

export function UpdateProfileComponent() {
  const { updateUser, user } = useAuth();

  const handleUpdate = async () => {
    // قم بتحديث البيانات على الباك إند أولاً
    const response = await fetch('/api/user/profile', {
      method: 'PATCH',
      body: JSON.stringify({ name: 'اسم جديد' }),
    });

    if (response.ok) {
      // ثم حدّث Context المحلي
      updateUser({ name: 'اسم جديد' });
    }
  };

  return (
    <div>
      <p>الاسم الحالي: {user?.name}</p>
      <button onClick={handleUpdate}>تحديث الاسم</button>
    </div>
  );
}
```

## 6. الحماية في Server Components

```typescript
import { requireAuth, requireRole } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function AdminPage() {
  // تحقق من المصادقة والصلاحية
  try {
    await requireRole('ADMIN');
  } catch {
    redirect('/login');
  }

  return <div>صفحة المدراء</div>;
}
```

## 7. Middleware للحماية

الـ Middleware موجود في `src/middleware.ts` ويتعامل مع:
- إعادة توجيه المستخدمين غير المصادقين إلى صفحة تسجيل الدخول
- منع المستخدمين المصادقين من الوصول إلى صفحات المصادقة
- التحكم في الوصول بناءً على الدور (ADMIN, MERCHANT, MEMBER)

## 8. API Routes

### الحصول على المستخدم الحالي

```typescript
// تم إنشاؤه في: /api/auth/me
GET /api/auth/me

// Response:
{
  "success": true,
  "user": {
    "id": "...",
    "name": "...",
    "email": "...",
    "role": "MERCHANT",
    // ...
  }
}
```

## الفرق بين النظام القديم والجديد

### القديم (React Router):
- ❌ استخدام localStorage للتخزين
- ❌ Client-side فقط
- ❌ التوكن مكشوف في JavaScript
- ❌ لا يعمل مع Server Components

### الجديد (Next.js):
- ✅ استخدام httpOnly cookies
- ✅ Server + Client State Management
- ✅ التوكن آمن (لا يمكن الوصول إليه من JavaScript)
- ✅ يعمل مع Server و Client Components
- ✅ Middleware للحماية التلقائية
- ✅ Better SEO و Performance

## ملاحظات مهمة

1. **لا تستخدم localStorage للتوكنات**: الـ cookies تتم إدارتها تلقائياً
2. **Server Actions هي الطريقة الوحيدة للمصادقة**: لا تحاول تعديل الـ cookies من الـ client
3. **استخدم `refetch()`**: بعد أي عملية تغيير على المستخدم في الـ Server
4. **الـ Middleware يعمل تلقائياً**: لا حاجة لحماية يدوية في معظم الحالات


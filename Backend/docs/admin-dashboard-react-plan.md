# خطة لوحة تحكم الأدمن — React 19 + Vite

> خطة مفصّلة لبناء لوحة تحكم أدمن كاملة باستخدام **React 19** و **Vite** كمشروع مستقل، بنفس هيكلية المشروع (Kleeem-MVP) مع المراجع والمسارات والعمليات.

---

## 1. نظرة عامة

| العنصر | التفاصيل |
|--------|----------|
| **التقنية** | React 19 + Vite |
| **التوجيه** | React Router v7 |
| **الطبيعة** | مشروع جديد مستقل (ليس مع الفرونت إند الحالي) |
| **الربط** | Backend API الموجود في Kleeem-MVP |
| **التصميم** | نفس هيكلية frontend-next (features, lib, components, messages) |

---

## 2. المراجع

| المرجع | المسار | الاستخدام |
|--------|--------|-----------|
| مسارات الأدمن الكاملة | `Backend/docs/ADMIN_ROUTES.md` | كل الـ endpoints والتوثيق |
| خطة عمليات لوحة الأدمن | `Backend/docs/admin-dashboard-operations-plan.md` | المراحل والعمليات المنفذة |
| بنية الفرونت إند المرجعية | `frontend-next/src/` | هيكلية المجلدات والمكونات |
| توثيق الـ API | Swagger `/api/docs` | التفاصيل التقنية للـ endpoints |
| Backend المصدر | `Backend/` | مصادقة JWT، نماذج البيانات |

---

## 3. هيكلية المشروع المقترحة (Vite + React Router)

```
admin-dashboard/
├── public/
├── index.html
├── src/
│   ├── main.tsx                 # نقطة الدخول
│   ├── App.tsx                  # Router + Providers
│   ├── routes/
│   │   ├── index.tsx            # تعريف المسارات
│   │   ├── AuthLayout.tsx       # layout تسجيل الدخول
│   │   ├── AdminLayout.tsx      # layout الأدمن (sidebar, header)
│   │   ├── LoginPage.tsx
│   │   ├── DashboardPage.tsx
│   │   ├── MerchantsPage.tsx
│   │   ├── MerchantDetailPage.tsx
│   │   ├── UsersPage.tsx
│   │   ├── UsagePage.tsx
│   │   ├── PlansPage.tsx
│   │   ├── ChannelsPage.tsx
│   │   ├── InstructionsPage.tsx
│   │   ├── SupportPage.tsx
│   │   ├── ReportsPage.tsx
│   │   ├── AnalyticsPage.tsx
│   │   ├── SystemPage.tsx
│   │   └── ...
│   ├── features/                # منطق النطاق
│   │   ├── admin/
│   │   │   ├── api/             # استدعاءات API
│   │   │   │   ├── dashboard.ts
│   │   │   │   ├── merchants.ts
│   │   │   │   ├── users.ts
│   │   │   │   └── ...
│   │   │   ├── hooks/           # React Query hooks
│   │   │   └── types.ts
│   │   └── auth/
│   │       ├── api.ts
│   │       ├── AuthContext.tsx
│   │       └── types.ts
│   ├── components/
│   │   ├── layouts/
│   │   │   ├── AdminLayout.tsx
│   │   │   └── Sidebar.tsx
│   │   └── shared/
│   │       ├── DataTable.tsx
│   │       └── StatCard.tsx
│   ├── lib/
│   │   ├── axios.ts
│   │   └── utils.ts
│   ├── messages/
│   │   ├── ar/
│   │   │   └── admin.json
│   │   └── en/
│   │       └── admin.json
│   └── providers/
│       └── QueryProvider.tsx
├── package.json
└── vite.config.ts
```

**إنشاء المشروع:**
```bash
npm create vite@latest admin-dashboard -- --template react-ts
cd admin-dashboard
npm install react-router-dom @tanstack/react-query axios @mui/material @emotion/react @emotion/styled recharts react-i18next i18next date-fns zod
```

**نموذج التوجيه (React Router):**
```tsx
// App.tsx
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';

const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    path: '/admin',
    element: <AdminLayout />,
    children: [
      { index: true, element: <Navigate to="/admin/dashboard" replace /> },
      { path: 'dashboard', element: <DashboardPage /> },
      { path: 'merchants', element: <MerchantsPage /> },
      { path: 'merchants/:id', element: <MerchantDetailPage /> },
      // ...
    ],
  },
  { path: '*', element: <Navigate to="/admin/dashboard" replace /> },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
```

---

## 4. المسارات والشاشات

### 4.1 لوحة رئيسية
| المسار | الشاشة | API |
|--------|--------|-----|
| `/admin/dashboard` | إحصائيات + ترندات | `GET /admin/dashboard`, `GET /admin/dashboard/trends?period=7d\|30d` |

**العمليات:**
- عرض بطاقات (تجار، مستخدمين، استهلاك)
- رسم بياني للترندات (recharts)

---

### 4.2 التجار
| المسار | الشاشة | API |
|--------|--------|-----|
| `/admin/merchants` | قائمة + فلترة + بحث | `GET /admin/merchants` |
| `/admin/merchants/:id` | تفاصيل تاجر | `GET /admin/merchants/:id` |
| `/admin/merchants/:id/audit-log` | سجل إجراءات | `GET /admin/merchants/:id/audit-log` |

**العمليات:**
- فلترة (status, active, subscriptionTier)
- بحث، ترتيب، ترقيم
- تصدير CSV
- تعليق/إعادة تفعيل
- تحديث حالة

---

### 4.3 المستخدمون
| المسار | الشاشة | API |
|--------|--------|-----|
| `/admin/users` | قائمة + فلترة | `GET /admin/users` |
| `/admin/users/:id` | تفاصيل مستخدم | `GET /admin/users/:id` |

**العمليات:**
- فلترة (role, active)، بحث، ترقيم
- تصدير CSV
- تحديث (دور، حالة، ربط تاجر)
- إعادة تعيين كلمة مرور

---

### 4.4 الاستهلاك
| المسار | الشاشة | API |
|--------|--------|-----|
| `/admin/usage` | قائمة استهلاك | `GET /admin/usage` |
| `/admin/usage/alerts` | تنبيهات تجاوز الحد | `GET /admin/usage/alerts` |
| `/admin/usage/report` | تقرير فترة | `GET /admin/usage/report?from=&to=` |
| `/admin/usage/:merchantId` | استهلاك تاجر | `GET /admin/usage/:merchantId` |

**العمليات:**
- إعادة تعيين استهلاك شهر
- تصدير CSV

---

### 4.5 الخطط
| المسار | الشاشة | API |
|--------|--------|-----|
| `/admin/plans` | قائمة خطط | `GET /admin/plans` |
| `/admin/plans/:id` | تفاصيل/تعديل | `GET`, `PUT` |
| `/admin/plans/create` | إنشاء خطة | `POST` |

**العمليات:** CRUD، تفعيل/أرشفة

---

### 4.6 القنوات والتوجيهات
| المسار | الشاشة | API |
|--------|--------|-----|
| `/admin/channels` | قائمة قنوات | `GET /admin/channels` |
| `/admin/instructions` | قائمة توجيهات | `GET /admin/instructions` |

**العمليات:** تحديث، فصل قناة، تفعيل/إلغاء تفعيل جماعي

---

### 4.7 الدعم والتذاكر
| المسار | الشاشة | API |
|--------|--------|-----|
| `/admin/support` | قائمة تذاكر | `GET /admin/support` |
| `/admin/support/:id` | تفاصيل + ردود | `GET`, `PATCH`, `POST .../replies` |
| `/admin/support/stats` | إحصائيات | `GET /admin/support/stats` |

**العمليات:** تعيين موظف، إضافة رد، تصدير

---

### 4.8 التقارير
| المسار | الشاشة | API |
|--------|--------|-----|
| `/admin/reports` | لوحة تقارير | — |
| `/admin/reports/merchant-activity/:id` | نشاط تاجر | `GET /admin/reports/merchant-activity/:id` |
| `/admin/reports/signups` | تسجيلات | `GET /admin/reports/signups?from=&to=` |
| `/admin/reports/kleem-summary` | ملخص كليم | `GET /admin/reports/kleem-summary` |
| `/admin/reports/usage-by-plan` | استخدام حسب الخطة | `GET /admin/reports/usage-by-plan?monthKey=` |

---

### 4.9 التحليلات وكليم
| المسار | الشاشة | API |
|--------|--------|-----|
| `/admin/analytics/kleem-missing-responses` | ردود مفقودة | `GET`, `PATCH`, `POST bulk-resolve` |
| `/admin/kleem/*` | إعدادات كليم | `admin/kleem/*` |

---

### 4.10 النظام والأمان
| المسار | الشاشة | API |
|--------|--------|-----|
| `/admin/system/audit-log` | سجل تدقيق | `GET /admin/system/audit-log` |
| `/admin/system/sessions` | جلسات أدمن | `GET`, `DELETE /admin/system/sessions/:jti` |
| `/admin/system/feature-flags` | إعدادات قفل/فتح | `GET /admin/system/feature-flags` |
| `/admin/system/backup` | نسخ احتياطي | `POST /admin/system/backup` |

---

## 5. المصادقة

| العملية | المسار | الملاحظات |
|---------|--------|-----------|
| تسجيل الدخول | `POST /auth/login` | email, password → accessToken, refreshToken |
| تخزين التوكن | localStorage أو cookie | Bearer في `Authorization` |
| التحقق من الدور | `user.role === 'ADMIN'` | إن لم يكن أدمن → إعادة توجيه |
| تجديد التوكن | `POST /auth/refresh` | قبل انتهاء الصلاحية |

---

## 6. الاعتماديات المقترحة

```json
{
  "react": "^19",
  "react-dom": "^19",
  "@tanstack/react-query": "^5",
  "axios": "^1.x",
  "react-router-dom": "^7",
  "@mui/material": "^7",
  "@emotion/react": "^11",
  "@emotion/styled": "^11",
  "recharts": "^3",
  "react-i18next": "^15",
  "i18next": "^24",
  "zod": "^3",
  "date-fns": "^4"
}
```

---

## 7. ترتيب التنفيذ المقترح

| المرحلة | المحتوى | التقدير |
|---------|---------|----------|
| 1 | إعداد المشروع + مصادقة + layout أساسي | أسبوع |
| 2 | لوحة رئيسية + التجار + المستخدمون | أسبوعان |
| 3 | الاستهلاك + الخطط + القنوات + التوجيهات | أسبوع |
| 4 | الدعم + التقارير + التحليلات | أسبوع |
| 5 | النظام والأمان + كليم | أسبوع |
| 6 | تحسينات UX + اختبارات | أسبوع |

---

## 8. المتغيرات البيئية

```env
VITE_API_BASE_URL=https://api.kleem.sa
```

استخدم `import.meta.env.VITE_API_BASE_URL` في الكود.

---

## 9. مراجع إضافية

- [React 19 Docs](https://react.dev/)
- [Vite](https://vite.dev/)
- [React Router](https://reactrouter.com/)
- [TanStack Query](https://tanstack.com/query/latest)
- [MUI Data Grid](https://mui.com/x/react-data-grid/)
- [Recharts](https://recharts.org/)
- [react-i18next](https://react.i18next.com/)
- [ADMIN_ROUTES.md](./ADMIN_ROUTES.md) — قائمة المسارات الكاملة
- [admin-dashboard-operations-plan.md](./admin-dashboard-operations-plan.md) — خطة العمليات

---

*آخر تحديث: 2025-02-11*

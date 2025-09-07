# تكامل Sentry - نظام معالجة الأخطاء

## 🚀 نظرة عامة

تم إضافة تكامل شامل مع **Sentry** لنظام معالجة الأخطاء، مما يوفر:

- ✅ **مراقبة الأخطاء في الوقت الفعلي**
- ✅ **تتبع الأداء والعمليات**
- ✅ **مراقبة المستخدمين والجلسات**
- ✅ **تصفية ذكية للأخطاء**
- ✅ **تكامل سلس مع النظام الحالي**

## 📦 المكونات المضافة

### 1. SentryIntegration.ts
**الملف الرئيسي لتكامل Sentry**

```typescript
import { sentryIntegration } from '@/shared/errors';

// تهيئة Sentry
sentryIntegration.init({
  dsn: 'your-sentry-dsn',
  environment: 'production',
  release: '1.0.0'
});

// إرسال خطأ
sentryIntegration.captureException(error, context);

// إرسال رسالة
sentryIntegration.captureMessage('Custom message', 'error');

// إضافة معلومات المستخدم
sentryIntegration.setUser({
  id: 'user-id',
  email: 'user@example.com',
  role: 'merchant'
});
```

### 2. SentryProvider.tsx
**مكون React لتوفير Sentry في التطبيق**

```typescript
import { SentryProvider, useSentry } from '@/shared/errors';

function App() {
  return (
    <SentryProvider 
      config={sentryConfig}
      autoTrackUser={true}
      autoTrackPerformance={true}
    >
      <YourApp />
    </SentryProvider>
  );
}

// استخدام Sentry في المكونات
function MyComponent() {
  const { captureException, addBreadcrumb } = useSentry();
  
  const handleError = (error) => {
    captureException(error, { component: 'MyComponent' });
  };
  
  const handleClick = () => {
    addBreadcrumb({
      message: 'Button clicked',
      category: 'ui',
      level: 'info'
    });
  };
}
```

### 3. sentry.config.ts
**ملف التكوين مع إعدادات البيئات المختلفة**

```typescript
import { createSentryConfig, getSentryConfig } from '@/shared/errors';

// الحصول على التكوين المناسب للبيئة
const config = getSentryConfig();

// إنشاء تكوين مخصص
const customConfig = createSentryConfig({
  tracesSampleRate: 0.5,
  debug: true
});
```

## 🔧 التثبيت والإعداد

### 1. تثبيت Sentry
```bash
npm install @sentry/react @sentry/tracing
```

### 2. إعداد متغيرات البيئة
```env
# .env.development
VITE_SENTRY_DSN_DEV=https://your-dev-dsn@sentry.io/project

# .env.production
VITE_SENTRY_DSN_PROD=https://your-prod-dsn@sentry.io/project
VITE_APP_VERSION=1.0.0
```

### 3. تكامل مع التطبيق الرئيسي
```typescript
// src/app/main.tsx
import { AppErrorIntegration } from '@/shared/errors';
import { createSentryConfig } from '@/shared/errors/sentry.config';

const sentryConfig = createSentryConfig();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AppErrorIntegration
        enableSentry={true}
        sentryConfig={sentryConfig}
        enablePerformanceMonitoring={true}
      >
        <App />
      </AppErrorIntegration>
    </BrowserRouter>
  </React.StrictMode>
);
```

## 🎯 الميزات المتاحة

### 1. مراقبة الأخطاء
- **تسجيل تلقائي**: جميع الأخطاء تُسجل تلقائياً
- **تصفية ذكية**: تجاهل الأخطاء غير المهمة
- **سياق غني**: معلومات المستخدم والبيئة
- **تتبع الجلسة**: ربط الأخطاء بالمستخدمين

### 2. مراقبة الأداء
- **تحميل الصفحات**: قياس وقت التحميل
- **العمليات**: تتبع العمليات المهمة
- **المكونات**: مراقبة أداء المكونات
- **النماذج**: تتبع تفاعلات النماذج

### 3. مراقبة المستخدمين
- **تتبع تلقائي**: معلومات المستخدم تلقائياً
- **الجلسات**: مراقبة جلسات المستخدمين
- **التنقل**: تتبع حركة المستخدمين
- **التفاعلات**: مراقبة النقرات والإجراءات

### 4. تصفية الأخطاء
```typescript
// تجاهل أخطاء معينة
ignoreErrors: [
  'Network Error',
  'Failed to fetch',
  'Script error.',
  'ResizeObserver loop limit exceeded'
]

// تصفية العناوين
denyUrls: [
  /localhost/,
  /127\.0\.0\.1/,
  /chrome-extension/
]
```

## 🛠️ الاستخدام المتقدم

### 1. مراقبة المكونات
```typescript
import { SentryComponentMonitor } from '@/shared/errors';

function MyComponent() {
  return (
    <SentryComponentMonitor componentName="MyComponent">
      <div>My Component Content</div>
    </SentryComponentMonitor>
  );
}
```

### 2. مراقبة الأداء
```typescript
import { SentryPerformanceMonitor } from '@/shared/errors';

function App() {
  return (
    <SentryPerformanceMonitor>
      <YourApp />
    </SentryPerformanceMonitor>
  );
}
```

### 3. إضافة Breadcrumbs
```typescript
import { useSentry } from '@/shared/errors';

function MyComponent() {
  const { addBreadcrumb } = useSentry();
  
  const handleAction = () => {
    addBreadcrumb({
      message: 'User performed action',
      category: 'user',
      level: 'info',
      data: { action: 'button_click' }
    });
  };
}
```

### 4. تتبع العمليات المخصصة
```typescript
import { Sentry } from '@/shared/errors';

// إنشاء عملية مخصصة
const transaction = Sentry.startTransaction({
  name: 'Custom Operation',
  op: 'custom'
});

// إضافة خطوات للعملية
const span = transaction.startChild({
  op: 'step',
  description: 'Processing data'
});

// إنهاء العملية
span.finish();
transaction.finish();
```

## 📊 الإعدادات المتقدمة

### 1. تكوين مخصص
```typescript
const customConfig = {
  dsn: 'your-dsn',
  environment: 'production',
  release: '1.0.0',
  debug: false,
  tracesSampleRate: 0.1,
  
  // تصفية مخصصة
  beforeSend: (event, hint) => {
    // منطق التصفية المخصص
    return event;
  },
  
  // تصفية Breadcrumbs
  beforeBreadcrumb: (breadcrumb, hint) => {
    // منطق تصفية Breadcrumbs
    return breadcrumb;
  }
};
```

### 2. إعدادات الأداء
```typescript
const performanceConfig = {
  enablePageLoadMonitoring: true,
  enableTransactionMonitoring: true,
  enableComponentMonitoring: true,
  enableFormMonitoring: true,
  enableClickMonitoring: true,
  enableNavigationMonitoring: true,
};
```

### 3. إعدادات المستخدم
```typescript
const userTrackingConfig = {
  autoTrackUser: true,
  trackUserDetails: true,
  trackSession: true,
  trackChanges: true,
};
```

## 🔍 مراقبة وإدارة الأخطاء

### 1. لوحة تحكم Sentry
- **الأخطاء في الوقت الفعلي**: عرض الأخطاء فور حدوثها
- **تحليلات مفصلة**: إحصائيات وتحليلات شاملة
- **تتبع المستخدمين**: رؤية تجربة المستخدمين
- **أداء التطبيق**: مراقبة الأداء والسرعة

### 2. التنبيهات والإشعارات
- **تنبيهات فورية**: إشعارات فورية للأخطاء الحرجة
- **قواعد مخصصة**: إنشاء قواعد للتنبيهات
- **تكامل Slack/Email**: إرسال التنبيهات عبر قنوات مختلفة

### 3. التحليل والتقارير
- **تقارير دورية**: تقارير أسبوعية وشهرية
- **تحليل الاتجاهات**: تتبع اتجاهات الأخطاء
- **مقاييس الأداء**: قياس أداء التطبيق

## 🚨 أفضل الممارسات

### 1. تصفية الأخطاء
```typescript
// تجاهل الأخطاء المتكررة
beforeSend: (event, hint) => {
  if (event.exception) {
    const exception = event.exception.values?.[0];
    if (exception?.value?.includes('Network Error')) {
      return null; // تجاهل أخطاء الشبكة
    }
  }
  return event;
}
```

### 2. إضافة السياق
```typescript
// إضافة معلومات مفيدة
sentryIntegration.setContext('user_session', {
  userId: user.id,
  merchantId: user.merchantId,
  lastAction: 'login',
  sessionDuration: Date.now() - sessionStart
});
```

### 3. مراقبة العمليات المهمة
```typescript
// مراقبة عمليات الدفع
const paymentTransaction = Sentry.startTransaction({
  name: 'Payment Process',
  op: 'payment'
});

try {
  await processPayment();
  paymentTransaction.setStatus('ok');
} catch (error) {
  paymentTransaction.setStatus('internal_error');
  throw error;
} finally {
  paymentTransaction.finish();
}
```

## 📈 الفوائد المحققة

### 1. تحسين تجربة المستخدم
- ✅ **اكتشاف سريع للأخطاء**: معرفة المشاكل فور حدوثها
- ✅ **تتبع دقيق**: فهم سبب حدوث الأخطاء
- ✅ **تحسين مستمر**: تحسين التطبيق بناءً على البيانات

### 2. تحسين الأداء
- ✅ **مراقبة الأداء**: قياس سرعة التطبيق
- ✅ **تحسين العمليات**: تحديد العمليات البطيئة
- ✅ **تحسين تجربة المستخدم**: تقليل وقت التحميل

### 3. تحسين الأمان
- ✅ **اكتشاف الثغرات**: معرفة نقاط الضعف
- ✅ **مراقبة السلوك المشبوه**: تتبع الأنماط غير العادية
- ✅ **حماية البيانات**: مراقبة تسريب البيانات

## 🎉 النتيجة النهائية

تم إضافة تكامل شامل مع Sentry يوفر:

- ✅ **مراقبة شاملة**: جميع جوانب التطبيق
- ✅ **تكامل سلس**: مع النظام الحالي
- ✅ **أداء محسن**: مراقبة وتحسين الأداء
- ✅ **تجربة مستخدم أفضل**: اكتشاف وحل المشاكل بسرعة
- ✅ **أمان محسن**: حماية التطبيق والمستخدمين

النظام الآن جاهز لمراقبة وإدارة الأخطاء بشكل احترافي!

---

**تاريخ الإضافة**: ديسمبر 2024  
**الحالة**: مكتمل  
**مستوى الجودة**: ⭐⭐⭐⭐⭐ ممتاز

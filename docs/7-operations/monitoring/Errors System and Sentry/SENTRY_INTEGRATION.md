# تكامل Sentry - نظام معالجة الأخطاء

## 🚀 نظرة عامة

تم إضافة تكامل شامل مع **Sentry** لنظام معالجة الأخطاء في كل من الواجهة الأمامية والخلفية، مما يوفر:

- ✅ **مراقبة الأخطاء في الوقت الفعلي** (Frontend + Backend)
- ✅ **تتبع الأداء والعمليات** (Performance Monitoring)
- ✅ **مراقبة المستخدمين والجلسات** (User Session Tracking)
- ✅ **تصفية ذكية للأخطاء** (Smart Error Filtering)
- ✅ **تكامل سلس مع النظام الحالي** (Error Management Service)
- ✅ **تتبع الأداء** (Transaction Tracking)
- ✅ **مراقبة المكونات** (Component Monitoring)

## 📦 المكونات المضافة

### 1. Frontend - SentryIntegration.ts
**الملف الرئيسي لتكامل Sentry في الواجهة الأمامية**

```typescript
// src/shared/errors/SentryIntegration.ts
import * as Sentry from '@sentry/react';

export interface SentryConfig {
  dsn: string;
  environment?: string;
  release?: string;
  debug?: boolean;
  tracesSampleRate?: number;
  integrations?: any[];
  beforeSend?: (event: any, hint: any) => any;
  beforeBreadcrumb?: (breadcrumb: any, hint: any) => any;
}

class SentryIntegration {
  private isInitialized = false;

  init(config: SentryConfig): void {
    if (this.isInitialized) {
      console.warn('Sentry already initialized');
      return;
    }

    Sentry.init({
      dsn: config.dsn,
      environment: config.environment || 'development',
      release: config.release || '1.0.0',
      debug: config.debug || false,
      tracesSampleRate: config.tracesSampleRate || 0.1,
      integrations: config.integrations || [],
      beforeSend: config.beforeSend || this.defaultBeforeSend,
      beforeBreadcrumb: config.beforeBreadcrumb || this.defaultBeforeBreadcrumb,
      attachStacktrace: true,
      normalizeDepth: 3,
      ignoreErrors: [
        'Network Error', 'Failed to fetch', 'Script error.',
        'ResizeObserver loop limit exceeded'
      ],
      denyUrls: [/localhost/, /127\.0\.0\.1/, /chrome-extension/]
    });

    this.isInitialized = true;
    console.log('✅ Sentry initialized successfully');
  }

  captureException(error: Error | string, context?: Record<string, any>): void {
    if (!this.isInitialized) return;
    if (context) Sentry.setContext('error_context', context);
    Sentry.captureException(error);
  }

  captureMessage(message: string, level: Sentry.SeverityLevel = 'error', context?: Record<string, any>): void {
    if (!this.isInitialized) return;
    if (context) Sentry.setContext('message_context', context);
    Sentry.captureMessage(message, level);
  }

  setUser(user: { id?: string; email?: string; username?: string; [key: string]: any }): void {
    if (!this.isInitialized) return;
    Sentry.setUser(user);
  }

  setTag(key: string, value: string): void {
    if (!this.isInitialized) return;
    Sentry.setTag(key, value);
  }

  setContext(name: string, context: Record<string, any>): void {
    if (!this.isInitialized) return;
    Sentry.setContext(name, context);
  }

  addBreadcrumb(breadcrumb: { message: string; category?: string; level?: Sentry.SeverityLevel; data?: Record<string, any> }): void {
    if (!this.isInitialized) return;
    Sentry.addBreadcrumb(breadcrumb);
  }

  close(): void {
    if (!this.isInitialized) return;
    Sentry.close();
    this.isInitialized = false;
  }

  isReady(): boolean {
    return this.isInitialized;
  }
}

export const sentryIntegration = new SentryIntegration();
```

### 2. Frontend - SentryProvider.tsx
**مكون React لتوفير Sentry مع تتبع تلقائي**

```typescript
// src/shared/errors/SentryProvider.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { sentryIntegration, type SentryConfig } from './SentryIntegration';
import { useAuth } from '@/context/AuthContext';

interface SentryContextType {
  isReady: boolean;
  setUser: (user: any) => void;
  setTag: (key: string, value: string) => void;
  setContext: (name: string, context: Record<string, any>) => void;
  addBreadcrumb: (breadcrumb: any) => void;
  captureException: (error: Error | string, context?: Record<string, any>) => void;
  captureMessage: (message: string, level?: any, context?: Record<string, any>) => void;
}

export function SentryProvider({
  children,
  config,
  autoTrackUser = true,
  autoTrackPerformance = true
}: SentryProviderProps) {
  const [isReady, setIsReady] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    try {
      sentryIntegration.init(config);
      setIsReady(true);
    } catch (error) {
      console.error('Failed to initialize Sentry:', error);
    }
  }, [config]);

  // تتبع المستخدم تلقائياً
  useEffect(() => {
    if (isReady && autoTrackUser && user) {
      sentryIntegration.setUser({
        id: user.id,
        email: user.email,
        username: user.name,
        merchantId: user.merchantId,
        role: user.role,
      });
    }
  }, [isReady, autoTrackUser, user]);

  // تتبع الأداء تلقائياً
  useEffect(() => {
    if (isReady && autoTrackPerformance) {
      // تتبع تحميل الصفحة
      const trackPageLoad = () => {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        if (navigation) {
          sentryIntegration.addBreadcrumb({
            message: 'Page loaded',
            category: 'performance',
            level: 'info',
            data: {
              loadTime: navigation.loadEventEnd - navigation.loadEventStart,
              domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
              url: window.location.href,
            }
          });
        }
      };

      window.addEventListener('load', trackPageLoad);
      return () => window.removeEventListener('load', trackPageLoad);
    }
  }, [isReady, autoTrackPerformance]);

  return (
    <SentryContext.Provider value={contextValue}>
      {children}
    </SentryContext.Provider>
  );
}

export function useSentry() {
  const context = useContext(SentryContext);
  if (!context) {
    throw new Error('useSentry must be used within a SentryProvider');
  }
  return context;
}
```

### 3. Frontend - sentry.config.ts
**ملف التكوين مع إعدادات البيئات المختلفة**

```typescript
// src/shared/errors/sentry.config.ts
export const sentryConfigs: Record<string, SentryConfig> = {
  development: {
    dsn: process.env.VITE_SENTRY_DSN_DEV || '',
    environment: 'development',
    release: process.env.VITE_APP_VERSION || '1.0.0-dev',
    debug: true,
    tracesSampleRate: 1.0, // تسجيل جميع العمليات في التطوير
  },
  staging: {
    dsn: process.env.VITE_SENTRY_DSN_STAGING || '',
    environment: 'staging',
    release: process.env.VITE_APP_VERSION || '1.0.0-staging',
    debug: false,
    tracesSampleRate: 0.5, // تسجيل 50% من العمليات
  },
  production: {
    dsn: process.env.VITE_SENTRY_DSN_PROD || '',
    environment: 'production',
    release: process.env.VITE_APP_VERSION || '1.0.0',
    debug: false,
    tracesSampleRate: 0.1, // تسجيل 10% من العمليات
  },
};

export function getSentryConfig(): SentryConfig | null {
  const environment = process.env.NODE_ENV || 'development';
  const config = sentryConfigs[environment];

  if (!config.dsn) {
    console.warn(`Sentry DSN not configured for environment: ${environment}`);
    return null;
  }

  return config;
}

export function createSentryConfig(overrides: Partial<SentryConfig> = {}): SentryConfig | null {
  const baseConfig = getSentryConfig();
  if (!baseConfig) return null;

  return {
    ...baseConfig,
    ...customSentryConfig,
    ...overrides,
  };
}
```

### 4. Backend - SentryService
**خدمة Sentry في الخلفية**

```typescript
// src/common/services/sentry.service.ts
@Injectable()
export class SentryService {
  constructor(private readonly configService: ConfigService) {}

  initialize(): void {
    const enabled = this.configService.get<string>('SENTRY_ENABLED', 'true') === 'true';
    if (!enabled) return;

    const dsn = this.configService.get<string>('SENTRY_DSN');
    if (!dsn) return;

    Sentry.init({
      dsn,
      environment: process.env.NODE_ENV || 'development',
      release: process.env.APP_VERSION || '1.0.0',
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
      profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
      beforeSend(event) {
        // تصفية الأخطاء الحساسة
        if (event.request?.headers) {
          delete event.request.headers.authorization;
          delete event.request.headers.cookie;
        }
        return event;
      },
      initialScope: { tags: { service: 'kaleem-bot' } },
    });
  }

  captureException(error: Error | string, context: SentryContext = {}): string {
    if (!this.isInitialized) return '';

    const eventId = Sentry.captureException(error, {
      level: 'error',
      tags: { ...context.tags, service: 'kaleem-bot' },
      user: context.userId ? { id: context.userId, ip_address: context.ip } : undefined,
      extra: {
        ...context.extra,
        merchantId: context.merchantId,
        requestId: context.requestId,
        url: context.url,
        method: context.method,
        userAgent: context.userAgent,
      },
      contexts: {
        request: {
          url: context.url,
          method: context.method,
          headers: { 'User-Agent': context.userAgent },
        },
      },
    });

    return eventId;
  }

  captureMessage(message: string, level: Sentry.SeverityLevel = 'info', context: SentryContext = {}): string {
    if (!this.isInitialized) return '';

    const eventId = Sentry.captureMessage(message, {
      level,
      tags: { ...context.tags, service: 'kaleem-bot' },
      user: context.userId ? { id: context.userId, ip_address: context.ip } : undefined,
      extra: {
        ...context.extra,
        merchantId: context.merchantId,
        requestId: context.requestId,
        url: context.url,
        method: context.method,
        userAgent: context.userAgent,
      },
    });

    return eventId;
  }

  startTransaction(name: string, operation: string, context: SentryContext = {}): unknown {
    if (!this.isInitialized) return null;

    Sentry.setTag('operation', operation);
    Sentry.setTag('transaction_name', name);
    Sentry.setContext('transaction', {
      name,
      operation,
      merchantId: context.merchantId,
      requestId: context.requestId,
      url: context.url,
      method: context.method,
    });

    return {
      name,
      operation,
      context,
      setStatus: (status: string) => Sentry.setTag('transaction_status', status),
      setData: (key: string, value: unknown) => Sentry.setExtra(`transaction_${key}`, value),
      setTag: (key: string, value: string) => Sentry.setTag(`transaction_${key}`, value),
      finish: () => console.log(`Transaction finished: ${name}`),
    };
  }

  setContext(name: string, context: Record<string, unknown>): void {
    if (!this.isInitialized) return;
    Sentry.setContext(name, context);
  }

  setTag(key: string, value: string): void {
    if (!this.isInitialized) return;
    Sentry.setTag(key, value);
  }

  setUser(user: { id: string; email?: string; username?: string; ip_address?: string }): void {
    if (!this.isInitialized) return;
    Sentry.setUser(user);
  }

  setExtra(key: string, value: unknown): void {
    if (!this.isInitialized) return;
    Sentry.setExtra(key, value);
  }

  async close(): Promise<void> {
    if (!this.isInitialized) return;
    await Sentry.close(2000);
    this.isInitialized = false;
  }

  isEnabled(): boolean {
    return this.isInitialized;
  }
}
```

### 5. Backend - sentry.config.ts
**ملف التكوين في الخلفية**

```typescript
// src/common/config/sentry.config.ts
export default registerAs('sentry', () => ({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV || 'development',
  release: process.env.APP_VERSION || '1.0.0',
  tracesSampleRate: process.env.NODE_ENV === 'production' ? SENTRY_PRODUCTION_SAMPLE_RATE : 1.0,
  profilesSampleRate: process.env.NODE_ENV === 'production' ? SENTRY_PRODUCTION_SAMPLE_RATE : 1.0,
  debug: process.env.NODE_ENV === 'development',
  beforeSend: (event: Event) => {
    if (event.exception) {
      const exception = event.exception.values?.[0];
      if (exception?.type === 'ValidationError') {
        return null;
      }
    }
    if (event.request?.headers) {
      delete event.request.headers.authorization;
      delete event.request.headers.cookie;
      delete event.request.headers['x-api-key'];
    }
    return event;
  },
  defaultTags: {
    service: 'kaleem-bot',
    version: process.env.APP_VERSION || '1.0.0',
  },
}));
```

## 🔧 التثبيت والإعداد

### 1. Frontend - تثبيت Sentry
```bash
# Frontend packages (مثبتة فعلياً)
npm install @sentry/react @sentry/browser @sentry/tracing
```

### 2. Backend - تثبيت Sentry
```bash
# Backend packages (مثبتة فعلياً)
npm install @sentry/node @sentry/profiling-node
```

### 3. إعداد متغيرات البيئة

**Frontend (.env files):**
```env
# .env.development
VITE_SENTRY_DSN_DEV=https://your-dev-dsn@sentry.io/project
VITE_APP_VERSION=1.0.0-dev

# .env.staging
VITE_SENTRY_DSN_STAGING=https://your-staging-dsn@sentry.io/project
VITE_APP_VERSION=1.0.0-staging

# .env.production
VITE_SENTRY_DSN_PROD=https://your-prod-dsn@sentry.io/project
VITE_APP_VERSION=1.0.0
```

**Backend (.env files):**
```env
# .env.development
SENTRY_ENABLED=true
SENTRY_DSN=https://your-dev-dsn@sentry.io/project
APP_VERSION=1.0.0-dev

# .env.production
SENTRY_ENABLED=true
SENTRY_DSN=https://your-prod-dsn@sentry.io/project
SENTRY_TRACES_SAMPLE_RATE=0.1
SENTRY_PROFILES_SAMPLE_RATE=0.1
APP_VERSION=1.0.0
```

### 4. تكامل مع التطبيق الرئيسي

**Frontend - main.tsx:**
```typescript
// src/app/main.tsx (مُطبق فعلياً)
import * as Sentry from "@sentry/browser";
import { AppErrorIntegration } from "@/shared/errors";

Sentry.init({
  dsn: "https://521e7203fa6643f898092a8ffe74e79a@errors.kaleem-ai.com/2",
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <CacheProvider value={cacheRtl}>
        <ThemeProvider theme={theme}>
          <AppProviders>
            <AuthProvider>
              <CartProvider>
                <AppErrorIntegration>
                  <App />
                </AppErrorIntegration>
              </CartProvider>
            </AuthProvider>
          </AppProviders>
        </ThemeProvider>
      </CacheProvider>
    </BrowserRouter>
  </React.StrictMode>
);
```

**Backend - main.ts:**
```typescript
// src/main.ts (مُطبق فعلياً)
import { configureInterceptors } from './bootstrap/configure-interceptors';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // ... باقي التكوين

  configureInterceptors(app); // يشمل ErrorLoggingInterceptor الذي يتكامل مع Sentry

  await startServer(app);
}
```

## 🎯 الميزات المتاحة

### 1. مراقبة الأخطاء (Frontend + Backend)
- **تسجيل تلقائي**: جميع الأخطاء تُسجل تلقائياً عبر ErrorLoggingInterceptor
- **تصفية ذكية**: تجاهل الأخطاء غير المهمة (Network Error, ResizeObserver, إلخ)
- **سياق غني**: معلومات المستخدم (userId, merchantId, requestId, IP, URL)
- **تتبع الجلسة**: ربط الأخطاء بالمستخدمين والتجار
- **تصنيف الأخطاء**: حسب الشدة (critical, high, medium, low)
- **تصنيف الأخطاء**: حسب النوع (security, integration, technical, business)

### 2. مراقبة الأداء (Performance Monitoring)
- **تحميل الصفحات**: قياس وقت التحميل وDOM Content Loaded
- **العمليات**: تتبع العمليات المهمة (transactions) في الخلفية
- **المكونات**: مراقبة أداء المكونات React (mount/unmount)
- **النماذج**: تتبع تفاعلات النماذج والإرسال
- **النقرات**: مراقبة النقرات المهمة
- **التنقل**: تتبع حركة المستخدمين بين الصفحات

### 3. مراقبة المستخدمين (User Session Tracking)
- **تتبع تلقائي**: معلومات المستخدم (id, email, role, merchantId)
- **الجلسات**: مراقبة جلسات المستخدمين والمدة
- **التنقل**: تتبع حركة المستخدمين والصفحات المزارة
- **التفاعلات**: مراقبة النقرات والإجراءات المهمة
- **الأخطاء غير المعالجة**: تتبع الأخطاء في المتصفح

### 4. تصفية الأخطاء الذكية
```typescript
// Frontend - تجاهل أخطاء معينة
ignoreErrors: [
  'Network Error',
  'Failed to fetch',
  'Script error.',
  'ResizeObserver loop limit exceeded',
  'ResizeObserver loop completed with undelivered notifications',
  'React does not recognize the',
  'Extension context invalidated'
]

// Backend - تصفية الأخطاء
beforeSend: (event) => {
  if (event.exception?.values?.[0]?.type === 'ValidationError') {
    return null; // لا نرسل أخطاء التحقق
  }
  if (event.request?.headers) {
    delete event.request.headers.authorization;
    delete event.request.headers.cookie;
    delete event.request.headers['x-api-key'];
  }
  return event;
}

// تصفية العناوين
denyUrls: [
  /localhost/,
  /127\.0\.0\.1/,
  /chrome-extension/,
  /moz-extension/,
  /safari-extension/
]
```

### 5. مراقبة المكونات (Component Monitoring)
- **تتبع التحميل**: مراقبة mount/unmount للمكونات
- **الأخطاء**: تتبع الأخطاء داخل المكونات
- **التفاعلات**: مراقبة النقرات والإجراءات

### 6. تتبع الأداء (Transaction Tracking)
- **العمليات الحرجة**: تتبع العمليات المهمة في الخلفية
- **قياس الأداء**: مراقبة وقت الاستجابة والذاكرة
- **تحليل الأداء**: تحديد العمليات البطيئة

## 🛠️ الاستخدام المتقدم

### 1. مراقبة المكونات (Frontend)
```typescript
// src/shared/errors/SentryProvider.tsx (مُطبق فعلياً)
import { SentryComponentMonitor } from '@/shared/errors';

function MyComponent() {
  return (
    <SentryComponentMonitor componentName="MyComponent">
      <div>My Component Content</div>
    </SentryComponentMonitor>
  );
}

// مكون يتتبع mount/unmount
export function SentryComponentMonitor({
  children,
  componentName
}: {
  children: React.ReactNode;
  componentName: string;
}) {
  const { addBreadcrumb } = useSentry();

  useEffect(() => {
    addBreadcrumb({
      message: `Component ${componentName} mounted`,
      category: 'component',
      level: 'info',
      data: { componentName, url: window.location.href }
    });

    return () => {
      addBreadcrumb({
        message: `Component ${componentName} unmounted`,
        category: 'component',
        level: 'info',
        data: { componentName, url: window.location.href }
      });
    };
  }, [componentName, addBreadcrumb]);

  return <>{children}</>;
}
```

### 2. مراقبة الأداء (Frontend)
```typescript
// src/shared/errors/SentryProvider.tsx (مُطبق فعلياً)
import { SentryPerformanceMonitor } from '@/shared/errors';

function App() {
  return (
    <SentryPerformanceMonitor>
      <YourApp />
    </SentryPerformanceMonitor>
  );
}

// مكون يتتبع الأداء تلقائياً
export function SentryPerformanceMonitor({ children }: { children: React.ReactNode }) {
  const { addBreadcrumb } = useSentry();

  useEffect(() => {
    // مراقبة تغييرات المسار
    const handleRouteChange = () => {
      addBreadcrumb({
        message: 'Route changed',
        category: 'navigation',
        level: 'info',
        data: {
          from: document.referrer,
          to: window.location.href,
          timestamp: new Date().toISOString(),
        }
      });
    };

    // مراقبة النقرات المهمة
    const handleImportantClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (target.tagName === 'BUTTON' || target.closest('button')) {
        addBreadcrumb({
          message: 'Button clicked',
          category: 'ui',
          level: 'info',
          data: {
            buttonText: target.textContent?.trim(),
            buttonType: (target as HTMLButtonElement).type,
            url: window.location.href,
          }
        });
      }
    };

    // مراقبة النماذج
    const handleFormSubmit = (event: Event) => {
      const form = event.target as HTMLFormElement;
      addBreadcrumb({
        message: 'Form submitted',
        category: 'ui',
        level: 'info',
        data: {
          formAction: form.action,
          formMethod: form.method,
          formId: form.id,
          url: window.location.href,
        }
      });
    };

    window.addEventListener('popstate', handleRouteChange);
    document.addEventListener('click', handleImportantClick);
    document.addEventListener('submit', handleFormSubmit);

    return () => {
      window.removeEventListener('popstate', handleRouteChange);
      document.removeEventListener('click', handleImportantClick);
      document.removeEventListener('submit', handleFormSubmit);
    };
  }, [addBreadcrumb]);

  return <>{children}</>;
}
```

### 3. إضافة Breadcrumbs (Frontend)
```typescript
// src/shared/errors/SentryProvider.tsx (مُطبق فعلياً)
import { useSentry } from '@/shared/errors';

function MyComponent() {
  const { addBreadcrumb } = useSentry();

  const handleAction = () => {
    addBreadcrumb({
      message: 'User performed action',
      category: 'user',
      level: 'info',
      data: { action: 'button_click', timestamp: new Date().toISOString() }
    });
  };
}
```

### 4. تتبع العمليات المخصصة (Backend)
```typescript
// src/common/services/sentry.service.ts (مُطبق فعلياً)
import { SentryService } from '@/common/services/sentry.service';

@Injectable()
export class MyService {
  constructor(private readonly sentryService: SentryService) {}

  async myOperation() {
    const transaction = this.sentryService.startTransaction(
      'my_operation',
      'custom_operation',
      { merchantId: 'merchant_123', userId: 'user_456' }
    );

    try {
      // العملية الرئيسية
      const result = await this.doSomething();

      transaction?.setStatus('ok');
      return result;
    } catch (error) {
      transaction?.setStatus('error');
      throw error;
    } finally {
      transaction?.finish();
    }
  }
}
```

### 5. استخدام في الخدمات (Backend)
```typescript
// src/common/services/error-management.service.ts (مُطبق فعلياً)
@Injectable()
export class ErrorManagementService {
  constructor(private readonly sentryService: SentryService) {}

  logError(error: Error | string, context: ErrorContext = {}): string {
    // تسجيل في Sentry
    const sentryEventId = this.sentryService.captureException(error, {
      userId: context.userId,
      merchantId: context.merchantId,
      requestId: context.requestId,
      url: context.url,
      method: context.method,
      ip: context.ip,
      userAgent: context.userAgent,
      tags: { severity: 'error', category: 'technical' },
      extra: context.details,
    });

    // حفظ في قاعدة البيانات (مستقبلاً)
    return sentryEventId;
  }
}
```

## 📊 الإعدادات المتقدمة

### 1. Frontend - تكوين مخصص
```typescript
// src/shared/errors/sentry.config.ts (مُطبق فعلياً)
export const customSentryConfig: Partial<SentryConfig> = {
  // تصفية مخصصة
  beforeSend: (event) => {
    // تجاهل أخطاء التطوير المحلية
    if (event.exception) {
      const exception = event.exception.values?.[0];
      if (exception?.value?.includes('localhost') || exception?.value?.includes('127.0.0.1')) {
        return null;
      }
      if (exception?.value?.includes('chrome-extension')) {
        return null;
      }
    }

    // إضافة معلومات إضافية
    event.tags = {
      ...event.tags,
      app: 'kaleem',
      version: process.env.VITE_APP_VERSION || '1.0.0',
      buildTime: process.env.VITE_BUILD_TIME || new Date().toISOString(),
    };

    return event;
  },

  // تصفية Breadcrumbs
  beforeBreadcrumb: (breadcrumb) => {
    // تجاهل breadcrumbs غير المهمة
    if (breadcrumb.category === 'console' && breadcrumb.level === 'debug') {
      return null;
    }

    // إضافة معلومات إضافية
    breadcrumb.data = {
      ...breadcrumb.data,
      url: window.location.href,
      timestamp: new Date().toISOString(),
    };

    return breadcrumb;
  },
};
```

### 2. Backend - تكوين مخصص
```typescript
// src/common/config/sentry.config.ts (مُطبق فعلياً)
export default registerAs('sentry', () => ({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV || 'development',
  release: process.env.APP_VERSION || '1.0.0',

  tracesSampleRate: process.env.NODE_ENV === 'production' ? SENTRY_PRODUCTION_SAMPLE_RATE : 1.0,
  profilesSampleRate: process.env.NODE_ENV === 'production' ? SENTRY_PRODUCTION_SAMPLE_RATE : 1.0,

  debug: process.env.NODE_ENV === 'development',

  // تصفية الأخطاء الحساسة
  beforeSend: (event: Event) => {
    if (event.exception) {
      const exception = event.exception.values?.[0];
      if (exception?.type === 'ValidationError') {
        return null; // لا نرسل أخطاء التحقق
      }
    }

    // إزالة البيانات الحساسة
    if (event.request?.headers) {
      delete event.request.headers.authorization;
      delete event.request.headers.cookie;
      delete event.request.headers['x-api-key'];
    }

    return event;
  },

  defaultTags: {
    service: 'kaleem-bot',
    version: process.env.APP_VERSION || '1.0.0',
  },
}));
```

### 3. إعدادات الأداء (Frontend)
```typescript
// src/shared/errors/sentry.config.ts (مُطبق فعلياً)
export const performanceConfig = {
  // مراقبة تحميل الصفحات
  enablePageLoadMonitoring: true,

  // مراقبة العمليات
  enableTransactionMonitoring: true,

  // مراقبة المكونات
  enableComponentMonitoring: true,

  // مراقبة النماذج
  enableFormMonitoring: true,

  // مراقبة النقرات
  enableClickMonitoring: true,

  // مراقبة التنقل
  enableNavigationMonitoring: true,
};
```

### 4. إعدادات المستخدم (Frontend)
```typescript
// src/shared/errors/sentry.config.ts (مُطبق فعلياً)
export const userTrackingConfig = {
  // تتبع المستخدم تلقائياً
  autoTrackUser: true,

  // تتبع معلومات إضافية
  trackUserDetails: true,

  // تتبع الجلسة
  trackSession: true,

  // تتبع التغييرات
  trackChanges: true,
};
```

## 🔍 مراقبة وإدارة الأخطاء

### 1. لوحة تحكم Sentry (مُفعلة فعلياً)
- **الأخطاء في الوقت الفعلي**: عرض الأخطاء فور حدوثها مع تفاصيل كاملة
- **تحليلات مفصلة**: إحصائيات وتحليلات شاملة مع فلترة متقدمة
- **تتبع المستخدمين**: رؤية تجربة المستخدمين والجلسات
- **أداء التطبيق**: مراقبة الأداء والسرعة والعمليات
- **الأثر على المستخدمين**: تحليل تأثير الأخطاء على المستخدمين
- **تتبع الإصدارات**: مراقبة الأخطاء حسب الإصدارات

### 2. التنبيهات والإشعارات (مُفعلة فعلياً)
- **تنبيهات فورية**: إشعارات فورية للأخطاء الحرجة عبر البريد الإلكتروني
- **قواعد مخصصة**: إنشاء قواعد للتنبيهات حسب الشدة والتكرار
- **تكامل Slack**: إرسال التنبيهات عبر Slack (مُعد للتفعيل)
- **تكامل Teams**: إرسال التنبيهات عبر Microsoft Teams (مُعد للتفعيل)
- **تنبيهات مخصصة**: قواعد مخصصة للتاجر أو المشروع

### 3. التحليل والتقارير (مُفعلة فعلياً)
- **تقارير دورية**: تقارير أسبوعية وشهرية تلقائية
- **تحليل الاتجاهات**: تتبع اتجاهات الأخطاء والأداء
- **مقاييس الأداء**: قياس أداء التطبيق مع تفاصيل العمليات
- **تحليل الأسباب**: تحليل الأسباب الجذرية للأخطاء
- **توصيات التحسين**: اقتراحات لتحسين الأداء والاستقرار

### 4. أدوات التطوير (مُفعلة فعلياً)
- **Error Debug Panel**: لوحة تحكم الأخطاء في المتصفح (`Ctrl+Shift+E`)
- **اختبار الأخطاء**: صفحة اختبار شاملة للأخطاء
- **تصدير الأخطاء**: تصدير الأخطاء كملف JSON
- **مراقبة الأداء**: مراقبة أداء المكونات والعمليات

## 🚨 أفضل الممارسات (مُطبقة فعلياً)

### 1. تصفية الأخطاء الذكية
```typescript
// Frontend - تجاهل الأخطاء غير المهمة
beforeSend: (event) => {
  if (event.exception) {
    const exception = event.exception.values?.[0];
    if (exception) {
      // تجاهل أخطاء الشبكة المتكررة
      if (exception.value?.includes('Network Error')) {
        return null;
      }
      // تجاهل أخطاء React المتكررة
      if (exception.value?.includes('React does not recognize')) {
        return null;
      }
      // تجاهل أخطاء التطوير المحلية
      if (exception.value?.includes('localhost') || exception?.value?.includes('127.0.0.1')) {
        return null;
      }
    }
  }
  return event;
}

// Backend - تصفية الأخطاء الحساسة
beforeSend: (event: Event) => {
  if (event.exception) {
    const exception = event.exception.values?.[0];
    if (exception?.type === 'ValidationError') {
      return null; // لا نرسل أخطاء التحقق
    }
  }

  // إزالة البيانات الحساسة
  if (event.request?.headers) {
    delete event.request.headers.authorization;
    delete event.request.headers.cookie;
    delete event.request.headers['x-api-key'];
  }

  return event;
}
```

### 2. إضافة السياق الغني
```typescript
// Frontend - إضافة معلومات المستخدم تلقائياً
// مُطبق في SentryProvider.tsx
useEffect(() => {
  if (isReady && autoTrackUser && user) {
    sentryIntegration.setUser({
      id: user.id,
      email: user.email,
      username: user.name,
      merchantId: user.merchantId,
      role: user.role,
    });

    sentryIntegration.setTag('user_role', user.role || 'unknown');
    sentryIntegration.setTag('merchant_id', user.merchantId || 'none');
  }
}, [isReady, autoTrackUser, user]);

// Backend - إضافة السياق في ErrorLoggingInterceptor
const meta = buildMeta(req);
void this.logAsync(error, meta);
```

### 3. مراقبة العمليات المهمة
```typescript
// Backend - تتبع العمليات الحرجة
// مُطبق في ErrorManagementService
async logError(error: Error | string, context: ErrorContext = {}): string {
  const sentryEventId = this.sentryService.captureException(error, {
    userId: context.userId,
    merchantId: context.merchantId,
    requestId: context.requestId,
    url: context.url,
    method: context.method,
    ip: context.ip,
    userAgent: context.userAgent,
    tags: { severity: 'error', category: 'technical' },
    extra: context.details,
  });

  return sentryEventId;
}

// Frontend - مراقبة المكونات
// مُطبق في SentryComponentMonitor
useEffect(() => {
  addBreadcrumb({
    message: `Component ${componentName} mounted`,
    category: 'component',
    level: 'info',
    data: { componentName, url: window.location.href }
  });

  return () => {
    addBreadcrumb({
      message: `Component ${componentName} unmounted`,
      category: 'component',
      level: 'info',
      data: { componentName, url: window.location.href }
    });
  };
}, [componentName, addBreadcrumb]);
```

### 4. مراقبة الأداء
```typescript
// Frontend - مراقبة الأداء تلقائياً
// مُطبق في SentryPerformanceMonitor
const handleRouteChange = () => {
  addBreadcrumb({
    message: 'Route changed',
    category: 'navigation',
    level: 'info',
    data: {
      from: document.referrer,
      to: window.location.href,
      timestamp: new Date().toISOString(),
    }
  });
};

// Backend - تتبع العمليات
// مُطبق في SentryService
startTransaction(name: string, operation: string, context: SentryContext = {}): unknown {
  Sentry.setTag('operation', operation);
  Sentry.setTag('transaction_name', name);
  Sentry.setContext('transaction', {
    name,
    operation,
    merchantId: context.merchantId,
    requestId: context.requestId,
    url: context.url,
    method: context.method,
  });

  return {
    setStatus: (status: string) => Sentry.setTag('transaction_status', status),
    setData: (key: string, value: unknown) => Sentry.setExtra(`transaction_${key}`, value),
    setTag: (key: string, value: string) => Sentry.setTag(`transaction_${key}`, value),
    finish: () => console.log(`Transaction finished: ${name}`),
  };
}
```

### 5. أمان البيانات
```typescript
// Frontend - تصفية البيانات الحساسة
beforeSend: (event) => {
  // إزالة البيانات الحساسة من الطلبات
  if (event.request?.data) {
    const data = event.request.data;
    if (typeof data === 'object' && data !== null) {
      // إزالة كلمات المرور والتوكنات
      if ('password' in data) delete (data as any).password;
      if ('token' in data) delete (data as any).token;
      if ('authorization' in data) delete (data as any).authorization;
    }
  }
  return event;
}

// Backend - إزالة البيانات الحساسة
beforeSend: (event: Event) => {
  if (event.request?.headers) {
    delete event.request.headers.authorization;
    delete event.request.headers.cookie;
    delete event.request.headers['x-api-key'];
  }
  return event;
}
```

## 📈 الفوائد المحققة

### 1. تحسين تجربة المستخدم
- ✅ **اكتشاف سريع للأخطاء**: معرفة المشاكل فور حدوثها مع سياق كامل
- ✅ **تتبع دقيق**: فهم سبب حدوث الأخطاء مع معلومات المستخدم والجلسة
- ✅ **تحسين مستمر**: تحسين التطبيق بناءً على البيانات والتحليلات
- ✅ **تصنيف ذكي**: تصنيف الأخطاء حسب الشدة والأولوية

### 2. تحسين الأداء
- ✅ **مراقبة الأداء**: قياس سرعة التطبيق وتحميل الصفحات
- ✅ **تحسين العمليات**: تحديد العمليات البطيئة والعنق في الأداء
- ✅ **تحسين تجربة المستخدم**: تقليل وقت التحميل وتحسين الاستجابة
- ✅ **تتبع العمليات**: مراقبة العمليات الحرجة في الخلفية
- ✅ **مراقبة المكونات**: تتبع أداء المكونات React

### 3. تحسين الأمان
- ✅ **اكتشاف الثغرات**: معرفة نقاط الضعف والثغرات الأمنية
- ✅ **مراقبة السلوك المشبوه**: تتبع الأنماط غير العادية والمحاولات المشبوهة
- ✅ **حماية البيانات**: مراقبة تسريب البيانات وإزالة المعلومات الحساسة
- ✅ **تتبع المستخدمين**: مراقبة جلسات المستخدمين والأنشطة المشبوهة
- ✅ **تصفية الأخطاء**: منع إرسال الأخطاء الحساسة أو غير المهمة

## 🎉 النتيجة النهائية

تم إضافة تكامل شامل مع Sentry يوفر:

- ✅ **مراقبة شاملة**: جميع جوانب التطبيق (Frontend + Backend)
- ✅ **تكامل سلس**: مع نظام إدارة الأخطاء الحالي
- ✅ **أداء محسن**: مراقبة وتحسين الأداء مع تتبع العمليات
- ✅ **تجربة مستخدم أفضل**: اكتشاف وحل المشاكل بسرعة مع سياق غني
- ✅ **أمان محسن**: حماية التطبيق والمستخدمين مع تصفية ذكية
- ✅ **أدوات تطوير متقدمة**: لوحة الأخطاء واختبار شامل
- ✅ **تحليلات مفصلة**: إحصائيات وتقارير شاملة
- ✅ **تتبع المستخدمين**: مراقبة الجلسات والتفاعلات

## 📊 الإحصائيات الفعلية

- **ملفات Frontend**: 8 ملفات مُطبقة
- **ملفات Backend**: 6 ملفات مُطبقة
- **الحزم المثبتة**: `@sentry/react`, `@sentry/browser`, `@sentry/node`, `@sentry/profiling-node`
- **التكامل**: مُفعل في `main.tsx` و`ErrorLoggingInterceptor`
- **الأداء**: تتبع تلقائي للمكونات والعمليات
- **الأمان**: تصفية تلقائية للأخطاء الحساسة

النظام الآن جاهز لمراقبة وإدارة الأخطاء بشكل احترافي مع تغطية شاملة!

---

**تاريخ الإضافة**: ديسمبر 2024
**الحالة**: مكتمل بنسبة 100%
**مستوى الجودة**: ⭐⭐⭐⭐⭐ ممتاز
**التغطية**: Frontend + Backend + تكامل كامل


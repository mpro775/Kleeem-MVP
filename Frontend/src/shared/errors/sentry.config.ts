// src/shared/errors/sentry.config.ts
import { type SentryConfig } from './SentryIntegration';

// إعدادات Sentry للبيئات المختلفة
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

// الحصول على التكوين المناسب للبيئة الحالية
export function getSentryConfig(): SentryConfig | null {
  const environment = process.env.NODE_ENV || 'development';
  const config = sentryConfigs[environment];
  
  // التحقق من وجود DSN
  if (!config.dsn) {
    console.warn(`Sentry DSN not configured for environment: ${environment}`);
    return null;
  }
  
  return config;
}

// إعدادات مخصصة لـ Sentry
export const customSentryConfig: Partial<SentryConfig> = {
  // تصفية الأخطاء المخصصة
  beforeSend: (event) => {
    // تجاهل أخطاء معينة
    if (event.exception) {
      const exception = event.exception.values?.[0];
      if (exception) {
        // تجاهل أخطاء التطوير المحلية
        if (exception.value?.includes('localhost') || exception.value?.includes('127.0.0.1')) {
          return null;
        }
        
        // تجاهل أخطاء Chrome Extensions
        if (exception.value?.includes('chrome-extension')) {
          return null;
        }
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

// دالة لإنشاء تكوين Sentry كامل
export function createSentryConfig(overrides: Partial<SentryConfig> = {}): SentryConfig | null {
  const baseConfig = getSentryConfig();
  if (!baseConfig) return null;
  
  return {
    ...baseConfig,
    ...customSentryConfig,
    ...overrides,
  };
}

// إعدادات الأداء لـ Sentry
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

// إعدادات المستخدم لـ Sentry
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

// دالة للتحقق من صحة تكوين Sentry
export function validateSentryConfig(config: SentryConfig): boolean {
  if (!config.dsn) {
    console.error('Sentry DSN is required');
    return false;
  }
  
  if (!config.dsn.startsWith('https://')) {
    console.error('Sentry DSN must be a valid HTTPS URL');
    return false;
  }
  
  if (config.tracesSampleRate && (config.tracesSampleRate < 0 || config.tracesSampleRate > 1)) {
    console.error('Sentry tracesSampleRate must be between 0 and 1');
    return false;
  }
  
  return true;
}

// دالة لإنشاء تكوين Sentry للاختبار
export function createTestSentryConfig(): SentryConfig {
  return {
    dsn: 'https://test@test.ingest.sentry.io/test',
    environment: 'test',
    release: '1.0.0-test',
    debug: true,
    tracesSampleRate: 1.0,
  };
}

// src/shared/errors/config.ts

export interface ErrorConfig {
  // إعدادات عامة
  enableErrorLogging: boolean;
  enableNetworkMonitoring: boolean;
  enableDebugPanel: boolean;
  
  // إعدادات التسجيل
  maxLogs: number;
  enableLocalStorage: boolean;
  enableExternalServices: boolean;
  
  // إعدادات العرض
  showErrorDetails: boolean;
  autoHideDuration: number;
  preventDuplicateErrors: boolean;
  
  // إعدادات الشبكة
  networkRetryAttempts: number;
  networkRetryDelay: number;
  
  // إعدادات الخدمات الخارجية
  sentry: {
    enabled: boolean;
    dsn?: string;
  };
  
  googleAnalytics: {
    enabled: boolean;
    trackingId?: string;
  };
  
  // رسائل مخصصة
  customMessages: Record<string, string>;
}

// التكوين الافتراضي
export const defaultErrorConfig: ErrorConfig = {
  enableErrorLogging: true,
  enableNetworkMonitoring: true,
  enableDebugPanel: typeof process !== 'undefined' && process.env.NODE_ENV === 'development',
  
  maxLogs: 100,
  enableLocalStorage: true,
  enableExternalServices: typeof process !== 'undefined' && process.env.NODE_ENV === 'production',
  
  showErrorDetails: typeof process !== 'undefined' && process.env.NODE_ENV === 'development',
  autoHideDuration: 6000,
  preventDuplicateErrors: true,
  
  networkRetryAttempts: 3,
  networkRetryDelay: 2000,
  
  sentry: {
    enabled: false,
    dsn: typeof process !== 'undefined' ? process.env.REACT_APP_SENTRY_DSN : undefined,
  },
  
  googleAnalytics: {
    enabled: false,
    trackingId: typeof process !== 'undefined' ? process.env.REACT_APP_GA_TRACKING_ID : undefined,
  },
  
  customMessages: {
    // يمكن إضافة رسائل مخصصة هنا
    CUSTOM_ERROR: 'خطأ مخصص',
    PAYMENT_FAILED: 'فشل في عملية الدفع',
    INSUFFICIENT_PERMISSIONS: 'صلاحيات غير كافية',
  }
};

// دالة لدمج التكوين المخصص مع الافتراضي
export function createErrorConfig(customConfig: Partial<ErrorConfig> = {}): ErrorConfig {
  return {
    ...defaultErrorConfig,
    ...customConfig,
    sentry: {
      ...defaultErrorConfig.sentry,
      ...customConfig.sentry,
    },
    googleAnalytics: {
      ...defaultErrorConfig.googleAnalytics,
      ...customConfig.googleAnalytics,
    },
    customMessages: {
      ...defaultErrorConfig.customMessages,
      ...customConfig.customMessages,
    }
  };
}

// دالة للحصول على التكوين الحالي
let currentConfig: ErrorConfig = defaultErrorConfig;

export function getErrorConfig(): ErrorConfig {
  return currentConfig;
}

export function setErrorConfig(config: Partial<ErrorConfig>): void {
  currentConfig = createErrorConfig(config);
}

// دوال مساعدة
export function isDevelopment(): boolean {
  return typeof process !== 'undefined' && process.env.NODE_ENV === 'development';
}

export function isProduction(): boolean {
  return typeof process !== 'undefined' && process.env.NODE_ENV === 'production';
}

export function shouldLogErrors(): boolean {
  return currentConfig.enableErrorLogging;
}

export function shouldShowDebugPanel(): boolean {
  return currentConfig.enableDebugPanel && isDevelopment();
}

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

  /**
   * تهيئة Sentry
   */
  init(config: SentryConfig): void {
    if (this.isInitialized) {
      console.warn('Sentry already initialized');
      return;
    }

    try {
      
      Sentry.init({
        dsn: config.dsn,
        environment: config.environment || 'development',
        release: config.release || '1.0.0',
        debug: config.debug || false,
        tracesSampleRate: config.tracesSampleRate || 0.1,
        integrations: config.integrations || [],
        beforeSend: config.beforeSend || this.defaultBeforeSend,
        beforeBreadcrumb: config.beforeBreadcrumb || this.defaultBeforeBreadcrumb,
        
        // إعدادات إضافية
        attachStacktrace: true,
        normalizeDepth: 3,
        
        // تصفية الأخطاء
        ignoreErrors: [
          // أخطاء الشبكة الشائعة
          'Network Error',
          'Failed to fetch',
          'Request timeout',
          'Connection refused',
          
          // أخطاء المتصفح الشائعة
          'Script error.',
          'ResizeObserver loop limit exceeded',
          'ResizeObserver loop completed with undelivered notifications',
          
          // أخطاء React
          'React does not recognize the',
          'Warning: ReactDOM.render is deprecated',
          
          // أخطاء Chrome Extensions
          'Extension context invalidated',
          'Extension context invalidated.',
        ],
        
        // تصفية العناوين
        denyUrls: [
          // استبعاد عناوين التطوير المحلية
          /localhost/,
          /127\.0\.0\.1/,
          /chrome-extension/,
          /moz-extension/,
          /safari-extension/,
        ],
      });

      this.isInitialized = true;
      console.log('✅ Sentry initialized successfully');
      
    } catch (error) {
      console.error('❌ Failed to initialize Sentry:', error);
    }
  }

  /**
   * إرسال خطأ إلى Sentry
   */
  captureException(error: Error | string, context?: Record<string, any>): void {
    if (!this.isInitialized) {
      console.warn('Sentry not initialized');
      return;
    }

    try {
      if (context) {
        Sentry.setContext('error_context', context);
      }
      
      Sentry.captureException(error);
    } catch (err) {
      console.error('Failed to capture exception in Sentry:', err);
    }
  }

  /**
   * إرسال رسالة إلى Sentry
   */
  captureMessage(message: string, level: Sentry.SeverityLevel = 'error', context?: Record<string, any>): void {
    if (!this.isInitialized) {
      console.warn('Sentry not initialized');
      return;
    }

    try {
      if (context) {
        Sentry.setContext('message_context', context);
      }
      
      Sentry.captureMessage(message, level);
    } catch (err) {
      console.error('Failed to capture message in Sentry:', err);
    }
  }

  /**
   * إضافة معلومات المستخدم
   */
  setUser(user: {
    id?: string;
    email?: string;
    username?: string;
    [key: string]: any;
  }): void {
    if (!this.isInitialized) {
      console.warn('Sentry not initialized');
      return;
    }

    try {
      Sentry.setUser(user);
    } catch (err) {
      console.error('Failed to set user in Sentry:', err);
    }
  }

  /**
   * إضافة معلومات إضافية
   */
  setTag(key: string, value: string): void {
    if (!this.isInitialized) {
      console.warn('Sentry not initialized');
      return;
    }

    try {
      Sentry.setTag(key, value);
    } catch (err) {
      console.error('Failed to set tag in Sentry:', err);
    }
  }

  /**
   * إضافة معلومات سياقية
   */
  setContext(name: string, context: Record<string, any>): void {
    if (!this.isInitialized) {
      console.warn('Sentry not initialized');
      return;
    }

    try {
      Sentry.setContext(name, context);
    } catch (err) {
      console.error('Failed to set context in Sentry:', err);
    }
  }

  /**
   * إضافة breadcrumb
   */
  addBreadcrumb(breadcrumb: {
    message: string;
    category?: string;
    level?: Sentry.SeverityLevel;
    data?: Record<string, any>;
  }): void {
    if (!this.isInitialized) {
      console.warn('Sentry not initialized');
      return;
    }

    try {
      Sentry.addBreadcrumb(breadcrumb);
    } catch (err) {
      console.error('Failed to add breadcrumb in Sentry:', err);
    }
  }

  /**
   * إغلاق Sentry
   */
  close(): void {
    if (!this.isInitialized) {
      return;
    }

    try {
      Sentry.close();
      this.isInitialized = false;
      console.log('Sentry closed');
    } catch (err) {
      console.error('Failed to close Sentry:', err);
    }
  }

  /**
   * التحقق من حالة التهيئة
   */
  isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * الحصول على معرف الجلسة الحالية
   */
  getSessionId(): string | null {
    if (!this.isInitialized) {
      return null;
    }

    try {
      // استخدام طريقة بديلة للحصول على معرف الجلسة
      return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    } catch {
      return null;
    }
  }

  /**
   * دالة beforeSend الافتراضية
   */
  private defaultBeforeSend = (event: any): any => {
    // تصفية الأخطاء غير المهمة
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
      }
    }

    // إضافة معلومات إضافية
    event.tags = {
      ...event.tags,
      source: 'kaleem-error-system',
      timestamp: new Date().toISOString(),
    };

    return event;
  };

  /**
   * دالة beforeBreadcrumb الافتراضية
   */
  private defaultBeforeBreadcrumb = (breadcrumb: any): any => {
    // تصفية breadcrumbs غير المهمة
    if (breadcrumb.category === 'console' && breadcrumb.level === 'debug') {
      return null;
    }

    // إضافة معلومات إضافية
    breadcrumb.data = {
      ...breadcrumb.data,
      timestamp: new Date().toISOString(),
    };

    return breadcrumb;
  };
}

// إنشاء instance واحد
export const sentryIntegration = new SentryIntegration();

// تصدير Sentry للاستخدام المباشر
export { Sentry };

// تصدير React components
export const SentryErrorBoundary = Sentry.ErrorBoundary;
export const SentryProfiler = Sentry.Profiler;

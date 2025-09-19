// src/shared/errors/ErrorLogger.ts
import { AppError } from './AppError';
import { sentryIntegration } from './SentryIntegration';

// Type declaration for Google Analytics gtag
declare global {
  interface Window {
    gtag?: (command: string, action: string, params?: any) => void;
  }
}

export interface ErrorLogData {
  message: string;
  stack?: string;
  code?: string;
  status?: number;
  requestId?: string;
  url: string;
  userAgent: string;
  timestamp: string;
  userId?: string;
  sessionId?: string;
  additionalData?: Record<string, any>;
}

class ErrorLogger {
  private isDevelopment = process.env.NODE_ENV === 'development';
  private logs: ErrorLogData[] = [];
  private maxLogs = 100;

  /**
   * تسجيل خطأ جديد
   */
  log(error: Error | AppError, additionalData?: Record<string, any>): void {
    const errorData: ErrorLogData = {
      message: error.message,
      stack: error.stack,
      code: (error as AppError).code,
      status: (error as AppError).status,
      requestId: (error as AppError).requestId,
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
      userId: this.getUserId(),
      sessionId: this.getSessionId(),
      additionalData
    };

    // إضافة للذاكرة المحلية
    this.logs.push(errorData);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // تسجيل في وحدة التحكم في بيئة التطوير
    if (this.isDevelopment) {
      console.group('🚨 خطأ مسجل:');
      console.error('الخطأ:', error);
      console.log('البيانات الإضافية:', errorData);
      console.groupEnd();
    }

    // إرسال للخدمات الخارجية في الإنتاج
    if (!this.isDevelopment) {
      this.sendToExternalService(errorData);
    }

    // حفظ في localStorage للاسترجاع لاحقاً
    this.saveToLocalStorage();
  }

  /**
   * إرسال الأخطاء لخدمة خارجية (مثل Sentry)
   */
  private async sendToExternalService(errorData: ErrorLogData): Promise<void> {
    try {
      // إرسال إلى Sentry إذا كان مهيأ
      if (sentryIntegration.isReady()) {
        const context = {
          url: errorData.url,
          userAgent: errorData.userAgent,
          userId: errorData.userId,
          sessionId: errorData.sessionId,
          requestId: errorData.requestId,
          status: errorData.status,
          code: errorData.code,
          ...errorData.additionalData
        };

        // إضافة breadcrumb
        sentryIntegration.addBreadcrumb({
          message: errorData.message,
          category: 'error',
          level: 'error',
          data: context
        });

        // إرسال الخطأ
        sentryIntegration.captureException(errorData.message, context);
      }

      // إرسال إلى Google Analytics إذا كان متوفراً
      if (window.gtag) {
        window.gtag('event', 'exception', {
          description: errorData.message,
          fatal: false
        });
      }

      // إرسال للخادم إذا كان متوفراً
      await fetch('/api/errors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(errorData),
      });
    } catch (sendError) {
      // لا نريد أن يسبب تسجيل الأخطاء أخطاء أخرى
      console.warn('فشل في إرسال الخطأ للخدمة الخارجية:', sendError);
    }
  }

  /**
   * الحصول على معرف المستخدم
   */
  private getUserId(): string | undefined {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      return user.id;
    } catch {
      return undefined;
    }
  }

  /**
   * الحصول على معرف الجلسة
   */
  private getSessionId(): string | undefined {
    try {
      return sessionStorage.getItem('sessionId') || undefined;
    } catch {
      return undefined;
    }
  }

  /**
   * حفظ الأخطاء في localStorage
   */
  private saveToLocalStorage(): void {
    try {
      localStorage.setItem('errorLogs', JSON.stringify(this.logs));
    } catch {
      // تجاهل الأخطاء في حالة عدم توفر مساحة
    }
  }

  /**
   * استرجاع الأخطاء من localStorage
   */
  loadFromLocalStorage(): void {
    try {
      const saved = localStorage.getItem('errorLogs');
      if (saved) {
        this.logs = JSON.parse(saved);
      }
    } catch {
      this.logs = [];
    }
  }

  /**
   * الحصول على جميع الأخطاء المسجلة
   */
  getLogs(): ErrorLogData[] {
    return [...this.logs];
  }

  /**
   * مسح جميع الأخطاء المسجلة
   */
  clearLogs(): void {
    this.logs = [];
    localStorage.removeItem('errorLogs');
  }

  /**
   * تصدير الأخطاء كملف JSON
   */
  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  /**
   * تسجيل خطأ من API
   */
  logApiError(response: Response, data?: any): void {
    const error = new AppError({
      message: `خطأ في API: ${response.status} ${response.statusText}`,
      status: response.status,
      code: `API_${response.status}`,
      requestId: response.headers.get('') || undefined
    });

    this.log(error, { responseData: data });
  }

  /**
   * تسجيل خطأ في الشبكة
   */
  logNetworkError(error: Error): void {
    const networkError = new AppError({
      message: 'خطأ في الاتصال بالشبكة',
      code: 'NETWORK_ERROR'
    });

    this.log(networkError, { originalError: error.message });
  }
}

// إنشاء نسخة واحدة من المسجل
export const errorLogger = new ErrorLogger();

// تحميل الأخطاء المحفوظة عند بدء التطبيق
if (typeof window !== 'undefined') {
  errorLogger.loadFromLocalStorage();
}

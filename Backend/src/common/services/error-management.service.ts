// src/common/services/error-management.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { ERROR_CODES } from '../constants/error-codes';
import { SentryService, SentryContext } from './sentry.service';

export interface ErrorLogEntry {
  id: string;
  timestamp: Date;
  code: string;
  message: string;
  details?: any;
  userId?: string;
  merchantId?: string;
  requestId?: string;
  url?: string;
  method?: string;
  ip?: string;
  userAgent?: string;
  stack?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'business' | 'technical' | 'security' | 'integration';
  sentryEventId?: string;
}

export interface ErrorContext {
  userId?: string;
  merchantId?: string;
  requestId?: string;
  url?: string;
  method?: string;
  ip?: string;
  userAgent?: string;
  details?: any;
}

@Injectable()
export class ErrorManagementService {
  private readonly logger = new Logger(ErrorManagementService.name);

  constructor(private readonly sentryService: SentryService) {}

  /**
   * تسجيل خطأ مع تفاصيل كاملة
   */
  async logError(
    error: Error | string,
    context: ErrorContext = {}
  ): Promise<string> {
    const errorId = this.generateErrorId();
    const timestamp = new Date();
    
    const errorMessage = typeof error === 'string' ? error : error.message;
    const errorCode = this.extractErrorCode(error);
    const severity = this.determineSeverity(errorCode);
    const category = this.determineCategory(errorCode);

    const errorEntry: ErrorLogEntry = {
      id: errorId,
      timestamp,
      code: errorCode,
      message: errorMessage,
      details: typeof error === 'object' ? { name: error.name, stack: error.stack } : undefined,
      severity,
      category,
      ...context,
    };

    // تسجيل في السجلات المحلية
    this.logger.error(`Error logged: ${errorCode}`, {
      errorId,
      ...errorEntry,
    });

    // تسجيل في Sentry للأخطاء المتوسطة والعالية والحرجة
    if (severity !== 'low') {
      const sentryContext: SentryContext = {
        userId: context.userId,
        merchantId: context.merchantId,
        requestId: context.requestId,
        url: context.url,
        method: context.method,
        ip: context.ip,
        userAgent: context.userAgent,
        tags: {
          errorCode,
          severity,
          category,
          service: 'kaleem-bot',
        },
        extra: {
          ...context.details,
          errorId,
          timestamp: timestamp.toISOString(),
        },
      };

      const sentryEventId = this.sentryService.captureException(error, sentryContext);
      errorEntry.sentryEventId = sentryEventId;

      if (sentryEventId) {
        this.logger.debug(`Error also captured in Sentry with ID: ${sentryEventId}`);
      }
    }

    // يمكن إضافة حفظ في قاعدة البيانات هنا
    await this.persistError(errorEntry);

    return errorId;
  }

  /**
   * تسجيل خطأ أمان
   */
  async logSecurityError(
    activity: string,
    context: ErrorContext = {}
  ): Promise<string> {
    const errorId = this.generateErrorId();
    const timestamp = new Date();

    const errorEntry: ErrorLogEntry = {
      id: errorId,
      timestamp,
      code: ERROR_CODES.SUSPICIOUS_ACTIVITY,
      message: `Security violation: ${activity}`,
      severity: 'high',
      category: 'security',
      ...context,
    };

    // تسجيل في السجلات المحلية
    this.logger.error(`Security error logged: ${activity}`, {
      errorId,
      ...errorEntry,
    });

    // تسجيل في Sentry
    const sentryContext: SentryContext = {
      userId: context.userId,
      merchantId: context.merchantId,
      requestId: context.requestId,
      url: context.url,
      method: context.method,
      ip: context.ip,
      userAgent: context.userAgent,
      tags: {
        errorCode: ERROR_CODES.SUSPICIOUS_ACTIVITY,
        severity: 'high',
        category: 'security',
        service: 'kaleem-bot',
        activity,
      },
      extra: {
        ...context.details,
        errorId,
        timestamp: timestamp.toISOString(),
        activity,
      },
    };

    const sentryEventId = this.sentryService.captureMessage(
      `Security violation: ${activity}`,
      'error',
      sentryContext
    );
    errorEntry.sentryEventId = sentryEventId;

    await this.persistError(errorEntry);
    return errorId;
  }

  /**
   * تسجيل خطأ تكامل
   */
  async logIntegrationError(
    serviceName: string,
    error: Error | string,
    context: ErrorContext = {}
  ): Promise<string> {
    const errorId = this.generateErrorId();
    const timestamp = new Date();
    const errorMessage = typeof error === 'string' ? error : error.message;

    const errorEntry: ErrorLogEntry = {
      id: errorId,
      timestamp,
      code: ERROR_CODES.EXTERNAL_SERVICE_ERROR,
      message: `Integration error with ${serviceName}: ${errorMessage}`,
      severity: 'medium',
      category: 'integration',
      ...context,
    };

    // تسجيل في السجلات المحلية
    this.logger.error(`Integration error logged: ${serviceName}`, {
      errorId,
      ...errorEntry,
    });

    // تسجيل في Sentry
    const sentryContext: SentryContext = {
      userId: context.userId,
      merchantId: context.merchantId,
      requestId: context.requestId,
      url: context.url,
      method: context.method,
      ip: context.ip,
      userAgent: context.userAgent,
      tags: {
        errorCode: ERROR_CODES.EXTERNAL_SERVICE_ERROR,
        severity: 'medium',
        category: 'integration',
        service: 'kaleem-bot',
        integrationService: serviceName,
      },
      extra: {
        ...context.details,
        errorId,
        timestamp: timestamp.toISOString(),
        serviceName,
        originalError: typeof error === 'object' ? error.message : error,
      },
    };

    const sentryEventId = this.sentryService.captureException(error, sentryContext);
    errorEntry.sentryEventId = sentryEventId;

    await this.persistError(errorEntry);
    return errorId;
  }

  /**
   * تسجيل خطأ أعمال
   */
  async logBusinessError(
    code: string,
    message: string,
    context: ErrorContext = {}
  ): Promise<string> {
    const errorId = this.generateErrorId();
    const timestamp = new Date();

    const errorEntry: ErrorLogEntry = {
      id: errorId,
      timestamp,
      code,
      message,
      severity: 'low',
      category: 'business',
      ...context,
    };

    // تسجيل في السجلات المحلية
    this.logger.warn(`Business error logged: ${code}`, {
      errorId,
      ...errorEntry,
    });

    // تسجيل في Sentry فقط للأخطاء المهمة
    if (this.shouldSendToSentry(code)) {
      const sentryContext: SentryContext = {
        userId: context.userId,
        merchantId: context.merchantId,
        requestId: context.requestId,
        url: context.url,
        method: context.method,
        ip: context.ip,
        userAgent: context.userAgent,
        tags: {
          errorCode: code,
          severity: 'low',
          category: 'business',
          service: 'kaleem-bot',
        },
        extra: {
          ...context.details,
          errorId,
          timestamp: timestamp.toISOString(),
        },
      };

      const sentryEventId = this.sentryService.captureMessage(
        message,
        'warning',
        sentryContext
      );
      errorEntry.sentryEventId = sentryEventId;
    }

    await this.persistError(errorEntry);
    return errorId;
  }

  /**
   * بدء تتبع الأداء
   */
  startPerformanceTracking(
    name: string,
    operation: string,
    context: ErrorContext = {}
  ): any {
    const sentryContext: SentryContext = {
      userId: context.userId,
      merchantId: context.merchantId,
      requestId: context.requestId,
      url: context.url,
      method: context.method,
      ip: context.ip,
      userAgent: context.userAgent,
      tags: {
        service: 'kaleem-bot',
        operation,
      },
    };

    return this.sentryService.startTransaction(name, operation, sentryContext);
  }

  /**
   * الحصول على إحصائيات الأخطاء
   */
  async getErrorStats(filters: {
    merchantId?: string;
    severity?: string;
    category?: string;
    from?: Date;
    to?: Date;
  } = {}): Promise<{
    total: number;
    bySeverity: Record<string, number>;
    byCategory: Record<string, number>;
    byCode: Record<string, number>;
    recentErrors: ErrorLogEntry[];
    sentryEnabled: boolean;
  }> {
    // يمكن تنفيذ هذا لاحقاً مع قاعدة البيانات
    return {
      total: 0,
      bySeverity: {},
      byCategory: {},
      byCode: {},
      recentErrors: [],
      sentryEnabled: this.sentryService.isEnabled(),
    };
  }

  /**
   * تنظيف الأخطاء القديمة
   */
  async cleanupOldErrors(olderThanDays: number = 30): Promise<number> {
    // يمكن تنفيذ هذا لاحقاً مع قاعدة البيانات
    this.logger.log(`Cleaning up errors older than ${olderThanDays} days`);
    return 0;
  }

  /**
   * إغلاق خدمات المراقبة
   */
  async shutdown(): Promise<void> {
    try {
      await this.sentryService.close();
      this.logger.log('Error management service shutdown completed');
    } catch (error) {
      this.logger.error('Error during shutdown', error);
    }
  }

  private generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private extractErrorCode(error: Error | string): string {
    if (typeof error === 'string') {
      return ERROR_CODES.INTERNAL_ERROR;
    }

    // محاولة استخراج الكود من رسالة الخطأ
    const message = error.message;
    for (const [code, value] of Object.entries(ERROR_CODES)) {
      if (message.includes(value)) {
        return value;
      }
    }

    return ERROR_CODES.INTERNAL_ERROR;
  }

  private determineSeverity(code: string): 'low' | 'medium' | 'high' | 'critical' {
    const criticalCodes = [
      ERROR_CODES.DATABASE_ERROR,
      ERROR_CODES.EXTERNAL_SERVICE_ERROR,
      ERROR_CODES.AI_SERVICE_UNAVAILABLE,
    ];

    const highCodes = [
      ERROR_CODES.SUSPICIOUS_ACTIVITY,
      ERROR_CODES.IP_BLOCKED,
      ERROR_CODES.LICENSE_EXPIRED,
      ERROR_CODES.WEBHOOK_SIGNATURE_INVALID,
    ];

    const mediumCodes = [
      ERROR_CODES.VALIDATION_ERROR,
      ERROR_CODES.CONFLICT,
      ERROR_CODES.RATE_LIMIT_EXCEEDED,
      ERROR_CODES.QUOTA_EXCEEDED,
    ];

    if (criticalCodes.includes(code as any)) return 'critical';
    if (highCodes.includes(code as any)) return 'high';
    if (mediumCodes.includes(code as any)) return 'medium';
    return 'low';
  }

  private determineCategory(code: string): 'business' | 'technical' | 'security' | 'integration' {
    const securityCodes = [
      ERROR_CODES.UNAUTHORIZED,
      ERROR_CODES.FORBIDDEN,
      ERROR_CODES.SUSPICIOUS_ACTIVITY,
      ERROR_CODES.IP_BLOCKED,
      ERROR_CODES.INVALID_TOKEN,
      ERROR_CODES.TOKEN_EXPIRED,
    ];

    const integrationCodes = [
      ERROR_CODES.EXTERNAL_SERVICE_ERROR,
      ERROR_CODES.WEBHOOK_FAILED,
      ERROR_CODES.INTEGRATION_ERROR,
      ERROR_CODES.TELEGRAM_API_ERROR,
      ERROR_CODES.WHATSAPP_API_ERROR,
      ERROR_CODES.EMAIL_SEND_FAILED,
      ERROR_CODES.SMS_SEND_FAILED,
    ];

    const technicalCodes = [
      ERROR_CODES.DATABASE_ERROR,
      ERROR_CODES.INTERNAL_ERROR,
      ERROR_CODES.FILE_UPLOAD_FAILED,
      ERROR_CODES.MEDIA_UPLOAD_FAILED,
      ERROR_CODES.VECTOR_INDEX_ERROR,
      ERROR_CODES.EMBEDDING_GENERATION_FAILED,
    ];

    if (securityCodes.includes(code as any)) return 'security';
    if (integrationCodes.includes(code as any)) return 'integration';
    if (technicalCodes.includes(code as any)) return 'technical';
    return 'business';
  }

  private shouldSendToSentry(code: string): boolean {
    // إرسال أخطاء الأعمال المهمة فقط إلى Sentry
    const importantBusinessCodes = [
      ERROR_CODES.QUOTA_EXCEEDED,
      ERROR_CODES.LICENSE_EXPIRED,
      ERROR_CODES.FEATURE_NOT_AVAILABLE,
    ];

    return importantBusinessCodes.includes(code as any);
  }

  private async persistError(errorEntry: ErrorLogEntry): Promise<void> {
    // يمكن تنفيذ هذا لاحقاً مع قاعدة البيانات
    // حالياً نطبع فقط في السجلات
    this.logger.debug('Error persisted', errorEntry);
  }
}

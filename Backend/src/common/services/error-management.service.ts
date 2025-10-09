// src/common/services/error-management.service.ts

// external
import { Injectable, Logger } from '@nestjs/common';

// internal
import { ERROR_CODES } from '../constants/error-codes';

import { SentryService, type SentryContext } from './sentry.service';

// -----------------------------------------------------------------------------
const BASE36_RADIX = 36;
const RANDOM_ID_LENGTH = 11;

// -----------------------------------------------------------------------------
// Types
export interface ErrorLogEntry {
  id: string;
  timestamp: Date;
  code: string;
  message: string;
  details?: Record<string, unknown>;
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
  details?: Record<string, unknown>;
}

// -----------------------------------------------------------------------------

@Injectable()
export class ErrorManagementService {
  private readonly logger = new Logger(ErrorManagementService.name);

  constructor(private readonly sentryService: SentryService) {}

  /**
   * تسجيل خطأ مع تفاصيل كاملة
   */
  logError(error: Error | string, context: ErrorContext = {}): string {
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
      severity,
      category,
      ...context,
    };

    if (typeof error === 'object') {
      errorEntry.details = { name: error.name, stack: error.stack };
    }

    this.logger.error(`Error logged: ${errorCode}`, { errorId, ...errorEntry });

    if (severity !== 'low') {
      const sentryContext = this.buildSentryContext(
        errorCode,
        severity,
        category,
        context,
        errorId,
        timestamp,
      );
      const sentryEventId = this.sentryService.captureException(
        error,
        sentryContext,
      );
      errorEntry.sentryEventId = sentryEventId;
      if (sentryEventId) {
        this.logger.debug(
          `Error also captured in Sentry with ID: ${sentryEventId}`,
        );
      }
    }

    this.persistError(errorEntry);
    return errorId;
  }

  /**
   * تسجيل خطأ أمان
   */
  logSecurityError(activity: string, context: ErrorContext = {}): string {
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

    this.logger.error(`Security error logged: ${activity}`, {
      errorId,
      ...errorEntry,
    });

    const sentryContext: SentryContext = {
      ...this.baseSentryContext(context),
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

    errorEntry.sentryEventId = this.sentryService.captureMessage(
      `Security violation: ${activity}`,
      'error',
      sentryContext,
    );

    this.persistError(errorEntry);
    return errorId;
  }

  /**
   * تسجيل خطأ تكامل
   */
  logIntegrationError(
    serviceName: string,
    error: Error | string,
    context: ErrorContext = {},
  ): string {
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

    this.logger.error(`Integration error logged: ${serviceName}`, {
      errorId,
      ...errorEntry,
    });

    const sentryContext: SentryContext = {
      ...this.baseSentryContext(context),
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

    errorEntry.sentryEventId = this.sentryService.captureException(
      error,
      sentryContext,
    );

    this.persistError(errorEntry);
    return errorId;
  }

  /**
   * تسجيل خطأ أعمال
   */
  logBusinessError(
    code: string,
    message: string,
    context: ErrorContext = {},
  ): string {
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

    this.logger.warn(`Business error logged: ${code}`, {
      errorId,
      ...errorEntry,
    });

    if (this.shouldSendToSentry(code)) {
      const sentryContext: SentryContext = {
        ...this.baseSentryContext(context),
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
      errorEntry.sentryEventId = this.sentryService.captureMessage(
        message,
        'warning',
        sentryContext,
      );
    }

    this.persistError(errorEntry);
    return errorId;
  }

  /**
   * بدء تتبع الأداء
   */
  startPerformanceTracking(
    name: string,
    operation: string,
    context: ErrorContext = {},
  ): ReturnType<SentryService['startTransaction']> {
    const sentryContext: SentryContext = {
      ...this.baseSentryContext(context),
      tags: { service: 'kaleem-bot', operation },
    };
    return this.sentryService.startTransaction(name, operation, sentryContext);
  }

  getErrorStats(
    filters: {
      merchantId?: string;
      severity?: string;
      category?: string;
      from?: Date;
      to?: Date;
    } = {},
  ): {
    total: number;
    bySeverity: Record<string, number>;
    byCategory: Record<string, number>;
    byCode: Record<string, number>;
    recentErrors: ErrorLogEntry[];
    sentryEnabled: boolean;
  } {
    // TODO: Implement filtering logic when error persistence is added
    // For now, filters are accepted but not used since we return static data
    void filters; // Explicitly mark as intentionally unused

    return {
      total: 0,
      bySeverity: {},
      byCategory: {},
      byCode: {},
      recentErrors: [],
      sentryEnabled: this.sentryService.isEnabled(),
    };
  }

  cleanupOldErrors(olderThanDays = 30): number {
    this.logger.log(`Cleaning up errors older than ${olderThanDays} days`);
    return 0;
  }

  shutdown(): void {
    try {
      void this.sentryService.close();
      this.logger.log('Error management service shutdown completed');
    } catch (error) {
      const err = error instanceof Error ? error.message : String(error);
      this.logger.error('Error during shutdown', err);
    }
  }

  // ---------------------------------------------------------------------------
  // Private helpers

  private generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(BASE36_RADIX).slice(2, RANDOM_ID_LENGTH)}`;
  }

  private extractErrorCode(error: Error | string): string {
    if (typeof error === 'string') return ERROR_CODES.INTERNAL_ERROR;
    for (const value of Object.values(ERROR_CODES)) {
      if (error.message.includes(value)) return value;
    }
    return ERROR_CODES.INTERNAL_ERROR;
  }

  private determineSeverity(
    code: string,
  ): 'low' | 'medium' | 'high' | 'critical' {
    const critical = [
      ERROR_CODES.DATABASE_ERROR,
      ERROR_CODES.EXTERNAL_SERVICE_ERROR,
      ERROR_CODES.AI_SERVICE_UNAVAILABLE,
    ];
    const high = [
      ERROR_CODES.SUSPICIOUS_ACTIVITY,
      ERROR_CODES.IP_BLOCKED,
      ERROR_CODES.LICENSE_EXPIRED,
      ERROR_CODES.WEBHOOK_SIGNATURE_INVALID,
    ];
    const medium = [
      ERROR_CODES.VALIDATION_ERROR,
      ERROR_CODES.CONFLICT,
      ERROR_CODES.RATE_LIMIT_EXCEEDED,
      ERROR_CODES.QUOTA_EXCEEDED,
    ];
    if (
      critical.includes(
        code as
          | 'DATABASE_ERROR'
          | 'EXTERNAL_SERVICE_ERROR'
          | 'AI_SERVICE_UNAVAILABLE',
      )
    )
      return 'critical';
    if (
      high.includes(
        code as
          | 'SUSPICIOUS_ACTIVITY'
          | 'IP_BLOCKED'
          | 'LICENSE_EXPIRED'
          | 'WEBHOOK_SIGNATURE_INVALID',
      )
    )
      return 'high';
    if (
      medium.includes(
        code as
          | 'VALIDATION_ERROR'
          | 'CONFLICT'
          | 'RATE_LIMIT_EXCEEDED'
          | 'QUOTA_EXCEEDED',
      )
    )
      return 'medium';
    return 'low';
  }

  private determineCategory(
    code: string,
  ): 'business' | 'technical' | 'security' | 'integration' {
    const security = [
      ERROR_CODES.UNAUTHORIZED,
      ERROR_CODES.FORBIDDEN,
      ERROR_CODES.SUSPICIOUS_ACTIVITY,
      ERROR_CODES.IP_BLOCKED,
      ERROR_CODES.INVALID_TOKEN,
      ERROR_CODES.TOKEN_EXPIRED,
    ];
    const integration = [
      ERROR_CODES.EXTERNAL_SERVICE_ERROR,
      ERROR_CODES.WEBHOOK_FAILED,
      ERROR_CODES.INTEGRATION_ERROR,
      ERROR_CODES.TELEGRAM_API_ERROR,
      ERROR_CODES.WHATSAPP_API_ERROR,
      ERROR_CODES.EMAIL_SEND_FAILED,
      ERROR_CODES.SMS_SEND_FAILED,
    ];
    const technical = [
      ERROR_CODES.DATABASE_ERROR,
      ERROR_CODES.INTERNAL_ERROR,
      ERROR_CODES.FILE_UPLOAD_FAILED,
      ERROR_CODES.MEDIA_UPLOAD_FAILED,
      ERROR_CODES.VECTOR_INDEX_ERROR,
      ERROR_CODES.EMBEDDING_GENERATION_FAILED,
    ];
    if (
      security.includes(
        code as
          | 'UNAUTHORIZED'
          | 'FORBIDDEN'
          | 'SUSPICIOUS_ACTIVITY'
          | 'IP_BLOCKED'
          | 'INVALID_TOKEN'
          | 'TOKEN_EXPIRED',
      )
    )
      return 'security';
    if (
      integration.includes(
        code as
          | 'EXTERNAL_SERVICE_ERROR'
          | 'WEBHOOK_FAILED'
          | 'INTEGRATION_ERROR'
          | 'TELEGRAM_API_ERROR'
          | 'WHATSAPP_API_ERROR'
          | 'EMAIL_SEND_FAILED'
          | 'SMS_SEND_FAILED',
      )
    )
      return 'integration';
    if (
      technical.includes(
        code as
          | 'INTERNAL_ERROR'
          | 'FILE_UPLOAD_FAILED'
          | 'DATABASE_ERROR'
          | 'VECTOR_INDEX_ERROR'
          | 'EMBEDDING_GENERATION_FAILED'
          | 'MEDIA_UPLOAD_FAILED',
      )
    )
      return 'technical';
    return 'business';
  }

  private shouldSendToSentry(code: string): boolean {
    return [
      ERROR_CODES.QUOTA_EXCEEDED,
      ERROR_CODES.LICENSE_EXPIRED,
      ERROR_CODES.FEATURE_NOT_AVAILABLE,
    ].includes(
      code as 'LICENSE_EXPIRED' | 'QUOTA_EXCEEDED' | 'FEATURE_NOT_AVAILABLE',
    );
  }

  private persistError(errorEntry: ErrorLogEntry): void {
    this.logger.debug('Error persisted', errorEntry);
  }

  private baseSentryContext(
    context: ErrorContext,
  ): Omit<SentryContext, 'tags' | 'extra'> {
    const result: Omit<SentryContext, 'tags' | 'extra'> = {};

    if (context.userId) result.userId = context.userId;
    if (context.merchantId) result.merchantId = context.merchantId;
    if (context.requestId) result.requestId = context.requestId;
    if (context.url) result.url = context.url;
    if (context.method) result.method = context.method;
    if (context.ip) result.ip = context.ip;
    if (context.userAgent) result.userAgent = context.userAgent;

    return result;
  }

  private buildSentryContext(
    errorCode: string,
    severity: string,
    category: string,
    context: ErrorContext,
    errorId: string,
    timestamp: Date,
  ): SentryContext {
    return {
      ...this.baseSentryContext(context),
      tags: { errorCode, severity, category, service: 'kaleem-bot' },
      extra: {
        ...context.details,
        errorId,
        timestamp: timestamp.toISOString(),
      },
    };
  }
}

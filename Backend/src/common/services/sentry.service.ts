// src/common/services/sentry.service.ts
import { Injectable, Logger } from '@nestjs/common';
import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';
import { ConfigService } from '@nestjs/config';

export interface SentryContext {
  userId?: string;
  merchantId?: string;
  requestId?: string;
  url?: string;
  method?: string;
  ip?: string;
  userAgent?: string;
  tags?: Record<string, string>;
  extra?: Record<string, any>;
}

@Injectable()
export class SentryService {
  private readonly logger = new Logger(SentryService.name);
  private isInitialized = false;

  constructor(private readonly configService: ConfigService) {}

  /**
   * تهيئة Sentry
   */
  initialize(): void {
    if (this.isInitialized) {
      this.logger.warn('Sentry already initialized');
      return;
    }

    const enabled =
      this.configService.get<string>('SENTRY_ENABLED', 'true') === 'true';
    if (!enabled) {
      this.logger.log('Sentry disabled by SENTRY_ENABLED=false');
      return;
    }

    const dsn = this.configService.get<string>('SENTRY_DSN'); // ← لا تَستخدم القيمة الـ hard-coded
    const environment = this.configService.get<string>(
      'NODE_ENV',
      'development',
    );
    const release = this.configService.get<string>('APP_VERSION', '1.0.0');

    if (!dsn) {
      this.logger.warn('SENTRY_DSN not configured, Sentry will be disabled');
      return;
    }

    // اجعل الأداء صفر في dev ما لم يطلب صراحة
    const tracesSampleRate = Number(
      this.configService.get<string>(
        'SENTRY_TRACES_SAMPLE_RATE',
        environment === 'production' ? '0.1' : '0',
      ),
    );
    const profilesSampleRate = Number(
      this.configService.get<string>(
        'SENTRY_PROFILES_SAMPLE_RATE',
        environment === 'production' ? '0.1' : '0',
      ),
    );
    const debug =
      this.configService.get<string>('SENTRY_DEBUG', 'false') === 'true';

    try {
      Sentry.init({
        dsn,
        environment,
        release,
        debug,
        // فعّل التكامل الخاص بالبروفايل فقط إن كان فيه sampling > 0
        integrations:
          profilesSampleRate > 0 ? [nodeProfilingIntegration()] : [],
        tracesSampleRate,
        profilesSampleRate,

        beforeSend(event) {
          if (event.exception) {
            const ex = event.exception.values?.[0];
            if (ex?.type === 'ValidationError') return null;
          }
          if (event.request?.headers) {
            delete event.request.headers.authorization;
            delete event.request.headers.cookie;
          }
          return event;
        },
        initialScope: { tags: { service: 'kaleem-bot' } },
      });

      this.isInitialized = true;
      this.logger.log(
        `Sentry initialized (env=${environment}, traces=${tracesSampleRate}, profiles=${profilesSampleRate})`,
      );
    } catch (error) {
      this.logger.error('Failed to initialize Sentry', error as any);
    }
  }

  /**
   * تسجيل خطأ في Sentry
   */
  captureException(error: Error | string, context: SentryContext = {}): string {
    if (!this.isInitialized) {
      this.logger.warn('Sentry not initialized, error not captured');
      return '';
    }

    try {
      const eventId = Sentry.captureException(error, {
        level: 'error',
        tags: {
          ...context.tags,
          service: 'kaleem-bot',
        },
        user: context.userId
          ? {
              id: context.userId,
              ip_address: context.ip,
            }
          : undefined,
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
            headers: {
              'User-Agent': context.userAgent,
            },
          },
        },
      });

      this.logger.debug(`Error captured in Sentry with ID: ${eventId}`);
      return eventId;
    } catch (sentryError) {
      this.logger.error('Failed to capture error in Sentry', sentryError);
      return '';
    }
  }

  /**
   * تسجيل رسالة في Sentry
   */
  captureMessage(
    message: string,
    level: Sentry.SeverityLevel = 'info',
    context: SentryContext = {},
  ): string {
    if (!this.isInitialized) {
      this.logger.warn('Sentry not initialized, message not captured');
      return '';
    }

    try {
      const eventId = Sentry.captureMessage(message, {
        level,
        tags: {
          ...context.tags,
          service: 'kaleem-bot',
        },
        user: context.userId
          ? {
              id: context.userId,
              ip_address: context.ip,
            }
          : undefined,
        extra: {
          ...context.extra,
          merchantId: context.merchantId,
          requestId: context.requestId,
          url: context.url,
          method: context.method,
          userAgent: context.userAgent,
        },
      });

      this.logger.debug(`Message captured in Sentry with ID: ${eventId}`);
      return eventId;
    } catch (sentryError) {
      this.logger.error('Failed to capture message in Sentry', sentryError);
      return '';
    }
  }

  /**
   * بدء تتبع الأداء (مبسط)
   */
  startTransaction(
    name: string,
    operation: string,
    context: SentryContext = {},
  ): any {
    if (!this.isInitialized) {
      this.logger.warn('Sentry not initialized, transaction not started');
      return null;
    }

    try {
      // إضافة تاج للعملية
      Sentry.setTag('operation', operation);
      Sentry.setTag('transaction_name', name);

      // إضافة سياق للعملية
      Sentry.setContext('transaction', {
        name,
        operation,
        merchantId: context.merchantId,
        requestId: context.requestId,
        url: context.url,
        method: context.method,
      });

      // تسجيل بداية العملية
      this.logger.debug(`Transaction started: ${name} (${operation})`);

      return {
        name,
        operation,
        context,
        setStatus: (status: string) => {
          Sentry.setTag('transaction_status', status);
        },
        setData: (key: string, value: any) => {
          Sentry.setExtra(`transaction_${key}`, value);
        },
        setTag: (key: string, value: string) => {
          Sentry.setTag(`transaction_${key}`, value);
        },
        finish: () => {
          this.logger.debug(`Transaction finished: ${name}`);
        },
      };
    } catch (error) {
      this.logger.error('Failed to start Sentry transaction', error);
      return null;
    }
  }

  /**
   * إضافة سياق للخطأ الحالي
   */
  setContext(name: string, context: Record<string, any>): void {
    if (!this.isInitialized) {
      return;
    }

    try {
      Sentry.setContext(name, context);
    } catch (error) {
      this.logger.error('Failed to set Sentry context', error);
    }
  }

  /**
   * إضافة تاج للخطأ الحالي
   */
  setTag(key: string, value: string): void {
    if (!this.isInitialized) {
      return;
    }

    try {
      Sentry.setTag(key, value);
    } catch (error) {
      this.logger.error('Failed to set Sentry tag', error);
    }
  }

  /**
   * إضافة مستخدم للخطأ الحالي
   */
  setUser(user: {
    id: string;
    email?: string;
    username?: string;
    ip_address?: string;
  }): void {
    if (!this.isInitialized) {
      return;
    }

    try {
      Sentry.setUser(user);
    } catch (error) {
      this.logger.error('Failed to set Sentry user', error);
    }
  }

  /**
   * إضافة بيانات إضافية للخطأ الحالي
   */
  setExtra(key: string, value: any): void {
    if (!this.isInitialized) {
      return;
    }

    try {
      Sentry.setExtra(key, value);
    } catch (error) {
      this.logger.error('Failed to set Sentry extra', error);
    }
  }

  /**
   * إغلاق Sentry
   */
  async close(): Promise<void> {
    if (!this.isInitialized) {
      return;
    }

    try {
      await Sentry.close(2000); // انتظار 2 ثانية لإرسال الأحداث المتبقية
      this.isInitialized = false;
      this.logger.log('Sentry closed successfully');
    } catch (error) {
      this.logger.error('Failed to close Sentry', error);
    }
  }

  /**
   * فحص حالة Sentry
   */
  isEnabled(): boolean {
    return this.isInitialized;
  }

  /**
   * الحصول على معرف المستخدم الحالي
   */
  getCurrentUserId(): string | undefined {
    if (!this.isInitialized) {
      return undefined;
    }

    try {
      // في الإصدارات الحديثة من Sentry، يمكن استخدام getCurrentScope
      // لكن سنستخدم طريقة مبسطة
      return undefined;
    } catch (error) {
      this.logger.error('Failed to get current user ID from Sentry', error);
      return undefined;
    }
  }
}

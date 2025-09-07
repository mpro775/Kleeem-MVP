// src/common/interceptors/performance-tracking.interceptor.ts
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { Observable } from 'rxjs';
import { tap, finalize } from 'rxjs/operators';
import { SentryService } from '../services/sentry.service';
import { RequestWithUser } from '../interfaces/request-with-user.interface';
import { shouldBypass } from './bypass.util';

@Injectable()
export class PerformanceTrackingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(PerformanceTrackingInterceptor.name);

  constructor(private readonly sentryService: SentryService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    // نتعامل مع HTTP فقط
    if (context.getType<'http'>() !== 'http') {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const response = context.switchToHttp().getResponse<Response>();

    if (shouldBypass(request)) {
      return next.handle(); // لا تتبع لـ /metrics وما شابه
    }

    const url = (request.originalUrl || request.url || '').split('?')[0];
    const method = request.method;
    const ip = request.ip;
    const userAgent = request.headers['user-agent'] as string | undefined;
    const requestId =
      (request as any).requestId ||
      (request.headers['x-request-id'] as string | undefined) ||
      undefined;

    // نفضّل authUser (محمّل من DB عبر IdentityGuard)، وإلا نأخذ من JWT payload
    const auth = request.authUser;
    const jwt = request.user;
    const userId = (auth?._id as any)?.toString?.() || jwt?.userId || undefined;
    const merchantId =
      (auth?.merchantId as any)?.toString?.() ||
      (jwt?.merchantId as any) ||
      undefined;

    const operationName = `${method} ${url}`;
    const operationType = 'http.server';

    const transaction = this.sentryService.startTransaction(
      operationName,
      operationType,
      {
        userId,
        merchantId,
        requestId,
        url,
        method,
        ip,
        userAgent,
      },
    );

    if (!transaction) {
      // لا يوجد Sentry/Tracing مفعّل
      return next.handle();
    }

    const startTime = Date.now();

    // وسمات/حقول ثابتة مفيدة
    try {
      transaction.setTag('http.method', method);
      transaction.setTag('http.route', url);
      if (userId) transaction.setTag('user.id', userId);
      if (merchantId) transaction.setTag('merchant.id', String(merchantId));
      if (requestId) transaction.setTag('request.id', requestId);
    } catch {
      /* ignore */
    }

    return next.handle().pipe(
      tap({
        next: (data) => {
          transaction.setStatus('ok');

          // حاول قياس حجم الاستجابة بحذر
          try {
            const s = JSON.stringify(data);
            // لا حاجة لتخزين كل الرد—نأخذ الطول فقط
            transaction.setData('response_size', s.length);
          } catch {
            // تجاهل لو ما نقدر نعمل stringify (circular refs)
          }
        },
        error: (error) => {
          transaction.setStatus('internal_error');
          transaction.setData('error_message', error?.message ?? 'Unknown');
          transaction.setData('error_code', error?.status ?? 500);
        },
      }),
      finalize(() => {
        const duration = Date.now() - startTime;

        // قد يتغير الكود أثناء السايكل؛ خذه في النهاية
        const statusCode = (response?.statusCode as number) ?? undefined;

        // بيانات أداء
        transaction.setData('duration_ms', duration);
        if (statusCode) transaction.setData('status_code', statusCode);
        if (requestId) transaction.setData('request_id', requestId);

        // وسم الأداء
        if (duration > 5000) {
          transaction.setTag('performance', 'slow');
        } else if (duration > 1000) {
          transaction.setTag('performance', 'medium');
        } else {
          transaction.setTag('performance', 'fast');
        }

        transaction.finish();

        // سجلات
        if (duration > 3000) {
          this.logger.warn(
            `Slow request: ${operationName} took ${duration}ms`,
            {
              duration,
              url,
              method,
              userId,
              merchantId,
              requestId,
              statusCode,
            } as any,
          );
        } else {
          this.logger.debug(
            `Request completed: ${operationName} took ${duration}ms`,
          );
        }
      }),
    );
  }
}

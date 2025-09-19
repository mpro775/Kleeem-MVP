import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  Logger,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Inject } from '@nestjs/common';
import { Counter, Histogram } from 'prom-client';
import {
  METRIC_HTTP_DURATION,
  METRIC_HTTP_ERRORS,
  METRIC_HTTP_TOTAL,
} from 'src/metrics/metrics.providers';

/**
 * Interceptor لقياس أداء HTTP requests
 */
@Injectable()
export class HttpMetricsInterceptor implements NestInterceptor {
  private readonly logger = new Logger(HttpMetricsInterceptor.name);

  constructor(
    @Inject(METRIC_HTTP_DURATION)
    private readonly httpDuration: Histogram<string>,
    @Inject(METRIC_HTTP_ERRORS) private readonly httpErrors: Counter<string>,
    @Inject(METRIC_HTTP_TOTAL) private readonly httpTotal: Counter<string>,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const res = context.switchToHttp().getResponse();
    const startTime = process.hrtime.bigint();

    // استخراج معلومات الطلب
    const method = req.method;
    const route = this.extractRoute(req);
    const userAgent = req.headers['user-agent'] || 'unknown';
    const ip = req.ip || req.connection.remoteAddress;

    // إضافة request ID للتتبع
    const requestId = req.headers['X-Request-Id'] || this.generateRequestId();
    req.requestId = requestId;
    res.setHeader('X-Request-ID', requestId);

    return next.handle().pipe(
      tap(() => {
        this.recordMetrics(method, route, res.statusCode, startTime);
      }),
      catchError((error) => {
        this.recordMetrics(method, route, res.statusCode || 500, startTime);
        this.recordError(method, route, res.statusCode || 500, error);

        // تسجيل تفاصيل الخطأ
        this.logger.error(`HTTP Error - ${method} ${route}`, {
          requestId,
          method,
          route,
          statusCode: res.statusCode || 500,
          userAgent,
          ip,
          error: error.message,
          stack: error.stack,
        });

        return throwError(() => error);
      }),
    );
  }

  /**
   * تسجيل مقاييس الأداء
   */
  private recordMetrics(
    method: string,
    route: string,
    statusCode: number,
    startTime: bigint,
  ): void {
    const duration = Number(process.hrtime.bigint() - startTime) / 1e9;
    const status = statusCode.toString();

    this.httpDuration.labels(method, route, status).observe(duration);
    this.httpTotal.labels(method, route, status).inc();

    if (duration > 1) {
      this.logger.warn(
        `Slow request detected: ${method} ${route} took ${duration.toFixed(3)}s`,
      );
    }
  }

  /**
   * تسجيل الأخطاء
   */
  private recordError(
    method: string,
    route: string,
    statusCode: number,
    error: any,
  ): void {
    const errorType = this.categorizeError(statusCode, error);
    this.httpErrors
      .labels(method, route, statusCode.toString(), errorType)
      .inc();
  }

  /**
   * استخراج المسار من الطلب
   */
  private extractRoute(req: any): string {
    // استخدام route pattern إذا متوفر
    if (req.route?.path) {
      return req.route.path;
    }

    // تنظيف URL من query parameters
    const url = req.originalUrl || req.url || '/';
    const path = url.split('?')[0];

    // استبدال IDs بـ placeholders للتجميع
    return path
      .replace(/\/[0-9a-fA-F]{24}/g, '/:id') // MongoDB ObjectIds
      .replace(/\/\d+/g, '/:id') // Numeric IDs
      .replace(/\/[a-zA-Z0-9-_]{8,}/g, '/:slug'); // Slugs
  }

  /**
   * تصنيف نوع الخطأ
   */
  private categorizeError(statusCode: number, error: any): string {
    if (statusCode >= 500) {
      return 'server_error';
    } else if (statusCode === 404) {
      return 'not_found';
    } else if (statusCode === 401) {
      return 'unauthorized';
    } else if (statusCode === 403) {
      return 'forbidden';
    } else if (statusCode >= 400) {
      return 'client_error';
    }

    return 'unknown';
  }

  /**
   * إنشاء request ID فريد
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// builtins
import { randomUUID } from 'crypto';

// external
import {
  Inject,
  Injectable,
  Logger,
  type CallHandler,
  type ExecutionContext,
  type NestInterceptor,
} from '@nestjs/common';
import { type Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

// internal
import {
  HTTP_ERRORS_TOTAL,
  HTTP_REQUEST_DURATION_SECONDS,
} from '../../metrics/metrics.module';

import { shouldBypass } from './bypass.util';

// type
import type { Request, Response } from 'express';
import type { Counter, Histogram } from 'prom-client';

// -----------------------------------------------------------------------------
// Constants (no-magic-numbers)
const SLOW_REQUEST_SECONDS = 1;
const STATUS_FALLBACK = 500;

// -----------------------------------------------------------------------------
// Types
type RequestWithMeta = Request & {
  requestId?: string;
  originalUrl?: string;
  headers: Request['headers'] & {
    'x-request-id'?: string | string[];
    'user-agent'?: string;
  };
};

type ResponseWithMeta = Response;

// -----------------------------------------------------------------------------
// Helpers (تبسيط وتقليل التعقيد)
function isHttpContext(ctx: ExecutionContext): boolean {
  return ctx.getType<'http'>() === 'http';
}

function getHttp(ctx: ExecutionContext): {
  req: RequestWithMeta;
  res: ResponseWithMeta;
} {
  const http = ctx.switchToHttp();
  return {
    req: http.getRequest<RequestWithMeta>(),
    res: http.getResponse<ResponseWithMeta>(),
  };
}

function firstHeader(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function extractRoute(req: RequestWithMeta): string {
  if ((req as unknown as { route?: { path?: string } }).route?.path) {
    return (req as unknown as { route: { path: string } }).route.path;
  }
  const url = req.originalUrl ?? req.url ?? '/';
  const path = url.split('?')[0];
  return path
    .replace(/\/[0-9a-fA-F]{24}/g, '/:id') // MongoDB ObjectIds
    .replace(/\/\d+/g, '/:id') // Numeric IDs
    .replace(/\/[a-zA-Z0-9-_]{8,}/g, '/:slug'); // Slugs
}

function categorizeError(statusCode: number): string {
  if (statusCode >= 500) return 'server_error';
  if (statusCode === 404) return 'not_found';
  if (statusCode === 401) return 'unauthorized';
  if (statusCode === 403) return 'forbidden';
  if (statusCode >= 400) return 'client_error';
  return 'unknown';
}

function formatErrorForLog(error: unknown): {
  message: string;
  stack?: string;
} {
  if (error instanceof Error) {
    return { message: error.message, stack: error.stack };
  }
  return { message: String(error) };
}

function generateRequestId(): string {
  return randomUUID();
}

// -----------------------------------------------------------------------------

/**
 * Interceptor لقياس أداء HTTP requests
 */
@Injectable()
export class HttpMetricsInterceptor implements NestInterceptor {
  private readonly logger = new Logger(HttpMetricsInterceptor.name);

  constructor(
    @Inject(HTTP_REQUEST_DURATION_SECONDS)
    private readonly httpDuration: Histogram<string>,

    @Inject('HTTP_REQUESTS_TOTAL')
    private readonly httpTotal: Counter<string>,

    @Inject(HTTP_ERRORS_TOTAL)
    private readonly httpErrors: Counter<string>,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (!isHttpContext(context)) return next.handle();

    const { req, res } = getHttp(context);
    if (shouldBypass(req)) return next.handle();

    const startTime = process.hrtime.bigint();

    // استخراج معلومات الطلب
    const method = req.method;
    const route = extractRoute(req);
    const userAgent = req.headers['user-agent'] ?? 'unknown';
    const ip = req.ip ?? req.socket?.remoteAddress ?? 'unknown';

    // إضافة request ID للتتبع
    const requestId =
      firstHeader(req.headers['x-request-id']) ?? generateRequestId();
    req.requestId = requestId;
    res.setHeader('X-Request-ID', requestId);

    return next.handle().pipe(
      tap(() => {
        this.recordMetrics(method, route, res.statusCode, startTime);
      }),

      // الأخطاء
      catchError((error: unknown) => {
        const status = res.statusCode ?? STATUS_FALLBACK;
        this.recordMetrics(method, route, status, startTime);
        this.recordError(method, route, status);

        const errInfo = formatErrorForLog(error);
        // تلافي تمرير كائنات غير مضبوطة للـ logger
        this.logger.error(
          `HTTP Error - ${method} ${route} | requestId=${requestId} status=${status} ua=${userAgent} ip=${ip} msg=${errInfo.message}`,
        );
        if (errInfo.stack) {
          this.logger.error(errInfo.stack);
        }

        return throwError(() =>
          error instanceof Error ? error : new Error(String(error)),
        );
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
    const NANOSECONDS_PER_SECOND = 1000000000;
    const duration =
      Number(process.hrtime.bigint() - startTime) / NANOSECONDS_PER_SECOND;
    const status_code = statusCode.toString();

    this.httpDuration.labels(method, route, status_code).observe(duration);
    this.httpTotal.labels(method, route, status_code).inc();

    if (duration > SLOW_REQUEST_SECONDS) {
      this.logger.warn(
        `Slow request detected: ${method} ${route} took ${duration.toFixed(3)}s`,
      );
    }
  }

  /**
   * تسجيل الأخطاء
   */
  private recordError(method: string, route: string, statusCode: number): void {
    const errorType = categorizeError(statusCode);
    this.httpErrors
      .labels(method, route, statusCode.toString(), errorType)
      .inc();
  }
}

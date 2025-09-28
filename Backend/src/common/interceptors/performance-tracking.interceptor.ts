// src/common/interceptors/performance-tracking.interceptor.ts

// builtins
import { randomUUID } from 'crypto';

// external
import {
  Injectable,
  Logger,
  type CallHandler,
  type ExecutionContext,
  type NestInterceptor,
} from '@nestjs/common';
import { type Observable } from 'rxjs';
import { finalize, tap } from 'rxjs/operators';

// internal
import { SentryService } from '../services/sentry.service';

import { shouldBypass } from './bypass.util';

// type-only
import type { RequestWithUser } from '../interfaces/request-with-user.interface';
import type { Response } from 'express';

// -----------------------------------------------------------------------------
// Constants
const PERF_SLOW_MS = 5_000;
const PERF_MEDIUM_MS = 1_000;
const LOG_SLOW_THRESHOLD_MS = 3_000;

// -----------------------------------------------------------------------------
// Types & helpers
type RequestWithMeta = RequestWithUser & {
  requestId?: string;
  originalUrl?: string;
  headers: RequestWithUser['headers'] & {
    'x-request-id'?: string | string[];
    'user-agent'?: string | string[];
  };
};

type SentryTransaction = {
  setTag(key: string, value: string): void;
  setStatus(status: string): void;
  setData(key: string, value: unknown): void;
  finish(): void;
};

function firstHeader(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}
function isHttpContext(ctx: ExecutionContext): boolean {
  return ctx.getType<'http'>() === 'http';
}
function getReqRes(ctx: ExecutionContext): {
  req: RequestWithMeta;
  res: Response;
} {
  const http = ctx.switchToHttp();
  return {
    req: http.getRequest<RequestWithMeta>(),
    res: http.getResponse<Response>(),
  };
}
function extractUrl(req: RequestWithMeta): string {
  return (req.originalUrl ?? req.url ?? '').split('?')[0];
}
function getRequestId(req: RequestWithMeta): string {
  return (
    req.requestId ?? firstHeader(req.headers['x-request-id']) ?? randomUUID()
  );
}
function getUserIdFromAuth(req: RequestWithMeta): string | undefined {
  const auth = req.authUser;
  if (!auth || !auth._id) return undefined;
  try {
    if (typeof auth._id === 'string') return auth._id;
    if (typeof auth._id === 'number') return String(auth._id);
    return undefined;
  } catch {
    return undefined;
  }
}
function getUserIdFromJwt(req: RequestWithMeta): string | undefined {
  const jwt = req.user as { userId?: unknown } | undefined;
  return typeof jwt?.userId === 'string' ? jwt.userId : undefined;
}
function getMerchantIdFromAuth(req: RequestWithMeta): string | undefined {
  const auth = req.authUser;
  if (!auth || !auth.merchantId) return undefined;
  try {
    if (typeof auth.merchantId === 'string') return auth.merchantId;
    if (typeof auth.merchantId === 'number') return String(auth.merchantId);
    return undefined;
  } catch {
    return undefined;
  }
}
function getMerchantIdFromJwt(req: RequestWithMeta): string | undefined {
  const jwt = req.user as { merchantId?: unknown } | undefined;
  return typeof jwt?.merchantId === 'string' ? jwt.merchantId : undefined;
}
function buildUserIds(req: RequestWithMeta): {
  userId?: string;
  merchantId?: string;
} {
  return {
    userId: getUserIdFromAuth(req) ?? getUserIdFromJwt(req),
    merchantId: getMerchantIdFromAuth(req) ?? getMerchantIdFromJwt(req),
  };
}
function performanceTag(ms: number): 'slow' | 'medium' | 'fast' {
  if (ms > PERF_SLOW_MS) return 'slow';
  if (ms > PERF_MEDIUM_MS) return 'medium';
  return 'fast';
}
function asTransaction(v: unknown): SentryTransaction | null {
  const t = v as Partial<SentryTransaction> | null;
  return t &&
    typeof t.setTag === 'function' &&
    typeof t.setStatus === 'function' &&
    typeof t.setData === 'function' &&
    typeof t.finish === 'function'
    ? (t as SentryTransaction)
    : null;
}
function tagBase(
  transaction: SentryTransaction,
  method: string,
  url: string,
  requestId: string,
  userId?: string,
  merchantId?: string,
): void {
  try {
    transaction.setTag('http.method', method);
    transaction.setTag('http.route', url);
    transaction.setTag('request.id', requestId);
    if (userId) transaction.setTag('user.id', userId);
    if (merchantId) transaction.setTag('merchant.id', merchantId);
  } catch {
    /* ignore */
  }
}

// -----------------------------------------------------------------------------

@Injectable()
export class PerformanceTrackingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(PerformanceTrackingInterceptor.name);

  constructor(private readonly sentryService: SentryService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (!isHttpContext(context)) return next.handle() as Observable<unknown>;

    const { req, res } = getReqRes(context);
    if (shouldBypass(req)) return next.handle() as Observable<unknown>;

    const url = extractUrl(req);
    const method = req.method;
    const ip = req.ip;
    const userAgent = firstHeader(req.headers['user-agent']);
    const requestId = getRequestId(req);
    req.requestId = requestId;
    res.setHeader('X-Request-ID', requestId);

    const { userId, merchantId } = buildUserIds(req);
    const tx = asTransaction(
      (
        this.sentryService.startTransaction as unknown as (
          name: string,
          op: string,
          meta: Record<string, unknown>,
        ) => unknown
      )(`${method} ${url}`, 'http.server', {
        userId,
        merchantId,
        requestId,
        url,
        method,
        ip,
        userAgent,
      }),
    );
    if (!tx) return next.handle() as Observable<unknown>;

    const start = Date.now();
    tagBase(tx, method, url, requestId, userId, merchantId);

    return next.handle().pipe(
      tap({
        next: (data: unknown) => {
          tx.setStatus('ok');
          try {
            const s = JSON.stringify(data);
            tx.setData('response_size', s.length);
          } catch {
            /* ignore */
          }
        },
        error: (err: unknown) => {
          tx.setStatus('internal_error');
          tx.setData(
            'error_message',
            err instanceof Error ? err.message : String(err),
          );
          tx.setData('error_code', res?.statusCode ?? 500);
        },
      }),
      finalize(() => {
        const duration = Date.now() - start;
        const statusCode = res?.statusCode;
        tx.setData('duration_ms', duration);
        if (typeof statusCode === 'number')
          tx.setData('status_code', statusCode);
        tx.setData('request_id', requestId);
        tx.setTag('performance', performanceTag(duration));
        tx.finish();

        if (duration > LOG_SLOW_THRESHOLD_MS) {
          this.logger.warn(
            `Slow request: ${method} ${url} took ${duration}ms | ${JSON.stringify(
              {
                duration,
                url,
                method,
                userId,
                merchantId,
                requestId,
                statusCode,
              },
            )}`,
          );
        } else {
          this.logger.debug(
            `Request completed: ${method} ${url} took ${duration}ms`,
          );
        }
      }),
    );
  }
}

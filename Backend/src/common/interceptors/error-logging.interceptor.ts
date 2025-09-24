// src/common/interceptors/error-logging.interceptor.ts

// external (alphabetized)
import {
  Injectable,
  Logger,
  type CallHandler,
  type ExecutionContext,
  type NestInterceptor,
} from '@nestjs/common';
import { throwError, type Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';

// internal
import { ErrorManagementService } from '../services/error-management.service';

import { shouldBypass } from './bypass.util';

import type { RequestWithUser } from '../interfaces/request-with-user.interface';

// -----------------------------------------------------------------------------

type RequestWithMeta = RequestWithUser & {
  requestId?: string;
  originalUrl?: string;
  headers: RequestWithUser['headers'] & {
    'x-request-id'?: string | string[];
    'user-agent'?: string;
  };
};

type ErrorMeta = {
  userId?: string;
  merchantId?: string;
  requestId?: string;
  url: string;
  method: string;
  ip: string;
  userAgent?: string;
};

// -------------------------- Helpers (خفض التعقيد) ---------------------------

function firstHeader(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function isHttpContext(ctx: ExecutionContext): boolean {
  return ctx.getType<'http'>() === 'http';
}

function getRequest(ctx: ExecutionContext): RequestWithMeta {
  return ctx.switchToHttp().getRequest<RequestWithMeta>();
}

function getUrl(req: RequestWithMeta): string {
  return (req.originalUrl ?? req.url ?? '').split('?')[0];
}

function getRequestId(req: RequestWithMeta): string | undefined {
  return req.requestId ?? firstHeader(req.headers['x-request-id']);
}

function safeToString(v: unknown): string | undefined {
  return typeof (v as { toString?: () => string })?.toString === 'function'
    ? (v as { toString: () => string }).toString()
    : undefined;
}

function getUserIdFromAuth(req: RequestWithMeta): string | undefined {
  const auth = req.authUser;
  return auth ? safeToString(auth._id) : undefined;
}

function getUserIdFromJwt(req: RequestWithMeta): string | undefined {
  const jwt = req.user as { userId?: unknown } | undefined;
  return typeof jwt?.userId === 'string' ? jwt.userId : undefined;
}

function getMerchantIdFromAuth(req: RequestWithMeta): string | undefined {
  const auth = req.authUser;
  return auth ? safeToString(auth.merchantId) : undefined;
}

function getMerchantIdFromJwt(req: RequestWithMeta): string | undefined {
  const jwt = req.user as { merchantId?: unknown } | undefined;
  return typeof jwt?.merchantId === 'string' ? jwt.merchantId : undefined;
}

function buildMeta(req: RequestWithMeta): ErrorMeta {
  const url = getUrl(req);
  const method = req.method ?? 'UNKNOWN';
  const ip = req.ip ?? 'unknown';
  const userAgent = req.headers['user-agent'];
  const requestId = getRequestId(req);

  // نفضّل authUser ثم JWT لكل من userId و merchantId
  const userId = getUserIdFromAuth(req) ?? getUserIdFromJwt(req);
  const merchantId = getMerchantIdFromAuth(req) ?? getMerchantIdFromJwt(req);

  return { userId, merchantId, requestId, url, method, ip, userAgent };
}

// -----------------------------------------------------------------------------

@Injectable()
export class ErrorLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(ErrorLoggingInterceptor.name);

  constructor(
    private readonly errorManagementService: ErrorManagementService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (!isHttpContext(context)) {
      return next.handle();
    }

    const req = getRequest(context);
    if (shouldBypass(req)) {
      return next.handle();
    }

    const meta = buildMeta(req);

    return next.handle().pipe(
      catchError((error: unknown) => {
        void this.logAsync(error, meta);
        return throwError(() =>
          error instanceof Error ? error : new Error(String(error)),
        );
      }),
    );
  }

  private logAsync(error: unknown, meta: ErrorMeta): void {
    try {
      const errorId = this.errorManagementService.logError(
        error as string | Error,
        meta,
      );
      this.logger.debug(`Error logged with ID: ${errorId}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this.logger.error(`Failed to log error: ${msg}`);
    }
  }
}

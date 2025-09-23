// src/common/interceptors/logging.interceptor.ts
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

import { sanitizeBody } from '../utils/logger.utils';

import { shouldBypass } from './bypass.util';

import type { Request, Response } from 'express';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context
      .switchToHttp()
      .getRequest<Request & { requestId?: string }>();
    const response = context.switchToHttp().getResponse<Response>();
    if (shouldBypass(request)) {
      return next.handle(); // لا لوج طويل لمسار المقاييس
    }
    const method = request.method;
    const url = request.url;
    const body = request.body as Record<string, unknown> | undefined;
    const requestId = request.requestId;
    const userAgent = request.get('User-Agent') || '';
    const startTime = Date.now();

    // تسجيل بداية الطلب
    this.logger.log(
      `[${requestId}] ${method} ${url} - User-Agent: ${userAgent}`,
    );

    // ✅ G1: تسجيل Body مع إخفاء البيانات الحساسة
    if (body && Object.keys(body).length > 0) {
      const sanitizedBody = sanitizeBody(body) as Record<string, unknown>;
      this.logger.debug(
        `[${requestId}] Request Body: ${JSON.stringify(sanitizedBody)}`,
      );
    }

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - startTime;
          this.logger.log(
            `[${requestId}] ${method} ${url} - ${response.statusCode} - ${duration}ms`,
          );
        },
        error: (error) => {
          const duration = Date.now() - startTime;
          const errorMessage =
            error instanceof Error ? error.stack : String(error);
          this.logger.error(
            `[${requestId}] ${method} ${url} - ERROR - ${duration}ms`,
            errorMessage,
          );
        },
      }),
    );
  }
}

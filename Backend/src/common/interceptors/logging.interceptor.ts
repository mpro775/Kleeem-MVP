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
import type { Request, Response } from 'express';
import { shouldBypass } from './bypass.util';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context
      .switchToHttp()
      .getRequest<Request & { requestId?: string }>();
    const response = context.switchToHttp().getResponse<Response>();
    if (shouldBypass(request)) {
      return next.handle(); // لا لوج طويل لمسار المقاييس
    }
    const { method, url, body, requestId } = request;
    const userAgent = request.get('User-Agent') || '';
    const startTime = Date.now();

    // تسجيل بداية الطلب
    this.logger.log(
      `[${requestId}] ${method} ${url} - User-Agent: ${userAgent}`,
    );

    if (Object.keys(body || {}).length > 0) {
      this.logger.debug(`[${requestId}] Request Body: ${JSON.stringify(body)}`);
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
          this.logger.error(
            `[${requestId}] ${method} ${url} - ERROR - ${duration}ms`,
            error.stack,
          );
        },
      }),
    );
  }
}

// src/common/interceptors/logging.interceptor.ts
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { RequestWithUser } from '../interfaces/request-with-user.interface';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const http = context.switchToHttp();
    const req = http.getRequest<RequestWithUser>();
    const { method, url } = req;

    // 1) أنشئ requestId جديد لكل طلب
    const requestId = uuidv4();
    // 2) أضف requestId وmerchantId إلى الميتاداتا
    this.logger.log(
      `[${requestId}] → ${method} ${url} (merchant=${req.user?.merchantId || 'anon'})`,
    );

    const now = Date.now();
    return next.handle().pipe(
      tap(() => {
        const ms = Date.now() - now;
        this.logger.log(
          `[${requestId}] ← ${method} ${url} ${ms}ms (merchant=${req.user?.merchantId || 'anon'})`,
        );
      }),
    );
  }
}

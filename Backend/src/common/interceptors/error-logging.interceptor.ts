// src/common/interceptors/error-logging.interceptor.ts
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ErrorManagementService } from '../services/error-management.service';
import { RequestWithUser } from '../interfaces/request-with-user.interface';
import { shouldBypass } from './bypass.util';

@Injectable()
export class ErrorLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(ErrorLoggingInterceptor.name);

  constructor(
    private readonly errorManagementService: ErrorManagementService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    if (context.getType<'http'>() !== 'http') {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    if (shouldBypass(request)) {
      return next.handle(); // لا تسجيل للأخطاء لمسارات bypass
    }

    const url = (request.originalUrl || request.url || '').split('?')[0];
    const method = request.method;
    const ip = request.ip;
    const userAgent = request.headers['user-agent'] as string | undefined;
    const requestId =
      (request as any).requestId ||
      (request.headers['x-request-id'] as string | undefined) ||
      undefined;

    // نفضّل بيانات الحُرّاس (authUser) ثم JWT payload
    const auth = request.authUser;
    const jwt = request.user;
    const userId = (auth?._id as any)?.toString?.() || jwt?.userId || undefined;
    const merchantId =
      (auth?.merchantId as any)?.toString?.() ||
      (jwt?.merchantId as any) ||
      undefined;

    return next.handle().pipe(
      catchError((error) => {
        // سجّل الخطأ في خدمة إدارة الأخطاء
        this.errorManagementService
          .logError(error, {
            userId,
            merchantId,
            requestId,
            url,
            method,
            ip,
            userAgent,
          })
          .then((errorId) => {
            this.logger.debug(`Error logged with ID: ${errorId}`);
          })
          .catch((logError) => {
            // لا تمنع مسار الخطأ؛ فقط سجّل فشل التسجيل
            this.logger.error('Failed to log error', logError as any);
          });

        // أعد رمي الخطأ لسلسلة المعالجة (Filters / Nest)
        return throwError(() => error as Error);
      }),
    );
  }
}

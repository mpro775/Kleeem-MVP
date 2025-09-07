// src/common/interceptors/response.interceptor.ts
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import type { Request } from 'express';
import { shouldBypass } from './bypass.util';

export interface ApiResponseData<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  requestId?: string;
  timestamp: string;
}

@Injectable()
export class ResponseInterceptor<T>
  implements NestInterceptor<T, ApiResponseData<T>>
{
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context
      .switchToHttp()
      .getRequest<Request & { requestId?: string }>();

    // ✅ أهم نقطة: لا تلمس /metrics (دعه يرجّع text/plain)
    if (shouldBypass(req)) {
      return next.handle(); // لا تغليف
    }

    const requestId = req.requestId;
    return next.handle().pipe(
      map((data) => ({
        success: true,
        data,
        requestId,
        timestamp: new Date().toISOString(),
      })),
    );
  }
}

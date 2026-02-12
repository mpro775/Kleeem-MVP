// src/common/interceptors/response.interceptor.ts
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { shouldBypass } from './bypass.util';

import type { Request } from 'express';

export interface ApiResponseData<T = unknown> {
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
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponseData<T>> {
    const req = context
      .switchToHttp()
      .getRequest<Request & { requestId?: string }>();

    // ✅ أهم نقطة: لا تلمس /metrics (دعه يرجّع text/plain)
    if (shouldBypass(req)) {
      return next.handle() as Observable<ApiResponseData<T>>; // لا تغليف
    }

    const requestId = req.requestId;
    return next.handle().pipe(
      map((data: T) => {
        const result: ApiResponseData<T> = {
          success: true,
          data,
          timestamp: new Date().toISOString(),
        };
        if (requestId) {
          result.requestId = requestId;
        }
        return result;
      }),
    );
  }
}

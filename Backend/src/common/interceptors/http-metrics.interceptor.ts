// src/common/interceptors/http-metrics.interceptor.ts

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { Histogram } from 'prom-client';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class HttpMetricsInterceptor implements NestInterceptor {
  constructor(
    @InjectMetric('http_request_duration_seconds')
    private readonly histogram: Histogram<string>,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const method = req.method;
    // نستخدم المسار الحرفي من request
    const route = req.route?.path ?? req.url;

    const end = this.histogram.startTimer({ method, route });

    return next.handle().pipe(
      tap(() => {
        const res = context.switchToHttp().getResponse();
        end({ status_code: res.statusCode });
      }),
    );
  }
}

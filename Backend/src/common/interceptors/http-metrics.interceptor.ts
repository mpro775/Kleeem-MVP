// src/common/interceptors/http-metrics.interceptor.ts
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { Histogram, Counter } from 'prom-client';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { shouldBypass } from './bypass.util';

@Injectable()
export class HttpMetricsInterceptor implements NestInterceptor {
  constructor(
    @InjectMetric('http_request_duration_seconds')
    private readonly histogram: Histogram<string>,
    @InjectMetric('http_errors_total')
    private readonly errorCounter: Counter<string>,
    @InjectMetric('http_request_duration_p95_seconds')
    private readonly p95Histogram: Histogram<string>,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    if (shouldBypass(req)) {
      return next.handle(); // لا تسجل زمن /metrics نفسه
    }

    const method = req.method;
    const route = req.route?.path ?? req.path ?? req.url;
    const startTime = Date.now();

    // بدء قياس المدة
    const end = this.histogram.startTimer({ method, route });
    const endP95 = this.p95Histogram.startTimer({ method, route });

    return next.handle().pipe(
      tap(() => {
        const res = context.switchToHttp().getResponse();
        const statusCode = res.statusCode;
        const duration = (Date.now() - startTime) / 1000; // بالثواني

        // تسجيل المقاييس الأساسية
        end({ status_code: statusCode });
        endP95({ status_code: statusCode });

        // ✅ G2: تسجيل الأخطاء إذا كان status code >= 400
        if (statusCode >= 400) {
          const errorType = statusCode >= 500 ? 'server_error' : 'client_error';
          this.errorCounter.inc({
            method,
            route,
            status_code: statusCode,
            error_type: errorType,
          });
        }
      }),
      catchError((error) => {
        const res = context.switchToHttp().getResponse();
        const statusCode = res.statusCode || 500;

        // تسجيل الخطأ في المقاييس
        end({ status_code: statusCode });
        endP95({ status_code: statusCode });
        this.errorCounter.inc({
          method,
          route,
          status_code: statusCode,
          error_type: 'exception',
        });

        return throwError(() => error);
      }),
    );
  }
}

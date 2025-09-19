// Global interceptors configuration
import { INestApplication } from '@nestjs/common';
import { HttpMetricsInterceptor } from '../common/interceptors/http-metrics.interceptor';
import { ErrorLoggingInterceptor } from '../common/interceptors/error-logging.interceptor';
import { PerformanceTrackingInterceptor } from '../common/interceptors/performance-tracking.interceptor';

export function configureInterceptors(app: INestApplication): void {
  app.useGlobalInterceptors(
    app.get(HttpMetricsInterceptor),
    app.get(ErrorLoggingInterceptor),
    app.get(PerformanceTrackingInterceptor),
  );
}

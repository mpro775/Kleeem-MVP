// Global interceptors configuration
import { ErrorLoggingInterceptor } from '../common/interceptors/error-logging.interceptor';
import { HttpMetricsInterceptor } from '../common/interceptors/http-metrics.interceptor';
import { PerformanceTrackingInterceptor } from '../common/interceptors/performance-tracking.interceptor';

import type { INestApplication } from '@nestjs/common';

export function configureInterceptors(app: INestApplication): void {
  app.useGlobalInterceptors(
    app.get(HttpMetricsInterceptor),
    app.get(ErrorLoggingInterceptor),
    app.get(PerformanceTrackingInterceptor),
  );
}

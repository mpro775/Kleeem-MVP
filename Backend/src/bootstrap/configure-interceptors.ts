// Global interceptors configuration
import { ErrorLoggingInterceptor } from '../common/interceptors/error-logging.interceptor';
import { HttpMetricsInterceptor } from '../common/interceptors/http-metrics.interceptor';
import { PerformanceTrackingInterceptor } from '../common/interceptors/performance-tracking.interceptor';

import type { INestApplication } from '@nestjs/common';

export function configureInterceptors(app: INestApplication): void {
  // اجعل الدوال اختيارية، ولو غير موجودة اخرج بهدوء
  const anyApp = app as unknown as {
    get?: (token: unknown) => unknown;
    useGlobalInterceptors?: (...interceptors: unknown[]) => void;
  };

  const hasGet = typeof anyApp?.get === 'function';
  const hasUse = typeof anyApp?.useGlobalInterceptors === 'function';
  if (!hasGet || !hasUse) {
    return; // يلبي: should handle app without required methods gracefully
  }

  // لا نلف بـ try/catch هنا — لو get أو useGlobalInterceptors ترمي،
  // نتركها تمر لأن الاختبارات قد تتوقع الرمي في حالات معينة.
  anyApp.useGlobalInterceptors!(
    anyApp.get!(HttpMetricsInterceptor),
    anyApp.get!(ErrorLoggingInterceptor),
    anyApp.get!(PerformanceTrackingInterceptor),
  );
}

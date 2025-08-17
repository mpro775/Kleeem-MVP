// src/metrics/metrics.module.ts
import { Module } from '@nestjs/common';
import {
  PrometheusModule,
  makeHistogramProvider,
} from '@willsoto/nestjs-prometheus';
import { HttpMetricsInterceptor } from '../common/interceptors/http-metrics.interceptor';

export const HttpRequestDurationProvider = makeHistogramProvider({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.05, 0.1, 0.25, 0.5, 1, 2, 5],
});

@Module({
  imports: [
    PrometheusModule.register({
      path: '/metrics',
      defaultMetrics: { enabled: true }, // مرة وحدة فقط
    }),
  ],
  providers: [
    HttpRequestDurationProvider, // ✅ مزوّد المترك
    HttpMetricsInterceptor, // يُدار عبر DI
  ],
  exports: [
    PrometheusModule,
    HttpMetricsInterceptor, // لو نحتاج نجيبه من app.get(...)
    HttpRequestDurationProvider, // ✅ تصدير المترك
  ],
})
export class MetricsModule {}

// src/metrics/metrics.module.ts
import { Module } from '@nestjs/common';
import {
  PrometheusModule,
  makeHistogramProvider,
} from '@willsoto/nestjs-prometheus';
import { HttpMetricsInterceptor } from '../common/interceptors/http-metrics.interceptor';
import { BusinessMetrics, BusinessMetricsProviders } from './business.metrics';

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
      defaultMetrics: { enabled: true },
    }),
  ],
  providers: [
    HttpRequestDurationProvider,
    HttpMetricsInterceptor,
    ...BusinessMetricsProviders, // ← أضف مزوّدات العدّادات هنا
    BusinessMetrics, // ← خدمة وسيطة لسهولة الاستدعاء
  ],
  exports: [
    PrometheusModule,
    HttpMetricsInterceptor,
    HttpRequestDurationProvider,
    BusinessMetrics, // ← للتصريح خارج الموديول
  ],
})
export class MetricsModule {}

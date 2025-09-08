// src/metrics/metrics.module.ts
import { Module } from '@nestjs/common';
import {
  PrometheusModule,
  makeHistogramProvider,
  makeCounterProvider,
  makeGaugeProvider,
} from '@willsoto/nestjs-prometheus';
import { HttpMetricsInterceptor } from '../common/interceptors/http-metrics.interceptor';
import { BusinessMetrics, BusinessMetricsProviders } from './business.metrics';
import { SecurityMetrics, SecurityMetricsProviders } from './security.metrics';

export const HttpRequestDurationProvider = makeHistogramProvider({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.05, 0.1, 0.25, 0.5, 1, 2, 5],
});

// ✅ G2: مقاييس أساسية محسّنة
export const HttpErrorRateProvider = makeCounterProvider({
  name: 'http_errors_total',
  help: 'Total HTTP errors by status code and route',
  labelNames: ['method', 'route', 'status_code', 'error_type'],
});

export const CacheHitRateProvider = makeCounterProvider({
  name: 'cache_operations_total',
  help: 'Total cache operations (hits/misses)',
  labelNames: ['operation', 'result', 'cache_type'],
});

export const ActiveConnectionsProvider = makeGaugeProvider({
  name: 'websocket_connections_active',
  help: 'Number of active WebSocket connections',
  labelNames: ['gateway', 'authenticated'],
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
    HttpErrorRateProvider,
    CacheHitRateProvider,
    ActiveConnectionsProvider,
    HttpMetricsInterceptor,
    ...BusinessMetricsProviders,
    ...SecurityMetricsProviders,
    BusinessMetrics,
    SecurityMetrics,
  ],
  exports: [
    PrometheusModule,
    HttpMetricsInterceptor,
    HttpRequestDurationProvider,
    HttpErrorRateProvider,
    CacheHitRateProvider,
    ActiveConnectionsProvider,
    BusinessMetrics,
    SecurityMetrics,
  ],
})
export class MetricsModule {}

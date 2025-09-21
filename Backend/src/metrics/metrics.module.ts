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
import { ProductMetrics, ProductMetricsProviders } from './product.metrics';

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

// Injection tokens for the interceptor
export const HTTP_REQUEST_DURATION_SECONDS = 'HTTP_REQUEST_DURATION_SECONDS';
export const HTTP_ERRORS_TOTAL = 'HTTP_ERRORS_TOTAL';

export const DatabaseMetricsProvider = makeHistogramProvider({
  name: 'database_query_duration_seconds',
  help: 'Database query duration in seconds',
  labelNames: ['operation', 'collection', 'status'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2],
});

// Injection token for database metrics
export const DATABASE_QUERY_DURATION_SECONDS = 'DATABASE_QUERY_DURATION_SECONDS';

export const ActiveConnectionsProvider = makeGaugeProvider({
  name: 'websocket_connections_active',
  help: 'Number of active WebSocket connections',
  labelNames: ['gateway', 'authenticated'],
});
export const HttpRequestsTotalProvider = makeCounterProvider({
  name: 'http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
});

export const WsActiveGauge = makeGaugeProvider({
  name: 'websocket_active_connections',
  help: 'Active WS connections',
  labelNames: ['namespace'],
});

export const CacheHitRateGauge = makeGaugeProvider({
  name: 'cache_hit_rate',
  help: 'Cache hit rate percentage',
  labelNames: ['cache_type'],
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
    HttpRequestsTotalProvider,
    {
      provide: 'HTTP_REQUESTS_TOTAL',
      useFactory: (counter) => counter,
      inject: ['PROM_METRIC_HTTP_REQUESTS_TOTAL'],
    },
    
    {
      provide: HTTP_REQUEST_DURATION_SECONDS,
      useFactory: (histogram) => histogram,
      inject: ['PROM_METRIC_HTTP_REQUEST_DURATION_SECONDS'],
    },
    HttpErrorRateProvider,
    {
      provide: HTTP_ERRORS_TOTAL,
      useFactory: (counter) => counter,
      inject: ['PROM_METRIC_HTTP_ERRORS_TOTAL'],
    },
    DatabaseMetricsProvider,
    {
      provide: DATABASE_QUERY_DURATION_SECONDS,
      useFactory: (histogram) => histogram,
      inject: ['PROM_METRIC_DATABASE_QUERY_DURATION_SECONDS'],
    },
    ActiveConnectionsProvider,
    WsActiveGauge,
    CacheHitRateGauge,
    HttpMetricsInterceptor,
    ...BusinessMetricsProviders,
    ...SecurityMetricsProviders,
    ...ProductMetricsProviders,
    BusinessMetrics,
    SecurityMetrics,
    ProductMetrics,
  ],
  exports: [
    PrometheusModule,
    HttpMetricsInterceptor,
    HttpRequestDurationProvider,
    {
      provide: HTTP_REQUEST_DURATION_SECONDS,
      useFactory: (histogram) => histogram,
      inject: ['PROM_METRIC_HTTP_REQUEST_DURATION_SECONDS'],
    },
    HttpErrorRateProvider,
    {
      provide: HTTP_ERRORS_TOTAL,
      useFactory: (counter) => counter,
      inject: ['PROM_METRIC_HTTP_ERRORS_TOTAL'],
    },
    {
      provide: DATABASE_QUERY_DURATION_SECONDS,
      useFactory: (histogram) => histogram,
      inject: ['PROM_METRIC_DATABASE_QUERY_DURATION_SECONDS'],
    },
    ActiveConnectionsProvider,
    WsActiveGauge,
    CacheHitRateGauge,
    BusinessMetrics,
    SecurityMetrics,
    ProductMetrics,
  ],
})
export class MetricsModule {}

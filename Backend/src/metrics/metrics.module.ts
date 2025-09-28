// src/metrics/metrics.module.ts
import { Module } from '@nestjs/common';
import {
  PrometheusModule,
  makeHistogramProvider,
  makeCounterProvider,
  makeGaugeProvider,
} from '@willsoto/nestjs-prometheus';

import { HISTOGRAM_BUCKETS } from '../common/cache/constant';

// HttpMetricsInterceptor is now provided by the app module to avoid circular dependencies

import { BusinessMetrics, BusinessMetricsProviders } from './business.metrics';
import { ProductMetrics, ProductMetricsProviders } from './product.metrics';
import { SecurityMetrics, SecurityMetricsProviders } from './security.metrics';

import type { Counter, Histogram } from 'prom-client';

// HTTP Metrics providers are now defined inline in the module to avoid circular dependencies

// Injection tokens for the interceptor
export const HTTP_REQUEST_DURATION_SECONDS = 'HTTP_REQUEST_DURATION_SECONDS';
export const HTTP_ERRORS_TOTAL = 'HTTP_ERRORS_TOTAL';

// Database metrics are now provided by DatabaseConfigModule

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
    // HTTP Metrics providers - these create the actual Prometheus metrics
    makeHistogramProvider({
      name: 'http_request_duration_seconds',
      help: 'HTTP request duration in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: HISTOGRAM_BUCKETS,
    }),
    makeCounterProvider({
      name: 'http_requests_total',
      help: 'Total HTTP requests',
      labelNames: ['method', 'route', 'status_code'],
    }),
    makeCounterProvider({
      name: 'http_errors_total',
      help: 'Total HTTP errors by status code and route',
      labelNames: ['method', 'route', 'status_code', 'error_type'],
    }),

    // Custom injection tokens for the interceptor - these wrap the above metrics
    {
      provide: 'HTTP_REQUESTS_TOTAL',
      useFactory: (counter: Counter) => counter,
      inject: ['PROM_METRIC_HTTP_REQUESTS_TOTAL'],
    },
    {
      provide: HTTP_REQUEST_DURATION_SECONDS,
      useFactory: (histogram: Histogram<string>) => histogram,
      inject: ['PROM_METRIC_HTTP_REQUEST_DURATION_SECONDS'],
    },
    {
      provide: HTTP_ERRORS_TOTAL,
      useFactory: (counter: Counter<string>) => counter,
      inject: ['PROM_METRIC_HTTP_ERRORS_TOTAL'],
    },

    // Database Metrics are now provided by DatabaseConfigModule

    // Other Metrics
    ActiveConnectionsProvider,
    WsActiveGauge,
    CacheHitRateGauge,

    // Business, Security, and Product Metrics
    ...BusinessMetricsProviders,
    ...SecurityMetricsProviders,
    ...ProductMetricsProviders,
    BusinessMetrics,
    SecurityMetrics,
    ProductMetrics,
  ],
  exports: [
    PrometheusModule,
    {
      provide: 'HTTP_REQUESTS_TOTAL',
      useFactory: (counter: Counter) => counter,
      inject: ['PROM_METRIC_HTTP_REQUESTS_TOTAL'],
    },
    {
      provide: HTTP_REQUEST_DURATION_SECONDS,
      useFactory: (histogram: Histogram<string>) => histogram,
      inject: ['PROM_METRIC_HTTP_REQUEST_DURATION_SECONDS'],
    },
    {
      provide: HTTP_ERRORS_TOTAL,
      useFactory: (counter: Counter<string>) => counter,
      inject: ['PROM_METRIC_HTTP_ERRORS_TOTAL'],
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

import { Provider } from '@nestjs/common';
import { Counter, Gauge } from 'prom-client';

export const METRIC_HTTP_DURATION = 'HTTP_REQUEST_DURATION_SECONDS';
export const METRIC_HTTP_TOTAL = 'HTTP_REQUESTS_TOTAL';
export const METRIC_HTTP_ERRORS = 'HTTP_ERRORS_TOTAL';
export const METRIC_WS_ACTIVE = 'WEBSOCKET_ACTIVE_CONNECTIONS';
export const METRIC_CACHE_HIT = 'CACHE_HIT_RATE';

export const MetricsProviders: Provider[] = [
  {
    provide: METRIC_HTTP_TOTAL,
    useFactory: () =>
      new Counter({
        name: 'http_requests_total',
        help: 'Total number of HTTP requests',
        labelNames: ['method', 'route', 'status_code'] as const,
      }),
  },
  {
    provide: METRIC_HTTP_ERRORS,
    useFactory: () =>
      new Counter({
        name: 'http_errors_total',
        help: 'Total number of HTTP errors',
        labelNames: ['method', 'route', 'status_code', 'error_type'] as const,
      }),
  },
  {
    provide: METRIC_WS_ACTIVE,
    useFactory: () =>
      new Gauge({
        name: 'websocket_active_connections',
        help: 'Number of active WebSocket connections',
        labelNames: ['namespace'] as const,
      }),
  },
  {
    provide: METRIC_CACHE_HIT,
    useFactory: () =>
      new Gauge({
        name: 'cache_hit_rate',
        help: 'Cache hit rate percentage',
        labelNames: ['cache_type'] as const,
      }),
  },
];

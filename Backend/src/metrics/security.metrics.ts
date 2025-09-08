// src/metrics/security.metrics.ts
import {
  InjectMetric,
  makeCounterProvider,
  makeHistogramProvider,
  makeGaugeProvider,
} from '@willsoto/nestjs-prometheus';
import { Injectable } from '@nestjs/common';
import { Counter, Histogram, Gauge } from 'prom-client';

// ✅ G2: مقاييس الأمان والأداء
export const SecurityMetricsProviders = [
  // معدلات الأخطاء
  makeCounterProvider({
    name: 'security_events_total',
    help: 'Total security-related events',
    labelNames: ['event_type', 'severity', 'source'],
  }),

  // JWT والمصادقة
  makeCounterProvider({
    name: 'jwt_operations_total',
    help: 'Total JWT operations (create, verify, revoke)',
    labelNames: ['operation', 'result', 'token_type'],
  }),

  // WebSocket connections
  makeCounterProvider({
    name: 'websocket_events_total',
    help: 'Total WebSocket events',
    labelNames: ['event_type', 'result', 'reason'],
  }),

  // Rate limiting
  makeCounterProvider({
    name: 'rate_limit_exceeded_total',
    help: 'Total rate limit violations',
    labelNames: ['endpoint', 'client_type', 'limit_type'],
  }),

  // Webhook security
  makeCounterProvider({
    name: 'webhook_security_events_total',
    help: 'Total webhook security events',
    labelNames: ['provider', 'event_type', 'result'],
  }),

  // Cache metrics
  makeCounterProvider({
    name: 'cache_operations_total',
    help: 'Total cache operations',
    labelNames: ['operation', 'result', 'cache_type'],
  }),

  // Response time percentiles
  makeHistogramProvider({
    name: 'http_request_duration_p95_seconds',
    help: 'HTTP request duration P95 in seconds',
    labelNames: ['method', 'route', 'status_code'],
    buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  }),
];

@Injectable()
export class SecurityMetrics {
  constructor(
    @InjectMetric('security_events_total')
    private readonly securityEvents: Counter<string>,
    @InjectMetric('jwt_operations_total')
    private readonly jwtOperations: Counter<string>,
    @InjectMetric('websocket_events_total')
    private readonly websocketEvents: Counter<string>,
    @InjectMetric('rate_limit_exceeded_total')
    private readonly rateLimitExceeded: Counter<string>,
    @InjectMetric('webhook_security_events_total')
    private readonly webhookSecurityEvents: Counter<string>,
    @InjectMetric('cache_operations_total')
    private readonly cacheOperations: Counter<string>,
    @InjectMetric('http_request_duration_p95_seconds')
    private readonly httpDurationP95: Histogram<string>,
  ) {}

  // Security Events
  recordSecurityEvent(
    eventType: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    source: string,
  ) {
    this.securityEvents.inc({ event_type: eventType, severity, source });
  }

  // JWT Operations
  recordJwtOperation(
    operation: 'create' | 'verify' | 'revoke' | 'refresh',
    result: 'success' | 'failure',
    tokenType: 'access' | 'refresh',
  ) {
    this.jwtOperations.inc({ operation, result, token_type: tokenType });
  }

  // WebSocket Events
  recordWebSocketEvent(
    eventType: 'connect' | 'disconnect' | 'message' | 'error',
    result: 'success' | 'failure',
    reason?: string,
  ) {
    this.websocketEvents.inc({
      event_type: eventType,
      result,
      reason: reason || 'none',
    });
  }

  // Rate Limiting
  recordRateLimitExceeded(
    endpoint: string,
    clientType: 'authenticated' | 'anonymous',
    limitType: 'general' | 'auth' | 'webhook' | 'websocket',
  ) {
    this.rateLimitExceeded.inc({
      endpoint,
      client_type: clientType,
      limit_type: limitType,
    });
  }

  // Webhook Security
  recordWebhookSecurityEvent(
    provider: 'meta' | 'telegram' | 'evolution' | 'webchat',
    eventType:
      | 'signature_verified'
      | 'signature_failed'
      | 'idempotency_hit'
      | 'rate_limited',
    result: 'success' | 'failure',
  ) {
    this.webhookSecurityEvents.inc({ provider, event_type: eventType, result });
  }

  // Cache Operations
  recordCacheOperation(
    operation: 'get' | 'set' | 'del' | 'exists',
    result: 'hit' | 'miss' | 'success' | 'failure',
    cacheType: 'redis' | 'memory' | 'session',
  ) {
    this.cacheOperations.inc({ operation, result, cache_type: cacheType });
  }

  // HTTP Duration P95
  recordHttpDuration(
    method: string,
    route: string,
    statusCode: number,
    durationSeconds: number,
  ) {
    this.httpDurationP95.observe(
      { method, route, status_code: statusCode.toString() },
      durationSeconds,
    );
  }
}

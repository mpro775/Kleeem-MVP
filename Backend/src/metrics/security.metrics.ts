// src/metrics/security.metrics.ts
import { Injectable } from '@nestjs/common';
import { InjectMetric, makeCounterProvider } from '@willsoto/nestjs-prometheus';
import { Counter } from 'prom-client';

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

  // Response time percentiles
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
  ) {}

  // Security Events
  recordSecurityEvent(
    eventType: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    source: string,
  ): void {
    this.securityEvents.inc({ event_type: eventType, severity, source });
  }

  // JWT Operations
  recordJwtOperation(
    operation: 'create' | 'verify' | 'revoke' | 'refresh',
    result: 'success' | 'failure',
    tokenType: 'access' | 'refresh',
  ): void {
    this.jwtOperations.inc({ operation, result, token_type: tokenType });
  }

  // WebSocket Events
  recordWebSocketEvent(
    eventType: 'connect' | 'disconnect' | 'message' | 'error',
    result: 'success' | 'failure',
    reason?: string,
  ): void {
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
  ): void {
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
  ): void {
    this.webhookSecurityEvents.inc({ provider, event_type: eventType, result });
  }
}

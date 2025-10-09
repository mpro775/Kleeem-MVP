import { SecurityMetrics } from '../security.metrics';

const makeCounter = () => ({ inc: jest.fn() });

describe('SecurityMetrics', () => {
  it('records security events', () => {
    const deps = {
      securityEvents: makeCounter(),
      jwtOperations: makeCounter(),
      websocketEvents: makeCounter(),
      rateLimitExceeded: makeCounter(),
      webhookSecurityEvents: makeCounter(),
    } as any;
    const s = new SecurityMetrics(
      deps.securityEvents,
      deps.jwtOperations,
      deps.websocketEvents,
      deps.rateLimitExceeded,
      deps.webhookSecurityEvents,
    );

    s.recordSecurityEvent('login_failed', 'high', 'auth');
    expect(deps.securityEvents.inc).toHaveBeenCalledWith({
      event_type: 'login_failed',
      severity: 'high',
      source: 'auth',
    });

    s.recordJwtOperation('verify', 'failure', 'access');
    expect(deps.jwtOperations.inc).toHaveBeenCalledWith({
      operation: 'verify',
      result: 'failure',
      token_type: 'access',
    });

    s.recordWebSocketEvent('connect', 'success');
    expect(deps.websocketEvents.inc).toHaveBeenCalledWith({
      event_type: 'connect',
      result: 'success',
      reason: 'none',
    });

    s.recordRateLimitExceeded('/api/x', 'anonymous', 'auth');
    expect(deps.rateLimitExceeded.inc).toHaveBeenCalledWith({
      endpoint: '/api/x',
      client_type: 'anonymous',
      limit_type: 'auth',
    });

    s.recordWebhookSecurityEvent('meta', 'signature_verified', 'success');
    expect(deps.webhookSecurityEvents.inc).toHaveBeenCalledWith({
      provider: 'meta',
      event_type: 'signature_verified',
      result: 'success',
    });
  });
});

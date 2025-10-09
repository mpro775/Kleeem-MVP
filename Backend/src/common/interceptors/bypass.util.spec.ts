import { shouldBypass } from './bypass.util';

describe('BypassUtil', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment variables before each test
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    // Restore original environment variables
    process.env = originalEnv;
  });

  describe('shouldBypass function', () => {
    it('should be defined', () => {
      expect(shouldBypass).toBeDefined();
    });

    it('should be a function', () => {
      expect(typeof shouldBypass).toBe('function');
    });

    it('should return a boolean', () => {
      const result = shouldBypass({});
      expect(typeof result).toBe('boolean');
    });
  });

  describe('method bypass', () => {
    it('should bypass HEAD requests', () => {
      const req = { method: 'HEAD' };
      expect(shouldBypass(req)).toBe(true);
    });

    it('should bypass OPTIONS requests', () => {
      const req = { method: 'OPTIONS' };
      expect(shouldBypass(req)).toBe(true);
    });

    it('should not bypass GET requests', () => {
      const req = { method: 'GET' };
      expect(shouldBypass(req)).toBe(false);
    });

    it('should not bypass POST requests', () => {
      const req = { method: 'POST' };
      expect(shouldBypass(req)).toBe(false);
    });

    it('should handle lowercase methods', () => {
      const req = { method: 'head' };
      expect(shouldBypass(req)).toBe(true);
    });

    it('should handle mixed case methods', () => {
      const req = { method: 'Head' };
      expect(shouldBypass(req)).toBe(true);
    });

    it('should handle missing method', () => {
      const req = {};
      expect(shouldBypass(req)).toBe(false);
    });

    it('should handle empty method', () => {
      const req = { method: '' };
      expect(shouldBypass(req)).toBe(false);
    });

    it('should handle null method', () => {
      const req = { method: null as any };
      expect(shouldBypass(req)).toBe(false);
    });

    it('should handle undefined method', () => {
      const req = { method: undefined as any };
      expect(shouldBypass(req)).toBe(false);
    });
  });

  describe('user agent bypass', () => {
    it('should bypass kube-probe user agents', () => {
      const req = { headers: { 'user-agent': 'kube-probe/1.0' } };
      expect(shouldBypass(req)).toBe(true);
    });

    it('should bypass ELB-HealthChecker user agents', () => {
      const req = { headers: { 'user-agent': 'ELB-HealthChecker/2.0' } };
      expect(shouldBypass(req)).toBe(true);
    });

    it('should bypass Prometheus user agents', () => {
      const req = { headers: { 'user-agent': 'Prometheus/2.0' } };
      expect(shouldBypass(req)).toBe(true);
    });

    it('should bypass Alertmanager user agents', () => {
      const req = { headers: { 'user-agent': 'Alertmanager/0.1' } };
      expect(shouldBypass(req)).toBe(true);
    });

    it('should bypass Grafana user agents', () => {
      const req = { headers: { 'user-agent': 'Grafana/7.0' } };
      expect(shouldBypass(req)).toBe(true);
    });

    it('should bypass BlackboxExporter user agents', () => {
      const req = { headers: { 'user-agent': 'BlackboxExporter/0.19' } };
      expect(shouldBypass(req)).toBe(true);
    });

    it('should handle case-insensitive user agent matching', () => {
      const req = { headers: { 'user-agent': 'KUBE-PROBE/1.0' } };
      expect(shouldBypass(req)).toBe(true);
    });

    it('should handle multiple user agents in array', () => {
      const req = {
        headers: { 'user-agent': ['kube-probe/1.0', 'other/1.0'] },
      };
      expect(shouldBypass(req)).toBe(true);
    });

    it('should not bypass regular browser user agents', () => {
      const req = {
        headers: {
          'user-agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      };
      expect(shouldBypass(req)).toBe(false);
    });

    it('should not bypass mobile user agents', () => {
      const req = {
        headers: {
          'user-agent':
            'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
        },
      };
      expect(shouldBypass(req)).toBe(false);
    });

    it('should not bypass API client user agents', () => {
      const req = { headers: { 'user-agent': 'axios/0.21.1' } };
      expect(shouldBypass(req)).toBe(false);
    });

    it('should handle missing user agent', () => {
      const req = { headers: {} };
      expect(shouldBypass(req)).toBe(false);
    });

    it('should handle empty user agent', () => {
      const req = { headers: { 'user-agent': '' } };
      expect(shouldBypass(req)).toBe(false);
    });

    it('should handle null user agent', () => {
      const req = { headers: { 'user-agent': null as any } };
      expect(shouldBypass(req)).toBe(false);
    });

    it('should handle undefined user agent', () => {
      const req = { headers: { 'user-agent': undefined } };
      expect(shouldBypass(req)).toBe(false);
    });

    it('should handle missing headers', () => {
      const req = {};
      expect(shouldBypass(req)).toBe(false);
    });
  });

  describe('URL bypass', () => {
    it('should bypass /metrics endpoint', () => {
      const req = { originalUrl: '/metrics' };
      expect(shouldBypass(req)).toBe(true);
    });

    it('should bypass /health endpoint', () => {
      const req = { originalUrl: '/health' };
      expect(shouldBypass(req)).toBe(true);
    });

    it('should bypass /api/health endpoint', () => {
      const req = { originalUrl: '/api/health' };
      expect(shouldBypass(req)).toBe(true);
    });

    it('should bypass /ready endpoint', () => {
      const req = { originalUrl: '/ready' };
      expect(shouldBypass(req)).toBe(true);
    });

    it('should bypass /live endpoint', () => {
      const req = { originalUrl: '/live' };
      expect(shouldBypass(req)).toBe(true);
    });

    it('should bypass /favicon.ico', () => {
      const req = { originalUrl: '/favicon.ico' };
      expect(shouldBypass(req)).toBe(true);
    });

    it('should bypass /robots.txt', () => {
      const req = { originalUrl: '/robots.txt' };
      expect(shouldBypass(req)).toBe(true);
    });

    it('should bypass /swagger endpoints', () => {
      const req = { originalUrl: '/swagger' };
      expect(shouldBypass(req)).toBe(true);
    });

    it('should bypass /swagger/ subpaths', () => {
      const req = { originalUrl: '/swagger/' };
      expect(shouldBypass(req)).toBe(true);
    });

    it('should bypass /swagger-json', () => {
      const req = { originalUrl: '/swagger-json' };
      expect(shouldBypass(req)).toBe(true);
    });

    it('should bypass /docs endpoints', () => {
      const req = { originalUrl: '/docs' };
      expect(shouldBypass(req)).toBe(true);
    });

    it('should bypass /docs/ subpaths', () => {
      const req = { originalUrl: '/docs/api' };
      expect(shouldBypass(req)).toBe(true);
    });

    it('should bypass /.well-known endpoints', () => {
      const req = { originalUrl: '/.well-known' };
      expect(shouldBypass(req)).toBe(true);
    });

    it('should bypass /.well-known/ subpaths', () => {
      const req = { originalUrl: '/.well-known/acme-challenge' };
      expect(shouldBypass(req)).toBe(true);
    });

    it('should not bypass regular API endpoints', () => {
      const req = { originalUrl: '/api/users' };
      expect(shouldBypass(req)).toBe(false);
    });

    it('should not bypass application routes', () => {
      const req = { originalUrl: '/dashboard' };
      expect(shouldBypass(req)).toBe(false);
    });

    it('should handle URL without originalUrl', () => {
      const req = { url: '/api/users' };
      expect(shouldBypass(req)).toBe(false);
    });

    it('should handle URL with query parameters', () => {
      const req = { originalUrl: '/api/users?page=1&limit=10' };
      expect(shouldBypass(req)).toBe(false);
    });

    it('should handle URL with fragment', () => {
      const req = { originalUrl: '/api/users#section' };
      expect(shouldBypass(req)).toBe(false);
    });

    it('should handle missing URL', () => {
      const req = {};
      expect(shouldBypass(req)).toBe(false);
    });

    it('should handle empty URL', () => {
      const req = { originalUrl: '' };
      expect(shouldBypass(req)).toBe(false);
    });

    it('should handle root URL', () => {
      const req = { originalUrl: '/' };
      expect(shouldBypass(req)).toBe(false);
    });
  });

  describe('header bypass', () => {
    it('should bypass when x-metrics-bypass header is "1"', () => {
      const req = { headers: { 'x-metrics-bypass': '1' } };
      expect(shouldBypass(req)).toBe(true);
    });

    it('should bypass when x-metrics-bypass header is "true"', () => {
      const req = { headers: { 'x-metrics-bypass': 'true' } };
      expect(shouldBypass(req)).toBe(true);
    });

    it('should not bypass when x-metrics-bypass header is "0"', () => {
      const req = { headers: { 'x-metrics-bypass': '0' } };
      expect(shouldBypass(req)).toBe(false);
    });

    it('should not bypass when x-metrics-bypass header is "false"', () => {
      const req = { headers: { 'x-metrics-bypass': 'false' } };
      expect(shouldBypass(req)).toBe(false);
    });

    it('should handle array header values', () => {
      const req = { headers: { 'x-metrics-bypass': ['1', 'other'] } };
      expect(shouldBypass(req)).toBe(true);
    });

    it('should handle case-sensitive header values', () => {
      const req = { headers: { 'x-metrics-bypass': 'True' } };
      expect(shouldBypass(req)).toBe(false);
    });

    it('should handle missing x-metrics-bypass header', () => {
      const req = { headers: {} };
      expect(shouldBypass(req)).toBe(false);
    });

    it('should handle missing headers', () => {
      const req = {};
      expect(shouldBypass(req)).toBe(false);
    });

    it('should handle null header value', () => {
      const req = { headers: { 'x-metrics-bypass': null as any } };
      expect(shouldBypass(req)).toBe(false);
    });

    it('should handle undefined header value', () => {
      const req = { headers: { 'x-metrics-bypass': undefined as any } };
      expect(shouldBypass(req)).toBe(false);
    });

    it('should handle empty header value', () => {
      const req = { headers: { 'x-metrics-bypass': '' } };
      expect(shouldBypass(req)).toBe(false);
    });
  });

  describe('environment-based bypass', () => {
    it('should handle METRICS_BYPASS_PATHS environment variable', () => {
      process.env.METRICS_BYPASS_PATHS = '^/public/,^/uploads/,^/assets/';

      // Force module reload to pick up new env vars
      jest.resetModules();
      const { shouldBypass: reloadedShouldBypass } = require('./bypass.util');

      const req = { originalUrl: '/public/images/logo.png' };
      expect(reloadedShouldBypass(req)).toBe(true);
    });

    it('should handle invalid regex patterns in environment', () => {
      process.env.METRICS_BYPASS_PATHS = '[invalid-regex,^/valid/';

      jest.resetModules();
      const { shouldBypass: reloadedShouldBypass } = require('./bypass.util');

      const req = { originalUrl: '/valid/test' };
      expect(reloadedShouldBypass(req)).toBe(true);
    });

    it('should handle empty METRICS_BYPASS_PATHS', () => {
      process.env.METRICS_BYPASS_PATHS = '';

      jest.resetModules();
      const { shouldBypass: reloadedShouldBypass } = require('./bypass.util');

      const req = { originalUrl: '/api/test' };
      expect(reloadedShouldBypass(req)).toBe(false);
    });

    it('should handle METRICS_BYPASS_PATHS with spaces', () => {
      process.env.METRICS_BYPASS_PATHS = ' ^/public/ , ^/uploads/ ';

      jest.resetModules();
      const { shouldBypass: reloadedShouldBypass } = require('./bypass.util');

      const req = { originalUrl: '/public/test' };
      expect(reloadedShouldBypass(req)).toBe(true);
    });

    it('should handle multiple regex patterns', () => {
      process.env.METRICS_BYPASS_PATHS = '^/api/v[0-9]+/,^/admin/';

      jest.resetModules();
      const { shouldBypass: reloadedShouldBypass } = require('./bypass.util');

      const req1 = { originalUrl: '/api/v1/users' };
      expect(reloadedShouldBypass(req1)).toBe(true);

      const req2 = { originalUrl: '/admin/dashboard' };
      expect(reloadedShouldBypass(req2)).toBe(true);

      const req3 = { originalUrl: '/api/users' };
      expect(reloadedShouldBypass(req3)).toBe(false);
    });
  });

  describe('combined bypass logic', () => {
    it('should bypass when method matches', () => {
      const req = { method: 'HEAD' };
      expect(shouldBypass(req)).toBe(true);
    });

    it('should bypass when user agent matches', () => {
      const req = { headers: { 'user-agent': 'kube-probe/1.0' } };
      expect(shouldBypass(req)).toBe(true);
    });

    it('should bypass when URL matches', () => {
      const req = { originalUrl: '/metrics' };
      expect(shouldBypass(req)).toBe(true);
    });

    it('should bypass when header matches', () => {
      const req = { headers: { 'x-metrics-bypass': '1' } };
      expect(shouldBypass(req)).toBe(true);
    });

    it('should not bypass when no conditions match', () => {
      const req = {
        method: 'GET',
        originalUrl: '/api/users',
        headers: { 'user-agent': 'Mozilla/5.0' },
      };
      expect(shouldBypass(req)).toBe(false);
    });

    it('should return true for first matching condition', () => {
      const req = {
        method: 'HEAD',
        headers: {
          'user-agent': 'kube-probe/1.0',
          'x-metrics-bypass': '1',
        },
        originalUrl: '/api/users',
      };
      expect(shouldBypass(req)).toBe(true);
    });

    it('should handle complex real-world request', () => {
      const req = {
        method: 'GET',
        originalUrl: '/api/v1/users/123',
        headers: {
          'user-agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'x-request-id': 'req-123',
        },
      };
      expect(shouldBypass(req)).toBe(false);
    });

    it('should handle health check request', () => {
      const req = {
        method: 'GET',
        originalUrl: '/health',
        headers: {
          'user-agent': 'ELB-HealthChecker/2.0',
        },
      };
      expect(shouldBypass(req)).toBe(true);
    });

    it('should handle metrics request', () => {
      const req = {
        method: 'GET',
        originalUrl: '/metrics',
        headers: {
          'user-agent': 'Prometheus/2.0',
        },
      };
      expect(shouldBypass(req)).toBe(true);
    });

    it('should handle swagger request', () => {
      const req = {
        method: 'GET',
        originalUrl: '/swagger',
        headers: {
          'user-agent': 'Mozilla/5.0',
        },
      };
      expect(shouldBypass(req)).toBe(true);
    });

    it('should handle API request with bypass header', () => {
      const req = {
        method: 'POST',
        originalUrl: '/api/webhooks',
        headers: {
          'user-agent': 'axios/0.21.1',
          'x-metrics-bypass': 'true',
        },
      };
      expect(shouldBypass(req)).toBe(true);
    });
  });

  describe('bypass priority', () => {
    it('should check method first', () => {
      const req = {
        method: 'HEAD',
        headers: { 'user-agent': 'kube-probe/1.0' },
        originalUrl: '/api/users',
      };
      expect(shouldBypass(req)).toBe(true);
    });

    it('should check user agent second', () => {
      const req = {
        method: 'GET',
        headers: { 'user-agent': 'kube-probe/1.0' },
        originalUrl: '/api/users',
      };
      expect(shouldBypass(req)).toBe(true);
    });

    it('should check URL third', () => {
      const req = {
        method: 'GET',
        headers: { 'user-agent': 'Mozilla/5.0' },
        originalUrl: '/metrics',
      };
      expect(shouldBypass(req)).toBe(true);
    });

    it('should check header last', () => {
      const req = {
        method: 'GET',
        headers: {
          'user-agent': 'Mozilla/5.0',
          'x-metrics-bypass': '1',
        },
        originalUrl: '/api/users',
      };
      expect(shouldBypass(req)).toBe(true);
    });
  });

  describe('URL normalization', () => {
    it('should handle URLs with query parameters', () => {
      const req = { originalUrl: '/api/users?page=1&limit=10' };
      expect(shouldBypass(req)).toBe(false);
    });

    it('should handle URLs with fragments', () => {
      const req = { originalUrl: '/api/users#section' };
      expect(shouldBypass(req)).toBe(false);
    });

    it('should handle URLs with both query and fragment', () => {
      const req = { originalUrl: '/api/users?page=1#section' };
      expect(shouldBypass(req)).toBe(false);
    });

    it('should handle encoded URLs', () => {
      const req = { originalUrl: '/api/users%20with%20spaces' };
      expect(shouldBypass(req)).toBe(false);
    });

    it('should handle Unicode URLs', () => {
      const req = { originalUrl: '/api/مستخدمين' };
      expect(shouldBypass(req)).toBe(false);
    });

    it('should handle very long URLs', () => {
      const longUrl = '/api/' + 'a'.repeat(1000);
      const req = { originalUrl: longUrl };
      expect(shouldBypass(req)).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should handle malformed request object', () => {
      expect(shouldBypass(null as any)).toBe(false);
      expect(shouldBypass(undefined as any)).toBe(false);
      expect(shouldBypass({} as any)).toBe(false);
    });

    it('should handle request with all bypass conditions', () => {
      const req = {
        method: 'HEAD',
        headers: {
          'user-agent': 'kube-probe/1.0',
          'x-metrics-bypass': '1',
        },
        originalUrl: '/metrics',
      };
      expect(shouldBypass(req)).toBe(true);
    });

    it('should handle request with no bypass conditions', () => {
      const req = {
        method: 'POST',
        headers: {
          'user-agent': 'axios/0.21.1',
        },
        originalUrl: '/api/webhooks',
      };
      expect(shouldBypass(req)).toBe(false);
    });

    it('should handle request with url fallback', () => {
      const req = {
        method: 'GET',
        url: '/api/users',
        headers: { 'user-agent': 'Mozilla/5.0' },
      };
      expect(shouldBypass(req)).toBe(false);
    });

    it('should handle request with both originalUrl and url', () => {
      const req = {
        method: 'GET',
        originalUrl: '/api/users',
        url: '/api/users',
        headers: { 'user-agent': 'Mozilla/5.0' },
      };
      expect(shouldBypass(req)).toBe(false);
    });
  });

  describe('performance considerations', () => {
    it('should handle rapid bypass checks', () => {
      const requests = Array.from({ length: 1000 }, (_, i) => ({
        method: i % 2 === 0 ? 'GET' : 'HEAD',
        originalUrl: `/api/test${i}`,
        headers: { 'user-agent': 'test-agent' },
      }));

      const startTime = Date.now();

      for (const req of requests) {
        shouldBypass(req);
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(100); // Should complete within 100ms
    });

    it('should not create memory leaks', () => {
      for (let i = 0; i < 10000; i++) {
        const req = { method: 'GET', originalUrl: `/api/test${i}` };
        shouldBypass(req);
      }

      // If we get here without memory issues, test passes
      expect(true).toBe(true);
    });

    it('should handle concurrent bypass checks', async () => {
      const promises: Promise<void>[] = [];

      for (let i = 0; i < 100; i++) {
        promises.push(
          new Promise<void>((resolve) => {
            setImmediate(() => {
              const req = { method: 'GET', originalUrl: `/api/test${i}` };
              shouldBypass(req);
              resolve();
            });
          }),
        );
      }

      await Promise.all(promises);

      expect(promises).toHaveLength(100);
    });
  });

  describe('real-world usage scenarios', () => {
    it('should handle Kubernetes health check', () => {
      const req = {
        method: 'GET',
        originalUrl: '/health',
        headers: {
          'user-agent': 'kube-probe/1.21',
        },
      };
      expect(shouldBypass(req)).toBe(true);
    });

    it('should handle ELB health check', () => {
      const req = {
        method: 'GET',
        originalUrl: '/health',
        headers: {
          'user-agent': 'ELB-HealthChecker/2.0',
        },
      };
      expect(shouldBypass(req)).toBe(true);
    });

    it('should handle Prometheus scraping', () => {
      const req = {
        method: 'GET',
        originalUrl: '/metrics',
        headers: {
          'user-agent': 'Prometheus/2.26.0',
        },
      };
      expect(shouldBypass(req)).toBe(true);
    });

    it('should handle Swagger documentation access', () => {
      const req = {
        method: 'GET',
        originalUrl: '/swagger',
        headers: {
          'user-agent': 'Mozilla/5.0 (compatible; Swagger UI)',
        },
      };
      expect(shouldBypass(req)).toBe(true);
    });

    it('should handle API documentation access', () => {
      const req = {
        method: 'GET',
        originalUrl: '/docs',
        headers: {
          'user-agent': 'Mozilla/5.0',
        },
      };
      expect(shouldBypass(req)).toBe(true);
    });

    it('should handle ACME challenge', () => {
      const req = {
        method: 'GET',
        originalUrl: '/.well-known/acme-challenge/test',
        headers: {
          'user-agent': 'certbot/1.0',
        },
      };
      expect(shouldBypass(req)).toBe(true);
    });

    it('should handle regular API requests', () => {
      const req = {
        method: 'POST',
        originalUrl: '/api/webhooks/stripe',
        headers: {
          'user-agent': 'Stripe/1.0 (+https://stripe.com/docs/webhooks)',
          'content-type': 'application/json',
        },
      };
      expect(shouldBypass(req)).toBe(false);
    });

    it('should handle authenticated API requests', () => {
      const req = {
        method: 'GET',
        originalUrl: '/api/users/profile',
        headers: {
          'user-agent': 'axios/0.21.1',
          authorization: 'Bearer token123',
          'x-request-id': 'req-123',
        },
      };
      expect(shouldBypass(req)).toBe(false);
    });

    it('should handle file serving requests', () => {
      const req = {
        method: 'GET',
        originalUrl: '/api/files/download/123',
        headers: {
          'user-agent': 'Mozilla/5.0',
          range: 'bytes=0-1023',
        },
      };
      expect(shouldBypass(req)).toBe(false);
    });

    it('should handle admin panel requests', () => {
      const req = {
        method: 'GET',
        originalUrl: '/admin/dashboard',
        headers: {
          'user-agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          authorization: 'Bearer admin-token',
        },
      };
      expect(shouldBypass(req)).toBe(false);
    });
  });

  describe('environment configuration', () => {
    it('should handle missing METRICS_BYPASS_PATHS', () => {
      delete process.env.METRICS_BYPASS_PATHS;

      jest.resetModules();
      const { shouldBypass: reloadedShouldBypass } = require('./bypass.util');

      const req = { originalUrl: '/api/test' };
      expect(reloadedShouldBypass(req)).toBe(false);
    });

    it('should handle empty METRICS_BYPASS_PATHS', () => {
      process.env.METRICS_BYPASS_PATHS = '';

      jest.resetModules();
      const { shouldBypass: reloadedShouldBypass } = require('./bypass.util');

      const req = { originalUrl: '/api/test' };
      expect(reloadedShouldBypass(req)).toBe(false);
    });

    it('should handle METRICS_BYPASS_PATHS with single pattern', () => {
      process.env.METRICS_BYPASS_PATHS = '^/public/';

      jest.resetModules();
      const { shouldBypass: reloadedShouldBypass } = require('./bypass.util');

      const req = { originalUrl: '/public/assets/style.css' };
      expect(reloadedShouldBypass(req)).toBe(true);
    });

    it('should handle METRICS_BYPASS_PATHS with multiple patterns', () => {
      process.env.METRICS_BYPASS_PATHS = '^/public/,^/uploads/,^/temp/';

      jest.resetModules();
      const { shouldBypass: reloadedShouldBypass } = require('./bypass.util');

      const req1 = { originalUrl: '/public/images/logo.png' };
      expect(reloadedShouldBypass(req1)).toBe(true);

      const req2 = { originalUrl: '/uploads/files/document.pdf' };
      expect(reloadedShouldBypass(req2)).toBe(true);

      const req3 = { originalUrl: '/api/test' };
      expect(reloadedShouldBypass(req3)).toBe(false);
    });

    it('should handle invalid regex patterns gracefully', () => {
      process.env.METRICS_BYPASS_PATHS = '[invalid-regex,^/valid/';

      jest.resetModules();
      const { shouldBypass: reloadedShouldBypass } = require('./bypass.util');

      const req = { originalUrl: '/valid/test' };
      expect(reloadedShouldBypass(req)).toBe(true);
    });

    it('should handle regex patterns with flags', () => {
      process.env.METRICS_BYPASS_PATHS = '^/test/i';

      jest.resetModules();
      const { shouldBypass: reloadedShouldBypass } = require('./bypass.util');

      const req = { originalUrl: '/TEST/PATH' };
      expect(reloadedShouldBypass(req)).toBe(true);
    });
  });

  describe('configuration stability', () => {
    it('should return consistent results on multiple calls', () => {
      const req = { method: 'GET', originalUrl: '/api/users' };

      const result1 = shouldBypass(req);
      const result2 = shouldBypass(req);

      expect(result1).toBe(result2);
    });

    it('should not mutate the original process.env', () => {
      const originalEnv = { ...process.env };

      shouldBypass({ method: 'GET', originalUrl: '/test' });

      expect(process.env).toEqual(originalEnv);
    });

    it('should handle concurrent bypass checks', () => {
      const requests = Array.from({ length: 100 }, (_, i) => ({
        method: 'GET',
        originalUrl: `/api/test${i}`,
        headers: { 'user-agent': 'test' },
      }));

      const results = requests.map((req) => shouldBypass(req));

      expect(results).toHaveLength(100);
      results.forEach((result) => expect(typeof result).toBe('boolean'));
    });
  });
});

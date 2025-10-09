import { sentryConfig } from './sentry.config';

describe('sentryConfig', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment variables before each test
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    // Restore original environment variables
    process.env = originalEnv;
  });

  describe('DSN configuration', () => {
    it('should use SENTRY_DSN from environment when set', () => {
      const customDsn = 'https://test@test.ingest.sentry.io/test';
      process.env.SENTRY_DSN = customDsn;

      const config = sentryConfig();

      expect(config.dsn).toBe(customDsn);
    });

    it('should handle undefined SENTRY_DSN', () => {
      delete process.env.SENTRY_DSN;

      const config = sentryConfig();

      expect(config.dsn).toBeUndefined();
    });

    it('should handle empty SENTRY_DSN', () => {
      process.env.SENTRY_DSN = '';

      const config = sentryConfig();

      expect(config.dsn).toBe('');
    });

    it('should handle malformed SENTRY_DSN', () => {
      process.env.SENTRY_DSN = 'not-a-valid-dsn';

      const config = sentryConfig();

      expect(config.dsn).toBe('not-a-valid-dsn');
    });
  });

  describe('environment configuration', () => {
    it('should use NODE_ENV when set', () => {
      process.env.NODE_ENV = 'test';

      const config = sentryConfig();

      expect(config.environment).toBe('test');
    });

    it('should default to development when NODE_ENV is not set', () => {
      delete process.env.NODE_ENV;

      const config = sentryConfig();

      expect(config.environment).toBe('development');
    });

    it('should handle empty NODE_ENV', () => {
      process.env.NODE_ENV = '';

      const config = sentryConfig();

      expect(config.environment).toBe('development');
    });

    it('should handle production environment', () => {
      process.env.NODE_ENV = 'production';

      const config = sentryConfig();

      expect(config.environment).toBe('production');
      expect(config.tracesSampleRate).toBe(0.1); // Production sample rate
      expect(config.profilesSampleRate).toBe(0.1); // Production sample rate
    });

    it('should handle staging environment', () => {
      process.env.NODE_ENV = 'staging';

      const config = sentryConfig();

      expect(config.environment).toBe('staging');
      expect(config.tracesSampleRate).toBe(1.0); // Non-production sample rate
      expect(config.profilesSampleRate).toBe(1.0); // Non-production sample rate
    });
  });

  describe('release configuration', () => {
    it('should use APP_VERSION when set', () => {
      process.env.APP_VERSION = '1.2.3';

      const config = sentryConfig();

      expect(config.release).toBe('1.2.3');
    });

    it('should default to 1.0.0 when APP_VERSION is not set', () => {
      delete process.env.APP_VERSION;

      const config = sentryConfig();

      expect(config.release).toBe('1.0.0');
    });

    it('should handle empty APP_VERSION', () => {
      process.env.APP_VERSION = '';

      const config = sentryConfig();

      expect(config.release).toBe('1.0.0');
    });

    it('should handle semantic versioning', () => {
      process.env.APP_VERSION = '2.0.0-beta.1';

      const config = sentryConfig();

      expect(config.release).toBe('2.0.0-beta.1');
    });
  });

  describe('sample rates configuration', () => {
    it('should use production sample rate in production', () => {
      process.env.NODE_ENV = 'production';

      const config = sentryConfig();

      expect(config.tracesSampleRate).toBe(0.1);
      expect(config.profilesSampleRate).toBe(0.1);
    });

    it('should use full sample rate in development', () => {
      process.env.NODE_ENV = 'development';

      const config = sentryConfig();

      expect(config.tracesSampleRate).toBe(1.0);
      expect(config.profilesSampleRate).toBe(1.0);
    });

    it('should use full sample rate in staging', () => {
      process.env.NODE_ENV = 'staging';

      const config = sentryConfig();

      expect(config.tracesSampleRate).toBe(1.0);
      expect(config.profilesSampleRate).toBe(1.0);
    });

    it('should handle test environment', () => {
      process.env.NODE_ENV = 'test';

      const config = sentryConfig();

      expect(config.tracesSampleRate).toBe(1.0);
      expect(config.profilesSampleRate).toBe(1.0);
    });
  });

  describe('debug configuration', () => {
    it('should enable debug in development', () => {
      process.env.NODE_ENV = 'development';

      const config = sentryConfig();

      expect(config.debug).toBe(true);
    });

    it('should disable debug in production', () => {
      process.env.NODE_ENV = 'production';

      const config = sentryConfig();

      expect(config.debug).toBe(false);
    });

    it('should handle custom SENTRY_DEBUG setting', () => {
      process.env.NODE_ENV = 'production';
      process.env.SENTRY_DEBUG = 'true';

      const config = sentryConfig();

      expect(config.debug).toBe(true);
    });

    it('should handle SENTRY_DEBUG in development', () => {
      process.env.NODE_ENV = 'development';
      process.env.SENTRY_DEBUG = 'false';

      const config = sentryConfig();

      expect(config.debug).toBe(true); // NODE_ENV takes precedence
    });

    it('should handle invalid SENTRY_DEBUG values', () => {
      process.env.NODE_ENV = 'production';
      process.env.SENTRY_DEBUG = 'invalid';

      const config = sentryConfig();

      expect(config.debug).toBe(false);
    });
  });

  describe('beforeSend configuration', () => {
    it('should filter ValidationError exceptions', () => {
      const config = sentryConfig();
      const mockEvent = {
        exception: {
          values: [
            {
              type: 'ValidationError',
              value: 'Validation failed',
            },
          ],
        },
      };

      const result = config.beforeSend(mockEvent as any);

      expect(result).toBeNull();
    });

    it('should not filter non-ValidationError exceptions', () => {
      const config = sentryConfig();
      const mockEvent = {
        exception: {
          values: [
            {
              type: 'TypeError',
              value: 'Something went wrong',
            },
          ],
        },
      };

      const result = config.beforeSend(mockEvent as any);

      expect(result).toBe(mockEvent);
    });

    it('should filter when exception values is empty', () => {
      const config = sentryConfig();
      const mockEvent = {
        exception: {
          values: [],
        },
      };

      const result = config.beforeSend(mockEvent as any);

      expect(result).toBe(mockEvent);
    });

    it('should handle missing exception', () => {
      const config = sentryConfig();
      const mockEvent = {};

      const result = config.beforeSend(mockEvent as any);

      expect(result).toBe(mockEvent);
    });

    it('should remove authorization header', () => {
      const config = sentryConfig();
      const mockEvent = {
        request: {
          headers: {
            authorization: 'Bearer token123',
            'content-type': 'application/json',
          },
        },
      };

      const result = config.beforeSend(mockEvent as any);

      expect(result!.request!.headers).not.toHaveProperty('authorization');
      expect(result!.request!.headers).toHaveProperty('content-type');
    });

    it('should remove cookie header', () => {
      const config = sentryConfig();
      const mockEvent = {
        request: {
          headers: {
            cookie: 'session=abc123',
            'content-type': 'application/json',
          },
        },
      };

      const result = config.beforeSend(mockEvent as any);

      expect(result!.request!.headers).not.toHaveProperty('cookie');
      expect(result!.request!.headers).toHaveProperty('content-type');
    });

    it('should remove x-api-key header', () => {
      const config = sentryConfig();
      const mockEvent = {
        request: {
          headers: {
            'x-api-key': 'secret-key',
            'content-type': 'application/json',
          },
        },
      };

      const result = config.beforeSend(mockEvent as any);

      expect(result!.request!.headers).not.toHaveProperty('x-api-key');
      expect(result!.request!.headers).toHaveProperty('content-type');
    });

    it('should handle missing request headers', () => {
      const config = sentryConfig();
      const mockEvent = {
        request: {},
      };

      const result = config.beforeSend(mockEvent as any);

      expect(result!.request).toEqual({});
    });

    it('should handle missing request', () => {
      const config = sentryConfig();
      const mockEvent = {};

      const result = config.beforeSend(mockEvent as any);

      expect(result).toEqual(mockEvent);
    });

    it('should handle multiple sensitive headers', () => {
      const config = sentryConfig();
      const mockEvent = {
        request: {
          headers: {
            authorization: 'Bearer token123',
            cookie: 'session=abc123',
            'x-api-key': 'secret-key',
            'content-type': 'application/json',
            'user-agent': 'test-agent',
          },
        },
      };

      const result = config.beforeSend(mockEvent as any);

      expect(result!.request!.headers).not.toHaveProperty('authorization');
      expect(result!.request!.headers).not.toHaveProperty('cookie');
      expect(result!.request!.headers).not.toHaveProperty('x-api-key');
      expect(result!.request!.headers).toHaveProperty('content-type');
      expect(result!.request!.headers).toHaveProperty('user-agent');
    });

    it('should return event when no modifications needed', () => {
      const config = sentryConfig();
      const mockEvent = {
        message: 'Test message',
        request: {
          headers: {
            'content-type': 'application/json',
          },
        },
      };

      const result = config.beforeSend(mockEvent as any);

      expect(result).toBe(mockEvent);
    });
  });

  describe('defaultTags configuration', () => {
    it('should include service tag', () => {
      const config = sentryConfig();

      expect(config.defaultTags).toHaveProperty('service');
      expect(config.defaultTags.service).toBe('kaleem-bot');
    });

    it('should include version tag from APP_VERSION', () => {
      process.env.APP_VERSION = '2.1.0';

      const config = sentryConfig();

      expect(config.defaultTags).toHaveProperty('version');
      expect(config.defaultTags.version).toBe('2.1.0');
    });

    it('should use default version when APP_VERSION is not set', () => {
      delete process.env.APP_VERSION;

      const config = sentryConfig();

      expect(config.defaultTags).toHaveProperty('version');
      expect(config.defaultTags.version).toBe('1.0.0');
    });

    it('should handle empty APP_VERSION for version tag', () => {
      process.env.APP_VERSION = '';

      const config = sentryConfig();

      expect(config.defaultTags).toHaveProperty('version');
      expect(config.defaultTags.version).toBe('1.0.0');
    });

    it('should have consistent tag structure', () => {
      const config = sentryConfig();

      expect(config.defaultTags).toHaveProperty('service');
      expect(config.defaultTags).toHaveProperty('version');

      expect(typeof config.defaultTags.service).toBe('string');
      expect(typeof config.defaultTags.version).toBe('string');

      expect(config.defaultTags.service).toBe('kaleem-bot');
      expect(config.defaultTags.version).toMatch(/^\d+\.\d+\.\d+/);
    });
  });

  describe('configuration structure', () => {
    it('should return complete configuration object', () => {
      const config = sentryConfig();

      expect(config).toHaveProperty('dsn');
      expect(config).toHaveProperty('environment');
      expect(config).toHaveProperty('release');
      expect(config).toHaveProperty('tracesSampleRate');
      expect(config).toHaveProperty('profilesSampleRate');
      expect(config).toHaveProperty('debug');
      expect(config).toHaveProperty('beforeSend');
      expect(config).toHaveProperty('defaultTags');
    });

    it('should have correct types for all properties', () => {
      const config = sentryConfig();

      expect(config.dsn).toBeUndefined(); // DSN is undefined when not set
      expect(typeof config.environment).toBe('string');
      expect(typeof config.release).toBe('string');
      expect(typeof config.tracesSampleRate).toBe('number');
      expect(typeof config.profilesSampleRate).toBe('number');
      expect(typeof config.debug).toBe('boolean');
      expect(typeof config.beforeSend).toBe('function');
      expect(typeof config.defaultTags).toBe('object');
    });

    it('should have all required numeric properties as numbers', () => {
      const config = sentryConfig();

      expect(typeof config.tracesSampleRate).toBe('number');
      expect(typeof config.profilesSampleRate).toBe('number');

      // Should be valid numbers (not NaN)
      expect(isNaN(config.tracesSampleRate)).toBe(false);
      expect(isNaN(config.profilesSampleRate)).toBe(false);
    });
  });

  describe('environment variable combinations', () => {
    it('should handle production environment with custom DSN', () => {
      process.env.NODE_ENV = 'production';
      process.env.SENTRY_DSN = 'https://prod@test.ingest.sentry.io/prod';
      process.env.APP_VERSION = '3.0.0';

      const config = sentryConfig();

      expect(config.dsn).toBe('https://prod@test.ingest.sentry.io/prod');
      expect(config.environment).toBe('production');
      expect(config.release).toBe('3.0.0');
      expect(config.tracesSampleRate).toBe(0.1);
      expect(config.profilesSampleRate).toBe(0.1);
      expect(config.debug).toBe(false);
      expect(config.defaultTags.version).toBe('3.0.0');
    });

    it('should handle development environment with debug enabled', () => {
      process.env.NODE_ENV = 'development';
      process.env.SENTRY_DSN = 'https://dev@test.ingest.sentry.io/dev';
      process.env.APP_VERSION = '1.0.0-dev';
      process.env.SENTRY_DEBUG = 'true';

      const config = sentryConfig();

      expect(config.dsn).toBe('https://dev@test.ingest.sentry.io/dev');
      expect(config.environment).toBe('development');
      expect(config.release).toBe('1.0.0-dev');
      expect(config.tracesSampleRate).toBe(1.0);
      expect(config.profilesSampleRate).toBe(1.0);
      expect(config.debug).toBe(true);
      expect(config.defaultTags.version).toBe('1.0.0-dev');
    });

    it('should handle test environment', () => {
      process.env.NODE_ENV = 'test';
      process.env.APP_VERSION = '1.0.0-test.123';

      const config = sentryConfig();

      expect(config.environment).toBe('test');
      expect(config.release).toBe('1.0.0-test.123');
      expect(config.tracesSampleRate).toBe(1.0);
      expect(config.profilesSampleRate).toBe(1.0);
      expect(config.debug).toBe(false);
      expect(config.defaultTags.version).toBe('1.0.0-test.123');
    });
  });

  describe('beforeSend function behavior', () => {
    it('should handle ValidationError in nested exception structure', () => {
      const config = sentryConfig();
      const mockEvent = {
        exception: {
          values: [
            {
              stacktrace: {
                frames: [],
              },
              type: 'ValidationError',
              value: 'Invalid input',
            },
          ],
        },
      };

      const result = config.beforeSend(mockEvent as any);

      expect(result).toBeNull();
    });

    it('should not filter ValidationError in message events', () => {
      const config = sentryConfig();
      const mockEvent = {
        message: 'ValidationError: Invalid input',
        level: 'error',
      };

      const result = config.beforeSend(mockEvent as any);

      expect(result).toBe(mockEvent);
    });

    it('should handle case-insensitive ValidationError type', () => {
      const config = sentryConfig();
      const mockEvent = {
        exception: {
          values: [
            {
              type: 'validationerror', // lowercase
              value: 'Invalid input',
            },
          ],
        },
      };

      const result = config.beforeSend(mockEvent as any);

      expect(result).toBeNull();
    });

    it('should handle ValidationError with extra spaces', () => {
      const config = sentryConfig();
      const mockEvent = {
        exception: {
          values: [
            {
              type: ' ValidationError ',
              value: 'Invalid input',
            },
          ],
        },
      };

      const result = config.beforeSend(mockEvent as any);

      expect(result).toBeNull();
    });

    it('should preserve other sensitive headers that should not be removed', () => {
      const config = sentryConfig();
      const mockEvent = {
        request: {
          headers: {
            'x-custom-header': 'custom-value',
            'x-trace-id': 'trace-123',
            'content-type': 'application/json',
          },
        },
      };

      const result = config.beforeSend(mockEvent as any);

      expect(result!.request!.headers).toHaveProperty('x-custom-header');
      expect(result!.request!.headers).toHaveProperty('x-trace-id');
      expect(result!.request!.headers).toHaveProperty('content-type');
    });
  });

  describe('configuration stability', () => {
    it('should return consistent configuration on multiple calls', () => {
      const config1 = sentryConfig();
      const config2 = sentryConfig();

      // Compare non-function properties
      expect(config1.dsn).toEqual(config2.dsn);
      expect(config1.environment).toEqual(config2.environment);
      expect(config1.release).toEqual(config2.release);
      expect(config1.tracesSampleRate).toEqual(config2.tracesSampleRate);
      expect(config1.profilesSampleRate).toEqual(config2.profilesSampleRate);
      expect(config1.debug).toEqual(config2.debug);
      expect(config1.defaultTags).toEqual(config2.defaultTags);

      // Check that functions exist and are functions
      expect(typeof config1.beforeSend).toBe('function');
      expect(typeof config2.beforeSend).toBe('function');
    });

    it('should not mutate the original process.env', () => {
      const originalEnv = { ...process.env };

      sentryConfig();

      expect(process.env).toEqual(originalEnv);
    });

    it('should handle concurrent configuration access', () => {
      const configs: ReturnType<typeof sentryConfig>[] = [];

      // Simulate concurrent access
      for (let i = 0; i < 10; i++) {
        configs.push(sentryConfig());
      }

      // All configurations should have identical properties
      for (let i = 1; i < configs.length; i++) {
        expect(configs[i].dsn).toEqual(configs[0].dsn);
        expect(configs[i].environment).toEqual(configs[0].environment);
        expect(configs[i].release).toEqual(configs[0].release);
        expect(configs[i].tracesSampleRate).toEqual(
          configs[0].tracesSampleRate,
        );
        expect(configs[i].profilesSampleRate).toEqual(
          configs[0].profilesSampleRate,
        );
        expect(configs[i].debug).toEqual(configs[0].debug);
        expect(configs[i].defaultTags).toEqual(configs[0].defaultTags);
        expect(typeof configs[i].beforeSend).toBe('function');
      }
    });

    it('should handle rapid environment changes', () => {
      process.env.NODE_ENV = 'development';
      const config1 = sentryConfig();

      process.env.NODE_ENV = 'production';
      const config2 = sentryConfig();

      expect(config1.environment).toBe('development');
      expect(config2.environment).toBe('production');
      expect(config1.tracesSampleRate).toBe(1.0);
      expect(config2.tracesSampleRate).toBe(0.1);
    });
  });

  describe('edge cases', () => {
    it('should handle extremely long DSN values', () => {
      const longDsn =
        'https://' + 'a'.repeat(1000) + '@test.ingest.sentry.io/test';
      process.env.SENTRY_DSN = longDsn;

      const config = sentryConfig();

      expect(config.dsn).toBe(longDsn);
    });

    it('should handle special characters in DSN', () => {
      const specialDsn =
        'https://test@example.com:8080@test.ingest.sentry.io/test?param=value';
      process.env.SENTRY_DSN = specialDsn;

      const config = sentryConfig();

      expect(config.dsn).toBe(specialDsn);
    });

    it('should handle unicode characters in DSN', () => {
      const unicodeDsn = 'https://tëst@example.com@test.ingest.sentry.io/test';
      process.env.SENTRY_DSN = unicodeDsn;

      const config = sentryConfig();

      expect(config.dsn).toBe(unicodeDsn);
    });

    it('should handle missing defaultTags initialization', () => {
      // Simulate a scenario where defaultTags might not be initialized
      process.env.APP_VERSION = undefined as any;

      const config = sentryConfig();

      expect(config.defaultTags).toBeDefined();
      expect(config.defaultTags).toHaveProperty('service');
      expect(config.defaultTags).toHaveProperty('version');
    });
  });
});

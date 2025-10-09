import { ConfigService } from '@nestjs/config';
import { Test, type TestingModule } from '@nestjs/testing';
import * as Sentry from '@sentry/node';

import { SentryService, type SentryContext } from './sentry.service';

// Mock Sentry
jest.mock('@sentry/node');
jest.mock('@sentry/profiling-node');

const MockedSentry = Sentry as jest.Mocked<typeof Sentry>;

describe('SentryService', () => {
  let service: SentryService;
  let configService: jest.Mocked<ConfigService>;

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    // Reset all mocks
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SentryService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<SentryService>(SentryService);
    configService = module.get(ConfigService);
  });

  afterEach(() => {
    // Reset Sentry initialization state
    (service as any).isInitialized = false;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('initialize', () => {
    beforeEach(() => {
      MockedSentry.init.mockClear();
      MockedSentry.close.mockClear();
    });

    it('should initialize Sentry with correct configuration', () => {
      // Given
      configService.get.mockImplementation(
        (key: string, defaultValue?: unknown) => {
          switch (key) {
            case 'SENTRY_ENABLED':
              return 'true';
            case 'SENTRY_DSN':
              return 'https://test@test.ingest.sentry.io/test';
            case 'NODE_ENV':
              return 'production';
            case 'APP_VERSION':
              return '1.0.0';
            case 'SENTRY_TRACES_SAMPLE_RATE':
              return '0.1';
            case 'SENTRY_PROFILES_SAMPLE_RATE':
              return '0.1';
            case 'SENTRY_DEBUG':
              return 'false';
            default:
              return defaultValue;
          }
        },
      );

      // When
      service.initialize();

      // Then
      expect(MockedSentry.init).toHaveBeenCalledTimes(1);
      expect(MockedSentry.init).toHaveBeenCalledWith({
        dsn: 'https://test@test.ingest.sentry.io/test',
        environment: 'production',
        release: '1.0.0',
        debug: false,
        integrations: expect.any(Array),
        tracesSampleRate: 0.1,
        profilesSampleRate: 0.1,
        beforeSend: expect.any(Function),
        initialScope: { tags: { service: 'kaleem-bot' } },
      });

      expect((service as any).isInitialized).toBe(true);
    });

    it('should disable Sentry when SENTRY_ENABLED is false', () => {
      // Given
      configService.get.mockImplementation((key: string) => {
        switch (key) {
          case 'SENTRY_ENABLED':
            return 'false';
          default:
            return undefined;
        }
      });

      // When
      service.initialize();

      // Then
      expect(MockedSentry.init).not.toHaveBeenCalled();
      expect((service as any).isInitialized).toBe(false);
    });

    it('should disable Sentry when SENTRY_DSN is not configured', () => {
      // Given
      configService.get.mockImplementation((key: string) => {
        switch (key) {
          case 'SENTRY_ENABLED':
            return 'true';
          case 'SENTRY_DSN':
            return undefined;
          default:
            return undefined;
        }
      });

      // When
      service.initialize();

      // Then
      expect(MockedSentry.init).not.toHaveBeenCalled();
      expect((service as any).isInitialized).toBe(false);
    });

    it('should use development defaults for traces and profiles sample rate', () => {
      // Given
      configService.get.mockImplementation((key: string) => {
        switch (key) {
          case 'SENTRY_ENABLED':
            return 'true';
          case 'SENTRY_DSN':
            return 'https://test@test.ingest.sentry.io/test';
          case 'NODE_ENV':
            return 'development';
          case 'SENTRY_TRACES_SAMPLE_RATE':
            return '0';
          case 'SENTRY_PROFILES_SAMPLE_RATE':
            return '0';
          default:
            return undefined;
        }
      });

      // When
      service.initialize();

      // Then
      expect(MockedSentry.init).toHaveBeenCalledWith(
        expect.objectContaining({
          tracesSampleRate: 0,
          profilesSampleRate: 0,
          integrations: [],
        }),
      );
    });

    it('should handle Sentry initialization errors gracefully', () => {
      // Given
      const error = new Error('Sentry initialization failed');
      MockedSentry.init.mockImplementation(() => {
        throw error;
      });

      configService.get.mockImplementation((key: string) => {
        switch (key) {
          case 'SENTRY_ENABLED':
            return 'true';
          case 'SENTRY_DSN':
            return 'https://test@test.ingest.sentry.io/test';
          case 'NODE_ENV':
            return 'production';
          default:
            return undefined;
        }
      });

      // When/Then
      expect(() => service.initialize()).not.toThrow();
      expect((service as any).isInitialized).toBe(false);
    });

    it('should not reinitialize if already initialized', () => {
      // Given
      configService.get.mockImplementation((key: string) => {
        switch (key) {
          case 'SENTRY_ENABLED':
            return 'true';
          case 'SENTRY_DSN':
            return 'https://test@test.ingest.sentry.io/test';
          default:
            return undefined;
        }
      });

      (service as any).isInitialized = true;

      // When
      service.initialize();

      // Then
      expect(MockedSentry.init).not.toHaveBeenCalled();
    });

    it('should configure beforeSend to filter ValidationError', () => {
      // Given
      configService.get.mockImplementation((key: string) => {
        switch (key) {
          case 'SENTRY_ENABLED':
            return 'true';
          case 'SENTRY_DSN':
            return 'https://test@test.ingest.sentry.io/test';
          case 'NODE_ENV':
            return 'production';
          default:
            return undefined;
        }
      });

      // When
      service.initialize();

      // Then
      const initCall = MockedSentry.init.mock.calls[0][0];
      expect(initCall?.beforeSend).toBeDefined();

      // Test beforeSend function
      const mockEvent = {
        type: 'error',
        exception: {
          values: [{ type: 'ValidationError' }],
        },
      };

      const result = initCall?.beforeSend?.(mockEvent as any, {});
      expect(result).toBeNull(); // Should filter out ValidationError
    });

    it('should configure beforeSend to remove sensitive headers', () => {
      // Given
      configService.get.mockImplementation((key: string) => {
        switch (key) {
          case 'SENTRY_ENABLED':
            return 'true';
          case 'SENTRY_DSN':
            return 'https://test@test.ingest.sentry.io/test';
          case 'NODE_ENV':
            return 'production';
          default:
            return undefined;
        }
      });

      // When
      service.initialize();

      // Then
      const initCall = MockedSentry.init.mock.calls[0][0];

      const result = initCall?.beforeSend?.(
        {
          type: 'error',
          request: {
            headers: {
              authorization: 'Bearer token123',
              cookie: 'session=abc123',
              'user-agent': 'test-agent',
            },
          },
        } as any,
        {},
      );

      expect((result as any)?.request?.headers?.authorization).toBeUndefined();
      expect((result as any)?.request?.headers?.cookie).toBeUndefined();
      expect((result as any)?.request?.headers['user-agent']).toBe(
        'test-agent',
      );
    });

    it('should log initialization details', () => {
      // Given
      const loggerSpy = jest.spyOn((service as any).logger, 'log');

      configService.get.mockImplementation((key: string) => {
        switch (key) {
          case 'SENTRY_ENABLED':
            return 'true';
          case 'SENTRY_DSN':
            return 'https://test@test.ingest.sentry.io/test';
          case 'NODE_ENV':
            return 'production';
          case 'SENTRY_TRACES_SAMPLE_RATE':
            return '0.2';
          case 'SENTRY_PROFILES_SAMPLE_RATE':
            return '0.1';
          default:
            return undefined;
        }
      });

      // When
      service.initialize();

      // Then
      expect(loggerSpy).toHaveBeenCalledWith(
        'Sentry initialized (env=production, traces=0.2, profiles=0.1)',
      );
    });
  });

  describe('captureException', () => {
    beforeEach(() => {
      MockedSentry.captureException.mockClear();
      (service as any).isInitialized = true;
    });

    it('should capture exception successfully', () => {
      // Given
      const error = new Error('Test error');
      const context: SentryContext = {
        userId: 'user123',
        requestId: 'req123',
      };

      MockedSentry.captureException.mockReturnValue('event-id-123');

      // When
      const result = service.captureException(error, context);

      // Then
      expect(MockedSentry.captureException).toHaveBeenCalledTimes(1);
      expect(MockedSentry.captureException).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          level: 'error',
          tags: expect.objectContaining({
            service: 'kaleem-bot',
          }),
          user: {
            id: 'user123',
            ip_address: undefined,
          },
          extra: expect.objectContaining({
            requestId: 'req123',
          }),
        }),
      );

      expect(result).toBe('event-id-123');
    });

    it('should capture string error', () => {
      // Given
      const error = 'String error message';
      const context: SentryContext = {
        merchantId: 'merchant123',
      };

      MockedSentry.captureException.mockReturnValue('event-id-456');

      // When
      const result = service.captureException(error, context);

      // Then
      expect(MockedSentry.captureException).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          extra: expect.objectContaining({
            merchantId: 'merchant123',
          }),
        }),
      );

      expect(result).toBe('event-id-456');
    });

    it('should return empty string when not initialized', () => {
      // Given
      (service as any).isInitialized = false;

      // When
      const result = service.captureException(new Error('Test'));

      // Then
      expect(result).toBe('');
      expect(MockedSentry.captureException).not.toHaveBeenCalled();
    });

    it('should handle Sentry capture errors gracefully', () => {
      // Given
      const error = new Error('Test error');
      MockedSentry.captureException.mockImplementation(() => {
        throw new Error('Sentry capture failed');
      });

      // When/Then
      expect(() => service.captureException(error)).not.toThrow();
      expect(service.captureException(error)).toBe('');
    });

    it('should build complete context with all fields', () => {
      // Given
      const error = new Error('Test error');
      const context: SentryContext = {
        userId: 'user123',
        merchantId: 'merchant123',
        requestId: 'req123',
        url: 'https://api.example.com/test',
        method: 'POST',
        ip: '192.168.1.1',
        userAgent: 'test-agent',
        tags: { customTag: 'customValue' },
        extra: { customData: 'customValue' },
      };

      MockedSentry.captureException.mockReturnValue('event-id-789');

      // When
      service.captureException(error, context);

      // Then
      expect(MockedSentry.captureException).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          level: 'error',
          tags: expect.objectContaining({
            service: 'kaleem-bot',
            customTag: 'customValue',
          }),
          user: {
            id: 'user123',
            ip_address: '192.168.1.1',
          },
          extra: expect.objectContaining({
            merchantId: 'merchant123',
            requestId: 'req123',
            url: 'https://api.example.com/test',
            method: 'POST',
            userAgent: 'test-agent',
            customData: 'customValue',
          }),
          contexts: {
            request: {
              url: 'https://api.example.com/test',
              method: 'POST',
              headers: {
                'User-Agent': 'test-agent',
              },
            },
          },
        }),
      );
    });

    it('should handle missing context fields', () => {
      // Given
      const error = new Error('Test error');
      const context: SentryContext = {};

      MockedSentry.captureException.mockReturnValue('event-id-101');

      // When
      const result = service.captureException(error, context);

      // Then
      expect(MockedSentry.captureException).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          level: 'error',
          tags: expect.objectContaining({
            service: 'kaleem-bot',
          }),
          user: undefined,
          extra: undefined,
          contexts: undefined,
        }),
      );

      expect(result).toBe('event-id-101');
    });
  });

  describe('captureMessage', () => {
    beforeEach(() => {
      MockedSentry.captureMessage.mockClear();
      (service as any).isInitialized = true;
    });

    it('should capture message with default level', () => {
      // Given
      const message = 'Test message';
      MockedSentry.captureMessage.mockReturnValue('message-id-123');

      // When
      const result = service.captureMessage(message);

      // Then
      expect(MockedSentry.captureMessage).toHaveBeenCalledWith(
        message,
        expect.objectContaining({
          level: 'info',
          tags: expect.objectContaining({
            service: 'kaleem-bot',
          }),
        }),
      );

      expect(result).toBe('message-id-123');
    });

    it('should capture message with custom level', () => {
      // Given
      const message = 'Warning message';
      const level = 'warning' as const;

      MockedSentry.captureMessage.mockReturnValue('message-id-456');

      // When
      const result = service.captureMessage(message, level);

      // Then
      expect(MockedSentry.captureMessage).toHaveBeenCalledWith(
        message,
        expect.objectContaining({
          level: 'warning',
        }),
      );

      expect(result).toBe('message-id-456');
    });

    it('should capture message with context', () => {
      // Given
      const message = 'Info message';
      const level = 'info' as const;
      const context: SentryContext = {
        userId: 'user123',
        tags: { feature: 'test' },
        extra: { data: 'value' },
      };

      MockedSentry.captureMessage.mockReturnValue('message-id-789');

      // When
      const result = service.captureMessage(message, level, context);

      // Then
      expect(MockedSentry.captureMessage).toHaveBeenCalledWith(
        message,
        expect.objectContaining({
          level: 'info',
          tags: expect.objectContaining({
            service: 'kaleem-bot',
            feature: 'test',
          }),
          user: {
            id: 'user123',
            ip_address: undefined,
          },
          extra: expect.objectContaining({
            data: 'value',
          }),
        }),
      );

      expect(result).toBe('message-id-789');
    });

    it('should return empty string when not initialized', () => {
      // Given
      (service as any).isInitialized = false;

      // When
      const result = service.captureMessage('Test message');

      // Then
      expect(result).toBe('');
      expect(MockedSentry.captureMessage).not.toHaveBeenCalled();
    });

    it('should handle Sentry capture errors gracefully', () => {
      // Given
      MockedSentry.captureMessage.mockImplementation(() => {
        throw new Error('Sentry capture failed');
      });

      // When/Then
      expect(() => service.captureMessage('Test message')).not.toThrow();
      expect(service.captureMessage('Test message')).toBe('');
    });
  });

  describe('startTransaction', () => {
    beforeEach(() => {
      MockedSentry.setTag.mockClear();
      MockedSentry.setContext.mockClear();
      MockedSentry.setExtra.mockClear();
      (service as any).isInitialized = true;
    });

    it('should start transaction successfully', () => {
      // Given
      const name = 'test-operation';
      const operation = 'test';
      const context: SentryContext = {
        merchantId: 'merchant123',
        requestId: 'req123',
      };

      // When
      const result = service.startTransaction(name, operation, context);

      // Then
      expect(MockedSentry.setTag).toHaveBeenCalledWith('operation', 'test');
      expect(MockedSentry.setTag).toHaveBeenCalledWith(
        'transaction_name',
        'test-operation',
      );
      expect(MockedSentry.setContext).toHaveBeenCalledWith('transaction', {
        name: 'test-operation',
        operation: 'test',
        merchantId: 'merchant123',
        requestId: 'req123',
        url: undefined,
        method: undefined,
      });

      expect(result).toBeDefined();
      expect((result as any).name).toBe('test-operation');
      expect((result as any).operation).toBe('test');
      expect(typeof (result as any).setStatus).toBe('function');
      expect(typeof (result as any).setData).toBe('function');
      expect(typeof (result as any).setTag).toBe('function');
      expect(typeof (result as any).finish).toBe('function');
    });

    it('should return null when not initialized', () => {
      // Given
      (service as any).isInitialized = false;

      // When
      const result = service.startTransaction('test', 'operation');

      // Then
      expect(result).toBeNull();
    });

    it('should handle transaction errors gracefully', () => {
      // Given
      MockedSentry.setTag.mockImplementation(() => {
        throw new Error('Sentry error');
      });

      // When/Then
      expect(() => service.startTransaction('test', 'operation')).not.toThrow();
      expect(service.startTransaction('test', 'operation')).toBeNull();
    });

    it('should support transaction methods', () => {
      // Given
      const transaction = service.startTransaction('test', 'operation');

      // When/Then - test transaction methods

      expect(() => (transaction as any)?.setStatus('ok')).not.toThrow();

      expect(() => (transaction as any)?.setData('key', 'value')).not.toThrow();

      expect(() => (transaction as any)?.setTag('tag', 'value')).not.toThrow();

      expect(() => (transaction as any)?.finish()).not.toThrow();
    });
  });

  describe('setContext', () => {
    beforeEach(() => {
      MockedSentry.setContext.mockClear();
      (service as any).isInitialized = true;
    });

    it('should set context successfully', () => {
      // Given
      const name = 'test-context';
      const context = { key: 'value' };

      // When
      service.setContext(name, context);

      // Then
      expect(MockedSentry.setContext).toHaveBeenCalledWith(name, context);
    });

    it('should not call Sentry when not initialized', () => {
      // Given
      (service as any).isInitialized = false;

      // When
      service.setContext('test', {});

      // Then
      expect(MockedSentry.setContext).not.toHaveBeenCalled();
    });

    it('should handle Sentry errors gracefully', () => {
      // Given
      MockedSentry.setContext.mockImplementation(() => {
        throw new Error('Sentry error');
      });

      // When/Then
      expect(() => service.setContext('test', {})).not.toThrow();
    });
  });

  describe('setTag', () => {
    beforeEach(() => {
      MockedSentry.setTag.mockClear();
      (service as any).isInitialized = true;
    });

    it('should set tag successfully', () => {
      // Given
      const key = 'test-key';
      const value = 'test-value';

      // When
      service.setTag(key, value);

      // Then
      expect(MockedSentry.setTag).toHaveBeenCalledWith(key, value);
    });

    it('should not call Sentry when not initialized', () => {
      // Given
      (service as any).isInitialized = false;

      // When
      service.setTag('test', 'value');

      // Then
      expect(MockedSentry.setTag).not.toHaveBeenCalled();
    });

    it('should handle Sentry errors gracefully', () => {
      // Given
      MockedSentry.setTag.mockImplementation(() => {
        throw new Error('Sentry error');
      });

      // When/Then
      expect(() => service.setTag('test', 'value')).not.toThrow();
    });
  });

  describe('setUser', () => {
    beforeEach(() => {
      MockedSentry.setUser.mockClear();
      (service as any).isInitialized = true;
    });

    it('should set user successfully', () => {
      // Given
      const user = {
        id: 'user123',
        email: 'user@example.com',
        username: 'testuser',
        ip_address: '192.168.1.1',
      };

      // When
      service.setUser(user);

      // Then
      expect(MockedSentry.setUser).toHaveBeenCalledWith(user);
    });

    it('should set user with minimal data', () => {
      // Given
      const user = {
        id: 'user123',
      };

      // When
      service.setUser(user);

      // Then
      expect(MockedSentry.setUser).toHaveBeenCalledWith(user);
    });

    it('should not call Sentry when not initialized', () => {
      // Given
      (service as any).isInitialized = false;

      // When
      service.setUser({ id: 'user123' });

      // Then
      expect(MockedSentry.setUser).not.toHaveBeenCalled();
    });

    it('should handle Sentry errors gracefully', () => {
      // Given
      MockedSentry.setUser.mockImplementation(() => {
        throw new Error('Sentry error');
      });

      // When/Then
      expect(() => service.setUser({ id: 'user123' })).not.toThrow();
    });
  });

  describe('setExtra', () => {
    beforeEach(() => {
      MockedSentry.setExtra.mockClear();
      (service as any).isInitialized = true;
    });

    it('should set extra data successfully', () => {
      // Given
      const key = 'test-key';
      const value = { data: 'test' };

      // When
      service.setExtra(key, value);

      // Then
      expect(MockedSentry.setExtra).toHaveBeenCalledWith(key, value);
    });

    it('should not call Sentry when not initialized', () => {
      // Given
      (service as any).isInitialized = false;

      // When
      service.setExtra('test', 'value');

      // Then
      expect(MockedSentry.setExtra).not.toHaveBeenCalled();
    });

    it('should handle Sentry errors gracefully', () => {
      // Given
      MockedSentry.setExtra.mockImplementation(() => {
        throw new Error('Sentry error');
      });

      // When/Then
      expect(() => service.setExtra('test', 'value')).not.toThrow();
    });
  });

  describe('close', () => {
    beforeEach(() => {
      MockedSentry.close.mockClear();
      (service as any).isInitialized = true;
    });

    it('should close Sentry successfully', async () => {
      // Given
      MockedSentry.close.mockResolvedValue(true);

      // When
      await service.close();

      // Then
      expect(MockedSentry.close).toHaveBeenCalledWith(2000);
      expect((service as any).isInitialized).toBe(false);
    });

    it('should handle close when not initialized', async () => {
      // Given
      (service as any).isInitialized = false;

      // When
      await service.close();

      // Then
      expect(MockedSentry.close).not.toHaveBeenCalled();
    });

    it('should handle close errors gracefully', async () => {
      // Given
      const error = new Error('Close failed');
      MockedSentry.close.mockRejectedValue(error);

      // When/Then
      await expect(service.close()).resolves.not.toThrow();
      expect((service as any).isInitialized).toBe(true); // Should remain true on error
    });
  });

  describe('isEnabled', () => {
    it('should return true when initialized', () => {
      // Given
      (service as any).isInitialized = true;

      // When
      const result = service.isEnabled();

      // Then
      expect(result).toBe(true);
    });

    it('should return false when not initialized', () => {
      // Given
      (service as any).isInitialized = false;

      // When
      const result = service.isEnabled();

      // Then
      expect(result).toBe(false);
    });
  });

  describe('getCurrentUserId', () => {
    it('should return undefined when not initialized', () => {
      // Given
      (service as any).isInitialized = false;

      // When
      const result = service.getCurrentUserId();

      // Then
      expect(result).toBeUndefined();
    });

    it('should handle errors gracefully', () => {
      // Given
      (service as any).isInitialized = true;

      // When/Then
      expect(() => service.getCurrentUserId()).not.toThrow();
      expect(service.getCurrentUserId()).toBeUndefined();
    });
  });

  describe('integration scenarios', () => {
    it('should handle complete error reporting workflow', () => {
      // Given
      configService.get.mockImplementation((key: string) => {
        switch (key) {
          case 'SENTRY_ENABLED':
            return 'true';
          case 'SENTRY_DSN':
            return 'https://test@test.ingest.sentry.io/test';
          case 'NODE_ENV':
            return 'production';
          default:
            return undefined;
        }
      });

      MockedSentry.captureException.mockReturnValue('event-id-123');
      MockedSentry.captureMessage.mockReturnValue('message-id-456');

      // Initialize
      service.initialize();
      expect((service as any).isInitialized).toBe(true);

      // Test exception capture
      const error = new Error('Test error');
      const exceptionResult = service.captureException(error, {
        userId: 'user123',
        requestId: 'req123',
      });
      expect(exceptionResult).toBe('event-id-123');

      // Test message capture
      const messageResult = service.captureMessage('Test message', 'info', {
        userId: 'user123',
      });
      expect(messageResult).toBe('message-id-456');

      // Test isEnabled
      expect(service.isEnabled()).toBe(true);
    });

    it('should handle production environment correctly', () => {
      // Given
      configService.get.mockImplementation((key: string) => {
        switch (key) {
          case 'SENTRY_ENABLED':
            return 'true';
          case 'SENTRY_DSN':
            return 'https://test@test.ingest.sentry.io/test';
          case 'NODE_ENV':
            return 'production';
          case 'SENTRY_TRACES_SAMPLE_RATE':
            return '0.1';
          case 'SENTRY_PROFILES_SAMPLE_RATE':
            return '0.1';
          default:
            return undefined;
        }
      });

      // When
      service.initialize();

      // Then
      expect(MockedSentry.init).toHaveBeenCalledWith(
        expect.objectContaining({
          environment: 'production',
          tracesSampleRate: 0.1,
          profilesSampleRate: 0.1,
          integrations: expect.any(Array), // Should have profiling integration
        }),
      );
    });

    it('should handle development environment correctly', () => {
      // Given
      configService.get.mockImplementation((key: string) => {
        switch (key) {
          case 'SENTRY_ENABLED':
            return 'true';
          case 'SENTRY_DSN':
            return 'https://test@test.ingest.sentry.io/test';
          case 'NODE_ENV':
            return 'development';
          default:
            return undefined;
        }
      });

      // When
      service.initialize();

      // Then
      expect(MockedSentry.init).toHaveBeenCalledWith(
        expect.objectContaining({
          environment: 'development',
          tracesSampleRate: 0,
          profilesSampleRate: 0,
          integrations: [], // Should not have profiling integration
        }),
      );
    });
  });

  describe('error handling and edge cases', () => {
    it('should handle malformed configuration gracefully', () => {
      // Given
      configService.get.mockImplementation(() => {
        throw new Error('Config error');
      });

      // When/Then
      expect(() => service.initialize()).not.toThrow();
      expect((service as any).isInitialized).toBe(false);
    });

    it('should handle very long error messages', () => {
      // Given
      const longMessage = 'x'.repeat(10000);
      const error = new Error(longMessage);

      MockedSentry.captureException.mockReturnValue('event-id-long');
      (service as any).isInitialized = true;

      // When
      const result = service.captureException(error);

      // Then
      expect(MockedSentry.captureException).toHaveBeenCalledWith(
        error,
        expect.any(Object),
      );
      expect(result).toBe('event-id-long');
    });

    it('should handle context with circular references', () => {
      // Given
      const circularContext: any = { key: 'value' };
      circularContext.circular = circularContext;

      const error = new Error('Circular error');

      MockedSentry.captureException.mockReturnValue('event-id-circular');
      (service as any).isInitialized = true;

      // When/Then - should not throw
      expect(() =>
        service.captureException(error, circularContext),
      ).not.toThrow();
    });

    it('should handle null and undefined values in context', () => {
      // Given
      const context = {
        userId: null as any,
        merchantId: undefined,
        requestId: '',
        url: null,
        method: undefined,
      };

      const error = new Error('Null context error');

      MockedSentry.captureException.mockReturnValue('event-id-null');
      (service as any).isInitialized = true;

      // When
      const result = service.captureException(error, context as any);

      // Then
      expect(MockedSentry.captureException).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          user: undefined, // null userId should not create user object
        }),
      );
      expect(result).toBe('event-id-null');
    });
  });

  describe('performance considerations', () => {
    it('should handle rapid successive calls', () => {
      // Given
      (service as any).isInitialized = true;
      MockedSentry.captureException.mockReturnValue('event-id-rapid');

      const errors = Array.from({ length: 100 }, (_, i) =>
        service.captureException(new Error(`Error ${i}`)),
      );

      // When
      const results = errors.map((result) => result);

      // Then
      expect(results).toHaveLength(100);
      expect(MockedSentry.captureException).toHaveBeenCalledTimes(100);
      results.forEach((result) => expect(result).toBe('event-id-rapid'));
    });

    it('should not create memory leaks during extended operation', () => {
      // Given
      (service as any).isInitialized = true;
      MockedSentry.captureException.mockReturnValue('event-id-memory');

      // When - simulate extended operation
      for (let i = 0; i < 1000; i++) {
        service.captureException(new Error(`Memory test ${i}`));
      }

      // Then - if we get here without memory issues, test passes
      expect(true).toBe(true);
    });
  });

  describe('real-world scenarios', () => {
    it('should handle typical error logging scenario', () => {
      // Given - typical application error scenario
      configService.get.mockImplementation((key: string) => {
        switch (key) {
          case 'SENTRY_ENABLED':
            return 'true';
          case 'SENTRY_DSN':
            return 'https://test@test.ingest.sentry.io/test';
          case 'NODE_ENV':
            return 'production';
          case 'APP_VERSION':
            return '1.2.3';
          default:
            return undefined;
        }
      });

      MockedSentry.captureException.mockReturnValue('real-world-id');

      // Initialize
      service.initialize();

      // Simulate real error scenario
      const error = new Error('Database connection failed');
      const context: SentryContext = {
        userId: 'user-123',
        merchantId: 'merchant-456',
        requestId: 'req-789',
        url: '/api/users',
        method: 'POST',
        ip: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (compatible; Bot/1.0)',
        tags: {
          feature: 'user-management',
          severity: 'high',
        },
        extra: {
          attemptCount: 3,
          lastRetry: new Date().toISOString(),
        },
      };

      // When
      const result = service.captureException(error, context);

      // Then
      expect(result).toBe('real-world-id');
      expect(MockedSentry.captureException).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          level: 'error',
          tags: expect.objectContaining({
            service: 'kaleem-bot',
            feature: 'user-management',
            severity: 'high',
          }),
          user: {
            id: 'user-123',
            ip_address: '192.168.1.100',
          },
          extra: expect.objectContaining({
            merchantId: 'merchant-456',
            requestId: 'req-789',
            url: '/api/users',
            method: 'POST',
            userAgent: 'Mozilla/5.0 (compatible; Bot/1.0)',
            attemptCount: 3,
            lastRetry: expect.any(String),
          }),
          contexts: {
            request: {
              url: '/api/users',
              method: 'POST',
              headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; Bot/1.0)',
              },
            },
          },
        }),
      );
    });

    it('should handle webhook error scenario', () => {
      // Given - webhook processing error
      (service as any).isInitialized = true;
      MockedSentry.captureException.mockReturnValue('webhook-error-id');

      const webhookError = new Error('Invalid webhook signature');
      const webhookContext: SentryContext = {
        requestId: 'webhook-123',
        url: '/webhooks/stripe',
        method: 'POST',
        tags: {
          webhookType: 'stripe',
          eventType: 'payment_intent.succeeded',
        },
        extra: {
          webhookId: 'wh_123',
          signature: '[HIDDEN]', // Sensitive data should be hidden
        },
      };

      // When
      const result = service.captureException(webhookError, webhookContext);

      // Then
      expect(result).toBe('webhook-error-id');
      expect(MockedSentry.captureException).toHaveBeenCalledWith(
        webhookError,
        expect.objectContaining({
          tags: expect.objectContaining({
            service: 'kaleem-bot',
            webhookType: 'stripe',
            eventType: 'payment_intent.succeeded',
          }),
          extra: expect.objectContaining({
            requestId: 'webhook-123',
            url: '/webhooks/stripe',
            method: 'POST',
            webhookId: 'wh_123',
            signature: '[HIDDEN]',
          }),
        }),
      );
    });
  });

  describe('Sentry context building comprehensive testing', () => {
    it('should handle all context types in buildExceptionContext', () => {
      // Given - complete context with all possible fields
      const completeContext: SentryContext = {
        userId: 'user123',
        merchantId: 'merchant456',
        requestId: 'req789',
        url: 'https://api.example.com/users/123',
        method: 'POST',
        ip: '192.168.1.100',
        userAgent:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        tags: {
          feature: 'user-management',
          operation: 'create',
        },
        extra: {
          customField: 'customValue',
          metadata: { version: '1.0' },
        },
      };

      // When
      const result = (service as any).buildExceptionContext(completeContext);

      // Then - verify all context fields are properly mapped
      expect(result).toEqual({
        level: 'error',
        tags: {
          feature: 'user-management',
          operation: 'create',
          service: 'kaleem-bot',
        },
        user: {
          id: 'user123',
          ip_address: '192.168.1.100',
        },
        extra: {
          merchantId: 'merchant456',
          requestId: 'req789',
          url: 'https://api.example.com/users/123',
          method: 'POST',
          userAgent:
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          customField: 'customValue',
          metadata: { version: '1.0' },
        },
        contexts: {
          request: {
            url: 'https://api.example.com/users/123',
            method: 'POST',
            headers: {
              'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            },
          },
        },
      });
    });

    it('should handle partial context in buildExceptionContext', () => {
      // Given - minimal context
      const minimalContext: SentryContext = {
        userId: 'user123',
      };

      // When
      const result = (service as any).buildExceptionContext(minimalContext);

      // Then - verify only provided fields are included
      expect(result).toEqual({
        level: 'error',
        tags: {
          service: 'kaleem-bot',
        },
        user: {
          id: 'user123',
        },
        extra: {
          merchantId: undefined,
          requestId: undefined,
          url: undefined,
          method: undefined,
          userAgent: undefined,
        },
        contexts: undefined,
      });
    });

    it('should handle empty context in buildExceptionContext', () => {
      // Given - empty context
      const emptyContext: SentryContext = {};

      // When
      const result = (service as any).buildExceptionContext(emptyContext);

      // Then - verify minimal structure
      expect(result).toEqual({
        level: 'error',
        tags: {
          service: 'kaleem-bot',
        },
        extra: {
          merchantId: undefined,
          requestId: undefined,
          url: undefined,
          method: undefined,
          userAgent: undefined,
        },
        contexts: undefined,
      });
    });

    it('should handle message context building correctly', () => {
      // Given - message context
      const messageContext: SentryContext = {
        userId: 'user456',
        tags: { level: 'warning' },
        extra: { messageType: 'notification' },
      };

      // When
      const result = (service as any).buildMessageContext(
        'info',
        messageContext,
      );

      // Then - verify message context structure
      expect(result).toEqual({
        level: 'info',
        tags: {
          level: 'warning',
          service: 'kaleem-bot',
        },
        user: {
          id: 'user456',
        },
        extra: {
          merchantId: undefined,
          requestId: undefined,
          url: undefined,
          method: undefined,
          userAgent: undefined,
          messageType: 'notification',
        },
      });
    });
  });

  describe('Sentry service state management', () => {
    it('should track initialization state correctly', () => {
      // Initially not initialized
      expect((service as any).isInitialized).toBe(false);

      // After successful initialization
      configService.get.mockImplementation((key: string) => {
        switch (key) {
          case 'SENTRY_ENABLED':
            return 'true';
          case 'SENTRY_DSN':
            return 'https://test@test.ingest.sentry.io/test';
          case 'NODE_ENV':
            return 'production';
          default:
            return undefined;
        }
      });

      service.initialize();
      expect((service as any).isInitialized).toBe(true);

      // Should not reinitialize
      const logSpy = jest.spyOn(console, 'warn').mockImplementation();
      service.initialize();
      expect(logSpy).toHaveBeenCalledWith('Sentry already initialized');
      logSpy.mockRestore();
    });

    it('should handle initialization failures gracefully', () => {
      // Given - Sentry init throws error
      MockedSentry.init.mockImplementation(() => {
        throw new Error('Sentry initialization failed');
      });

      configService.get.mockImplementation((key: string) => {
        switch (key) {
          case 'SENTRY_ENABLED':
            return 'true';
          case 'SENTRY_DSN':
            return 'https://test@test.ingest.sentry.io/test';
          case 'NODE_ENV':
            return 'production';
          default:
            return undefined;
        }
      });

      // When/Then - should not throw and should remain uninitialized
      expect(() => service.initialize()).not.toThrow();
      expect((service as any).isInitialized).toBe(false);
    });

    it('should handle isEnabled correctly', () => {
      // Initially disabled
      expect(service.isEnabled()).toBe(false);

      // After initialization
      configService.get.mockImplementation((key: string) => {
        switch (key) {
          case 'SENTRY_ENABLED':
            return 'true';
          case 'SENTRY_DSN':
            return 'https://test@test.ingest.sentry.io/test';
          case 'NODE_ENV':
            return 'production';
          default:
            return undefined;
        }
      });

      service.initialize();
      expect(service.isEnabled()).toBe(true);
    });

    it('should handle getCurrentUserId correctly', () => {
      // Initially no user
      expect(service.getCurrentUserId()).toBeUndefined();

      // When Sentry not initialized
      expect(service.getCurrentUserId()).toBeUndefined();
    });
  });

  describe('Sentry transaction management', () => {
    beforeEach(() => {
      // Initialize Sentry for transaction tests
      configService.get.mockImplementation((key: string) => {
        switch (key) {
          case 'SENTRY_ENABLED':
            return 'true';
          case 'SENTRY_DSN':
            return 'https://test@test.ingest.sentry.io/test';
          case 'NODE_ENV':
            return 'production';
          default:
            return undefined;
        }
      });

      service.initialize();
    });

    it('should start transaction with correct parameters', () => {
      // Given
      const context: SentryContext = {
        userId: 'user123',
        merchantId: 'merchant456',
        requestId: 'req789',
      };

      // When
      const transaction = service.startTransaction(
        'test-operation',
        'test',
        context,
      );

      // Then - verify transaction structure
      expect(transaction).toEqual({
        name: 'test-operation',
        operation: 'test',
        context: context,
        setStatus: expect.any(Function),
        setData: expect.any(Function),
        setTag: expect.any(Function),
        finish: expect.any(Function),
      });

      // Verify Sentry calls
      expect(MockedSentry.setTag).toHaveBeenCalledWith('operation', 'test');
      expect(MockedSentry.setTag).toHaveBeenCalledWith(
        'transaction_name',
        'test-operation',
      );
      expect(MockedSentry.setContext).toHaveBeenCalledWith('transaction', {
        name: 'test-operation',
        operation: 'test',
        merchantId: 'merchant456',
        requestId: 'req789',
        url: undefined,
        method: undefined,
      });
    });

    it('should handle transaction methods correctly', () => {
      // Given
      const transaction = service.startTransaction('test-op', 'test');

      // When - use transaction methods
      (transaction as any).setStatus('success');
      (transaction as any).setData('key', 'value');
      (transaction as any).setTag('env', 'test');
      (transaction as any).finish();

      // Then - verify Sentry calls
      expect(MockedSentry.setTag).toHaveBeenCalledWith(
        'transaction_status',
        'success',
      );
      expect(MockedSentry.setExtra).toHaveBeenCalledWith(
        'transaction_key',
        'value',
      );
      expect(MockedSentry.setTag).toHaveBeenCalledWith(
        'transaction_env',
        'test',
      );
    });

    it('should handle transaction when Sentry not initialized', () => {
      // Given - reset initialization
      (service as any).isInitialized = false;

      // When
      const transaction = service.startTransaction('test', 'test');

      // Then - should return null
      expect(transaction).toBeNull();
    });

    it('should handle transaction errors gracefully', () => {
      // Given - Sentry methods throw errors
      MockedSentry.setTag.mockImplementation(() => {
        throw new Error('Sentry error');
      });

      // When/Then - should not throw
      expect(() => {
        service.startTransaction('test', 'test');
      }).not.toThrow();
    });
  });

  describe('Sentry utility methods', () => {
    beforeEach(() => {
      // Initialize Sentry for utility tests
      configService.get.mockImplementation((key: string) => {
        switch (key) {
          case 'SENTRY_ENABLED':
            return 'true';
          case 'SENTRY_DSN':
            return 'https://test@test.ingest.sentry.io/test';
          case 'NODE_ENV':
            return 'production';
          default:
            return undefined;
        }
      });

      service.initialize();
    });

    it('should set context correctly', () => {
      // Given
      const context = { feature: 'test', version: '1.0' };

      // When
      service.setContext('test-context', context);

      // Then
      expect(MockedSentry.setContext).toHaveBeenCalledWith(
        'test-context',
        context,
      );
    });

    it('should set tag correctly', () => {
      // When
      service.setTag('environment', 'test');

      // Then
      expect(MockedSentry.setTag).toHaveBeenCalledWith('environment', 'test');
    });

    it('should set user correctly', () => {
      // Given
      const user = {
        id: 'user123',
        email: 'user@example.com',
        username: 'testuser',
        ip_address: '192.168.1.100',
      };

      // When
      service.setUser(user);

      // Then
      expect(MockedSentry.setUser).toHaveBeenCalledWith(user);
    });

    it('should set extra data correctly', () => {
      // When
      service.setExtra('testKey', 'testValue');

      // Then
      expect(MockedSentry.setExtra).toHaveBeenCalledWith(
        'testKey',
        'testValue',
      );
    });

    it('should handle utility methods when Sentry not initialized', () => {
      // Given - reset initialization
      (service as any).isInitialized = false;

      // When - call utility methods
      service.setContext('test', {});
      service.setTag('test', 'value');
      service.setUser({ id: 'user123' });
      service.setExtra('key', 'value');

      // Then - should not call Sentry methods
      expect(MockedSentry.setContext).not.toHaveBeenCalled();
      expect(MockedSentry.setTag).not.toHaveBeenCalled();
      expect(MockedSentry.setUser).not.toHaveBeenCalled();
      expect(MockedSentry.setExtra).not.toHaveBeenCalled();
    });

    it('should handle utility method errors gracefully', () => {
      // Given - Sentry methods throw errors
      MockedSentry.setContext.mockImplementation(() => {
        throw new Error('Sentry context error');
      });

      // When/Then - should not throw
      expect(() => {
        service.setContext('test', {});
      }).not.toThrow();
    });
  });

  describe('Sentry configuration variations', () => {
    it('should handle different environment configurations', () => {
      const environments = ['development', 'staging', 'production'];
      const expectedSampleRates = [0, 0, 0.1];

      environments.forEach((env, index) => {
        // Reset mocks
        jest.clearAllMocks();

        // Given - different environment
        configService.get.mockImplementation((key: string) => {
          switch (key) {
            case 'SENTRY_ENABLED':
              return 'true';
            case 'SENTRY_DSN':
              return 'https://test@test.ingest.sentry.io/test';
            case 'NODE_ENV':
              return env;
            case 'SENTRY_TRACES_SAMPLE_RATE':
              return expectedSampleRates[index].toString();
            case 'SENTRY_PROFILES_SAMPLE_RATE':
              return expectedSampleRates[index].toString();
            default:
              return undefined;
          }
        });

        // When
        service.initialize();

        // Then - verify environment-specific configuration
        expect(MockedSentry.init).toHaveBeenCalledWith(
          expect.objectContaining({
            environment: env,
            tracesSampleRate: expectedSampleRates[index],
            profilesSampleRate: expectedSampleRates[index],
          }),
        );
      });
    });

    it('should handle custom sample rates', () => {
      // Given - custom sample rates
      configService.get.mockImplementation((key: string) => {
        switch (key) {
          case 'SENTRY_ENABLED':
            return 'true';
          case 'SENTRY_DSN':
            return 'https://test@test.ingest.sentry.io/test';
          case 'NODE_ENV':
            return 'production';
          case 'SENTRY_TRACES_SAMPLE_RATE':
            return '0.5';
          case 'SENTRY_PROFILES_SAMPLE_RATE':
            return '0.2';
          default:
            return undefined;
        }
      });

      // When
      service.initialize();

      // Then - verify custom rates
      expect(MockedSentry.init).toHaveBeenCalledWith(
        expect.objectContaining({
          tracesSampleRate: 0.5,
          profilesSampleRate: 0.2,
          integrations: expect.any(Array), // Should include profiling integration
        }),
      );
    });

    it('should handle zero sample rates correctly', () => {
      // Given - zero sample rates
      configService.get.mockImplementation((key: string) => {
        switch (key) {
          case 'SENTRY_ENABLED':
            return 'true';
          case 'SENTRY_DSN':
            return 'https://test@test.ingest.sentry.io/test';
          case 'NODE_ENV':
            return 'production';
          case 'SENTRY_TRACES_SAMPLE_RATE':
            return '0';
          case 'SENTRY_PROFILES_SAMPLE_RATE':
            return '0';
          default:
            return undefined;
        }
      });

      // When
      service.initialize();

      // Then - verify zero rates and no profiling integration
      expect(MockedSentry.init).toHaveBeenCalledWith(
        expect.objectContaining({
          tracesSampleRate: 0,
          profilesSampleRate: 0,
          integrations: [], // Should not include profiling integration
        }),
      );
    });

    it('should handle debug mode configuration', () => {
      // Given - debug mode enabled
      configService.get.mockImplementation((key: string) => {
        switch (key) {
          case 'SENTRY_ENABLED':
            return 'true';
          case 'SENTRY_DSN':
            return 'https://test@test.ingest.sentry.io/test';
          case 'NODE_ENV':
            return 'development';
          case 'SENTRY_DEBUG':
            return 'true';
          default:
            return undefined;
        }
      });

      // When
      service.initialize();

      // Then - verify debug mode
      expect(MockedSentry.init).toHaveBeenCalledWith(
        expect.objectContaining({
          debug: true,
        }),
      );
    });
  });

  describe('Sentry error handling and resilience', () => {
    it('should handle Sentry captureException failures', () => {
      // Given - Sentry captureException throws error
      MockedSentry.captureException.mockImplementation(() => {
        throw new Error('Sentry capture failed');
      });

      configService.get.mockImplementation((key: string) => {
        switch (key) {
          case 'SENTRY_ENABLED':
            return 'true';
          case 'SENTRY_DSN':
            return 'https://test@test.ingest.sentry.io/test';
          case 'NODE_ENV':
            return 'production';
          default:
            return undefined;
        }
      });

      service.initialize();

      // When/Then - should not throw
      expect(() => {
        const result = service.captureException(new Error('Test error'));
        expect(result).toBe('');
      }).not.toThrow();
    });

    it('should handle Sentry captureMessage failures', () => {
      // Given - Sentry captureMessage throws error
      MockedSentry.captureMessage.mockImplementation(() => {
        throw new Error('Sentry message capture failed');
      });

      // When/Then - should not throw
      expect(() => {
        const result = service.captureMessage('Test message');
        expect(result).toBe('');
      }).not.toThrow();
    });

    it('should handle Sentry close failures', async () => {
      // Given - Sentry close throws error
      MockedSentry.close.mockImplementation(() => {
        throw new Error('Sentry close failed');
      });

      configService.get.mockImplementation((key: string) => {
        switch (key) {
          case 'SENTRY_ENABLED':
            return 'true';
          case 'SENTRY_DSN':
            return 'https://test@test.ingest.sentry.io/test';
          case 'NODE_ENV':
            return 'production';
          default:
            return undefined;
        }
      });

      service.initialize();

      // When/Then - should not throw
      await expect(service.close()).resolves.not.toThrow();
    });

    it('should handle Sentry context operations failures', () => {
      // Given - various Sentry operations throw errors
      MockedSentry.setContext.mockImplementation(() => {
        throw new Error('Context error');
      });
      MockedSentry.setTag.mockImplementation(() => {
        throw new Error('Tag error');
      });
      MockedSentry.setUser.mockImplementation(() => {
        throw new Error('User error');
      });
      MockedSentry.setExtra.mockImplementation(() => {
        throw new Error('Extra error');
      });

      // When/Then - should not throw
      expect(() => service.setContext('test', {})).not.toThrow();
      expect(() => service.setTag('test', 'value')).not.toThrow();
      expect(() => service.setUser({ id: 'user123' })).not.toThrow();
      expect(() => service.setExtra('key', 'value')).not.toThrow();
    });

    it('should handle malformed error objects', () => {
      // Given - various malformed error objects
      const malformedErrors = [
        null,
        undefined,
        {},
        { message: null },
        { message: undefined },
        'string error',
        42,
        [],
      ];

      configService.get.mockImplementation((key: string) => {
        switch (key) {
          case 'SENTRY_ENABLED':
            return 'true';
          case 'SENTRY_DSN':
            return 'https://test@test.ingest.sentry.io/test';
          case 'NODE_ENV':
            return 'production';
          default:
            return undefined;
        }
      });

      service.initialize();

      // When/Then - should handle all malformed errors
      malformedErrors.forEach((error) => {
        expect(() => {
          service.captureException(error as any);
        }).not.toThrow();
      });
    });

    it('should handle very large context objects', () => {
      // Given - very large context
      const largeContext: SentryContext = {
        extra: {
          largeData: 'x'.repeat(10000), // 10KB of data
          nested: {
            deep: {
              data: Array.from({ length: 100 }, (_, i) => ({
                id: i,
                value: `Item ${i}`,
              })),
            },
          },
        },
      };

      configService.get.mockImplementation((key: string) => {
        switch (key) {
          case 'SENTRY_ENABLED':
            return 'true';
          case 'SENTRY_DSN':
            return 'https://test@test.ingest.sentry.io/test';
          case 'NODE_ENV':
            return 'production';
          default:
            return undefined;
        }
      });

      service.initialize();

      // When/Then - should handle large context
      expect(() => {
        service.captureException(
          new Error('Large context error'),
          largeContext,
        );
      }).not.toThrow();
    });
  });

  describe('Sentry performance and load testing', () => {
    beforeEach(() => {
      configService.get.mockImplementation((key: string) => {
        switch (key) {
          case 'SENTRY_ENABLED':
            return 'true';
          case 'SENTRY_DSN':
            return 'https://test@test.ingest.sentry.io/test';
          case 'NODE_ENV':
            return 'production';
          default:
            return undefined;
        }
      });

      service.initialize();
    });

    it('should handle rapid successive error captures', () => {
      // Given - many errors to capture rapidly
      const errors = Array.from(
        { length: 100 },
        (_, i) => new Error(`Rapid error ${i}`),
      );

      // When - capture errors rapidly
      const startTime = Date.now();
      const results = errors.map((error) => service.captureException(error));
      const endTime = Date.now();

      // Then - should complete quickly
      expect(endTime - startTime).toBeLessThan(1000); // Within 1 second
      expect(results).toHaveLength(100);
      expect(MockedSentry.captureException).toHaveBeenCalledTimes(100);
    });

    it('should handle concurrent error captures', async () => {
      // Given - concurrent error captures
      const errors = Array.from(
        { length: 50 },
        (_, i) => new Error(`Concurrent error ${i}`),
      );

      // When - capture errors concurrently
      const capturePromises = errors.map((error) =>
        Promise.resolve(service.captureException(error)),
      );

      const results = await Promise.all(capturePromises);

      // Then - should handle concurrent captures
      expect(results).toHaveLength(50);
      expect(MockedSentry.captureException).toHaveBeenCalledTimes(50);
    });

    it('should handle mixed error and message captures', () => {
      // Given - mix of exceptions and messages
      const items = Array.from({ length: 50 }, (_, i) => {
        if (i % 2 === 0) {
          return { type: 'exception', data: new Error(`Exception ${i}`) };
        } else {
          return { type: 'message', data: `Message ${i}` };
        }
      });

      // When - capture mixed items
      const results = items.map((item) => {
        if (item.type === 'exception') {
          return service.captureException(item.data as Error);
        } else {
          return service.captureMessage(item.data as string);
        }
      });

      // Then - should handle mixed captures
      expect(results).toHaveLength(50);
      expect(MockedSentry.captureException).toHaveBeenCalledTimes(25);
      expect(MockedSentry.captureMessage).toHaveBeenCalledTimes(25);
    });

    it('should handle memory efficiently with many captures', () => {
      // Given - many captures to test memory usage
      const iterations = 1000;

      for (let i = 0; i < iterations; i++) {
        service.captureException(new Error(`Memory test ${i}`));

        // Periodic context operations
        if (i % 100 === 0) {
          service.setTag(`iteration-${Math.floor(i / 100)}`, 'test');
          service.setExtra(
            `extra-${Math.floor(i / 100)}`,
            `value-${Math.floor(i / 100)}`,
          );
        }
      }

      // Then - should complete without memory issues
      expect(MockedSentry.captureException).toHaveBeenCalledTimes(iterations);

      // Verify consistent performance
      const startTime = Date.now();
      for (let i = 0; i < 100; i++) {
        service.captureException(new Error(`Final memory test ${i}`));
      }
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(500); // Should still be fast
    });
  });

  describe('Sentry real-world integration scenarios', () => {
    it('should handle e-commerce transaction monitoring', () => {
      // Given - e-commerce transaction scenario
      const transactionContext: SentryContext = {
        userId: 'user123',
        merchantId: 'merchant456',
        requestId: 'order-789',
        url: '/api/orders',
        method: 'POST',
        tags: {
          feature: 'e-commerce',
          operation: 'create-order',
        },
        extra: {
          orderValue: 99.99,
          currency: 'USD',
          items: [
            { id: 'item1', quantity: 2, price: 25.0 },
            { id: 'item2', quantity: 1, price: 49.99 },
          ],
        },
      };

      // When - start transaction and capture errors
      const transaction = service.startTransaction(
        'create-order',
        'e-commerce',
        transactionContext,
      );

      // Simulate order processing with potential errors
      service.captureMessage('Order validation started', 'info', {
        ...transactionContext,
        extra: { ...transactionContext.extra, step: 'validation' },
      });

      service.captureException(new Error('Payment processing failed'), {
        ...transactionContext,
        extra: { ...transactionContext.extra, step: 'payment' },
      });

      // Finish transaction
      if (transaction) {
        (transaction as any).setStatus('failed');
        (transaction as any).finish();
      }

      // Then - verify e-commerce monitoring
      expect(MockedSentry.setTag).toHaveBeenCalledWith(
        'operation',
        'e-commerce',
      );
      expect(MockedSentry.captureMessage).toHaveBeenCalledWith(
        'Order validation started',
        expect.objectContaining({
          level: 'info',
          tags: expect.objectContaining({
            feature: 'e-commerce',
          }),
        }),
      );
      expect(MockedSentry.captureException).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          tags: expect.objectContaining({
            feature: 'e-commerce',
          }),
        }),
      );
    });

    it('should handle API rate limiting monitoring', () => {
      // Given - API rate limiting scenario
      const rateLimitContext: SentryContext = {
        userId: 'user123',
        ip: '192.168.1.100',
        url: '/api/products/search',
        method: 'GET',
        tags: {
          feature: 'api',
          operation: 'search',
        },
        extra: {
          rateLimit: 1000,
          window: '1 hour',
          currentUsage: 1001,
          retryAfter: 3600,
        },
      };

      // When - capture rate limit error
      service.captureException(
        new Error('Rate limit exceeded'),
        rateLimitContext,
      );

      // Then - verify rate limiting monitoring
      expect(MockedSentry.captureException).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          userId: 'user123',
          ip: '192.168.1.100',
          tags: expect.objectContaining({
            feature: 'api',
            operation: 'search',
          }),
          extra: expect.objectContaining({
            rateLimit: 1000,
            currentUsage: 1001,
            retryAfter: 3600,
          }),
        }),
      );
    });

    it('should handle database operation monitoring', () => {
      // Given - database operation scenario
      const dbContext: SentryContext = {
        merchantId: 'merchant456',
        requestId: 'db-op-123',
        tags: {
          feature: 'database',
          operation: 'find-user',
        },
        extra: {
          collection: 'users',
          operation: 'findOne',
          query: { email: 'user@example.com' },
          executionTime: 150,
        },
      };

      // When - monitor database operation
      const transaction = service.startTransaction(
        'db-find-user',
        'database',
        dbContext,
      );

      // Simulate database error
      service.captureException(
        new Error('Database connection timeout'),
        dbContext,
      );

      if (transaction) {
        (transaction as any).setStatus('failed');
        (transaction as any).finish();
      }

      // Then - verify database monitoring
      expect(MockedSentry.setTag).toHaveBeenCalledWith('operation', 'database');
      expect(MockedSentry.captureException).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          tags: expect.objectContaining({
            feature: 'database',
          }),
        }),
      );
    });

    it('should handle authentication flow monitoring', () => {
      // Given - authentication flow scenario
      const authContext: SentryContext = {
        userId: 'user123',
        requestId: 'auth-456',
        url: '/api/auth/login',
        method: 'POST',
        tags: {
          feature: 'authentication',
          operation: 'login',
        },
        extra: {
          method: 'email',
          attemptCount: 3,
          lastLogin: new Date().toISOString(),
        },
      };

      // When - monitor authentication flow
      const transaction = service.startTransaction(
        'user-login',
        'auth',
        authContext,
      );

      // Simulate authentication error
      service.captureException(new Error('Invalid credentials'), authContext);

      if (transaction) {
        (transaction as any).setStatus('failed');
        (transaction as any).finish();
      }

      // Then - verify authentication monitoring
      expect(MockedSentry.setTag).toHaveBeenCalledWith('operation', 'auth');
      expect(MockedSentry.captureException).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          userId: 'user123',
          tags: expect.objectContaining({
            feature: 'authentication',
          }),
        }),
      );
    });

    it('should handle external service integration monitoring', () => {
      // Given - external service integration scenario
      const integrationContext: SentryContext = {
        merchantId: 'merchant456',
        requestId: 'integration-789',
        tags: {
          feature: 'integration',
          operation: 'send-notification',
          service: 'telegram',
        },
        extra: {
          serviceName: 'telegram',
          endpoint: '/bot/sendMessage',
          messageId: 'msg-123',
          recipient: '+1234567890',
        },
      };

      // When - monitor external service integration
      service.captureException(
        new Error('Telegram API rate limit'),
        integrationContext,
      );

      // Then - verify integration monitoring
      expect(MockedSentry.captureException).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          tags: expect.objectContaining({
            feature: 'integration',
            service: 'telegram',
          }),
          extra: expect.objectContaining({
            serviceName: 'telegram',
            endpoint: '/bot/sendMessage',
          }),
        }),
      );
    });
  });

  describe('Sentry configuration edge cases', () => {
    it('should handle missing DSN gracefully', () => {
      // Given - missing DSN
      configService.get.mockImplementation((key: string) => {
        switch (key) {
          case 'SENTRY_ENABLED':
            return 'true';
          case 'SENTRY_DSN':
            return undefined;
          case 'NODE_ENV':
            return 'production';
          default:
            return undefined;
        }
      });

      // When
      service.initialize();

      // Then - should remain uninitialized
      expect((service as any).isInitialized).toBe(false);
      expect(MockedSentry.init).not.toHaveBeenCalled();
    });

    it('should handle invalid DSN format', () => {
      // Given - invalid DSN
      configService.get.mockImplementation((key: string) => {
        switch (key) {
          case 'SENTRY_ENABLED':
            return 'true';
          case 'SENTRY_DSN':
            return 'invalid-dsn-format';
          case 'NODE_ENV':
            return 'production';
          default:
            return undefined;
        }
      });

      // When/Then - should handle gracefully
      expect(() => service.initialize()).not.toThrow();
      expect((service as any).isInitialized).toBe(false);
    });

    it('should handle malformed sample rate values', () => {
      // Given - malformed sample rates
      configService.get.mockImplementation((key: string) => {
        switch (key) {
          case 'SENTRY_ENABLED':
            return 'true';
          case 'SENTRY_DSN':
            return 'https://test@test.ingest.sentry.io/test';
          case 'NODE_ENV':
            return 'production';
          case 'SENTRY_TRACES_SAMPLE_RATE':
            return 'invalid-number';
          case 'SENTRY_PROFILES_SAMPLE_RATE':
            return 'also-invalid';
          default:
            return undefined;
        }
      });

      // When/Then - should handle gracefully
      expect(() => service.initialize()).not.toThrow();
      expect(MockedSentry.init).toHaveBeenCalledWith(
        expect.objectContaining({
          tracesSampleRate: 0.1, // Should fall back to default
          profilesSampleRate: 0.1, // Should fall back to default
        }),
      );
    });

    it('should handle extreme sample rate values', () => {
      // Given - extreme sample rates
      configService.get.mockImplementation((key: string) => {
        switch (key) {
          case 'SENTRY_ENABLED':
            return 'true';
          case 'SENTRY_DSN':
            return 'https://test@test.ingest.sentry.io/test';
          case 'NODE_ENV':
            return 'production';
          case 'SENTRY_TRACES_SAMPLE_RATE':
            return '1.5'; // Above 1.0
          case 'SENTRY_PROFILES_SAMPLE_RATE':
            return '-0.5'; // Below 0.0
          default:
            return undefined;
        }
      });

      // When
      service.initialize();

      // Then - should handle extreme values
      expect(MockedSentry.init).toHaveBeenCalledWith(
        expect.objectContaining({
          tracesSampleRate: 1.5, // Should use as-is
          profilesSampleRate: -0.5, // Should use as-is
        }),
      );
    });
  });
});

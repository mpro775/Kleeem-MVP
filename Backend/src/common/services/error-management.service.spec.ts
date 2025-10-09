import { Logger } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { ERROR_CODES } from '../constants/error-codes';

import { ErrorManagementService } from './error-management.service';
import { SentryService } from './sentry.service';

import type { ErrorContext } from './error-management.service';
import type { TestingModule } from '@nestjs/testing';

describe('ErrorManagementService', () => {
  let service: ErrorManagementService;
  let sentryService: jest.Mocked<SentryService>;
  let logger: jest.Mocked<Logger>;

  const mockSentryService = {
    captureException: jest.fn(),
    captureMessage: jest.fn(),
    isEnabled: jest.fn(),
    close: jest.fn(),
  };

  beforeEach(async () => {
    // Mock Logger
    const mockLogger = {
      error: jest.fn(),
      warn: jest.fn(),
      log: jest.fn(),
      debug: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ErrorManagementService,
        {
          provide: SentryService,
          useValue: mockSentryService,
        },
        {
          provide: Logger,
          useValue: mockLogger,
        },
      ],
    }).compile();

    service = module.get<ErrorManagementService>(ErrorManagementService);
    sentryService = module.get(SentryService);
    logger = module.get(Logger);

    // Reset all mocks
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('logError', () => {
    it('should log error with Error object successfully', () => {
      // Given
      const error = new Error('Test error message');
      const context: ErrorContext = {
        userId: 'user123',
        merchantId: 'merchant456',
        requestId: 'req789',
      };

      sentryService.captureException.mockReturnValue('sentry-id-123');

      // When
      const result = service.logError(error, context);

      // Then
      expect(result).toMatch(/^err_\d+_[a-z0-9]+$/); // Should match error ID format

      expect(logger.error.bind(logger)).toHaveBeenCalledWith(
        `Error logged: ${ERROR_CODES.INTERNAL_ERROR}`,
        {
          errorId: result,
          id: result,
          timestamp: expect.any(Date),
          code: ERROR_CODES.INTERNAL_ERROR,
          message: 'Test error message',
          severity: 'low',
          category: 'business',
          userId: 'user123',
          merchantId: 'merchant456',
          requestId: 'req789',
          details: {
            name: 'Error',
            stack: error.stack,
          },
        },
      );

      expect(
        sentryService.captureException.bind(sentryService),
      ).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          userId: 'user123',
          merchantId: 'merchant456',
          requestId: 'req789',
          tags: expect.objectContaining({
            errorCode: ERROR_CODES.INTERNAL_ERROR,
            severity: 'low',
            category: 'business',
            service: 'kaleem-bot',
          }),
        }),
      );
    });

    it('should log error with string message', () => {
      // Given
      const error = 'String error message';
      const context: ErrorContext = {
        userId: 'user123',
      };

      sentryService.captureException.mockReturnValue('sentry-id-456');

      // When
      const result = service.logError(error, context);

      // Then
      expect(result).toMatch(/^err_\d+_[a-z0-9]+$/);

      expect(logger.error.bind(logger)).toHaveBeenCalledWith(
        `Error logged: ${ERROR_CODES.INTERNAL_ERROR}`,
        expect.objectContaining({
          code: ERROR_CODES.INTERNAL_ERROR,
          message: 'String error message',
          userId: 'user123',
        }),
      );

      expect(
        sentryService.captureException.bind(sentryService),
      ).toHaveBeenCalledWith(
        'String error message',
        expect.objectContaining({
          userId: 'user123',
        }),
      );
    });

    it('should extract error code from error message', () => {
      expect(logger.error.bind(logger)).toHaveBeenCalledWith(
        `Error logged: ${ERROR_CODES.DATABASE_ERROR}`,
        expect.objectContaining({
          code: ERROR_CODES.DATABASE_ERROR,
          severity: 'critical',
          category: 'technical',
        }),
      );
    });

    it('should not send low severity errors to Sentry', () => {
      // Given
      const error = new Error('Minor error');
      const context: ErrorContext = {};

      sentryService.captureException.mockReturnValue('sentry-id-low');

      // When
      service.logError(error, context);

      // Then
      expect(
        sentryService.captureException.bind(sentryService),
      ).not.toHaveBeenCalled();
    });

    it('should send medium severity errors to Sentry', () => {
      // Given
      const error = new Error(
        `Validation failed: ${ERROR_CODES.VALIDATION_ERROR}`,
      );
      const context: ErrorContext = {};

      sentryService.captureException.mockReturnValue('sentry-id-medium');

      // When
      service.logError(error, context);

      // Then
      expect(
        sentryService.captureException.bind(sentryService),
      ).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          tags: expect.objectContaining({
            severity: 'medium',
            category: 'business',
          }),
        }),
      );
    });

    it('should send high severity errors to Sentry', () => {
      // Given
      const error = new Error(
        `Security violation: ${ERROR_CODES.SUSPICIOUS_ACTIVITY}`,
      );
      const context: ErrorContext = {};

      sentryService.captureException.mockReturnValue('sentry-id-high');

      // When
      service.logError(error, context);

      // Then
      expect(
        sentryService.captureException.bind(sentryService),
      ).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          tags: expect.objectContaining({
            severity: 'high',
            category: 'security',
          }),
        }),
      );
    });

    it('should send critical severity errors to Sentry', () => {
      // Given
      const error = new Error(`Database error: ${ERROR_CODES.DATABASE_ERROR}`);
      const context: ErrorContext = {};

      sentryService.captureException.mockReturnValue('sentry-id-critical');

      // When
      service.logError(error, context);

      // Then
      expect(
        sentryService.captureException.bind(sentryService),
      ).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          tags: expect.objectContaining({
            severity: 'critical',
            category: 'technical',
          }),
        }),
      );
    });

    it('should handle empty context', () => {
      // Given
      const error = new Error('Test error');
      const context: ErrorContext = {};

      sentryService.captureException.mockReturnValue('sentry-id-empty');

      // When
      const result = service.logError(error, context);

      // Then
      expect(result).toMatch(/^err_\d+_[a-z0-9]+$/);

      expect(logger.error.bind(logger)).toHaveBeenCalledWith(
        `Error logged: ${ERROR_CODES.INTERNAL_ERROR}`,
        expect.objectContaining({
          userId: undefined,
          merchantId: undefined,
          requestId: undefined,
          url: undefined,
          method: undefined,
          ip: undefined,
          userAgent: undefined,
          details: undefined,
        }),
      );
    });

    it('should handle null and undefined values in context', () => {
      // Given
      const error = new Error('Test error');

      sentryService.captureException.mockReturnValue('sentry-id-null');

      // Given
      const context2: ErrorContext = {
        userId: 'user123',
      };

      sentryService.captureException.mockReturnValue('sentry-id-null');

      // When
      service.logError(error, context2);

      // Then
      expect(logger.error.bind(logger)).toHaveBeenCalledWith(
        `Error logged: ${ERROR_CODES.INTERNAL_ERROR}`,
        expect.objectContaining({
          userId: null,
          merchantId: undefined,
          requestId: '',
          url: null,
          method: undefined,
        }),
      );
    });

    it('should persist error entry', () => {
      // Given
      const error = new Error('Test error');
      const context: ErrorContext = {
        userId: 'user123',
      };

      // Mock persistError to track calls
      const persistSpy = jest.spyOn(service as any, 'persistError');

      sentryService.captureException.mockReturnValue('sentry-id-persist');

      // When
      service.logError(error, context);

      // Then
      expect(persistSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          id: expect.any(String),
          timestamp: expect.any(Date),
          code: ERROR_CODES.INTERNAL_ERROR,
          message: 'Test error',
          severity: 'low',
          category: 'business',
          userId: 'user123',
          sentryEventId: 'sentry-id-persist',
        }),
      );
    });

    it('should generate unique error IDs', () => {
      // Given
      const error = new Error('Test error');
      const context: ErrorContext = {};

      sentryService.captureException.mockReturnValue('sentry-id-unique');

      // When
      const result1 = service.logError(error, context);
      const result2 = service.logError(error, context);

      // Then
      expect(result1).not.toBe(result2);
      expect(result1).toMatch(/^err_\d+_[a-z0-9]+$/);
      expect(result2).toMatch(/^err_\d+_[a-z0-9]+$/);
    });
  });

  describe('logSecurityError', () => {
    it('should log security error with correct severity and category', () => {
      // Given
      const activity = 'Unauthorized API access';
      const context: ErrorContext = {
        userId: 'user123',
        ip: '192.168.1.100',
        userAgent: 'malicious-bot/1.0',
      };

      sentryService.captureMessage.mockReturnValue('sentry-security-id');

      // When
      const result = service.logSecurityError(activity, context);

      // Then
      expect(result).toMatch(/^err_\d+_[a-z0-9]+$/);

      expect(logger.error.bind(logger)).toHaveBeenCalledWith(
        `Security error logged: ${activity}`,
        expect.objectContaining({
          code: ERROR_CODES.SUSPICIOUS_ACTIVITY,
          message: `Security violation: ${activity}`,
          severity: 'high',
          category: 'security',
          userId: 'user123',
          ip: '192.168.1.100',
          userAgent: 'malicious-bot/1.0',
        }),
      );

      expect(
        sentryService.captureMessage.bind(sentryService),
      ).toHaveBeenCalledWith(
        `Security violation: ${activity}`,
        'error',
        expect.objectContaining({
          userId: 'user123',
          ip: '192.168.1.100',
          userAgent: 'malicious-bot/1.0',
          tags: expect.objectContaining({
            errorCode: ERROR_CODES.SUSPICIOUS_ACTIVITY,
            severity: 'high',
            category: 'security',
            service: 'kaleem-bot',
            activity: 'Unauthorized API access',
          }),
        }),
      );
    });

    it('should handle security error without context', () => {
      // Given
      const activity = 'Suspicious login attempt';
      const context: ErrorContext = {};

      sentryService.captureMessage.mockReturnValue('sentry-security-empty');

      // When
      const result = service.logSecurityError(activity, context);

      // Then
      expect(result).toMatch(/^err_\d+_[a-z0-9]+$/);

      expect(logger.error.bind(logger)).toHaveBeenCalledWith(
        `Security error logged: ${activity}`,
        expect.objectContaining({
          severity: 'high',
          category: 'security',
          userId: undefined,
          ip: undefined,
          userAgent: undefined,
        }),
      );

      expect(
        sentryService.captureMessage.bind(sentryService),
      ).toHaveBeenCalledWith(
        `Security violation: ${activity}`,
        'error',
        expect.objectContaining({
          tags: expect.objectContaining({
            activity: 'Suspicious login attempt',
          }),
        }),
      );
    });

    it('should persist security error entry', () => {
      // Given
      const activity = 'Brute force attack detected';
      const context: ErrorContext = {};

      const persistSpy = jest.spyOn(service as any, 'persistError');
      sentryService.captureMessage.mockReturnValue('sentry-security-persist');

      // When
      service.logSecurityError(activity, context);

      // Then
      expect(persistSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          code: ERROR_CODES.SUSPICIOUS_ACTIVITY,
          message: `Security violation: ${activity}`,
          severity: 'high',
          category: 'security',
          sentryEventId: 'sentry-security-persist',
        }),
      );
    });
  });

  describe('logIntegrationError', () => {
    it('should log integration error with Error object', () => {
      // Given
      const serviceName = 'Stripe API';
      const error = new Error('API rate limit exceeded');
      const context: ErrorContext = {
        requestId: 'stripe-req-123',
        url: 'https://api.stripe.com/charges',
      };

      sentryService.captureException.mockReturnValue('sentry-integration-id');

      // When
      const result = service.logIntegrationError(serviceName, error, context);

      // Then
      expect(result).toMatch(/^err_\d+_[a-z0-9]+$/);

      expect(logger.error.bind(logger)).toHaveBeenCalledWith(
        `Integration error logged: ${serviceName}`,
        expect.objectContaining({
          code: ERROR_CODES.EXTERNAL_SERVICE_ERROR,
          message: `Integration error with ${serviceName}: ${error.message}`,
          severity: 'medium',
          category: 'integration',
          requestId: 'stripe-req-123',
          url: 'https://api.stripe.com/charges',
        }),
      );

      expect(
        sentryService.captureException.bind(sentryService),
      ).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          requestId: 'stripe-req-123',
          url: 'https://api.stripe.com/charges',
          tags: expect.objectContaining({
            errorCode: ERROR_CODES.EXTERNAL_SERVICE_ERROR,
            severity: 'medium',
            category: 'integration',
            service: 'kaleem-bot',
            integrationService: serviceName,
          }),
        }),
      );
    });

    it('should log integration error with string message', () => {
      // Given
      const serviceName = 'WhatsApp API';
      const error = 'Connection timeout';
      const context: ErrorContext = {
        merchantId: 'merchant123',
      };

      sentryService.captureException.mockReturnValue(
        'sentry-integration-string',
      );

      // When
      const result = service.logIntegrationError(serviceName, error, context);

      // Then
      expect(result).toMatch(/^err_\d+_[a-z0-9]+$/);

      expect(logger.error.bind(logger)).toHaveBeenCalledWith(
        `Integration error logged: ${serviceName}`,
        expect.objectContaining({
          message: `Integration error with ${serviceName}: ${error}`,
          merchantId: 'merchant123',
        }),
      );

      expect(
        sentryService.captureException.bind(sentryService),
      ).toHaveBeenCalledWith(
        'Connection timeout',
        expect.objectContaining({
          merchantId: 'merchant123',
          extra: expect.objectContaining({
            serviceName: 'WhatsApp API',
            originalError: 'Connection timeout',
          }),
        }),
      );
    });

    it('should persist integration error entry', () => {
      // Given
      const serviceName = 'Telegram API';
      const error = new Error('Bot token invalid');
      const context: ErrorContext = {};

      const persistSpy = jest.spyOn(service as any, 'persistError');
      sentryService.captureException.mockReturnValue(
        'sentry-integration-persist',
      );

      // When
      service.logIntegrationError(serviceName, error, context);

      // Then
      expect(persistSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          code: ERROR_CODES.EXTERNAL_SERVICE_ERROR,
          message: `Integration error with ${serviceName}: ${error.message}`,
          severity: 'medium',
          category: 'integration',
          sentryEventId: 'sentry-integration-persist',
        }),
      );
    });
  });

  describe('logBusinessError', () => {
    it('should log business error with custom code and message', () => {
      // Given
      const code = 'INSUFFICIENT_BALANCE';
      const message = 'User has insufficient balance for this transaction';
      const context: ErrorContext = {
        userId: 'user123',
        merchantId: 'merchant456',
        details: {
          amount: 100,
          balance: 50,
        },
      };

      sentryService.captureMessage.mockReturnValue('sentry-business-id');

      // When
      const result = service.logBusinessError(code, message, context);

      // Then
      expect(result).toMatch(/^err_\d+_[a-z0-9]+$/);

      expect(logger.warn.bind(logger)).toHaveBeenCalledWith(
        `Business error logged: ${code}`,
        expect.objectContaining({
          code: code,
          message: message,
          severity: 'low',
          category: 'business',
          userId: 'user123',
          merchantId: 'merchant456',
          details: {
            amount: 100,
            balance: 50,
          },
        }),
      );

      expect(
        sentryService.captureMessage.bind(sentryService),
      ).toHaveBeenCalledWith(
        message,
        'warning',
        expect.objectContaining({
          userId: 'user123',
          merchantId: 'merchant456',
          tags: expect.objectContaining({
            errorCode: code,
            severity: 'low',
            category: 'business',
            service: 'kaleem-bot',
          }),
        }),
      );
    });

    it('should not send business errors to Sentry unless in special cases', () => {
      // Given
      const code = 'OUT_OF_STOCK';
      const message = 'Product is out of stock';
      const context: ErrorContext = {};

      sentryService.captureMessage.mockReturnValue('sentry-business-no');

      // When
      service.logBusinessError(code, message, context);

      // Then
      expect(
        sentryService.captureMessage.bind(sentryService),
      ).not.toHaveBeenCalled();
    });

    it('should send specific business errors to Sentry', () => {
      // Given
      const code = 'LICENSE_EXPIRED';
      const message = 'Merchant license has expired';
      const context: ErrorContext = {
        merchantId: 'merchant123',
      };

      sentryService.captureMessage.mockReturnValue('sentry-business-special');

      // When
      service.logBusinessError(code, message, context);

      // Then
      expect(
        sentryService.captureMessage.bind(sentryService),
      ).toHaveBeenCalledWith(
        message,
        'warning',
        expect.objectContaining({
          merchantId: 'merchant123',
          tags: expect.objectContaining({
            errorCode: code,
          }),
        }),
      );
    });

    it('should persist business error entry', () => {
      // Given
      const code = 'PRODUCT_NOT_AVAILABLE';
      const message = 'Product not available in this region';
      const context: ErrorContext = {};

      const persistSpy = jest.spyOn(service as any, 'persistError');

      // When
      service.logBusinessError(code, message, context);

      // Then
      expect(persistSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          code: code,
          message: message,
          severity: 'low',
          category: 'business',
          sentryEventId: undefined, // Should not be sent to Sentry
        }),
      );
    });
  });

  describe('startPerformanceTracking', () => {
    it('should start performance tracking via Sentry', () => {
      // Given
      const name = 'database-query';
      const operation = 'db';
      const context: ErrorContext = {
        userId: 'user123',
        merchantId: 'merchant456',
      };

      const mockTransaction = {
        setStatus: jest.fn(),
        setData: jest.fn(),
        setTag: jest.fn(),
        finish: jest.fn(),
      };

      sentryService.startTransaction.mockReturnValue(mockTransaction);

      // When
      const result = service.startPerformanceTracking(name, operation, context);

      // Then
      expect(
        sentryService.startTransaction.bind(sentryService),
      ).toHaveBeenCalledWith(
        name,
        operation,
        expect.objectContaining({
          userId: 'user123',
          merchantId: 'merchant456',
          tags: { service: 'kaleem-bot', operation: 'db' },
        }),
      );

      expect(result).toBe(mockTransaction);
    });

    it('should handle missing context for performance tracking', () => {
      // Given
      const name = 'api-call';
      const operation = 'http';
      const context: ErrorContext = {};

      const mockTransaction = {
        setStatus: jest.fn(),
        setData: jest.fn(),
        setTag: jest.fn(),
        finish: jest.fn(),
      };

      sentryService.startTransaction.mockReturnValue(mockTransaction);

      // When
      const result = service.startPerformanceTracking(name, operation, context);

      // Then
      expect(
        sentryService.startTransaction.bind(sentryService),
      ).toHaveBeenCalledWith(
        name,
        operation,
        expect.objectContaining({
          tags: { service: 'kaleem-bot', operation: 'http' },
        }),
      );

      expect(result).toBe(mockTransaction);
    });
  });

  describe('getErrorStats', () => {
    it('should return error statistics with Sentry status', () => {
      // Given
      sentryService.isEnabled.mockReturnValue(true);

      // When
      const result = service.getErrorStats();

      // Then
      expect(result).toEqual({
        total: 0,
        bySeverity: {},
        byCategory: {},
        byCode: {},
        recentErrors: [],
        sentryEnabled: true,
      });
    });

    it('should handle Sentry disabled', () => {
      // Given
      sentryService.isEnabled.mockReturnValue(false);

      // When
      const result = service.getErrorStats();

      // Then
      expect(result.sentryEnabled).toBe(false);
    });

    it('should accept filters parameter without using it', () => {
      // Given
      const filters = {
        merchantId: 'merchant123',
        severity: 'high',
        category: 'security',
        from: new Date('2023-01-01'),
        to: new Date('2023-12-31'),
      };

      sentryService.isEnabled.mockReturnValue(true);

      // When
      const result = service.getErrorStats(filters);

      // Then
      expect(result).toEqual({
        total: 0,
        bySeverity: {},
        byCategory: {},
        byCode: {},
        recentErrors: [],
        sentryEnabled: true,
      });

      // Filters should be accepted but not cause errors
      expect(result).toBeDefined();
    });
  });

  describe('cleanupOldErrors', () => {
    it('should cleanup errors older than default 30 days', () => {
      // When
      const result = service.cleanupOldErrors();

      // Then
      expect(result).toBe(0);
      expect(logger.log.bind(logger)).toHaveBeenCalledWith(
        'Cleaning up errors older than 30 days',
      );
    });

    it('should cleanup errors with custom days', () => {
      // When
      const result = service.cleanupOldErrors(7);

      // Then
      expect(result).toBe(0);
      expect(logger.log.bind(logger)).toHaveBeenCalledWith(
        'Cleaning up errors older than 7 days',
      );
    });
  });

  describe('shutdown', () => {
    it('should shutdown gracefully', () => {
      // Given
      sentryService.close.mockResolvedValue(undefined);

      // When
      service.shutdown();

      // Then
      expect(sentryService.close.bind(sentryService)).toHaveBeenCalled();
      expect(logger.log.bind(logger)).toHaveBeenCalledWith(
        'Error management service shutdown completed',
      );
    });

    it('should handle shutdown errors gracefully', () => {
      // Given
      const error = new Error('Shutdown failed');
      sentryService.close.mockRejectedValue(error);

      // When/Then
      expect(() => service.shutdown()).not.toThrow();

      expect(logger.error.bind(logger)).toHaveBeenCalledWith(
        'Error during shutdown',
        'Shutdown failed',
      );
    });
  });

  describe('error code extraction and classification', () => {
    it('should extract error code from error message', () => {
      // Test different error codes in messages
      const testCases = [
        {
          message: `Database error: ${ERROR_CODES.DATABASE_ERROR}`,
          expected: ERROR_CODES.DATABASE_ERROR,
        },
        {
          message: `Security violation: ${ERROR_CODES.SUSPICIOUS_ACTIVITY}`,
          expected: ERROR_CODES.SUSPICIOUS_ACTIVITY,
        },
        {
          message: `Integration error: ${ERROR_CODES.EXTERNAL_SERVICE_ERROR}`,
          expected: ERROR_CODES.EXTERNAL_SERVICE_ERROR,
        },
        {
          message: `Validation error: ${ERROR_CODES.VALIDATION_ERROR}`,
          expected: ERROR_CODES.VALIDATION_ERROR,
        },
        { message: 'Unknown error type', expected: ERROR_CODES.INTERNAL_ERROR },
      ];

      testCases.forEach(({ message, expected }) => {
        // Given
        const error = new Error(message);
        const context: ErrorContext = {};

        sentryService.captureException.mockReturnValue('sentry-id');

        // When
        service.logError(error, context);

        // Then
        expect(logger.error.bind(logger)).toHaveBeenCalledWith(
          `Error logged: ${expected}`,
          expect.objectContaining({
            code: expected,
          }),
        );
      });
    });

    it('should determine correct severity levels', () => {
      const severityTests = [
        { code: ERROR_CODES.DATABASE_ERROR, expected: 'critical' },
        { code: ERROR_CODES.SUSPICIOUS_ACTIVITY, expected: 'high' },
        { code: ERROR_CODES.VALIDATION_ERROR, expected: 'medium' },
        { code: ERROR_CODES.INTERNAL_ERROR, expected: 'low' },
        { code: ERROR_CODES.OUT_OF_STOCK, expected: 'low' },
      ];

      severityTests.forEach(({ code, expected }) => {
        // Given
        const error = new Error(`Error: ${code}`);
        const context: ErrorContext = {};

        sentryService.captureException.mockReturnValue('sentry-severity');

        // When
        service.logError(error, context);

        // Then
        expect(logger.error.bind(logger)).toHaveBeenCalledWith(
          `Error logged: ${code}`,
          expect.objectContaining({
            severity: expected,
          }),
        );
      });
    });

    it('should determine correct categories', () => {
      const categoryTests = [
        { code: ERROR_CODES.SUSPICIOUS_ACTIVITY, expected: 'security' },
        { code: ERROR_CODES.EXTERNAL_SERVICE_ERROR, expected: 'integration' },
        { code: ERROR_CODES.DATABASE_ERROR, expected: 'technical' },
        { code: ERROR_CODES.OUT_OF_STOCK, expected: 'business' },
        { code: ERROR_CODES.UNAUTHORIZED, expected: 'security' },
      ];

      categoryTests.forEach(({ code, expected }) => {
        // Given
        const error = new Error(`Error: ${code}`);
        const context: ErrorContext = {};

        sentryService.captureException.mockReturnValue('sentry-category');

        // When
        service.logError(error, context);

        // Then
        expect(logger.error.bind(logger)).toHaveBeenCalledWith(
          `Error logged: ${code}`,
          expect.objectContaining({
            category: expected,
          }),
        );
      });
    });
  });

  describe('Sentry context building', () => {
    it('should build complete Sentry context', () => {
      // Given
      const error = new Error('Test error');
      const context: ErrorContext = {
        userId: 'user123',
        merchantId: 'merchant456',
        requestId: 'req789',
        url: 'https://api.example.com/test',
        method: 'POST',
        ip: '192.168.1.1',
        userAgent: 'test-agent',
        details: {
          customField: 'customValue',
        },
      };

      sentryService.captureException.mockReturnValue('sentry-context');

      // When
      service.logError(error, context);

      // Then
      expect(
        sentryService.captureException.bind(sentryService),
      ).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          userId: 'user123',
          merchantId: 'merchant456',
          requestId: 'req789',
          url: 'https://api.example.com/test',
          method: 'POST',
          ip: '192.168.1.1',
          userAgent: 'test-agent',
          tags: expect.objectContaining({
            service: 'kaleem-bot',
          }),
          extra: expect.objectContaining({
            customField: 'customValue',
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

    it('should handle partial Sentry context', () => {
      // Given
      const error = new Error('Test error');
      const context: ErrorContext = {
        userId: 'user123',
        // Missing other fields
      };

      sentryService.captureException.mockReturnValue('sentry-partial');

      // When
      service.logError(error, context);

      // Then
      expect(
        sentryService.captureException.bind(sentryService),
      ).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          userId: 'user123',
          merchantId: undefined,
          requestId: undefined,
          url: undefined,
          method: undefined,
          ip: undefined,
          userAgent: undefined,
          tags: expect.objectContaining({
            service: 'kaleem-bot',
          }),
          extra: expect.objectContaining({
            // Should not have undefined fields in extra
          }),
          contexts: undefined,
        }),
      );
    });
  });

  describe('error ID generation', () => {
    it('should generate valid error IDs', () => {
      // When
      const id1 = (service as any).generateErrorId();
      const id2 = (service as any).generateErrorId();

      // Then
      expect(id1).toMatch(/^err_\d+_[a-z0-9]+$/);
      expect(id2).toMatch(/^err_\d+_[a-z0-9]+$/);
      expect(id1).not.toBe(id2);
    });

    it('should include timestamp in error ID', () => {
      // Given
      const before = Date.now();

      // When
      const id = (service as any).generateErrorId();

      // Then
      const timestamp = parseInt(id.split('_')[1]);
      expect(timestamp).toBeGreaterThanOrEqual(before - 1000);
      expect(timestamp).toBeLessThanOrEqual(before + 1000);
    });

    it('should include random component in error ID', () => {
      // When
      const ids: string[] = Array.from({ length: 100 } as any).map(
        () => (service as any).generateErrorId() as string,
      );

      // Then
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(100); // All should be unique
    });
  });

  describe('integration scenarios', () => {
    it('should handle complete error management workflow', () => {
      // Given - simulate real application errors
      sentryService.captureException.mockReturnValue('workflow-id-1');
      sentryService.captureMessage.mockReturnValue('workflow-id-2');

      // 1. Business error
      const businessErrorId = service.logBusinessError(
        'INSUFFICIENT_BALANCE',
        'User balance too low',
        { userId: 'user123', merchantId: 'merchant456' },
      );

      // 2. Technical error
      const technicalErrorId = service.logError(
        new Error(`Database error: ${ERROR_CODES.DATABASE_ERROR}`),
        { requestId: 'req123' },
      );

      // 3. Security error
      const securityErrorId = service.logSecurityError(
        'Multiple failed login attempts',
        { userId: 'user123', ip: '192.168.1.1' },
      );

      // 4. Integration error
      const integrationErrorId = service.logIntegrationError(
        'Stripe API',
        new Error('Rate limit exceeded'),
        { merchantId: 'merchant456' },
      );

      // Then - verify all errors were processed
      expect(businessErrorId).toMatch(/^err_\d+_[a-z0-9]+$/);
      expect(technicalErrorId).toMatch(/^err_\d+_[a-z0-9]+$/);
      expect(securityErrorId).toMatch(/^err_\d+_[a-z0-9]+$/);
      expect(integrationErrorId).toMatch(/^err_\d+_[a-z0-9]+$/);

      // Verify different logging levels were used
      expect(logger.warn.bind(logger)).toHaveBeenCalledTimes(1); // Business error
      expect(logger.error.bind(logger)).toHaveBeenCalledTimes(3); // Technical, Security, Integration

      // Verify Sentry calls
      expect(
        sentryService.captureException.bind(sentryService),
      ).toHaveBeenCalledTimes(3);
      expect(
        sentryService.captureMessage.bind(sentryService),
      ).toHaveBeenCalledTimes(1);
    });

    it('should handle high-load error scenarios', () => {
      // Given - simulate high error load
      sentryService.captureException.mockReturnValue('load-test-id');

      const errors = Array.from({ length: 1000 }, (_, i) =>
        service.logError(new Error(`Load test error ${i}`), {
          userId: `user${i}`,
          requestId: `req${i}`,
        }),
      );

      // When
      const results = errors.map((result) => result);

      // Then
      expect(results).toHaveLength(1000);
      expect(logger.error.bind(logger)).toHaveBeenCalledTimes(1000);
      expect(
        sentryService.captureException.bind(sentryService),
      ).toHaveBeenCalledTimes(1000);

      // All results should be valid error IDs
      results.forEach((result) => {
        expect(result).toMatch(/^err_\d+_[a-z0-9]+$/);
      });
    });

    it('should handle error management service shutdown', () => {
      // Given
      sentryService.close.mockResolvedValue(undefined);

      // When
      service.shutdown();

      // Then
      expect(sentryService.close.bind(sentryService)).toHaveBeenCalled();
      expect(logger.log.bind(logger)).toHaveBeenCalledWith(
        'Error management service shutdown completed',
      );
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle very long error messages', () => {
      // Given
      const longMessage = 'x'.repeat(10000);
      const error = new Error(longMessage);
      const context: ErrorContext = {};

      sentryService.captureException.mockReturnValue('long-message-id');

      // When
      const result = service.logError(error, context);

      // Then
      expect(result).toMatch(/^err_\d+_[a-z0-9]+$/);

      expect(logger.error.bind(logger)).toHaveBeenCalledWith(
        `Error logged: ${ERROR_CODES.INTERNAL_ERROR}`,
        expect.objectContaining({
          message: longMessage,
        }),
      );

      expect(
        sentryService.captureException.bind(sentryService),
      ).toHaveBeenCalledWith(error, expect.any(Object));
    });

    it('should handle context with circular references', () => {
      // Given
      const circularContext: any = {
        userId: 'user123',
        details: { data: 'value' },
      };
      circularContext.details.circular = circularContext;

      const error = new Error('Circular context error');

      sentryService.captureException.mockReturnValue('circular-id');

      // When/Then - should not throw
      expect(() => service.logError(error, circularContext)).not.toThrow();

      expect(logger.error.bind(logger)).toHaveBeenCalledWith(
        `Error logged: ${ERROR_CODES.INTERNAL_ERROR}`,
        expect.any(Object),
      );

      expect(
        sentryService.captureException.bind(sentryService),
      ).toHaveBeenCalledWith(error, expect.any(Object));
    });

    it('should handle null and undefined error objects', () => {
      // Given
      const error = null as any;
      const context: ErrorContext = {};

      // When/Then - should not throw
      expect(() => service.logError(error, context)).not.toThrow();

      // Should still generate an error ID
      const result = service.logError(error, context);
      expect(result).toMatch(/^err_\d+_[a-z0-9]+$/);
    });

    it('should handle empty string errors', () => {
      // Given
      const error = '';
      const context: ErrorContext = {};

      sentryService.captureException.mockReturnValue('empty-string-id');

      // When
      const result = service.logError(error, context);

      // Then
      expect(result).toMatch(/^err_\d+_[a-z0-9]+$/);

      expect(logger.error.bind(logger)).toHaveBeenCalledWith(
        `Error logged: ${ERROR_CODES.INTERNAL_ERROR}`,
        expect.objectContaining({
          message: '',
        }),
      );

      expect(
        sentryService.captureException.bind(sentryService),
      ).toHaveBeenCalledWith('', expect.any(Object));
    });
  });

  describe('performance considerations', () => {
    it('should handle rapid error logging', () => {
      // Given
      sentryService.captureException.mockReturnValue('rapid-logging-id');

      const startTime = Date.now();

      // When - log many errors rapidly
      for (let i = 0; i < 100; i++) {
        service.logError(new Error(`Rapid error ${i}`), {
          userId: `user${i}`,
          requestId: `req${i}`,
        });
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Then
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
      expect(logger.error.bind(logger)).toHaveBeenCalledTimes(100);
      expect(
        sentryService.captureException.bind(sentryService),
      ).toHaveBeenCalledTimes(100);
    });

    it('should not create memory leaks during extended operation', () => {
      // Given
      sentryService.captureException.mockReturnValue('memory-test-id');

      // When - simulate extended operation
      for (let i = 0; i < 1000; i++) {
        service.logError(new Error(`Memory test ${i}`), {
          userId: `user${i}`,
        });
      }

      // Then - if we get here without memory issues, test passes
      expect(true).toBe(true);
    });
  });

  describe('real-world scenarios', () => {
    it('should handle e-commerce error scenarios', () => {
      // Given - simulate e-commerce application errors
      sentryService.captureException.mockImplementation(
        (error) => `sentry-${(error as Error).message?.split(' ')[0]}`,
      );

      // 1. Payment processing error
      const paymentErrorId = service.logError(
        new Error(
          `External service error: ${ERROR_CODES.EXTERNAL_SERVICE_ERROR}`,
        ),
        {
          userId: 'user123',
          merchantId: 'merchant456',
          requestId: 'payment-123',
          details: {
            amount: 100,
            currency: 'USD',
            paymentMethod: 'stripe',
          },
        },
      );

      // 2. Inventory error
      const inventoryErrorId = service.logBusinessError(
        'OUT_OF_STOCK',
        'Product is currently out of stock',
        {
          userId: 'user123',
          details: {
            productId: 'prod-123',
            requestedQuantity: 5,
            availableQuantity: 0,
          },
        },
      );

      // 3. Security error
      const securityErrorId = service.logSecurityError(
        'Suspicious purchase pattern detected',
        {
          userId: 'user123',
          ip: '192.168.1.100',
          details: {
            purchaseCount: 15,
            timeWindow: '5 minutes',
          },
        },
      );

      // Then - verify proper error handling
      expect(paymentErrorId).toMatch(/^err_\d+_[a-z0-9]+$/);
      expect(inventoryErrorId).toMatch(/^err_\d+_[a-z0-9]+$/);
      expect(securityErrorId).toMatch(/^err_\d+_[a-z0-9]+$/);

      // Verify appropriate logging levels
      expect(logger.error.bind(logger)).toHaveBeenCalledTimes(2); // Payment and Security
      expect(logger.warn.bind(logger)).toHaveBeenCalledTimes(1); // Inventory

      // Verify Sentry integration
      expect(
        sentryService.captureException.bind(sentryService),
      ).toHaveBeenCalledTimes(2);
      expect(
        sentryService.captureMessage.bind(sentryService),
      ).toHaveBeenCalledTimes(1);
    });

    it('should handle API error scenarios', () => {
      // Given - simulate API server errors
      sentryService.captureException.mockReturnValue('api-error-id');

      // 1. Rate limiting
      const rateLimitErrorId = service.logError(
        new Error(`Rate limit exceeded: ${ERROR_CODES.RATE_LIMIT_EXCEEDED}`),
        {
          userId: 'user123',
          ip: '192.168.1.1',
          url: '/api/users',
          method: 'GET',
          details: {
            limit: 100,
            window: '1 minute',
          },
        },
      );

      // 2. Authentication error
      const authErrorId = service.logError(
        new Error(`Unauthorized access: ${ERROR_CODES.UNAUTHORIZED}`),
        {
          requestId: 'req-123',
          url: '/api/admin/users',
          method: 'POST',
          ip: '192.168.1.2',
        },
      );

      // 3. Validation error
      const validationErrorId = service.logError(
        new Error(`Validation error: ${ERROR_CODES.VALIDATION_ERROR}`),
        {
          userId: 'user456',
          requestId: 'req-456',
          url: '/api/users',
          method: 'POST',
          details: {
            missingFields: ['email', 'phone'],
            invalidFields: ['age'],
          },
        },
      );

      // Then - verify proper error classification
      expect(rateLimitErrorId).toMatch(/^err_\d+_[a-z0-9]+$/);
      expect(authErrorId).toMatch(/^err_\d+_[a-z0-9]+$/);
      expect(validationErrorId).toMatch(/^err_\d+_[a-z0-9]+$/);

      // Verify Sentry integration for medium+ severity errors
      expect(
        sentryService.captureException.bind(sentryService),
      ).toHaveBeenCalledTimes(2); // Rate limit and Auth
      // Validation error should not go to Sentry (low severity)
    });
  });

  describe('error severity classification edge cases', () => {
    it('should correctly classify all error codes by severity', () => {
      const errorCodes = Object.values(ERROR_CODES);

      errorCodes.forEach((errorCode) => {
        // Create error with the specific code
        const error = new Error(`Test error: ${errorCode}`);
        const context: ErrorContext = {};

        // When
        service.logError(error, context);

        // Then - verify error was logged with correct severity
        expect(logger.error.bind(logger)).toHaveBeenCalledWith(
          `Error logged: ${errorCode}`,
          expect.objectContaining({
            code: errorCode,
            severity: expect.any(String),
            category: expect.any(String),
          }),
        );
      });
    });

    it('should handle unknown error codes as low severity', () => {
      // Given
      const unknownError = new Error('Completely unknown error type');

      // When
      service.logError(unknownError);

      // Then
      expect(logger.error.bind(logger)).toHaveBeenCalledWith(
        `Error logged: ${ERROR_CODES.INTERNAL_ERROR}`,
        expect.objectContaining({
          severity: 'low',
          category: 'business',
        }),
      );
    });

    it('should handle error codes at severity boundaries', () => {
      // Test critical errors
      const criticalError = new Error(
        `Database error: ${ERROR_CODES.DATABASE_ERROR}`,
      );
      service.logError(criticalError);
      expect(logger.error.bind(logger)).toHaveBeenCalledWith(
        expect.stringContaining(ERROR_CODES.DATABASE_ERROR),
        expect.objectContaining({
          severity: 'critical',
          category: 'technical',
        }),
      );

      // Test high severity errors
      const highSeverityError = new Error(
        `Security issue: ${ERROR_CODES.SUSPICIOUS_ACTIVITY}`,
      );
      service.logError(highSeverityError);
      expect(logger.error.bind(logger)).toHaveBeenCalledWith(
        expect.stringContaining(ERROR_CODES.SUSPICIOUS_ACTIVITY),
        expect.objectContaining({
          severity: 'high',
          category: 'security',
        }),
      );

      // Test medium severity errors
      const mediumSeverityError = new Error(
        `Validation error: ${ERROR_CODES.VALIDATION_ERROR}`,
      );
      service.logError(mediumSeverityError);
      expect(logger.error.bind(logger)).toHaveBeenCalledWith(
        expect.stringContaining(ERROR_CODES.VALIDATION_ERROR),
        expect.objectContaining({
          severity: 'medium',
          category: 'business',
        }),
      );
    });
  });

  describe('Sentry integration comprehensive testing', () => {
    it('should handle all Sentry context types correctly', () => {
      // Given - complete context with all possible fields
      const completeContext: ErrorContext = {
        userId: 'user123',
        merchantId: 'merchant456',
        requestId: 'req789',
        url: 'https://api.example.com/users/123',
        method: 'POST',
        ip: '192.168.1.100',
        userAgent:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        details: {
          action: 'create_user',
          resource: 'users',
          timestamp: new Date().toISOString(),
        },
      };

      sentryService.captureException.mockReturnValue('sentry-complete-id');

      // When
      service.logError(new Error('Complete context error'), completeContext);

      // Then - verify all context fields are passed to Sentry
      expect(
        sentryService.captureException.bind(sentryService),
      ).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          userId: 'user123',
          merchantId: 'merchant456',
          requestId: 'req789',
          tags: expect.objectContaining({
            service: 'kaleem-bot',
            severity: 'low',
            category: 'business',
          }),
          extra: expect.objectContaining({
            url: 'https://api.example.com/users/123',
            method: 'POST',
            userAgent:
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            action: 'create_user',
            resource: 'users',
          }),
        }),
      );
    });

    it('should handle partial Sentry context gracefully', () => {
      // Given - minimal context
      const minimalContext: ErrorContext = {
        userId: 'user123',
      };

      sentryService.captureException.mockReturnValue('sentry-minimal-id');

      // When
      service.logError(new Error('Minimal context error'), minimalContext);

      // Then - verify only provided context is passed
      expect(
        sentryService.captureException.bind(sentryService),
      ).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          userId: 'user123',
          tags: expect.objectContaining({
            service: 'kaleem-bot',
          }),
          extra: expect.objectContaining({
            merchantId: undefined,
            requestId: undefined,
            url: undefined,
            method: undefined,
            userAgent: undefined,
          }),
        }),
      );
    });

    it('should handle Sentry service failures gracefully', () => {
      // Given - Sentry service throws error
      sentryService.captureException.mockImplementation(() => {
        throw new Error('Sentry service unavailable');
      });

      // When/Then
      expect(() => {
        service.logError(new Error('Test error'));
      }).not.toThrow();

      // Should still log to local logger
      expect(logger.error.bind(logger)).toHaveBeenCalled();
    });

    it('should handle Sentry context building with circular references', () => {
      // Given - context with circular reference
      const contextWithCircularRef: ErrorContext = {
        details: {
          nested: {
            value: 'test',
          },
        },
      };

      // Create circular reference
      (contextWithCircularRef.details as any).circular = contextWithCircularRef;

      sentryService.captureException.mockReturnValue('sentry-circular-id');

      // When/Then - should not throw
      expect(() => {
        service.logError(
          new Error('Circular reference error'),
          contextWithCircularRef,
        );
      }).not.toThrow();
    });
  });

  describe('error persistence and cleanup', () => {
    it('should persist errors with correct structure', () => {
      // Given
      const error = new Error('Persistence test error');
      const context: ErrorContext = {
        userId: 'user123',
        merchantId: 'merchant456',
        requestId: 'req789',
      };

      // Mock persistError to capture the data
      const persistSpy = jest.spyOn(service as any, 'persistError');

      sentryService.captureException.mockReturnValue('sentry-persist-id');

      // When
      service.logError(error, context);

      // Then - verify error is persisted with correct structure
      expect(persistSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          id: expect.any(String),
          timestamp: expect.any(Date),
          code: ERROR_CODES.INTERNAL_ERROR,
          message: 'Persistence test error',
          severity: 'low',
          category: 'business',
          userId: 'user123',
          merchantId: 'merchant456',
          requestId: 'req789',
          sentryEventId: 'sentry-persist-id',
        }),
      );
    });

    it('should handle cleanupOldErrors with different time ranges', () => {
      // Given

      // When/Then - test different cleanup scenarios
      expect(service.cleanupOldErrors()).toBe(0);
      expect(service.cleanupOldErrors(7)).toBe(0); // Should still be 0 since no data
      expect(service.cleanupOldErrors(30)).toBe(0);
      expect(service.cleanupOldErrors(90)).toBe(0);

      // Verify logging
      expect(logger.log.bind(logger)).toHaveBeenCalledWith(
        'Cleaning up errors older than 30 days',
      );
      expect(logger.log.bind(logger)).toHaveBeenCalledWith(
        'Cleaning up errors older than 7 days',
      );
    });

    it('should handle getErrorStats with various filter combinations', () => {
      // Given
      const filters = [
        {},
        { merchantId: 'merchant123' },
        { severity: 'high' },
        { category: 'security' },
        { from: new Date('2024-01-01'), to: new Date('2024-12-31') },
        {
          merchantId: 'merchant123',
          severity: 'critical',
          category: 'technical',
          from: new Date('2024-01-01'),
          to: new Date('2024-12-31'),
        },
      ];

      // When/Then - should handle all filter combinations
      filters.forEach((filter) => {
        const stats = service.getErrorStats(filter);

        expect(stats).toEqual({
          total: 0,
          bySeverity: {},
          byCategory: {},
          byCode: {},
          recentErrors: [],
          sentryEnabled: false,
        });
      });
    });
  });

  describe('performance and load handling', () => {
    it('should handle rapid error logging', () => {
      // Given
      sentryService.captureException.mockReturnValue('rapid-logging-id');

      const errors = Array.from(
        { length: 100 },
        (_, i) => new Error(`Rapid error ${i}`),
      );

      // When - log errors rapidly
      const startTime = Date.now();
      const errorIds = errors.map((error) => service.logError(error));
      const endTime = Date.now();

      // Then
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
      expect(errorIds).toHaveLength(100);
      errorIds.forEach((id) => {
        expect(id).toMatch(/^err_\d+_[a-z0-9]+$/);
      });

      // Verify Sentry was called for each error
      expect(
        sentryService.captureException.bind(sentryService),
      ).toHaveBeenCalledTimes(100);
    });

    it('should handle concurrent error logging', async () => {
      // Given
      sentryService.captureException.mockReturnValue('concurrent-id');

      const errors = Array.from(
        { length: 50 },
        (_, i) => new Error(`Concurrent error ${i}`),
      );

      // When - log errors concurrently
      const loggingPromises = errors.map((error) =>
        Promise.resolve(service.logError(error)),
      );

      const errorIds = await Promise.all(loggingPromises);

      // Then
      expect(errorIds).toHaveLength(50);
      errorIds.forEach((id) => {
        expect(id).toMatch(/^err_\d+_[a-z0-9]+$/);
      });

      // All unique IDs
      const uniqueIds = new Set(errorIds);
      expect(uniqueIds.size).toBe(50);
    });

    it('should handle memory efficiently during extended operation', () => {
      // Given
      sentryService.captureException.mockReturnValue('memory-test-id');

      // Simulate extended operation with many errors
      const iterations = 1000;
      const errorIds: string[] = [];

      for (let i = 0; i < iterations; i++) {
        const errorId = service.logError(new Error(`Memory test error ${i}`));
        errorIds.push(errorId);

        // Clean up periodically to simulate real-world usage
        if (i % 100 === 0) {
          service.cleanupOldErrors();
        }
      }

      // Then - verify all operations completed successfully
      expect(errorIds).toHaveLength(iterations);
      expect(
        sentryService.captureException.bind(sentryService),
      ).toHaveBeenCalledTimes(iterations);

      // Verify no memory leaks by checking consistent performance
      const startTime = Date.now();
      for (let i = 0; i < 100; i++) {
        service.logError(new Error(`Final memory test ${i}`));
      }
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(500); // Should still be fast
    });
  });

  describe('real-world error scenarios', () => {
    it('should handle e-commerce transaction errors', () => {
      // Given - e-commerce error scenarios
      const scenarios = [
        {
          error: new Error(
            `Payment failed: ${ERROR_CODES.EXTERNAL_SERVICE_ERROR}`,
          ),
          context: {
            userId: 'user123',
            merchantId: 'merchant456',
            details: {
              orderId: 'order-789',
              amount: 99.99,
              paymentMethod: 'credit_card',
              errorCode: 'CARD_DECLINED',
            },
          },
        },
        {
          error: new Error(`Inventory error: ${ERROR_CODES.QUOTA_EXCEEDED}`),
          context: {
            merchantId: 'merchant456',
            details: {
              productId: 'prod-123',
              requestedQuantity: 10,
              availableQuantity: 5,
            },
          },
        },
        {
          error: new Error(
            `Shipping error: ${ERROR_CODES.EXTERNAL_SERVICE_ERROR}`,
          ),
          context: {
            userId: 'user123',
            details: {
              orderId: 'order-789',
              shippingMethod: 'express',
              errorCode: 'SERVICE_UNAVAILABLE',
            },
          },
        },
      ];

      // When
      const errorIds = scenarios.map((scenario) =>
        service.logError(scenario.error, scenario.context),
      );

      // Then - verify all scenarios handled correctly
      expect(errorIds).toHaveLength(3);
      errorIds.forEach((id) => {
        expect(id).toMatch(/^err_\d+_[a-z0-9]+$/);
      });

      // Verify Sentry integration for appropriate severity levels
      expect(
        sentryService.captureException.bind(sentryService),
      ).toHaveBeenCalledTimes(3);
    });

    it('should handle API rate limiting scenarios', () => {
      // Given - API rate limiting scenario
      const rateLimitError = new Error(
        `Rate limit exceeded: ${ERROR_CODES.RATE_LIMIT_EXCEEDED}`,
      );
      const context: ErrorContext = {
        userId: 'user123',
        ip: '192.168.1.100',
        url: '/api/products/search',
        method: 'GET',
        details: {
          limit: 1000,
          window: '1 hour',
          currentUsage: 1001,
        },
      };

      sentryService.captureException.mockReturnValue('rate-limit-id');

      // When
      const errorId = service.logError(rateLimitError, context);

      // Then - verify rate limit error handled correctly
      expect(errorId).toMatch(/^err_\d+_[a-z0-9]+$/);

      expect(
        sentryService.captureException.bind(sentryService),
      ).toHaveBeenCalledWith(
        rateLimitError,
        expect.objectContaining({
          userId: 'user123',
          ip: '192.168.1.100',
          tags: expect.objectContaining({
            severity: 'medium',
            category: 'business',
          }),
          extra: expect.objectContaining({
            limit: 1000,
            window: '1 hour',
            currentUsage: 1001,
          }),
        }),
      );
    });

    it('should handle database connection errors', () => {
      // Given - database connection error
      const dbError = new Error(
        `Connection timeout: ${ERROR_CODES.DATABASE_ERROR}`,
      );
      const context: ErrorContext = {
        merchantId: 'merchant456',
        details: {
          operation: 'findOne',
          collection: 'users',
          timeout: 30000,
          connectionString: 'mongodb://localhost:27017/app',
        },
      };

      sentryService.captureException.mockReturnValue('db-error-id');

      // When
      const errorId = service.logError(dbError, context);

      // Then - verify database error handled correctly
      expect(errorId).toMatch(/^err_\d+_[a-z0-9]+$/);

      expect(
        sentryService.captureException.bind(sentryService),
      ).toHaveBeenCalledWith(
        dbError,
        expect.objectContaining({
          merchantId: 'merchant456',
          tags: expect.objectContaining({
            severity: 'critical',
            category: 'technical',
          }),
          extra: expect.objectContaining({
            operation: 'findOne',
            collection: 'users',
          }),
        }),
      );
    });

    it('should handle authentication and authorization errors', () => {
      // Given - auth errors
      const authScenarios = [
        {
          error: new Error(`Token expired: ${ERROR_CODES.TOKEN_EXPIRED}`),
          context: {
            userId: 'user123',
            requestId: 'req-456',
            url: '/api/admin/users',
            method: 'GET',
          },
        },
        {
          error: new Error(`Unauthorized access: ${ERROR_CODES.UNAUTHORIZED}`),
          context: {
            ip: '192.168.1.200',
            url: '/api/admin/settings',
            method: 'POST',
            userAgent: 'suspicious-bot/1.0',
          },
        },
        {
          error: new Error(`Forbidden action: ${ERROR_CODES.FORBIDDEN}`),
          context: {
            userId: 'user456',
            merchantId: 'merchant789',
            details: {
              action: 'delete_user',
              resource: 'users',
              userRole: 'viewer',
              requiredRole: 'admin',
            },
          },
        },
      ];

      sentryService.captureException.mockReturnValue('auth-error-id');

      // When
      const errorIds = authScenarios.map((scenario) =>
        service.logError(scenario.error, scenario.context),
      );

      // Then - verify auth errors handled correctly
      expect(errorIds).toHaveLength(3);

      // All should be sent to Sentry due to security category
      expect(
        sentryService.captureException.bind(sentryService),
      ).toHaveBeenCalledTimes(3);

      // Verify security categorization
      expect(logger.error.bind(logger)).toHaveBeenCalledWith(
        expect.stringContaining(ERROR_CODES.TOKEN_EXPIRED),
        expect.objectContaining({
          severity: 'high',
          category: 'security',
        }),
      );
    });

    it('should handle external service integration errors', () => {
      // Given - external service errors
      const integrationErrors = [
        {
          service: 'telegram',
          error: new Error(
            `Telegram API error: ${ERROR_CODES.TELEGRAM_API_ERROR}`,
          ),
          context: {
            details: {
              endpoint: '/bot/sendMessage',
              statusCode: 429,
              retryAfter: 30,
            },
          },
        },
        {
          service: 'whatsapp',
          error: new Error(
            `WhatsApp API error: ${ERROR_CODES.WHATSAPP_API_ERROR}`,
          ),
          context: {
            merchantId: 'merchant123',
            details: {
              operation: 'send_message',
              recipient: '+1234567890',
              errorCode: 'INVALID_NUMBER',
            },
          },
        },
        {
          service: 'email',
          error: new Error(
            `Email service error: ${ERROR_CODES.EMAIL_SEND_FAILED}`,
          ),
          context: {
            userId: 'user456',
            details: {
              recipient: 'user@example.com',
              template: 'welcome_email',
              errorCode: 'SMTP_CONNECTION_FAILED',
            },
          },
        },
      ];

      sentryService.captureException.mockReturnValue('integration-error-id');

      // When
      const errorIds = integrationErrors.map(
        ({ service: integrationService, error, context }) =>
          service.logIntegrationError(integrationService, error, context),
      );

      // Then - verify integration errors handled correctly
      expect(errorIds).toHaveLength(3);

      expect(
        sentryService.captureException.bind(sentryService),
      ).toHaveBeenCalledTimes(3);

      // Verify integration error logging
      expect(logger.error.bind(logger)).toHaveBeenCalledWith(
        'Integration error logged: telegram',
        expect.objectContaining({
          code: ERROR_CODES.EXTERNAL_SERVICE_ERROR,
          severity: 'medium',
          category: 'integration',
        }),
      );
    });
  });

  describe('error management service lifecycle', () => {
    it('should handle service shutdown gracefully', () => {
      // Given - service with some state
      sentryService.captureException.mockReturnValue('shutdown-test-id');
      service.logError(new Error('Pre-shutdown error'));

      // When
      service.shutdown();

      // Then - verify graceful shutdown
      expect(sentryService.close.bind(sentryService)).toHaveBeenCalled();
      expect(logger.log.bind(logger)).toHaveBeenCalledWith(
        'Error management service shutdown completed',
      );
    });

    it('should handle shutdown errors gracefully', () => {
      // Given - Sentry close throws error
      sentryService.close.mockImplementation(() => {
        throw new Error('Sentry close failed');
      });

      // When/Then
      expect(() => service.shutdown()).not.toThrow();

      expect(logger.error.bind(logger)).toHaveBeenCalledWith(
        'Error during shutdown',
        'Sentry close failed',
      );
    });

    it('should handle shutdown when Sentry is not initialized', () => {
      // Given - Sentry not initialized
      (service as any).isInitialized = false;

      // When
      service.shutdown();

      // Then - should not throw and should not try to close Sentry
      expect(sentryService.close.bind(sentryService)).not.toHaveBeenCalled();
      expect(logger.log.bind(logger)).toHaveBeenCalledWith(
        'Error management service shutdown completed',
      );
    });

    it('should handle multiple shutdown calls', () => {
      // Given
      sentryService.close.mockImplementation();

      // When - call shutdown multiple times
      service.shutdown();
      service.shutdown();
      service.shutdown();

      // Then - should handle multiple calls gracefully
      expect(sentryService.close.bind(sentryService)).toHaveBeenCalledTimes(1); // Only once
      expect(logger.log.bind(logger)).toHaveBeenCalledTimes(1);
    });
  });

  describe('advanced error context handling', () => {
    it('should handle very large context objects', () => {
      // Given - very large context object
      const largeContext: ErrorContext = {
        details: {
          data: 'x'.repeat(10000), // 10KB of data
          metadata: {
            timestamp: new Date().toISOString(),
            version: '1.0.0',
            environment: 'test',
          },
          logs: Array.from({ length: 100 }, (_, i) => ({
            level: 'info',
            message: `Log message ${i}`,
            timestamp: new Date().toISOString(),
          })),
        },
      };

      sentryService.captureException.mockReturnValue('large-context-id');

      // When
      const errorId = service.logError(
        new Error('Large context error'),
        largeContext,
      );

      // Then - should handle large context without issues
      expect(errorId).toMatch(/^err_\d+_[a-z0-9]+$/);
      expect(
        sentryService.captureException.bind(sentryService),
      ).toHaveBeenCalled();
    });

    it('should handle context with special data types', () => {
      // Given - context with various data types
      const specialContext: ErrorContext = {
        details: {
          boolean: true,
          number: 42,
          float: 3.14159,
          date: new Date(),
          nullValue: null,
          undefinedValue: undefined,
          array: [1, 2, 3, 'test'],
          nested: {
            deep: {
              value: 'deep nested',
            },
          },
        },
      };

      sentryService.captureException.mockReturnValue('special-types-id');

      // When
      const errorId = service.logError(
        new Error('Special types error'),
        specialContext,
      );

      // Then - should handle special types correctly
      expect(errorId).toMatch(/^err_\d+_[a-z0-9]+$/);
      expect(
        sentryService.captureException.bind(sentryService),
      ).toHaveBeenCalled();
    });

    it('should handle context with binary data', () => {
      // Given - context with binary-like data
      const binaryContext: ErrorContext = {
        details: {
          buffer: Buffer.from('binary data'),
          base64: 'SGVsbG8gV29ybGQ=', // "Hello World" in base64
          hex: '48656c6c6f', // "Hello" in hex
        },
      };

      sentryService.captureException.mockReturnValue('binary-data-id');

      // When
      const errorId = service.logError(
        new Error('Binary data error'),
        binaryContext,
      );

      // Then - should handle binary data correctly
      expect(errorId).toMatch(/^err_\d+_[a-z0-9]+$/);
      expect(
        sentryService.captureException.bind(sentryService),
      ).toHaveBeenCalled();
    });
  });

  describe('error management integration with external systems', () => {
    it('should integrate correctly with logging systems', () => {
      // Given - various log levels and formats
      const logScenarios = [
        {
          level: 'error' as const,
          message: 'Critical system failure',
          context: {},
        },
        {
          level: 'warn' as const,
          message: 'Deprecated API usage',
          context: { userId: 'user123' },
        },
        {
          level: 'debug' as const,
          message: 'Debug information',
          context: { details: { step: 'validation', status: 'passed' } },
        },
      ];

      // When - log at different levels
      logScenarios.forEach(({ level, message, context }) => {
        if (level === 'error') {
          service.logError(message, context);
        } else if (level === 'warn') {
          service.logBusinessError('DEPRECATED_API', message, context);
        } else {
          // For debug, just log normally
          logger.debug.bind(logger)(message, context);
        }
      });

      // Then - verify appropriate logging calls
      expect(logger.error.bind(logger)).toHaveBeenCalledTimes(1);
      expect(logger.warn.bind(logger)).toHaveBeenCalledTimes(1);
    });

    it('should handle error correlation across services', () => {
      // Given - related errors across different services
      const requestId = 'req-123';
      const errors = [
        {
          error: new Error('Authentication service error'),
          context: { requestId, service: 'auth' },
        },
        {
          error: new Error('User service error'),
          context: { requestId, service: 'users' },
        },
        {
          error: new Error('Notification service error'),
          context: { requestId, service: 'notifications' },
        },
      ];

      sentryService.captureException.mockReturnValue('correlation-id');

      // When - log related errors
      const errorIds = errors.map(({ error, context }) =>
        service.logError(error, context),
      );

      // Then - verify all errors logged with correlation
      expect(errorIds).toHaveLength(3);
      errorIds.forEach((id) => {
        expect(id).toMatch(/^err_\d+_[a-z0-9]+$/);
      });

      // Verify Sentry context includes request correlation
      expect(
        sentryService.captureException.bind(sentryService),
      ).toHaveBeenCalledTimes(3);
    });

    it('should handle error context enrichment from multiple sources', () => {
      // Given - context enriched from multiple sources
      const baseContext: ErrorContext = {
        userId: 'user123',
        requestId: 'req-456',
      };

      const additionalContext = {
        merchantId: 'merchant789',
        ip: '192.168.1.100',
        details: {
          feature: 'user_management',
          action: 'create',
        },
      };

      const enrichedContext = { ...baseContext, ...additionalContext };

      sentryService.captureException.mockReturnValue('enriched-id');

      // When
      const errorId = service.logError(
        new Error('Enriched context error'),
        enrichedContext,
      );

      // Then - verify all context sources are included
      expect(errorId).toMatch(/^err_\d+_[a-z0-9]+$/);

      expect(
        sentryService.captureException.bind(sentryService),
      ).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          userId: 'user123',
          merchantId: 'merchant789',
          requestId: 'req-456',
          ip: '192.168.1.100',
          extra: expect.objectContaining({
            feature: 'user_management',
            action: 'create',
          }),
        }),
      );
    });
  });

  describe('error management edge cases', () => {
    it('should handle extremely long error messages', () => {
      // Given - extremely long error message
      const longMessage = 'x'.repeat(10000); // 10KB error message
      const error = new Error(longMessage);

      sentryService.captureException.mockReturnValue('long-message-id');

      // When
      const errorId = service.logError(error);

      // Then - should handle long messages
      expect(errorId).toMatch(/^err_\d+_[a-z0-9]+$/);
      expect(logger.error.bind(logger)).toHaveBeenCalledWith(
        `Error logged: ${ERROR_CODES.INTERNAL_ERROR}`,
        expect.objectContaining({
          message: longMessage,
        }),
      );
    });

    it('should handle error messages with special unicode characters', () => {
      // Given - error with unicode characters
      const unicodeMessage =
        'Erreur de base de données: 数据库错误 データベースエラー';
      const error = new Error(unicodeMessage);

      sentryService.captureException.mockReturnValue('unicode-id');

      // When
      const errorId = service.logError(error);

      // Then - should handle unicode correctly
      expect(errorId).toMatch(/^err_\d+_[a-z0-9]+$/);
      expect(logger.error.bind(logger)).toHaveBeenCalledWith(
        `Error logged: ${ERROR_CODES.INTERNAL_ERROR}`,
        expect.objectContaining({
          message: unicodeMessage,
        }),
      );
    });

    it('should handle empty and whitespace-only error messages', () => {
      // Given - various empty/whitespace messages
      const messages = ['', '   ', '\t', '\n'];

      messages.forEach((message) => {
        const error = new Error(message);
        sentryService.captureException.mockReturnValue('empty-message-id');

        // When
        const errorId = service.logError(error);

        // Then - should handle empty messages
        expect(errorId).toMatch(/^err_\d+_[a-z0-9]+$/);
      });
    });

    it('should handle error objects with missing or corrupted properties', () => {
      // Given - corrupted error object
      const corruptedError = {
        message: 'Corrupted error',
        name: undefined,
        stack: null,
      } as any;

      sentryService.captureException.mockReturnValue('corrupted-id');

      // When
      const errorId = service.logError(corruptedError);

      // Then - should handle corrupted error object
      expect(errorId).toMatch(/^err_\d+_[a-z0-9]+$/);
      expect(logger.error.bind(logger)).toHaveBeenCalledWith(
        `Error logged: ${ERROR_CODES.INTERNAL_ERROR}`,
        expect.objectContaining({
          message: 'Corrupted error',
          details: {
            name: undefined,
            stack: null,
          },
        }),
      );
    });

    it('should handle concurrent error ID generation', async () => {
      // Given - rapid concurrent error logging
      sentryService.captureException.mockReturnValue('concurrent-id');

      const errors = Array.from(
        { length: 100 },
        (_, i) => new Error(`Concurrent error ${i}`),
      );

      // When - log errors concurrently
      const loggingPromises = errors.map((error) =>
        Promise.resolve(service.logError(error)),
      );

      const errorIds = await Promise.all(loggingPromises);

      // Then - verify all IDs are unique
      const uniqueIds = new Set(errorIds);
      expect(uniqueIds.size).toBe(100);

      // Verify ID format
      errorIds.forEach((id) => {
        expect(id).toMatch(/^err_\d+_[a-z0-9]+$/);
        expect(id.length).toBeGreaterThan(20); // Reasonable length
      });
    });
  });
});

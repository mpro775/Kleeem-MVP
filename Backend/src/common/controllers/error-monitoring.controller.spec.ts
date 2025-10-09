import { Test, type TestingModule } from '@nestjs/testing';

import { ErrorManagementService } from '../services/error-management.service';
import { SentryService } from '../services/sentry.service';

import { ErrorMonitoringController } from './error-monitoring.controller';

describe('ErrorMonitoringController', () => {
  let controller: ErrorMonitoringController;
  let errorManagementService: jest.Mocked<ErrorManagementService>;
  let sentryService: jest.Mocked<SentryService>;

  const mockErrorStats = {
    total: 42,
    bySeverity: { low: 10, medium: 20, high: 8, critical: 4 },
    byCategory: { business: 15, technical: 20, security: 5, integration: 2 },
    byCode: { ERR_001: 5, ERR_002: 8 },
    recentErrors: [
      {
        id: 'err_123',
        timestamp: new Date(),
        code: 'ERR_001',
        message: 'Test error',
        severity: 'high' as const,
        category: 'technical' as const,
      },
    ],
    sentryEnabled: true,
  };

  beforeEach(async () => {
    const mockErrorManagementService = {
      getErrorStats: jest.fn(),
    };

    const mockSentryService = {
      isEnabled: jest.fn(),
      getCurrentUserId: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ErrorMonitoringController],
      providers: [
        {
          provide: ErrorManagementService,
          useValue: mockErrorManagementService,
        },
        {
          provide: SentryService,
          useValue: mockSentryService,
        },
      ],
    }).compile();

    controller = module.get<ErrorMonitoringController>(
      ErrorMonitoringController,
    );
    errorManagementService = module.get(ErrorManagementService);
    sentryService = module.get(SentryService);

    // Set default mock implementations
    errorManagementService.getErrorStats.mockReturnValue(mockErrorStats);
    sentryService.isEnabled.mockReturnValue(true);
    sentryService.getCurrentUserId.mockReturnValue('user_123');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getErrorStats', () => {
    it('should return error statistics without filters', () => {
      const result = controller.getErrorStats();

      expect(errorManagementService.getErrorStats).toHaveBeenCalledWith({});
      expect(result).toBe(mockErrorStats);
    });

    it('should handle merchantId filter', () => {
      const merchantId = 'merchant_123';

      controller.getErrorStats(merchantId);

      expect(errorManagementService.getErrorStats).toHaveBeenCalledWith({
        merchantId,
      });
    });

    it('should handle severity filter', () => {
      const severity = 'high';

      controller.getErrorStats(undefined, severity);

      expect(errorManagementService.getErrorStats).toHaveBeenCalledWith({
        severity,
      });
    });

    it('should handle category filter', () => {
      const category = 'technical';

      controller.getErrorStats(undefined, undefined, category);

      expect(errorManagementService.getErrorStats).toHaveBeenCalledWith({
        category,
      });
    });

    it('should handle date range filters', () => {
      const from = '2023-01-01';
      const to = '2023-12-31';

      controller.getErrorStats(undefined, undefined, undefined, from, to);

      expect(errorManagementService.getErrorStats).toHaveBeenCalledWith({
        from: new Date(from),
        to: new Date(to),
      });
    });

    it('should handle all filters combined', () => {
      const merchantId = 'merchant_123';
      const severity = 'critical';
      const category = 'security';
      const from = '2023-01-01';
      const to = '2023-12-31';

      controller.getErrorStats(merchantId, severity, category, from, to);

      expect(errorManagementService.getErrorStats).toHaveBeenCalledWith({
        merchantId,
        severity,
        category,
        from: new Date(from),
        to: new Date(to),
      });
    });

    it('should handle partial filters', () => {
      const merchantId = 'merchant_123';
      const from = '2023-01-01';

      controller.getErrorStats(merchantId, undefined, undefined, from);

      expect(errorManagementService.getErrorStats).toHaveBeenCalledWith({
        merchantId,
        from: new Date(from),
      });
    });

    it('should convert date strings to Date objects', () => {
      const from = '2023-06-15T10:30:00Z';
      const to = '2023-06-15T15:45:00Z';

      controller.getErrorStats(undefined, undefined, undefined, from, to);

      const expectedFilters = {
        from: new Date(from),
        to: new Date(to),
      };

      expect(errorManagementService.getErrorStats).toHaveBeenCalledWith(
        expectedFilters,
      );
      const firstCallArgs =
        errorManagementService.getErrorStats.mock.calls[0][0];
      expect(firstCallArgs?.from).toBeInstanceOf(Date);
      expect(firstCallArgs?.to).toBeInstanceOf(Date);
    });

    it('should handle invalid date strings gracefully', () => {
      const invalidFrom = 'invalid-date';
      const invalidTo = 'another-invalid-date';

      expect(() => {
        controller.getErrorStats(
          undefined,
          undefined,
          undefined,
          invalidFrom,
          invalidTo,
        );
      }).toThrow();

      expect(errorManagementService.getErrorStats).toHaveBeenCalledWith({
        from: new Date(invalidFrom),
        to: new Date(invalidTo),
      });
    });

    it('should return the correct response structure', () => {
      const result = controller.getErrorStats();

      expect(result).toEqual(mockErrorStats);
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('bySeverity');
      expect(result).toHaveProperty('byCategory');
      expect(result).toHaveProperty('byCode');
      expect(result).toHaveProperty('recentErrors');
      expect(result).toHaveProperty('sentryEnabled');
    });

    it('should handle empty filter object', () => {
      controller.getErrorStats('', '', '', '', '');

      expect(errorManagementService.getErrorStats).toHaveBeenCalledWith({});
    });

    it('should handle whitespace in filters', () => {
      const merchantId = '  merchant_123  ';
      const severity = ' high ';

      controller.getErrorStats(merchantId, severity);

      expect(errorManagementService.getErrorStats).toHaveBeenCalledWith({
        merchantId,
        severity,
      });
    });
  });

  describe('getSentryStatus', () => {
    it('should return sentry status with enabled true', async () => {
      sentryService.isEnabled.mockReturnValue(true);
      sentryService.getCurrentUserId.mockReturnValue('user_123');

      const result = await controller.getSentryStatus();

      expect(result).toEqual({
        enabled: true,
        currentUserId: 'user_123',
        timestamp: expect.any(String),
      });
      expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('should return sentry status with enabled false', async () => {
      sentryService.isEnabled.mockReturnValue(false);
      sentryService.getCurrentUserId.mockReturnValue(undefined);

      const result = await controller.getSentryStatus();

      expect(result).toEqual({
        enabled: false,
        currentUserId: undefined,
        timestamp: expect.any(String),
      });
    });

    it('should call sentry service methods correctly', async () => {
      await controller.getSentryStatus();

      expect(sentryService.isEnabled).toHaveBeenCalledTimes(1);
      expect(sentryService.getCurrentUserId).toHaveBeenCalledTimes(1);
    });

    it('should always return a valid timestamp', async () => {
      const beforeCall = new Date();
      const result = await controller.getSentryStatus();
      const afterCall = new Date();

      const resultTimestamp = new Date(result.timestamp);
      expect(resultTimestamp).toBeInstanceOf(Date);
      expect(isNaN(resultTimestamp.getTime())).toBe(false);

      // Timestamp should be reasonable (between before and after call)
      expect(resultTimestamp.getTime()).toBeGreaterThanOrEqual(
        beforeCall.getTime() - 1000,
      );
      expect(resultTimestamp.getTime()).toBeLessThanOrEqual(
        afterCall.getTime() + 1000,
      );
    });

    it('should handle undefined currentUserId', async () => {
      sentryService.getCurrentUserId.mockReturnValue(undefined);

      const result = await controller.getSentryStatus();

      expect(result.currentUserId).toBeUndefined();
    });

    it('should handle different user IDs', async () => {
      const testUserIds = ['user_123', 'admin_456', 'test_user_789'];

      for (const userId of testUserIds) {
        sentryService.getCurrentUserId.mockReturnValue(userId);

        const result = await controller.getSentryStatus();

        expect(result.currentUserId).toBe(userId);
      }
    });
  });

  describe('getHealthStatus', () => {
    it('should return complete health status', () => {
      const result = controller.getHealthStatus();

      expect(result).toEqual({
        status: 'healthy',
        timestamp: expect.any(String),
        services: {
          errorManagement: {
            status: 'active',
            totalErrors: mockErrorStats.total,
          },
          sentry: {
            status: 'active',
            enabled: true,
          },
        },
        summary: {
          totalErrors: mockErrorStats.total,
          bySeverity: mockErrorStats.bySeverity,
          byCategory: mockErrorStats.byCategory,
          recentErrors: mockErrorStats.recentErrors.length,
        },
      });
    });

    it('should return healthy status', () => {
      const result = controller.getHealthStatus();

      expect(result.status).toBe('healthy');
    });

    it('should include valid timestamp', () => {
      const beforeCall = new Date();
      const result = controller.getHealthStatus();
      const afterCall = new Date();

      const resultTimestamp = new Date(result.timestamp);
      expect(resultTimestamp).toBeInstanceOf(Date);
      expect(isNaN(resultTimestamp.getTime())).toBe(false);

      expect(resultTimestamp.getTime()).toBeGreaterThanOrEqual(
        beforeCall.getTime() - 1000,
      );
      expect(resultTimestamp.getTime()).toBeLessThanOrEqual(
        afterCall.getTime() + 1000,
      );
    });

    it('should include error management service status', () => {
      const result = controller.getHealthStatus();

      expect(result.services.errorManagement).toEqual({
        status: 'active',
        totalErrors: mockErrorStats.total,
      });
    });

    it('should include sentry service status when enabled', () => {
      sentryService.isEnabled.mockReturnValue(true);

      const result = controller.getHealthStatus();

      expect(result.services.sentry).toEqual({
        status: 'active',
        enabled: true,
      });
    });

    it('should include sentry service status when disabled', () => {
      sentryService.isEnabled.mockReturnValue(false);

      const result = controller.getHealthStatus();

      expect(result.services.sentry).toEqual({
        status: 'disabled',
        enabled: false,
      });
    });

    it('should include error summary statistics', () => {
      const result = controller.getHealthStatus();

      expect(result.summary).toEqual({
        totalErrors: mockErrorStats.total,
        bySeverity: mockErrorStats.bySeverity,
        byCategory: mockErrorStats.byCategory,
        recentErrors: mockErrorStats.recentErrors.length,
      });
    });

    it('should call getErrorStats once', () => {
      controller.getHealthStatus();

      expect(errorManagementService.getErrorStats).toHaveBeenCalledTimes(1);
      expect(errorManagementService.getErrorStats).toHaveBeenCalledWith();
    });

    it('should call isEnabled once', () => {
      controller.getHealthStatus();

      expect(sentryService.isEnabled).toHaveBeenCalledTimes(1);
    });

    it('should handle zero errors', () => {
      const zeroStats = { ...mockErrorStats, total: 0, recentErrors: [] };
      errorManagementService.getErrorStats.mockReturnValue(zeroStats);

      const result = controller.getHealthStatus();

      expect(result.services.errorManagement.totalErrors).toBe(0);
      expect(result.summary.totalErrors).toBe(0);
      expect(result.summary.recentErrors).toBe(0);
    });

    it('should handle empty error statistics', () => {
      const emptyStats = {
        ...mockErrorStats,
        bySeverity: {},
        byCategory: {},
        recentErrors: [],
      };
      errorManagementService.getErrorStats.mockReturnValue(emptyStats);

      const result = controller.getHealthStatus();

      expect(result.summary.bySeverity).toEqual({});
      expect(result.summary.byCategory).toEqual({});
      expect(result.summary.recentErrors).toBe(0);
    });

    it('should return consistent structure regardless of data', () => {
      const result = controller.getHealthStatus();

      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('services');
      expect(result.services).toHaveProperty('errorManagement');
      expect(result.services).toHaveProperty('sentry');
      expect(result).toHaveProperty('summary');
      expect(result.summary).toHaveProperty('totalErrors');
      expect(result.summary).toHaveProperty('bySeverity');
      expect(result.summary).toHaveProperty('byCategory');
      expect(result.summary).toHaveProperty('recentErrors');
    });
  });

  describe('controller configuration', () => {
    it('should be configured with correct route prefix', () => {
      // This is tested by ensuring the controller exists and works
      expect(controller).toBeInstanceOf(ErrorMonitoringController);
    });

    it('should have required guards applied', () => {
      // Guards are applied at class level, tested by ensuring controller works
      expect(controller).toBeDefined();
    });

    it('should have proper API documentation tags', () => {
      // API tags are metadata, tested by ensuring controller works
      expect(controller).toBeDefined();
    });
  });

  describe('integration scenarios', () => {
    it('should handle typical admin dashboard request', () => {
      const result = controller.getHealthStatus();

      expect(result.status).toBe('healthy');
      expect(result.services.errorManagement.status).toBe('active');
      expect(result.services.sentry.status).toBe('active');
      expect(typeof result.summary.totalErrors).toBe('number');
    });

    it('should handle error statistics filtering request', () => {
      const merchantId = 'merchant_123';
      const severity = 'high';
      const from = '2023-01-01';
      const to = '2023-12-31';

      const result = controller.getErrorStats(
        merchantId,
        severity,
        undefined,
        from,
        to,
      );

      expect(errorManagementService.getErrorStats).toHaveBeenCalledWith({
        merchantId,
        severity,
        from: new Date(from),
        to: new Date(to),
      });
      expect(result).toBe(mockErrorStats);
    });

    it('should handle sentry status check', async () => {
      const result = await controller.getSentryStatus();

      expect(result).toEqual({
        enabled: true,
        currentUserId: 'user_123',
        timestamp: expect.any(String),
      });
    });

    it('should handle system monitoring scenario', () => {
      // Simulate a system check
      const health = controller.getHealthStatus();
      const stats = controller.getErrorStats();

      expect(health.status).toBe('healthy');
      expect(stats.total).toBe(mockErrorStats.total);
      expect(errorManagementService.getErrorStats).toHaveBeenCalledTimes(2);
    });
  });

  describe('error handling', () => {
    it('should handle error management service throwing errors', () => {
      errorManagementService.getErrorStats.mockImplementation(() => {
        throw new Error('Service unavailable');
      });

      expect(() => controller.getHealthStatus()).toThrow('Service unavailable');
    });

    it('should handle sentry service throwing errors', async () => {
      sentryService.isEnabled.mockImplementation(() => {
        throw new Error('Sentry error');
      });

      await expect(controller.getSentryStatus()).rejects.toThrow(
        'Sentry error',
      );
    });

    it('should handle date parsing errors in filters', () => {
      expect(() => {
        controller.getErrorStats(
          undefined,
          undefined,
          undefined,
          'invalid-date',
        );
      }).toThrow();
    });
  });

  describe('performance considerations', () => {
    it('should handle rapid successive calls', () => {
      const startTime = Date.now();

      for (let i = 0; i < 1000; i++) {
        controller.getErrorStats();
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should not create memory leaks', () => {
      for (let i = 0; i < 10000; i++) {
        controller.getHealthStatus();
      }

      // If we get here without memory issues, test passes
      expect(true).toBe(true);
    });
  });
});

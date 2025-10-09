import { ErrorLoggingInterceptor } from '../common/interceptors/error-logging.interceptor';
import { HttpMetricsInterceptor } from '../common/interceptors/http-metrics.interceptor';
import { PerformanceTrackingInterceptor } from '../common/interceptors/performance-tracking.interceptor';

import { configureInterceptors } from './configure-interceptors';

describe('configureInterceptors', () => {
  let mockApp: any;

  beforeEach(() => {
    mockApp = {
      useGlobalInterceptors: jest.fn(),
      get: jest.fn(),
    };

    // Reset all mocks
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(configureInterceptors).toBeDefined();
  });

  describe('Global interceptors configuration', () => {
    it('should get all required interceptors from app', () => {
      const mockInterceptors = {
        httpMetrics: {},
        errorLogging: {},
        performanceTracking: {},
      };

      mockApp.get
        .mockReturnValueOnce(mockInterceptors.httpMetrics)
        .mockReturnValueOnce(mockInterceptors.errorLogging)
        .mockReturnValueOnce(mockInterceptors.performanceTracking);

      configureInterceptors(mockApp);

      expect(mockApp.get).toHaveBeenCalledWith(HttpMetricsInterceptor);
      expect(mockApp.get).toHaveBeenCalledWith(ErrorLoggingInterceptor);
      expect(mockApp.get).toHaveBeenCalledWith(PerformanceTrackingInterceptor);
    });

    it('should register all global interceptors', () => {
      const mockInterceptors = {
        httpMetrics: {},
        errorLogging: {},
        performanceTracking: {},
      };

      mockApp.get
        .mockReturnValueOnce(mockInterceptors.httpMetrics)
        .mockReturnValueOnce(mockInterceptors.errorLogging)
        .mockReturnValueOnce(mockInterceptors.performanceTracking);

      configureInterceptors(mockApp);

      expect(mockApp.useGlobalInterceptors).toHaveBeenCalledWith(
        mockInterceptors.httpMetrics,
        mockInterceptors.errorLogging,
        mockInterceptors.performanceTracking,
      );
    });

    it('should register interceptors in correct order', () => {
      const mockInterceptors = {
        httpMetrics: {},
        errorLogging: {},
        performanceTracking: {},
      };

      mockApp.get
        .mockReturnValueOnce(mockInterceptors.httpMetrics)
        .mockReturnValueOnce(mockInterceptors.errorLogging)
        .mockReturnValueOnce(mockInterceptors.performanceTracking);

      configureInterceptors(mockApp);

      const callArgs = mockApp.useGlobalInterceptors.mock.calls[0];
      expect(callArgs[0]).toBe(mockInterceptors.httpMetrics);
      expect(callArgs[1]).toBe(mockInterceptors.errorLogging);
      expect(callArgs[2]).toBe(mockInterceptors.performanceTracking);
    });

    it('should handle interceptor retrieval errors gracefully', () => {
      mockApp.get.mockImplementation(() => {
        throw new Error('Interceptor not found');
      });

      expect(() => configureInterceptors(mockApp)).toThrow(
        'Interceptor not found',
      );
    });

    it('should handle null/undefined interceptors', () => {
      mockApp.get.mockReturnValue(null);

      expect(() => configureInterceptors(mockApp)).not.toThrow();

      expect(mockApp.useGlobalInterceptors).toHaveBeenCalledWith(
        null,
        null,
        null,
      );
    });
  });

  describe('Integration scenarios', () => {
    it('should work correctly in a typical NestJS application setup', () => {
      const mockInterceptors = {
        httpMetrics: {},
        errorLogging: {},
        performanceTracking: {},
      };

      mockApp.get
        .mockReturnValueOnce(mockInterceptors.httpMetrics)
        .mockReturnValueOnce(mockInterceptors.errorLogging)
        .mockReturnValueOnce(mockInterceptors.performanceTracking);

      configureInterceptors(mockApp);

      expect(mockApp.get).toHaveBeenCalledWith(HttpMetricsInterceptor);
      expect(mockApp.get).toHaveBeenCalledWith(ErrorLoggingInterceptor);
      expect(mockApp.get).toHaveBeenCalledWith(PerformanceTrackingInterceptor);
      expect(mockApp.useGlobalInterceptors).toHaveBeenCalledWith(
        mockInterceptors.httpMetrics,
        mockInterceptors.errorLogging,
        mockInterceptors.performanceTracking,
      );
    });

    it('should handle multiple interceptor registrations', () => {
      const mockInterceptors = {
        httpMetrics: {},
        errorLogging: {},
        performanceTracking: {},
      };

      mockApp.get
        .mockReturnValueOnce(mockInterceptors.httpMetrics)
        .mockReturnValueOnce(mockInterceptors.errorLogging)
        .mockReturnValueOnce(mockInterceptors.performanceTracking);

      // Configure multiple times
      configureInterceptors(mockApp);
      configureInterceptors(mockApp);

      expect(mockApp.useGlobalInterceptors).toHaveBeenCalledTimes(2);
    });
  });

  describe('Performance considerations', () => {
    it('should handle rapid successive configurations', () => {
      const mockInterceptors = {
        httpMetrics: {},
        errorLogging: {},
        performanceTracking: {},
      };

      mockApp.get
        .mockReturnValueOnce(mockInterceptors.httpMetrics)
        .mockReturnValueOnce(mockInterceptors.errorLogging)
        .mockReturnValueOnce(mockInterceptors.performanceTracking);

      // Configure multiple times
      for (let i = 0; i < 100; i++) {
        configureInterceptors(mockApp);
      }

      expect(mockApp.useGlobalInterceptors).toHaveBeenCalledTimes(100);
    });

    it('should be memory efficient', () => {
      const mockInterceptors = {
        httpMetrics: {},
        errorLogging: {},
        performanceTracking: {},
      };

      mockApp.get
        .mockReturnValueOnce(mockInterceptors.httpMetrics)
        .mockReturnValueOnce(mockInterceptors.errorLogging)
        .mockReturnValueOnce(mockInterceptors.performanceTracking);

      const initialMemory = process.memoryUsage().heapUsed;

      // Configure many times
      for (let i = 0; i < 1000; i++) {
        configureInterceptors(mockApp);
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be reasonable
      expect(memoryIncrease).toBeLessThan(5 * 1024 * 1024);
    });
  });

  describe('Error handling', () => {
    it('should handle app without required methods gracefully', () => {
      const invalidApp = {};

      expect(() => configureInterceptors(invalidApp as any)).not.toThrow();
    });

    it('should handle get method throwing errors', () => {
      mockApp.get.mockImplementation(() => {
        throw new Error('Service not available');
      });

      expect(() => configureInterceptors(mockApp)).toThrow(
        'Service not available',
      );
    });

    it('should handle useGlobalInterceptors throwing errors', () => {
      const mockInterceptors = {
        httpMetrics: {},
        errorLogging: {},
        performanceTracking: {},
      };

      mockApp.get
        .mockReturnValueOnce(mockInterceptors.httpMetrics)
        .mockReturnValueOnce(mockInterceptors.errorLogging)
        .mockReturnValueOnce(mockInterceptors.performanceTracking);

      mockApp.useGlobalInterceptors.mockImplementation(() => {
        throw new Error('Interceptor registration failed');
      });

      expect(() => configureInterceptors(mockApp)).toThrow(
        'Interceptor registration failed',
      );
    });
  });

  describe('Configuration validation', () => {
    it('should always register all three interceptors', () => {
      const mockInterceptors = {
        httpMetrics: {},
        errorLogging: {},
        performanceTracking: {},
      };

      mockApp.get
        .mockReturnValueOnce(mockInterceptors.httpMetrics)
        .mockReturnValueOnce(mockInterceptors.errorLogging)
        .mockReturnValueOnce(mockInterceptors.performanceTracking);

      configureInterceptors(mockApp);

      expect(mockApp.get).toHaveBeenCalledWith(HttpMetricsInterceptor);
      expect(mockApp.get).toHaveBeenCalledWith(ErrorLoggingInterceptor);
      expect(mockApp.get).toHaveBeenCalledWith(PerformanceTrackingInterceptor);
    });

    it('should register interceptors exactly once per configuration', () => {
      const mockInterceptors = {
        httpMetrics: {},
        errorLogging: {},
        performanceTracking: {},
      };

      mockApp.get
        .mockReturnValueOnce(mockInterceptors.httpMetrics)
        .mockReturnValueOnce(mockInterceptors.errorLogging)
        .mockReturnValueOnce(mockInterceptors.performanceTracking);

      configureInterceptors(mockApp);

      expect(mockApp.useGlobalInterceptors).toHaveBeenCalledTimes(1);
      expect(mockApp.useGlobalInterceptors).toHaveBeenCalledWith(
        mockInterceptors.httpMetrics,
        mockInterceptors.errorLogging,
        mockInterceptors.performanceTracking,
      );
    });

    it('should handle interceptor order correctly', () => {
      const mockInterceptors = {
        httpMetrics: {},
        errorLogging: {},
        performanceTracking: {},
      };

      mockApp.get
        .mockReturnValueOnce(mockInterceptors.httpMetrics)
        .mockReturnValueOnce(mockInterceptors.errorLogging)
        .mockReturnValueOnce(mockInterceptors.performanceTracking);

      configureInterceptors(mockApp);

      const callArgs = mockApp.useGlobalInterceptors.mock.calls[0];

      // Order should be: HttpMetricsInterceptor, ErrorLoggingInterceptor, PerformanceTrackingInterceptor
      expect(callArgs).toHaveLength(3);
      expect(callArgs[0]).toBe(mockInterceptors.httpMetrics);
      expect(callArgs[1]).toBe(mockInterceptors.errorLogging);
      expect(callArgs[2]).toBe(mockInterceptors.performanceTracking);
    });
  });
});

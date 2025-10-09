import { Logger as PinoLogger } from 'nestjs-pino';

import { configureLogging } from './configure-logging';

describe('configureLogging', () => {
  let mockApp: any;

  beforeEach(() => {
    mockApp = {
      useLogger: jest.fn(),
      get: jest.fn(),
    };

    // Reset all mocks
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(configureLogging).toBeDefined();
  });

  describe('Pino logger configuration', () => {
    it('should get Pino logger from app', () => {
      const mockLogger = {};
      mockApp.get.mockReturnValue(mockLogger);

      configureLogging(mockApp);

      expect(mockApp.get).toHaveBeenCalledWith(PinoLogger);
    });

    it('should configure app to use Pino logger', () => {
      const mockLogger = {};
      mockApp.get.mockReturnValue(mockLogger);

      configureLogging(mockApp);

      expect(mockApp.useLogger).toHaveBeenCalledWith(mockLogger);
    });

    it('should handle logger retrieval errors gracefully', () => {
      mockApp.get.mockImplementation(() => {
        throw new Error('Logger not found');
      });

      expect(() => configureLogging(mockApp)).toThrow('Logger not found');
    });

    it('should handle null/undefined logger', () => {
      mockApp.get.mockReturnValue(null);

      expect(() => configureLogging(mockApp)).not.toThrow();

      expect(mockApp.useLogger).toHaveBeenCalledWith(null);
    });
  });

  describe('Integration scenarios', () => {
    it('should work correctly in a typical NestJS application setup', () => {
      const mockLogger = {};
      mockApp.get.mockReturnValue(mockLogger);

      configureLogging(mockApp);

      expect(mockApp.get).toHaveBeenCalledWith(PinoLogger);
      expect(mockApp.useLogger).toHaveBeenCalledWith(mockLogger);
    });

    it('should handle multiple logger configurations', () => {
      const mockLogger = {};
      mockApp.get.mockReturnValue(mockLogger);

      // Configure multiple times
      configureLogging(mockApp);
      configureLogging(mockApp);

      expect(mockApp.useLogger).toHaveBeenCalledTimes(2);
      expect(mockApp.useLogger).toHaveBeenCalledWith(mockLogger);
    });
  });

  describe('Performance considerations', () => {
    it('should handle rapid successive configurations', () => {
      const mockLogger = {};
      mockApp.get.mockReturnValue(mockLogger);

      // Configure multiple times
      for (let i = 0; i < 100; i++) {
        configureLogging(mockApp);
      }

      expect(mockApp.useLogger).toHaveBeenCalledTimes(100);
    });

    it('should be memory efficient', () => {
      const mockLogger = {};
      mockApp.get.mockReturnValue(mockLogger);

      const initialMemory = process.memoryUsage().heapUsed;

      // Configure many times
      for (let i = 0; i < 1000; i++) {
        configureLogging(mockApp);
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

      expect(() => configureLogging(invalidApp as any)).not.toThrow();
    });

    it('should handle get method throwing errors', () => {
      mockApp.get.mockImplementation(() => {
        throw new Error('Service not available');
      });

      expect(() => configureLogging(mockApp)).toThrow('Service not available');
    });

    it('should handle useLogger throwing errors', () => {
      const mockLogger = {};
      mockApp.get.mockReturnValue(mockLogger);
      mockApp.useLogger.mockImplementation(() => {
        throw new Error('Logger configuration failed');
      });

      expect(() => configureLogging(mockApp)).toThrow(
        'Logger configuration failed',
      );
    });
  });

  describe('Configuration validation', () => {
    it('should always use PinoLogger', () => {
      const mockLogger = {};
      mockApp.get.mockReturnValue(mockLogger);

      configureLogging(mockApp);

      expect(mockApp.get).toHaveBeenCalledWith(PinoLogger);
    });

    it('should configure logger exactly once per call', () => {
      const mockLogger = {};
      mockApp.get.mockReturnValue(mockLogger);

      configureLogging(mockApp);

      expect(mockApp.useLogger).toHaveBeenCalledTimes(1);
      expect(mockApp.useLogger).toHaveBeenCalledWith(mockLogger);
    });
  });
});

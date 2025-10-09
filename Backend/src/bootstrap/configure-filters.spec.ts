import { AllExceptionsFilter } from '../common/filters/all-exceptions.filter';

import { configureFilters } from './configure-filters';

describe('configureFilters', () => {
  let mockApp: any;

  beforeEach(() => {
    mockApp = {
      useGlobalFilters: jest.fn(),
      get: jest.fn(),
    };

    // Reset all mocks
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(configureFilters).toBeDefined();
  });

  describe('Global exception filter configuration', () => {
    it('should get AllExceptionsFilter from app', () => {
      const mockFilter = {};
      mockApp.get.mockReturnValue(mockFilter);

      configureFilters(mockApp);

      expect(mockApp.get).toHaveBeenCalledWith(AllExceptionsFilter);
    });

    it('should register global exception filter', () => {
      const mockFilter = {};
      mockApp.get.mockReturnValue(mockFilter);

      configureFilters(mockApp);

      expect(mockApp.useGlobalFilters).toHaveBeenCalledWith(mockFilter);
    });

    it('should handle filter retrieval errors gracefully', () => {
      mockApp.get.mockImplementation(() => {
        throw new Error('Filter not found');
      });

      expect(() => configureFilters(mockApp)).toThrow('Filter not found');
    });

    it('should handle null/undefined filter', () => {
      mockApp.get.mockReturnValue(null);

      expect(() => configureFilters(mockApp)).not.toThrow();

      expect(mockApp.useGlobalFilters).toHaveBeenCalledWith(null);
    });
  });

  describe('Integration scenarios', () => {
    it('should work correctly in a typical NestJS application setup', () => {
      const mockFilter = {};
      mockApp.get.mockReturnValue(mockFilter);

      configureFilters(mockApp);

      expect(mockApp.get).toHaveBeenCalledWith(AllExceptionsFilter);
      expect(mockApp.useGlobalFilters).toHaveBeenCalledWith(mockFilter);
    });

    it('should handle multiple filter registrations', () => {
      const mockFilter = {};
      mockApp.get.mockReturnValue(mockFilter);

      // Configure multiple times
      configureFilters(mockApp);
      configureFilters(mockApp);

      expect(mockApp.useGlobalFilters).toHaveBeenCalledTimes(2);
      expect(mockApp.useGlobalFilters).toHaveBeenCalledWith(mockFilter);
    });
  });

  describe('Performance considerations', () => {
    it('should handle rapid successive configurations', () => {
      const mockFilter = {};
      mockApp.get.mockReturnValue(mockFilter);

      // Configure multiple times
      for (let i = 0; i < 100; i++) {
        configureFilters(mockApp);
      }

      expect(mockApp.useGlobalFilters).toHaveBeenCalledTimes(100);
    });

    it('should be memory efficient', () => {
      const mockFilter = {};
      mockApp.get.mockReturnValue(mockFilter);

      const initialMemory = process.memoryUsage().heapUsed;

      // Configure many times
      for (let i = 0; i < 1000; i++) {
        configureFilters(mockApp);
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

      expect(() => configureFilters(invalidApp as any)).not.toThrow();
    });

    it('should handle get method throwing errors', () => {
      mockApp.get.mockImplementation(() => {
        throw new Error('Service not available');
      });

      expect(() => configureFilters(mockApp)).toThrow('Service not available');
    });

    it('should handle useGlobalFilters throwing errors', () => {
      const mockFilter = {};
      mockApp.get.mockReturnValue(mockFilter);
      mockApp.useGlobalFilters.mockImplementation(() => {
        throw new Error('Filter registration failed');
      });

      expect(() => configureFilters(mockApp)).toThrow(
        'Filter registration failed',
      );
    });
  });

  describe('Configuration validation', () => {
    it('should always use AllExceptionsFilter', () => {
      const mockFilter = {};
      mockApp.get.mockReturnValue(mockFilter);

      configureFilters(mockApp);

      expect(mockApp.get).toHaveBeenCalledWith(AllExceptionsFilter);
    });

    it('should register exactly one filter', () => {
      const mockFilter = {};
      mockApp.get.mockReturnValue(mockFilter);

      configureFilters(mockApp);

      expect(mockApp.useGlobalFilters).toHaveBeenCalledTimes(1);
      expect(mockApp.useGlobalFilters).toHaveBeenCalledWith(mockFilter);
    });
  });
});

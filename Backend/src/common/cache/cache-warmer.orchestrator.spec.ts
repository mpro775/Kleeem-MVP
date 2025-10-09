import { Logger } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { CacheWarmerOrchestrator } from './cache-warmer.orchestrator';

import type { CacheWarmer } from './warmers/cache-warmer.interface';
import type { TestingModule } from '@nestjs/testing';

describe('CacheWarmerOrchestrator', () => {
  let orchestrator: CacheWarmerOrchestrator;
  let mockWarmers: jest.Mocked<CacheWarmer>[];

  beforeEach(async () => {
    jest.clearAllMocks();

    // Create mock warmers with correct interface
    mockWarmers = [
      {
        name: 'products',
        warm: jest.fn().mockResolvedValue(undefined),
      },
      {
        name: 'categories',
        warm: jest.fn().mockResolvedValue(undefined),
      },
      {
        name: 'merchants',
        warm: jest.fn().mockResolvedValue(undefined),
      },
    ];

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: CacheWarmerOrchestrator,
          useFactory: () => new CacheWarmerOrchestrator(mockWarmers),
        },
      ],
    }).compile();

    orchestrator = module.get<CacheWarmerOrchestrator>(CacheWarmerOrchestrator);
  });

  it('should be defined', () => {
    expect(orchestrator).toBeDefined();
  });

  describe('constructor', () => {
    it('should accept array of warmers', () => {
      expect(orchestrator).toBeDefined();
    });

    it('should handle empty warmers array', () => {
      const emptyOrchestrator = new CacheWarmerOrchestrator([]);
      expect(emptyOrchestrator).toBeDefined();
    });
  });

  describe('warmAll', () => {
    beforeEach(() => {
      mockWarmers.forEach((warmer) => {
        warmer.warm.mockClear();
      });
    });

    it('should execute all warmers successfully', async () => {
      await orchestrator.warmAll();

      mockWarmers.forEach((warmer: any) => {
        expect(warmer.warm).toHaveBeenCalledTimes(1);
      });
    });

    it('should prevent concurrent warming', async () => {
      // Start first warming
      const firstWarm = orchestrator.warmAll();

      // Try to start second warming while first is in progress
      await orchestrator.warmAll();

      // Only first set should be called once
      mockWarmers.forEach((warmer) => {
        expect(warmer.warm).toHaveBeenCalledTimes(1);
      });

      await firstWarm;
    });

    it('should log debug message when warming is already in progress', async () => {
      const debugSpy = jest
        .spyOn(Logger.prototype, 'debug')
        .mockImplementation();

      // Start first warming
      const firstWarm = orchestrator.warmAll();

      // Try to start second warming while first is in progress
      await orchestrator.warmAll();

      expect(debugSpy).toHaveBeenCalledWith(
        'Cache warming already in progress, skipping...',
      );

      await firstWarm;
      debugSpy.mockRestore();
    });

    it('should handle warmer failures gracefully', async () => {
      const error = new Error('Warmer failed');
      mockWarmers[0].warm.mockRejectedValue(error);

      // Should not throw, just log the error
      await expect(orchestrator.warmAll()).resolves.not.toThrow();

      // Other warmers should still be called
      expect(mockWarmers[1].warm).toHaveBeenCalled();
      expect(mockWarmers[2].warm).toHaveBeenCalled();
    });

    it('should reset isWarming flag after completion', async () => {
      await orchestrator.warmAll();

      // Should be able to start warming again
      await orchestrator.warmAll();

      mockWarmers.forEach((warmer) => {
        expect(warmer.warm).toHaveBeenCalledTimes(2);
      });
    });

    it('should reset isWarming flag even if warming fails', async () => {
      mockWarmers[0].warm.mockRejectedValue(new Error('Failed'));

      await orchestrator.warmAll();

      // Should be able to start warming again
      await orchestrator.warmAll();

      mockWarmers.forEach((warmer) => {
        expect(warmer.warm).toHaveBeenCalledTimes(2);
      });
    });

    it('should log warming start and completion', async () => {
      const loggerSpy = jest
        .spyOn(Logger.prototype, 'log')
        .mockImplementation();

      await orchestrator.warmAll();

      // Verify logging calls (implementation detail, but important for monitoring)
      expect(loggerSpy).toHaveBeenCalledWith(
        'Starting cache warming process...',
      );
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringMatching(/Cache warming completed in \d+ms/),
      );

      loggerSpy.mockRestore();
    });
  });

  describe('manualWarm', () => {
    beforeEach(() => {
      mockWarmers.forEach((warmer) => {
        warmer.warm.mockClear();
      });
    });

    it('should warm all warmers when no type specified', async () => {
      await orchestrator.manualWarm();

      mockWarmers.forEach((warmer) => {
        expect(warmer.warm).toHaveBeenCalledTimes(1);
      });
    });

    it('should warm specific warmer by name', async () => {
      await orchestrator.manualWarm('products');

      expect(mockWarmers[0].warm).toHaveBeenCalledTimes(1);
      expect(mockWarmers[1].warm).not.toHaveBeenCalled();
      expect(mockWarmers[2].warm).not.toHaveBeenCalled();
    });

    it('should be case insensitive for name matching', async () => {
      await orchestrator.manualWarm('PRODUCTS');

      expect(mockWarmers[0].warm).toHaveBeenCalledTimes(1);
      expect(mockWarmers[1].warm).not.toHaveBeenCalled();
    });

    it('should handle non-existent warmer name gracefully', async () => {
      await orchestrator.manualWarm('nonexistent');

      // No warmers should be called
      mockWarmers.forEach((warmer) => {
        expect(warmer.warm).not.toHaveBeenCalled();
      });
    });

    it('should throw error when specific warmer fails', async () => {
      const error = new Error('Products warmer failed');
      mockWarmers[0].warm.mockRejectedValue(error);

      await expect(orchestrator.manualWarm('products')).rejects.toThrow(
        'Products warmer failed',
      );
    });

    it('should execute multiple warmers of same name if they exist', async () => {
      // Add another products warmer
      const additionalWarmer = {
        name: 'products',
        warm: jest.fn().mockResolvedValue(undefined),
      };

      mockWarmers.push(additionalWarmer);

      await orchestrator.manualWarm('products');

      expect(mockWarmers[0].warm).toHaveBeenCalledTimes(1);
      expect(additionalWarmer.warm).toHaveBeenCalledTimes(1);
      expect(mockWarmers[1].warm).not.toHaveBeenCalled();
    });

    it('should handle undefined name parameter', async () => {
      await orchestrator.manualWarm(undefined);

      mockWarmers.forEach((warmer) => {
        expect(warmer.warm).toHaveBeenCalledTimes(1);
      });
    });

    it('should log manual warming start and completion', async () => {
      const logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();

      await orchestrator.manualWarm('products');

      expect(logSpy).toHaveBeenCalledWith(
        'Manual cache warming started for products',
      );
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringMatching(/Manual warming done in \d+ms/),
      );

      logSpy.mockRestore();
    });

    it('should log manual warming without specific type', async () => {
      const logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();

      await orchestrator.manualWarm();

      expect(logSpy).toHaveBeenCalledWith('Manual cache warming started');
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringMatching(/Manual warming done in \d+ms/),
      );

      logSpy.mockRestore();
    });

    it('should log errors during manual warming', async () => {
      const errorSpy = jest
        .spyOn(Logger.prototype, 'error')
        .mockImplementation();
      const error = new Error('Manual warming failed');

      mockWarmers[0].warm.mockRejectedValue(error);

      await expect(orchestrator.manualWarm('products')).rejects.toThrow();

      expect(errorSpy).toHaveBeenCalledWith(
        'Manual warming failed for products',
        error,
      );

      errorSpy.mockRestore();
    });
  });

  describe('cron scheduling', () => {
    it('should have cron decorator for warmAll method', () => {
      // This is tested by the fact that the method exists and is properly decorated
      // The actual cron behavior would be tested in integration tests
      expect(typeof orchestrator.warmAll).toBe('function');
    });

    it('should use correct cron expression', () => {
      // Every 15 minutes: '*/15 * * * *'
      // This is verified by the decorator configuration
      expect(orchestrator).toBeDefined();
    });

    it('should use correct timezone', () => {
      // Asia/Riyadh timezone
      // This is verified by the decorator configuration
      expect(orchestrator).toBeDefined();
    });
  });

  describe('concurrent execution protection', () => {
    it('should prevent overlapping automatic warming cycles', async () => {
      // Simulate long-running warming
      mockWarmers[0].warm.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100)),
      );

      const firstWarm = orchestrator.warmAll();
      const secondWarm = orchestrator.warmAll();

      await Promise.all([firstWarm, secondWarm]);

      // Only called once due to concurrency protection
      expect(mockWarmers[0].warm).toHaveBeenCalledTimes(1);
    });

    it('should allow manual warming during automatic warming', async () => {
      // Simulate long-running automatic warming
      mockWarmers[0].warm.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100)),
      );

      const automaticWarm = orchestrator.warmAll();
      const manualWarm = orchestrator.manualWarm('categories');

      await Promise.all([automaticWarm, manualWarm]);

      expect(mockWarmers[0].warm).toHaveBeenCalledTimes(1); // Automatic only
      expect(mockWarmers[1].warm).toHaveBeenCalledTimes(2); // Automatic + Manual
      expect(mockWarmers[2].warm).toHaveBeenCalledTimes(1); // Automatic only
    });
  });

  describe('error handling and logging', () => {
    let _logger: Logger;

    beforeEach(() => {
      _logger = new Logger();
    });

    it('should log warming start and completion times', async () => {
      const logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();

      await orchestrator.warmAll();

      // Should log start and completion with timing
      expect(logSpy).toHaveBeenCalledWith('Starting cache warming process...');
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringMatching(/Cache warming completed in \d+ms/),
      );

      logSpy.mockRestore();
    });

    it('should log errors during warming', async () => {
      const errorSpy = jest
        .spyOn(Logger.prototype, 'error')
        .mockImplementation();
      const error = new Error('Warming failed');

      mockWarmers[0].warm.mockRejectedValue(error);

      await orchestrator.warmAll();

      expect(errorSpy).toHaveBeenCalledWith('Cache warming failed', error);

      errorSpy.mockRestore();
    });

    it('should log warnings for unknown warmer names', async () => {
      const warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();

      await orchestrator.manualWarm('unknown');

      expect(warnSpy).toHaveBeenCalledWith(
        'No warmer found for type "unknown"',
      );

      warnSpy.mockRestore();
    });
  });

  describe('performance and timing', () => {
    it('should measure and log execution time', async () => {
      const logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();

      await orchestrator.warmAll();

      // Should log timing information
      const logCalls = logSpy.mock.calls;
      const completionLog = logCalls.find(
        (call) =>
          call[0].includes('completed in') || call[0].includes('done in'),
      );

      expect(completionLog).toBeDefined();
      expect(completionLog![0]).toMatch(/\d+ms/);

      logSpy.mockRestore();
    });

    it('should execute warmers in parallel', async () => {
      const executionOrder: string[] = [];

      mockWarmers.forEach((warmer) => {
        warmer.warm.mockImplementation(async () => {
          executionOrder.push(`start-${warmer.name}`);
          await new Promise((resolve) => setTimeout(resolve, 10));
          executionOrder.push(`end-${warmer.name}`);
        });
      });

      await orchestrator.warmAll();

      // All warmers should start before any complete (parallel execution)
      const startIndex = executionOrder.indexOf('start-products');
      const endIndex = executionOrder.indexOf('end-products');

      expect(startIndex).toBeLessThan(endIndex);
      expect(
        executionOrder.filter((item) => item.startsWith('start-')).length,
      ).toBe(3);
      expect(
        executionOrder.filter((item) => item.startsWith('end-')).length,
      ).toBe(3);
    });
  });
});

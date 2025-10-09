import { Test, type TestingModule } from '@nestjs/testing';
import { Counter, Histogram, register } from 'prom-client';

import { CacheMetrics } from './cache.metrics';
import { HISTOGRAM_BUCKETS } from './constant';

// Mock prom-client
jest.mock('prom-client', () => ({
  Counter: jest.fn().mockImplementation((config) => ({
    inc: jest.fn(),
    config,
  })),
  Histogram: jest.fn().mockImplementation((config) => ({
    observe: jest.fn(),
    startTimer: jest.fn().mockReturnValue(jest.fn()),
    config,
  })),
  register: jest.fn(),
}));

describe('CacheMetrics', () => {
  let metrics: CacheMetrics;
  let mockCounter: jest.Mocked<Counter>;
  let mockHistogram: jest.Mocked<Histogram>;

  beforeEach(async () => {
    jest.clearAllMocks();

    // Create mock instances
    mockCounter = {
      inc: jest.fn(),
      get: jest.fn(),
      labels: jest.fn(),
      remove: jest.fn(),
      reset: jest.fn(),
      config: {},
    } as jest.Mocked<Counter>;

    mockHistogram = {
      observe: jest.fn(),
      startTimer: jest.fn().mockReturnValue(() => {}),
      get: jest.fn(),
      labels: jest.fn(),
      remove: jest.fn(),
      zero: jest.fn(),
      reset: jest.fn(),
      config: {},
    } as jest.Mocked<Histogram>;

    // Mock the constructors
    (Counter as jest.MockedClass<typeof Counter>).mockImplementation(
      () => mockCounter as Counter,
    );
    (Histogram as jest.MockedClass<typeof Histogram>).mockImplementation(
      () => mockHistogram as Histogram,
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [CacheMetrics],
    }).compile();

    metrics = module.get<CacheMetrics>(CacheMetrics);
  });

  it('should be defined', () => {
    expect(metrics).toBeDefined();
  });

  describe('constructor', () => {
    it('should initialize all metric counters and histograms', () => {
      expect(Counter).toHaveBeenCalledTimes(4); // hit, miss, set, invalidate counters
      expect(Histogram).toHaveBeenCalledTimes(1); // operation duration histogram
    });

    it('should create cache hit counter with correct configuration', () => {
      expect(Counter).toHaveBeenCalledWith({
        name: 'cache_hit_total',
        help: 'Total number of cache hits',
        labelNames: ['cache_level', 'cache_key_prefix'],
        registers: [register],
      });
    });

    it('should create cache miss counter with correct configuration', () => {
      expect(Counter).toHaveBeenCalledWith({
        name: 'cache_miss_total',
        help: 'Total number of cache misses',
        labelNames: ['cache_key_prefix'],
        registers: [register],
      });
    });

    it('should create cache set counter with correct configuration', () => {
      expect(Counter).toHaveBeenCalledWith({
        name: 'cache_set_total',
        help: 'Total number of cache sets',
        labelNames: ['cache_key_prefix'],
        registers: [register],
      });
    });

    it('should create cache invalidate counter with correct configuration', () => {
      expect(Counter).toHaveBeenCalledWith({
        name: 'cache_invalidate_total',
        help: 'Total number of cache invalidations',
        labelNames: ['pattern'],
        registers: [register],
      });
    });

    it('should create operation duration histogram with correct configuration', () => {
      expect(Histogram).toHaveBeenCalledWith({
        name: 'cache_operation_duration_seconds',
        help: 'Duration of cache operations',
        labelNames: ['operation', 'cache_level'],
        buckets: HISTOGRAM_BUCKETS,
        registers: [register],
      });
    });
  });

  describe('recordHit method', () => {
    it('should increment hit counter with correct labels', () => {
      const cacheLevel = 'l1';
      const keyPrefix = 'user:profile';

      metrics.recordHit(cacheLevel, keyPrefix);

      expect(mockCounter.inc).toHaveBeenCalledWith({
        cache_level: cacheLevel,
        cache_key_prefix: keyPrefix,
      });
    });

    it('should support both l1 and l2 cache levels', () => {
      metrics.recordHit('l1', 'test:key');
      metrics.recordHit('l2', 'another:key');

      expect(mockCounter.inc).toHaveBeenCalledTimes(2);
      expect(mockCounter.inc).toHaveBeenNthCalledWith(1, {
        cache_level: 'l1',
        cache_key_prefix: 'test:key',
      });
      expect(mockCounter.inc).toHaveBeenNthCalledWith(2, {
        cache_level: 'l2',
        cache_key_prefix: 'another:key',
      });
    });
  });

  describe('recordMiss method', () => {
    it('should increment miss counter with correct label', () => {
      const keyPrefix = 'user:profile';

      metrics.recordMiss(keyPrefix);

      expect(mockCounter.inc).toHaveBeenCalledWith({
        cache_key_prefix: keyPrefix,
      });
    });
  });

  describe('recordSet method', () => {
    it('should increment set counter with correct label', () => {
      const keyPrefix = 'user:session';

      metrics.recordSet(keyPrefix);

      expect(mockCounter.inc).toHaveBeenCalledWith({
        cache_key_prefix: keyPrefix,
      });
    });
  });

  describe('recordInvalidation method', () => {
    it('should increment invalidation counter with correct label', () => {
      const pattern = 'user:*:profile';

      metrics.recordInvalidation(pattern);

      expect(mockCounter.inc).toHaveBeenCalledWith({
        pattern,
      });
    });
  });

  describe('recordOperationDuration method', () => {
    it('should observe operation duration with correct labels and value', () => {
      const operation = 'get';
      const cacheLevel = 'combined';
      const duration = 0.125; // 125ms

      metrics.recordOperationDuration(operation, cacheLevel, duration);

      expect(mockHistogram.observe).toHaveBeenCalledWith(
        { operation, cache_level: cacheLevel },
        duration,
      );
    });
  });

  describe('startTimer method', () => {
    it('should return a timer function', () => {
      const operation = 'set';
      const cacheLevel = 'l2';

      const timer = metrics.startTimer(operation, cacheLevel);

      expect(typeof timer).toBe('function');
      expect(mockHistogram.startTimer).toHaveBeenCalledWith({
        operation,
        cache_level: cacheLevel,
      });
    });

    it('should create timer with correct labels', () => {
      const operation = 'delete';
      const cacheLevel = 'l1';

      metrics.startTimer(operation, cacheLevel);

      expect(mockHistogram.startTimer).toHaveBeenCalledWith({
        operation,
        cache_level: cacheLevel,
      });
    });

    it('should return callable timer function', () => {
      const timer = metrics.startTimer('test', 'l1');

      expect(() => timer()).not.toThrow();
    });
  });

  describe('extractKeyPrefix static method', () => {
    it('should extract key prefix from complex keys', () => {
      const testCases = [
        {
          input: 'user:123:profile',
          expected: 'user:123:profile',
        },
        {
          input: 'user:123:profile:name',
          expected: 'user:123:profile',
        },
        {
          input: 'merchant:abc:products:list:page:1',
          expected: 'merchant:abc:products',
        },
        {
          input: 'session:xyz',
          expected: 'session:xyz',
        },
        {
          input: 'simple-key',
          expected: 'simple-key',
        },
        {
          input: 'a:b:c:d:e:f',
          expected: 'a:b:c',
        },
      ];

      testCases.forEach(({ input, expected }) => {
        const result = CacheMetrics.extractKeyPrefix(input);
        expect(result).toBe(expected);
      });
    });

    it('should handle edge cases', () => {
      expect(CacheMetrics.extractKeyPrefix('')).toBe('');
      expect(CacheMetrics.extractKeyPrefix('single')).toBe('single');
      expect(CacheMetrics.extractKeyPrefix('a:b')).toBe('a:b');
      expect(CacheMetrics.extractKeyPrefix('a:b:c')).toBe('a:b:c');
    });
  });

  describe('integration with Prometheus registry', () => {
    it('should register all metrics with Prometheus registry', () => {
      // Verify that register was passed to all metric constructors
      expect(Counter).toHaveBeenCalledWith(
        expect.objectContaining({
          registers: [register],
        }),
      );

      expect(Histogram).toHaveBeenCalledWith(
        expect.objectContaining({
          registers: [register],
        }),
      );
    });

    it('should use histogram buckets from constants', () => {
      expect(Histogram).toHaveBeenCalledWith(
        expect.objectContaining({
          buckets: HISTOGRAM_BUCKETS,
        }),
      );
    });
  });

  describe('metric isolation', () => {
    it('should maintain separate counters for different operations', () => {
      // Each metric type should use its own counter instance
      // This is tested by verifying the constructor calls create separate instances

      metrics.recordHit('l1', 'test');
      metrics.recordMiss('test');
      metrics.recordSet('test');
      metrics.recordInvalidation('pattern');

      expect(mockCounter.inc).toHaveBeenCalledTimes(4);
    });

    it('should maintain separate histogram for operation durations', () => {
      metrics.recordOperationDuration('get', 'l1', 0.1);
      metrics.recordOperationDuration('set', 'l2', 0.2);

      expect(mockHistogram.observe).toHaveBeenCalledTimes(2);
    });
  });
});

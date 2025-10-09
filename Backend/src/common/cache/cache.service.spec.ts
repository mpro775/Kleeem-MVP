import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Test, type TestingModule } from '@nestjs/testing';

import { CacheMetrics } from './cache.metrics';
import { CacheService } from './cache.service';
import { MS_PER_SECOND } from './constant';

// Mock the cache metrics
jest.mock('./cache.metrics', () => ({
  CacheMetrics: class {
    startTimer = jest.fn().mockReturnValue(jest.fn()); // Return a mock timer function
    recordHit = jest.fn();
    recordMiss = jest.fn();

    static extractKeyPrefix = jest.fn().mockReturnValue('test_prefix');
  },
}));

// Mock prometheus gauge
const mockGauge = {
  set: jest.fn(),
};

// Mock Redis client
const mockRedisClient = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  pipeline: jest.fn(),
  scanStream: jest.fn(),
  flushdb: jest.fn(),
};

const mockCacheManager = {
  store: {
    client: mockRedisClient, // Make Redis client directly available
    getClient: jest.fn().mockReturnValue(mockRedisClient),
  },
};

describe('CacheService', () => {
  let service: CacheService;
  let _cacheMetrics: CacheMetrics;

  beforeEach(async () => {
    jest.clearAllMocks();

    // Reset Redis mock
    mockRedisClient.get.mockReset();
    mockRedisClient.set.mockReset();
    mockRedisClient.del.mockReset();
    mockRedisClient.pipeline.mockReset();
    mockRedisClient.scanStream.mockReset();
    mockRedisClient.flushdb.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CacheService,
        {
          provide: CACHE_MANAGER,
          useValue: mockCacheManager,
        },
        {
          provide: CacheMetrics,
          useClass: CacheMetrics,
        },
        {
          provide: 'PROM_METRIC_CACHE_HIT_RATE',
          useValue: mockGauge,
        },
      ],
    }).compile();

    service = module.get<CacheService>(CacheService);

    _cacheMetrics = module.get<CacheMetrics>(CacheMetrics);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('constructor and initialization', () => {
    it('should initialize with Redis client when available', () => {
      expect(service).toBeDefined();
      // Redis client should be resolved during construction
    });

    it('should handle missing Redis client gracefully', async () => {
      const moduleWithoutRedis: TestingModule = await Test.createTestingModule({
        providers: [
          CacheService,
          {
            provide: CACHE_MANAGER,
            useValue: { store: {} }, // No getClient method
          },
          {
            provide: CacheMetrics,
            useClass: CacheMetrics,
          },
          {
            provide: 'PROM_METRIC_CACHE_HIT_RATE',
            useValue: mockGauge,
          },
        ],
      }).compile();

      const serviceWithoutRedis =
        moduleWithoutRedis.get<CacheService>(CacheService);
      expect(serviceWithoutRedis).toBeDefined();
    });
  });

  describe('get method', () => {
    it('should return value from L1 cache when available and not expired', async () => {
      const key = 'test-key';
      const value = { data: 'test-value' };
      const ttlSeconds = 300;

      // First set the value
      await service.set(key, value, ttlSeconds);

      // Then get it
      const result = await service.get<typeof value>(key);
      expect(result).toEqual(value);
    });

    it('should return value from L2 cache when not in L1', async () => {
      const key = 'test-key-l2';
      const value = { data: 'l2-value' };
      const ttlSeconds = 300;

      // Mock Redis get to return the value
      const cachedEntry = {
        v: value,
        e: Date.now() + ttlSeconds * MS_PER_SECOND,
      };
      mockRedisClient.get.mockResolvedValue(JSON.stringify(cachedEntry));

      const result = await service.get<typeof value>(key);
      expect(result).toEqual(value);
      expect(mockRedisClient.get).toHaveBeenCalledWith(key);
    });

    it('should return undefined when key not found in any cache', async () => {
      const key = 'non-existent-key';

      mockRedisClient.get.mockResolvedValue(null);

      const result = await service.get(key);
      expect(result).toBeUndefined();
    });

    it('should return undefined for expired L1 entries', async () => {
      const key = 'expired-key';
      const value = { data: 'expired' };
      const shortTtl = 1; // 1 second

      await service.set(key, value, shortTtl);

      // Wait for expiration
      await new Promise((resolve) => setTimeout(resolve, 1100));

      const result = await service.get<typeof value>(key);
      expect(result).toBeUndefined();
    });

    it('should handle Redis errors gracefully', async () => {
      const key = 'error-key';

      mockRedisClient.get.mockRejectedValue(
        new Error('Redis connection failed'),
      );

      const result = await service.get(key);
      expect(result).toBeUndefined();
    });

    it('should handle invalid JSON from Redis', async () => {
      const key = 'invalid-json-key';

      mockRedisClient.get.mockResolvedValue('invalid json string');

      const result = await service.get(key);
      expect(result).toBeUndefined();
    });
  });

  describe('set method', () => {
    it('should store value in both L1 and L2 caches', async () => {
      const key = 'test-set-key';
      const value = { data: 'set-value' };
      const ttlSeconds = 300;

      await service.set(key, value, ttlSeconds);

      // Verify L1 cache has the value
      const l1Result = await service.get<typeof value>(key);
      expect(l1Result).toEqual(value);

      // Verify Redis set was called
      expect(mockRedisClient.set).toHaveBeenCalledWith(
        key,
        expect.any(String),
        'EX',
        ttlSeconds,
      );
    });

    it('should handle Redis set errors', async () => {
      const key = 'error-set-key';
      const value = { data: 'error-value' };
      const ttlSeconds = 300;

      mockRedisClient.set.mockRejectedValue(new Error('Redis set failed'));

      await expect(service.set(key, value, ttlSeconds)).rejects.toThrow(
        'Redis set failed',
      );
    });

    it('should store complex objects correctly', async () => {
      const key = 'complex-key';
      const value = {
        id: '123',
        nested: {
          array: [1, 2, 3],
          date: new Date('2023-01-01'),
        },
        metadata: {
          version: '1.0',
          tags: ['test', 'cache'],
        },
      };
      const ttlSeconds = 600;

      await service.set(key, value, ttlSeconds);

      const result = await service.get<typeof value>(key);
      expect(result).toEqual(value);
    });
  });

  describe('delete method', () => {
    it('should remove key from both L1 and L2 caches', async () => {
      const key = 'delete-test-key';
      const value = { data: 'to-be-deleted' };

      // First set the value
      await service.set(key, value, 300);

      // Verify it exists
      let result = await service.get<typeof value>(key);
      expect(result).toEqual(value);

      // Delete it
      await service.delete(key);

      // Verify it's gone
      result = await service.get<typeof value>(key);
      expect(result).toBeUndefined();

      // Verify Redis delete was called
      expect(mockRedisClient.del).toHaveBeenCalledWith(key);
    });

    it('should propagate Redis delete errors', async () => {
      const key = 'delete-error-key';

      mockRedisClient.del.mockRejectedValue(new Error('Redis delete failed'));

      await expect(service.delete(key)).rejects.toThrow('Redis delete failed');
    });
  });

  describe('invalidate method', () => {
    it('should invalidate keys matching pattern', async () => {
      const pattern = 'test-pattern-*';
      const keys = ['test-pattern-1', 'test-pattern-2', 'other-key'];

      // Set some test keys
      await service.set(keys[0], { data: 'value1' }, 300);
      await service.set(keys[1], { data: 'value2' }, 300);
      await service.set(keys[2], { data: 'value3' }, 300);

      // Mock scanStream to return matching keys
      const mockStream = {
        on: jest.fn(),
        destroy: jest.fn(),
      };
      mockStream.on.mockImplementation((event, callback) => {
        if (event === 'data') {
          callback([keys[0], keys[1]]); // Only matching keys
        }
        if (event === 'end') {
          callback();
        }
      });
      mockRedisClient.scanStream.mockReturnValue(mockStream);

      // Mock pipeline for Redis operations
      const mockPipeline = {
        del: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      };
      mockRedisClient.pipeline.mockReturnValue(mockPipeline);

      await service.invalidate(pattern);

      // Verify pipeline.del was called for each matching key
      expect(mockPipeline.del).toHaveBeenCalledWith(keys[0]);
      expect(mockPipeline.del).toHaveBeenCalledWith(keys[1]);
      expect(mockPipeline.exec).toHaveBeenCalled();
    });

    it('should propagate scan errors', async () => {
      const pattern = 'error-pattern';

      mockRedisClient.scanStream.mockImplementation(() => {
        throw new Error('Scan failed');
      });

      await expect(service.invalidate(pattern)).rejects.toThrow('Scan failed');
    });
  });

  describe('cleanup and metrics', () => {
    it('should cleanup expired L1 entries periodically', async () => {
      const key1 = 'cleanup-test-1';
      const key2 = 'cleanup-test-2';

      // Set values with short TTL
      await service.set(key1, { data: 'short-lived' }, 1);
      await service.set(key2, { data: 'long-lived' }, 300);

      // Wait for first key to expire
      await new Promise((resolve) => setTimeout(resolve, 1100));

      // Trigger cleanup (normally called by @Interval)
      (service as any).cleanupL1Tick();

      // Verify expired key is removed from L1
      const result1 = await service.get(key1);
      const result2 = await service.get(key2);

      expect(result1).toBeUndefined(); // Should be cleaned up
      expect(result2).toBeDefined(); // Should still exist
    });

    it('should update hit rate metrics periodically', async () => {
      // Simulate some cache operations
      await service.set('test-metrics', { data: 'metrics' }, 300);
      await service.get('test-metrics'); // Hit
      await service.get('non-existent'); // Miss

      // Trigger metrics update (normally called by @Interval)
      (service as any).updateHitRate();

      // Verify gauge was updated
      expect(mockGauge.set).toHaveBeenCalledWith(
        { cache_type: 'redis' },
        expect.any(Number),
      );
    });

    it('should calculate hit rate correctly', () => {
      // Simulate hits and misses (short-term counters used by updateHitRate)
      (service as any).hits = 10;
      (service as any).misses = 5;

      service.updateHitRate();

      // Total operations: 15, hits: 10, hit rate: 66.67%
      expect(mockGauge.set).toHaveBeenCalledWith(
        { cache_type: 'redis' },
        expect.closeTo(66.67, 1),
      );

      // Counters should be reset
      expect((service as any).hits).toBe(0);
      expect((service as any).misses).toBe(0);
    });
  });

  describe('statistics and monitoring', () => {
    it('should track cache statistics', async () => {
      const key = 'stats-test';

      // Perform various operations
      await service.set(key, { data: 'stats' }, 300);
      await service.get(key); // Hit
      await service.get('non-existent'); // Miss
      await service.delete(key);

      const stats = (service as any).stats;

      expect(stats.sets).toBeGreaterThan(0);
      expect(stats.l1Hits + stats.l2Hits).toBeGreaterThan(0);
      expect(stats.misses).toBeGreaterThan(0);
      expect(stats.invalidations).toBe(0); // No invalidations performed
    });

    it('should handle concurrent operations safely', async () => {
      const operations = Array.from({ length: 10 }, async (_, i) => {
        const key = `concurrent-${i}`;
        await service.set(key, { data: `value-${i}` }, 300);
        return await service.get(key);
      });

      const results = await Promise.all(operations);

      results.forEach((result, i) => {
        expect(result).toEqual({ data: `value-${i}` });
      });
    });
  });

  describe('error handling', () => {
    it('should handle malformed cache entries', async () => {
      const key = 'malformed-key';

      // Mock Redis returning malformed JSON
      mockRedisClient.get.mockResolvedValue('{invalid json');

      const result = await service.get(key);
      expect(result).toBeUndefined();
    });

    it('should handle Redis connection failures during get', async () => {
      const key = 'connection-fail-key';

      mockRedisClient.get.mockRejectedValue(new Error('Connection lost'));

      const result = await service.get(key);
      expect(result).toBeUndefined();
    });

    it('should handle Redis connection failures during set', async () => {
      const key = 'connection-fail-set-key';
      const value = { data: 'test' };

      mockRedisClient.set.mockRejectedValue(new Error('Connection lost'));

      await expect(service.set(key, value, 300)).rejects.toThrow(
        'Connection lost',
      );
    });

    it('should handle malformed JSON in Redis gracefully', async () => {
      const key = 'malformed-json-key';

      // Mock Redis returning malformed JSON
      mockRedisClient.get.mockResolvedValue('{invalid json');

      const result = await service.get(key);
      expect(result).toBeUndefined();
    });

    it('should promote L2 hits to L1 cache', async () => {
      const key = 'l2-hit-key';
      const value = { data: 'from redis' };
      const entry = { v: value, e: Date.now() + 60000 }; // 1 minute TTL

      mockRedisClient.get.mockResolvedValue(JSON.stringify(entry));

      const result = await service.get(key);
      expect(result).toEqual(value);

      // Should be stored in L1 now
      expect(service['l1'].has(key)).toBe(true);
    });

    it('should handle expired Redis entries', async () => {
      const key = 'expired-redis-key';
      const value = { data: 'expired' };
      const entry = { v: value, e: Date.now() - 1000 }; // Already expired

      mockRedisClient.get.mockResolvedValue(JSON.stringify(entry));
      mockRedisClient.del.mockResolvedValue(1);

      const result = await service.get(key);
      expect(result).toBeUndefined();

      // Should attempt to delete from Redis
      expect(mockRedisClient.del).toHaveBeenCalledWith(key);
    });

    it('should handle Redis deletion failures for expired entries', async () => {
      const key = 'expired-redis-key-fail-delete';
      const value = { data: 'expired' };
      const entry = { v: value, e: Date.now() - 1000 };

      mockRedisClient.get.mockResolvedValue(JSON.stringify(entry));
      mockRedisClient.del.mockRejectedValue(new Error('Delete failed'));

      const result = await service.get(key);
      expect(result).toBeUndefined();

      // Should still try to delete but not throw
      expect(mockRedisClient.del).toHaveBeenCalledWith(key);
    });
  });

  describe('getOrSet', () => {
    it('should return cached value if available', async () => {
      const key = 'cached-key';
      const value = { data: 'cached' };
      const fn = jest.fn();

      // Pre-cache the value
      await service.set(key, value, 300);

      const result = await service.getOrSet(key, 300, fn);
      expect(result).toEqual(value);
      expect(fn).not.toHaveBeenCalled();
    });

    it('should execute function and cache result when not cached', async () => {
      const key = 'uncached-key';
      const value = { data: 'computed' };
      const fn = jest.fn().mockResolvedValue(value);

      const result = await service.getOrSet(key, 300, fn);
      expect(result).toEqual(value);
      expect(fn).toHaveBeenCalledTimes(1);

      // Should be cached now
      const cached = await service.get(key);
      expect(cached).toEqual(value);
    });

    it('should handle Redis lock conflicts', async () => {
      const key = 'lock-conflict-key';
      const value = { data: 'fallback' };
      const fn = jest.fn().mockResolvedValue(value);

      // First ensure no cached value exists
      mockRedisClient.get.mockResolvedValue(null);

      // Simulate lock already taken, then lock acquired
      mockRedisClient.set
        .mockResolvedValueOnce(null) // Lock attempt fails
        .mockResolvedValueOnce('OK') // Lock acquired
        .mockResolvedValueOnce('OK'); // Cache set

      const result = await service.getOrSet(key, 300, fn);
      expect(result).toEqual(value);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should handle Redis lock release failures', async () => {
      const key = 'lock-release-fail-key';
      const value = { data: 'computed' };
      const fn = jest.fn().mockResolvedValue(value);

      mockRedisClient.set
        .mockResolvedValueOnce('OK') // Lock acquired
        .mockResolvedValueOnce('OK'); // Cache set

      mockRedisClient.del.mockRejectedValue(new Error('Lock release failed'));

      const result = await service.getOrSet(key, 300, fn);
      expect(result).toEqual(value);
      // Should not throw despite lock release failure
    });

    it('should propagate function execution errors', async () => {
      const key = 'function-error-key';
      const error = new Error('Function failed');
      const fn = jest.fn().mockRejectedValue(error);

      await expect(service.getOrSet(key, 300, fn)).rejects.toThrow(
        'Function failed',
      );
    });
  });

  describe('invalidate', () => {
    it('should invalidate cache patterns', async () => {
      const pattern = 'user:*:profile';

      // Setup some L1 cache entries
      service['l1'].set('user:123:profile', {
        v: 'data1',
        e: Date.now() + 60000,
      });
      service['l1'].set('user:456:profile', {
        v: 'data2',
        e: Date.now() + 60000,
      });
      service['l1'].set('user:123:settings', {
        v: 'data3',
        e: Date.now() + 60000,
      }); // Should not match

      // Mock Redis scan and delete
      const mockStream = {
        on: jest.fn(),
      };
      mockRedisClient.scanStream.mockReturnValue(mockStream as any);

      // Simulate stream events
      let dataCallback: any;
      let endCallback: any;
      mockStream.on.mockImplementation((event: string, callback: any) => {
        if (event === 'data') dataCallback = callback;
        if (event === 'end') endCallback = callback;
      });

      // Trigger data and end events
      setTimeout(() => {
        dataCallback(['user:123:profile', 'user:456:profile']);
        endCallback();
      }, 0);

      const mockPipeline = {
        del: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      };
      mockRedisClient.pipeline.mockReturnValue(mockPipeline);

      await service.invalidate(pattern);

      // L1 entries should be cleared
      expect(service['l1'].has('user:123:profile')).toBe(false);
      expect(service['l1'].has('user:456:profile')).toBe(false);
      expect(service['l1'].has('user:123:settings')).toBe(true); // Should remain
    });

    it('should handle Redis scan failures', async () => {
      const pattern = 'fail:*';

      const mockStream = {
        on: jest.fn(),
      };
      mockRedisClient.scanStream.mockReturnValue(mockStream as any);

      let errorCallback: any;
      mockStream.on.mockImplementation((event: string, callback: any) => {
        if (event === 'error') errorCallback = callback;
      });

      // Trigger error event
      setTimeout(() => {
        errorCallback(new Error('Scan failed'));
      }, 0);

      await expect(service.invalidate(pattern)).rejects.toThrow('Scan failed');
    });

    it('should handle Redis pipeline execution failures', async () => {
      const pattern = 'pipeline:*';

      const mockStream = {
        on: jest.fn(),
      };
      mockRedisClient.scanStream.mockReturnValue(mockStream as any);

      let dataCallback: any;
      let endCallback: any;
      mockStream.on.mockImplementation((event: string, callback: any) => {
        if (event === 'data') dataCallback = callback;
        if (event === 'end') endCallback = callback;
      });

      const mockPipeline = {
        del: jest.fn().mockReturnThis(),
        exec: jest.fn().mockRejectedValue(new Error('Pipeline failed')),
      };
      mockRedisClient.pipeline.mockReturnValue(mockPipeline);

      setTimeout(() => {
        dataCallback(['pipeline:key1']);
        endCallback();
      }, 0);

      // Pipeline failures are handled gracefully with Promise.allSettled
      await expect(service.invalidate(pattern)).resolves.not.toThrow();
    });
  });

  describe('clear', () => {
    it('should clear L1 cache in production', async () => {
      // Setup L1 cache
      service['l1'].set('key1', { v: 'data1', e: Date.now() + 60000 });
      service['l1'].set('key2', { v: 'data2', e: Date.now() + 60000 });

      // Mock production environment
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      await service.clear();

      expect(service['l1'].size).toBe(0);

      // Restore environment
      process.env.NODE_ENV = originalEnv;
    });

    it('should clear Redis cache in non-production', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      mockRedisClient.flushdb = jest.fn().mockResolvedValue('OK');

      await service.clear();

      expect(mockRedisClient.flushdb).toHaveBeenCalled();

      process.env.NODE_ENV = originalEnv;
    });

    it('should handle Redis flush failures', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      mockRedisClient.flushdb = jest
        .fn()
        .mockRejectedValue(new Error('Flush failed'));

      await expect(service.clear()).rejects.toThrow('Flush failed');

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('static methods', () => {
    it('should create keys with proper format', () => {
      const key = CacheService.createKey('users', 123, 'profile');
      expect(key).toBe('users:123:profile');
    });

    it('should handle string and number parts', () => {
      const key = CacheService.createKey('cache', 'prefix', 456, 'suffix');
      expect(key).toBe('cache:prefix:456:suffix');
    });
  });

  describe('hit rate calculation', () => {
    it('should update hit rate periodically', () => {
      // Reset counters
      service['hits'] = 5;
      service['misses'] = 3;

      service.updateHitRate();

      // Should calculate and set gauge
      expect(mockGauge.set).toHaveBeenCalledWith(
        { cache_type: 'redis' },
        (5 / 8) * 100, // 62.5
      );

      // Should reset counters
      expect(service['hits']).toBe(0);
      expect(service['misses']).toBe(0);
    });

    it('should handle zero total requests', () => {
      service['hits'] = 0;
      service['misses'] = 0;

      service.updateHitRate();

      expect(mockGauge.set).toHaveBeenCalledWith(
        { cache_type: 'redis' },
        0, // 0/1 = 0
      );
    });
  });

  describe('cleanup functionality', () => {
    it('should cleanup expired L1 entries', () => {
      const now = Date.now();

      // Add expired and valid entries
      service['l1'].set('expired1', { v: 'data1', e: now - 1000 });
      service['l1'].set('expired2', { v: 'data2', e: now - 2000 });
      service['l1'].set('valid', { v: 'data3', e: now + 60000 });

      service['cleanupL1']();

      expect(service['l1'].has('expired1')).toBe(false);
      expect(service['l1'].has('expired2')).toBe(false);
      expect(service['l1'].has('valid')).toBe(true);
    });

    it('should be called periodically by interval', () => {
      const cleanupSpy = jest.spyOn(service as any, 'cleanupL1');

      // The interval should trigger cleanup
      service['cleanupL1Tick']();

      expect(cleanupSpy).toHaveBeenCalled();
    });
  });
});

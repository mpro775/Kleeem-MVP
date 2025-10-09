import { Test, type TestingModule } from '@nestjs/testing';

import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';

import { CacheWarmerOrchestrator } from './cache-warmer.orchestrator';
import { CacheController } from './cache.controller';
import { CacheService } from './cache.service'; // ✅ استيراد الكلاس الحقيقي كـ DI token

// ❌ لا نحتاج auto-mock طالما سنمرر useValue
// jest.mock('./cache.service');
// jest.mock('./cache-warmer.orchestrator');

// ✅ استخرج نوع الإحصائيات من الدالة الإنتاجية نفسها لتتفادى الاختلافات
type CacheStats = ReturnType<CacheService['getStats']>;

describe('CacheController', () => {
  let controller: CacheController;

  // سنحصل على نسخة typed من الـ mocks بدون تفكيك الدوال (تجنب unbound)
  let mockCacheService: {
    getStats: jest.Mock<CacheStats, []>;
    resetStats: jest.Mock<void, []>;
    clear: jest.Mock<Promise<void>, []>;
    invalidate: jest.Mock<Promise<void>, [string]>;
    delete: jest.Mock<Promise<void>, [string]>;
    set: jest.Mock<Promise<void>, [string, any, number]>;
    get: jest.Mock<Promise<void | null>, [string]>;
  };

  let mockCacheWarmer: {
    manualWarm: jest.Mock<Promise<void>, [string?]>;
  };

  beforeEach(async () => {
    mockCacheService = {
      getStats: jest.fn<CacheStats, []>(),
      resetStats: jest.fn<void, []>(),
      clear: jest.fn<Promise<void>, []>(),
      invalidate: jest.fn<Promise<void>, [string]>(),
      delete: jest.fn<Promise<void>, [string]>(),
      set: jest.fn<Promise<void>, [string, unknown, number]>(),
      get: jest.fn<Promise<void | null>, [string]>(),
    };

    mockCacheWarmer = {
      manualWarm: jest.fn<Promise<void>, [string?]>(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CacheController],
      providers: [
        // ✅ مرِّر الـ mocks عبر useValue مع **token** الكلاس الحقيقي
        { provide: CacheService, useValue: mockCacheService },
        { provide: CacheWarmerOrchestrator, useValue: mockCacheWarmer },
        // Mock guards to avoid dependency issues
        {
          provide: 'JwtAuthGuard',
          useValue: { canActivate: () => true },
        },
        {
          provide: 'RolesGuard',
          useValue: { canActivate: () => true },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<CacheController>(CacheController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getStats', () => {
    it('should return cache statistics', () => {
      const base = {
        l1Hits: 10,
        l2Hits: 5,
        misses: 3,
        sets: 8,
        invalidations: 2,
      };
      const totalRequests = base.l1Hits + base.l2Hits + base.misses;

      const mockStats: CacheStats = {
        ...base,
        l1Size: 1024,
        totalRequests,
        hitRate:
          totalRequests > 0
            ? (((base.l1Hits + base.l2Hits) / totalRequests) * 100).toFixed(2) +
              '%'
            : '0.00%',
      };

      mockCacheService.getStats.mockReturnValue(mockStats);

      const result = controller.getStats();

      expect(result).toEqual({ success: true, data: mockStats });
      expect(mockCacheService.getStats).toHaveBeenCalled();
    });
  });

  describe('resetStats', () => {
    it('should reset cache statistics and return success message', () => {
      const result = controller.resetStats();

      expect(result).toEqual({
        success: true,
        message: 'تم إعادة تعيين إحصائيات الكاش',
      });
      expect(mockCacheService.resetStats).toHaveBeenCalled();
    });
  });

  describe('clearCache', () => {
    it('should clear all cache and return success message', async () => {
      mockCacheService.clear.mockResolvedValue(undefined);

      const result = await controller.clearCache();

      expect(result).toEqual({ success: true, message: 'تم مسح جميع الكاش' });
      expect(mockCacheService.clear).toHaveBeenCalled();
    });

    it('should propagate clear errors', async () => {
      mockCacheService.clear.mockRejectedValue(new Error('Clear failed'));
      await expect(controller.clearCache()).rejects.toThrow('Clear failed');
    });
  });

  describe('invalidatePattern', () => {
    it('should invalidate cache pattern and return success message', async () => {
      const pattern = 'user:*:profile';
      mockCacheService.invalidate.mockResolvedValue(undefined);

      const result = await controller.invalidatePattern(pattern);

      expect(result).toEqual({
        success: true,
        message: `تم إبطال الكاش للنمط: ${pattern}`,
      });
      expect(mockCacheService.invalidate).toHaveBeenCalledWith(pattern);
    });

    it('should propagate invalidation errors', async () => {
      mockCacheService.invalidate.mockRejectedValue(
        new Error('Invalidation failed'),
      );
      await expect(controller.invalidatePattern('x')).rejects.toThrow(
        'Invalidation failed',
      );
    });
  });

  describe('deleteKey', () => {
    it('should delete specific cache key and return success message', async () => {
      const key = 'user:123:profile';
      mockCacheService.delete.mockResolvedValue(undefined);

      const result = await controller.deleteKey(key);

      expect(result).toEqual({
        success: true,
        message: `تم حذف المفتاح: ${key}`,
      });
      expect(mockCacheService.delete).toHaveBeenCalledWith(key);
    });

    it('should propagate delete errors', async () => {
      mockCacheService.delete.mockRejectedValue(new Error('Delete failed'));
      await expect(controller.deleteKey('k')).rejects.toThrow('Delete failed');
    });
  });

  describe('warmCache', () => {
    it('should warm cache without specific type', async () => {
      mockCacheWarmer.manualWarm.mockResolvedValue(undefined);

      const result = await controller.warmCache();

      expect(result).toEqual({ success: true, message: 'تم تسخين الكاش' });
      expect(mockCacheWarmer.manualWarm).toHaveBeenCalledWith(undefined);
    });

    it('should warm cache with specific type', async () => {
      mockCacheWarmer.manualWarm.mockResolvedValue(undefined);

      const result = await controller.warmCache({ type: 'products' });

      expect(result).toEqual({
        success: true,
        message: 'تم تسخين الكاش للنوع: products',
      });
      expect(mockCacheWarmer.manualWarm).toHaveBeenCalledWith('products');
    });

    it('should propagate warming errors', async () => {
      mockCacheWarmer.manualWarm.mockRejectedValue(new Error('Warming failed'));
      await expect(controller.warmCache()).rejects.toThrow('Warming failed');
    });
  });

  describe('healthCheck', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should return healthy status when cache operations work', async () => {
      const testValue = { timestamp: Date.now() };
      const stats: CacheStats = {
        l1Hits: 1,
        l2Hits: 1,
        misses: 0,
        sets: 2,
        invalidations: 0,
        l1Size: 1,
        totalRequests: 2,
        hitRate: '100.00%',
      };

      mockCacheService.set.mockResolvedValue(undefined);
      mockCacheService.get.mockResolvedValue(testValue as any);
      mockCacheService.delete.mockResolvedValue(undefined);
      mockCacheService.getStats.mockReturnValue(stats);

      const result = await controller.healthCheck();

      expect(result.success).toBe(true);
      expect(result.data.status).toBe('healthy');
      expect(result.data.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect((result.data as any).stats).toEqual(stats);

      expect(mockCacheService.set).toHaveBeenCalled();
      expect(mockCacheService.get).toHaveBeenCalled();
      expect(mockCacheService.delete).toHaveBeenCalled();
    });

    it('should return unhealthy status when cache read fails', async () => {
      mockCacheService.set.mockResolvedValue(undefined);
      mockCacheService.get.mockResolvedValue(null);
      mockCacheService.delete.mockResolvedValue(undefined);

      const result = await controller.healthCheck();

      expect(result.success).toBe(true);
      expect(result.data.status).toBe('unhealthy');
    });

    it('should return unhealthy status when cache operations throw', async () => {
      mockCacheService.set.mockRejectedValue(
        new Error('Cache operation failed'),
      );

      const result = await controller.healthCheck();

      expect(result.success).toBe(false);
      expect(result.data.status).toBe('unhealthy');
      expect((result.data as any).error).toBe('Cache operation failed');
      expect(result.data.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('should perform comprehensive health check operations', async () => {
      mockCacheService.set.mockResolvedValue(undefined);
      mockCacheService.get.mockResolvedValue({ timestamp: Date.now() } as any);
      mockCacheService.delete.mockResolvedValue(undefined);

      await controller.healthCheck();

      // تحقق أن set استُدعي بمفتاح health_check_* و TTL = 10
      expect(mockCacheService.set).toHaveBeenCalledWith(
        expect.stringContaining('health_check_'),
        expect.objectContaining({ timestamp: expect.any(Number) }),
        10,
      );

      const testKey = mockCacheService.set.mock.calls[0][0];
      expect(mockCacheService.get).toHaveBeenCalledWith(testKey);
      expect(mockCacheService.delete).toHaveBeenCalledWith(testKey);
    });

    it('should return unhealthy status when retrieved data does not match', async () => {
      const testValue = { timestamp: Date.now() };
      const wrongValue = { timestamp: Date.now() - 1000 }; // Different timestamp
      console.log('testValue', testValue);
      mockCacheService.set.mockResolvedValue(undefined);
      mockCacheService.get.mockResolvedValue(wrongValue as any);
      mockCacheService.delete.mockResolvedValue(undefined);

      const result = await controller.healthCheck();

      expect(result.success).toBe(true);
      expect(result.data.status).toBe('unhealthy');
      expect(result.data.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('should handle get operation errors gracefully', async () => {
      mockCacheService.set.mockResolvedValue(undefined);
      mockCacheService.get.mockRejectedValue(new Error('Get operation failed'));
      mockCacheService.delete.mockResolvedValue(undefined);

      const result = await controller.healthCheck();

      expect(result.success).toBe(false);
      expect(result.data.status).toBe('unhealthy');
      expect((result.data as any).error).toBe('Get operation failed');
      expect(result.data.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('should handle delete operation errors gracefully', async () => {
      const testValue = { timestamp: Date.now() };

      mockCacheService.set.mockResolvedValue(undefined);
      mockCacheService.get.mockResolvedValue(testValue as any);
      mockCacheService.delete.mockRejectedValue(
        new Error('Delete operation failed'),
      );

      const result = await controller.healthCheck();

      // Should return unhealthy since delete operation failed (caught by try-catch)
      expect(result.success).toBe(false);
      expect(result.data.status).toBe('unhealthy');
      expect((result.data as any).error).toBe('Delete operation failed');
    });
  });

  describe('API responses / parameters', () => {
    it('should return consistent response format', () => {
      // لن نستدعي mocks هنا لتجنب unbound—فقط تأكد من شكل الاستجابة
      mockCacheService.getStats.mockReturnValue({
        l1Hits: 0,
        l2Hits: 0,
        misses: 0,
        sets: 0,
        invalidations: 0,
        l1Size: 0,
        totalRequests: 0,
        hitRate: '0.00%',
      });

      const statsResult = controller.getStats();
      const resetResult = controller.resetStats();

      expect(statsResult).toHaveProperty('success');
      expect(statsResult).toHaveProperty('data');
      expect(resetResult).toHaveProperty('success');
      expect(resetResult).toHaveProperty('message');
      expect(typeof resetResult.message).toBe('string');
    });

    it('should accept params for invalidation/deletion/warm', async () => {
      mockCacheService.invalidate.mockResolvedValue(undefined);
      await controller.invalidatePattern('user:*:session');
      expect(mockCacheService.invalidate).toHaveBeenCalledWith(
        'user:*:session',
      );

      mockCacheService.delete.mockResolvedValue(undefined);
      await controller.deleteKey('specific:key:here');
      expect(mockCacheService.delete).toHaveBeenCalledWith('specific:key:here');

      mockCacheWarmer.manualWarm.mockResolvedValue(undefined);
      await controller.warmCache({ type: 'categories' });
      expect(mockCacheWarmer.manualWarm).toHaveBeenCalledWith('categories');
    });
  });
});

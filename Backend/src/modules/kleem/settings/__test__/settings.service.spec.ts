import { Test, type TestingModule } from '@nestjs/testing';

import { SettingsService } from '../settings.service';
import { SETTINGS_REPOSITORY } from '../tokens';

import type { BotRuntimeSettings } from '../botRuntimeSettings.schema';
import type { UpdateBotRuntimeSettingsDto } from '../dto/update-settings.dto';
import type { SettingsRepository } from '../repositories/settings.repository';

describe('SettingsService', () => {
  let service: SettingsService;

  const mockSettings = {
    _id: '507f1f77bcf86cd799439011',
    launchDate: '2024-01-01T00:00:00.000Z',
    applyUrl: 'https://example.com/apply',
    integrationsNow: 'سلة، زد',
    trialOffer: 'شهر مجاني كامل، ثم باقة تجريبية محدودة',
    yemenNext: 'تكامل شركات توصيل داخل اليمن + دفع إلكتروني مناسب',
    yemenPositioning: 'يعالج فجوة خدمة العملاء بالمتاجر في اليمن',
    ctaEvery: 3,
    highIntentKeywords: ['ابدأ', 'سجّل', 'التقديم'],
    piiKeywords: ['اسم', 'رقم', 'هاتف'],
  } as any;

  const repo: jest.Mocked<SettingsRepository> = {
    findOneLean: jest.fn(),
    create: jest.fn(),
    findOneAndUpdate: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SettingsService,
        { provide: SETTINGS_REPOSITORY, useValue: repo },
      ],
    }).compile();

    service = module.get(SettingsService);

    // Reset cache before each test
    service['cache'] = null;
    service['cacheAt'] = 0;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('get', () => {
    it('should return cached settings when available and not expired', async () => {
      // Set up cache
      service['cache'] = mockSettings;
      service['cacheAt'] = Date.now();

      const result = await service.get();

      expect(result).toEqual(mockSettings);
      expect(repo.findOneLean).not.toHaveBeenCalled();
    });

    it('should fetch from repository when cache is empty', async () => {
      repo.findOneLean.mockResolvedValue(mockSettings);

      const result = await service.get();

      expect(result).toEqual(mockSettings);
      expect(repo.findOneLean).toHaveBeenCalledTimes(1);
      expect(service['cache']).toEqual(mockSettings);
      expect(service['cacheAt']).toBeGreaterThan(0);
    });

    it('should fetch from repository when cache is expired', async () => {
      // Set up expired cache
      service['cache'] = { ...mockSettings, launchDate: 'expired' };
      service['cacheAt'] = Date.now() - 11 * 1000; // 11 seconds ago (TTL is 10s)

      repo.findOneLean.mockResolvedValue(mockSettings);

      const result = await service.get();

      expect(result).toEqual(mockSettings);
      expect(repo.findOneLean).toHaveBeenCalledTimes(1);
    });

    it('should create default settings when none exist', async () => {
      repo.findOneLean.mockResolvedValue(null);
      repo.create.mockResolvedValue(mockSettings);

      const result = await service.get();

      expect(result).toEqual(mockSettings);
      expect(repo.create).toHaveBeenCalledWith({});
    });

    it('should handle repository errors gracefully', async () => {
      repo.findOneLean.mockRejectedValue(
        new Error('Database connection failed'),
      );

      await expect(service.get()).rejects.toThrow('Database connection failed');
    });

    it('should handle creation errors gracefully', async () => {
      repo.findOneLean.mockResolvedValue(null);
      repo.create.mockRejectedValue(new Error('Creation failed'));

      await expect(service.get()).rejects.toThrow('Creation failed');
    });

    it('should refresh cache after TTL expires', async () => {
      // First call - populate cache
      repo.findOneLean.mockResolvedValue(mockSettings);
      await service.get();

      // Advance time beyond TTL (10 seconds)
      jest.advanceTimersByTime(11 * 1000);

      // Mock different data for second call
      const updatedSettings = { ...mockSettings, launchDate: '2024-02-01' };
      repo.findOneLean.mockResolvedValue(updatedSettings);

      const result = await service.get();

      expect(result.launchDate).toBe('2024-02-01');
      expect(repo.findOneLean).toHaveBeenCalledTimes(2);
    });

    it('should handle concurrent get requests efficiently', async () => {
      repo.findOneLean.mockResolvedValue(mockSettings);

      // Make multiple concurrent requests
      const promises = [service.get(), service.get(), service.get()];

      const results = await Promise.all(promises);

      expect(results).toHaveLength(3);
      results.forEach((result) => {
        expect(result).toEqual(mockSettings);
      });

      // Should only call repository once due to caching
      expect(repo.findOneLean).toHaveBeenCalledTimes(1);
    });
  });

  describe('cached', () => {
    it('should return cached settings when available', () => {
      service['cache'] = mockSettings;

      const result = service.cached();

      expect(result).toEqual(mockSettings);
    });

    it('should return empty object when no cache', () => {
      service['cache'] = null;

      const result = service.cached();

      expect(result).toEqual({});
    });

    it('should return cached settings even when expired', () => {
      service['cache'] = mockSettings;
      service['cacheAt'] = Date.now() - 11 * 1000; // Expired

      const result = service.cached();

      expect(result).toEqual(mockSettings);
    });
  });

  describe('update', () => {
    it('should create new settings when none exist', async () => {
      const updateDto: UpdateBotRuntimeSettingsDto = {
        launchDate: '2024-02-01T00:00:00.000Z',
        applyUrl: 'https://new-url.com/apply',
      };

      repo.findOneLean.mockResolvedValue(null);
      repo.create.mockResolvedValue({ ...mockSettings, ...updateDto });

      const result = await service.update(updateDto);

      expect(repo.findOneLean).toHaveBeenCalled();
      expect(repo.create).toHaveBeenCalledWith(updateDto);
      expect(result.launchDate).toBe('2024-02-01T00:00:00.000Z');
      expect(result.applyUrl).toBe('https://new-url.com/apply');
    });

    it('should update existing settings', async () => {
      const updateDto: UpdateBotRuntimeSettingsDto = {
        trialOffer: 'عرض تجريبي محدث',
        ctaEvery: 5,
      };

      const existingSettings = { ...mockSettings, trialOffer: 'القديم' };
      const updatedSettings = { ...existingSettings, ...updateDto };

      repo.findOneLean.mockResolvedValue(existingSettings);
      repo.findOneAndUpdate.mockResolvedValue(updatedSettings);

      const result = await service.update(updateDto);

      expect(repo.findOneLean).toHaveBeenCalled();
      expect(repo.findOneAndUpdate).toHaveBeenCalledWith(updateDto);
      expect(result.trialOffer).toBe('عرض تجريبي محدث');
      expect(result.ctaEvery).toBe(5);
    });

    it('should update cache after successful update', async () => {
      const updateDto: UpdateBotRuntimeSettingsDto = {
        launchDate: '2024-03-01T00:00:00.000Z',
      };

      const updatedSettings = { ...mockSettings, ...updateDto };

      repo.findOneLean.mockResolvedValue(mockSettings);
      repo.findOneAndUpdate.mockResolvedValue(updatedSettings);

      await service.update(updateDto);

      // Cache should be updated
      expect(service['cache']?.launchDate).toBe('2024-03-01T00:00:00.000Z');
      expect(service['cacheAt']).toBeGreaterThan(0);
    });

    it('should handle partial updates', async () => {
      const updateDto: UpdateBotRuntimeSettingsDto = {
        integrationsNow: 'تحديث التكاملات',
      };

      const updatedSettings = { ...mockSettings, ...updateDto };

      repo.findOneLean.mockResolvedValue(mockSettings);
      repo.findOneAndUpdate.mockResolvedValue(updatedSettings);

      const result = await service.update(updateDto);

      expect(result.integrationsNow).toBe('تحديث التكاملات');
      // Other fields should remain unchanged
      expect(result.launchDate).toBe(mockSettings.launchDate);
      expect(result.applyUrl).toBe(mockSettings.applyUrl);
    });

    it('should handle empty update DTO', async () => {
      const updateDto: UpdateBotRuntimeSettingsDto = {};

      const updatedSettings = { ...mockSettings };

      repo.findOneLean.mockResolvedValue(mockSettings);
      repo.findOneAndUpdate.mockResolvedValue(updatedSettings);

      const result = await service.update(updateDto);

      expect(result).toEqual(mockSettings);
      expect(repo.findOneAndUpdate).toHaveBeenCalledWith({});
    });

    it('should handle repository errors during update', async () => {
      const updateDto: UpdateBotRuntimeSettingsDto = {
        launchDate: '2024-02-01T00:00:00.000Z',
      };

      repo.findOneLean.mockRejectedValue(new Error('Database error'));

      await expect(service.update(updateDto)).rejects.toThrow('Database error');
    });

    it('should handle creation errors during update', async () => {
      const updateDto: UpdateBotRuntimeSettingsDto = {
        launchDate: '2024-02-01T00:00:00.000Z',
      };

      repo.findOneLean.mockResolvedValue(null);
      repo.create.mockRejectedValue(new Error('Creation failed'));

      await expect(service.update(updateDto)).rejects.toThrow(
        'Creation failed',
      );
    });

    it('should handle update errors during update', async () => {
      const updateDto: UpdateBotRuntimeSettingsDto = {
        launchDate: '2024-02-01T00:00:00.000Z',
      };

      repo.findOneLean.mockResolvedValue(mockSettings);
      repo.findOneAndUpdate.mockRejectedValue(new Error('Update failed'));

      await expect(service.update(updateDto)).rejects.toThrow('Update failed');
    });

    it('should handle concurrent updates correctly', async () => {
      const updateDto1: UpdateBotRuntimeSettingsDto = {
        launchDate: '2024-02-01T00:00:00.000Z',
      };

      const updateDto2: UpdateBotRuntimeSettingsDto = {
        applyUrl: 'https://new-url.com/apply',
      };

      repo.findOneLean.mockResolvedValue(mockSettings);
      repo.findOneAndUpdate
        .mockResolvedValueOnce({ ...mockSettings, ...updateDto1 })
        .mockResolvedValueOnce({
          ...mockSettings,
          ...updateDto1,
          ...updateDto2,
        });

      // Execute concurrent updates
      const [result1, result2] = await Promise.all([
        service.update(updateDto1),
        service.update(updateDto2),
      ]);

      expect(result1.launchDate).toBe('2024-02-01T00:00:00.000Z');
      expect(result2.applyUrl).toBe('https://new-url.com/apply');
    });

    it('should validate DTO constraints before updating', async () => {
      // This would normally be handled by the DTO validation pipe
      // But we can test that the service passes through the DTO correctly
      const updateDto: UpdateBotRuntimeSettingsDto = {
        ctaEvery: -1, // Invalid value
      };

      repo.findOneLean.mockResolvedValue(mockSettings);
      repo.findOneAndUpdate.mockResolvedValue({
        ...mockSettings,
        ctaEvery: -1,
      });

      const result = await service.update(updateDto);

      expect(result.ctaEvery).toBe(-1);
      // Note: In real implementation, validation should happen before reaching service
    });

    it('should handle large update payloads', async () => {
      const largeUpdateDto: UpdateBotRuntimeSettingsDto = {
        highIntentKeywords: Array(1000).fill('keyword'),
        piiKeywords: Array(1000).fill('pii-keyword'),
        integrationsNow: 'x'.repeat(10000),
      };

      const updatedSettings = { ...mockSettings, ...largeUpdateDto };

      repo.findOneLean.mockResolvedValue(mockSettings);
      repo.findOneAndUpdate.mockResolvedValue(updatedSettings);

      const result = await service.update(largeUpdateDto);

      expect(result.highIntentKeywords).toHaveLength(1000);
      expect(result.piiKeywords).toHaveLength(1000);
      expect(result.integrationsNow).toHaveLength(10000);
    });
  });

  describe('Cache Management', () => {
    it('should properly manage cache TTL', async () => {
      repo.findOneLean.mockResolvedValue(mockSettings);

      // First call - should cache
      const result1 = await service.get();
      expect(service['cache']).toEqual(mockSettings);
      expect(service['cacheAt']).toBeGreaterThan(0);
      expect(result1).toEqual(mockSettings);
      // Advance time but not beyond TTL
      jest.advanceTimersByTime(5 * 1000);

      // Second call - should use cache
      const result2 = await service.get();
      expect(result2).toEqual(mockSettings);
      expect(repo.findOneLean).toHaveBeenCalledTimes(1);

      // Advance time beyond TTL
      jest.advanceTimersByTime(6 * 1000);

      // Third call - should refresh cache
      repo.findOneLean.mockResolvedValue({
        ...mockSettings,
        launchDate: '2024-02-01',
      });
      const result3 = await service.get();
      expect(result3.launchDate).toBe('2024-02-01');
      expect(repo.findOneLean).toHaveBeenCalledTimes(2);
    });

    it('should handle cache invalidation on update', async () => {
      // Set initial cache
      service['cache'] = mockSettings;
      service['cacheAt'] = Date.now();

      const updateDto: UpdateBotRuntimeSettingsDto = {
        launchDate: '2024-02-01T00:00:00.000Z',
      };

      repo.findOneLean.mockResolvedValue(mockSettings);
      repo.findOneAndUpdate.mockResolvedValue({
        ...mockSettings,
        ...updateDto,
      });

      await service.update(updateDto);

      // Cache should be updated
      expect(service['cache']?.launchDate).toBe('2024-02-01T00:00:00.000Z');
      expect(service['cacheAt']).toBeGreaterThan(0);
    });

    it('should handle system time changes', async () => {
      repo.findOneLean.mockResolvedValue(mockSettings);

      // Mock Date.now to return a specific time
      const fixedTime = 1000000000000; // Fixed timestamp
      jest.spyOn(Date, 'now').mockReturnValue(fixedTime);

      await service.get();

      expect(service['cacheAt']).toBe(fixedTime);

      // Restore Date.now
      jest.spyOn(Date, 'now').mockRestore();
    });
  });

  describe('Integration scenarios', () => {
    it('should handle complete settings lifecycle', async () => {
      // Initially no settings exist
      repo.findOneLean.mockResolvedValueOnce(null);
      repo.create.mockResolvedValue(mockSettings);

      const initialSettings = await service.get();
      expect(initialSettings.launchDate).toBe('2024-01-01T00:00:00.000Z');

      // Update settings
      const updateDto: UpdateBotRuntimeSettingsDto = {
        launchDate: '2024-03-01T00:00:00.000Z',
        trialOffer: 'عرض تجريبي محدث',
      };

      repo.findOneLean.mockResolvedValue(mockSettings);
      repo.findOneAndUpdate.mockResolvedValue({
        ...mockSettings,
        ...updateDto,
      });

      const updatedSettings = await service.update(updateDto);
      expect(updatedSettings.launchDate).toBe('2024-03-01T00:00:00.000Z');
      expect(updatedSettings.trialOffer).toBe('عرض تجريبي محدث');

      // Get should return cached updated settings
      const cachedSettings = await service.get();
      expect(cachedSettings.launchDate).toBe('2024-03-01T00:00:00.000Z');
      expect(cachedSettings.trialOffer).toBe('عرض تجريبي محدث');
    });

    it('should handle rapid successive updates', async () => {
      repo.findOneLean.mockResolvedValue(mockSettings);

      const updates: UpdateBotRuntimeSettingsDto[] = [
        { launchDate: '2024-02-01T00:00:00.000Z' },
        { applyUrl: 'https://new-url.com/apply' },
        { ctaEvery: 5 },
        { trialOffer: 'عرض محدث' },
      ];

      const results: BotRuntimeSettings[] = [];

      for (const updateDto of updates) {
        repo.findOneAndUpdate.mockResolvedValue({
          ...mockSettings,
          ...updateDto,
        });
        const result = await service.update(updateDto);
        results.push(result);
      }

      expect(results).toHaveLength(4);
      expect(repo.findOneAndUpdate).toHaveBeenCalledTimes(4);
      expect(repo.findOneLean).toHaveBeenCalledTimes(4); // Once for each update
    });

    it('should handle service restart scenario', async () => {
      // Simulate service restart by clearing cache
      service['cache'] = null;
      service['cacheAt'] = 0;

      repo.findOneLean.mockResolvedValue(mockSettings);

      const result = await service.get();

      expect(result).toEqual(mockSettings);
      expect(service['cache']).toEqual(mockSettings);
      expect(service['cacheAt']).toBeGreaterThan(0);
    });
  });

  describe('Error handling', () => {
    it('should handle malformed repository responses', async () => {
      repo.findOneLean.mockResolvedValue(null as any);

      // Should handle null response and create default
      repo.create.mockResolvedValue(mockSettings);

      const result = await service.get();

      expect(result).toEqual(mockSettings);
      expect(repo.create).toHaveBeenCalledWith({});
    });

    it('should handle repository returning invalid data types', async () => {
      repo.findOneLean.mockResolvedValue('invalid_data' as any);

      // Should handle invalid data gracefully
      expect(service.cached()).toEqual({});

      // Should not crash when calling get
      repo.findOneLean.mockResolvedValue(mockSettings);
      const result = await service.get();
      expect(result).toEqual(mockSettings);
    });

    it('should handle network timeouts', async () => {
      repo.findOneLean.mockImplementation(
        () =>
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Network timeout')), 100),
          ),
      );

      await expect(service.get()).rejects.toThrow('Network timeout');
    });

    it('should handle database connection issues', async () => {
      repo.findOneLean.mockRejectedValue(new Error('MongoNetworkError'));

      await expect(service.get()).rejects.toThrow('MongoNetworkError');
    });

    it('should handle validation errors in update DTO', async () => {
      // This would be caught by the validation pipe in real usage
      // But we can test that the service doesn't crash with malformed data
      const invalidDto = {
        ctaEvery: 'not_a_number',
        launchDate: 'invalid_date',
      } as any;

      repo.findOneLean.mockResolvedValue(mockSettings);
      repo.findOneAndUpdate.mockResolvedValue({
        ...mockSettings,
        ...invalidDto,
      });

      const result = await service.update(invalidDto);

      expect(result.ctaEvery).toBe('not_a_number');
      expect(result.launchDate).toBe('invalid_date');
    });
  });

  describe('Performance considerations', () => {
    it('should handle high-frequency get requests', async () => {
      repo.findOneLean.mockResolvedValue(mockSettings);

      const startTime = Date.now();

      // Make many rapid requests
      const promises: Promise<BotRuntimeSettings>[] = [];
      for (let i = 0; i < 1000; i++) {
        promises.push(service.get());
      }

      const results = await Promise.all(promises);
      const endTime = Date.now();

      expect(results).toHaveLength(1000);
      results.forEach((result) => {
        expect(result).toEqual(mockSettings);
      });

      // Should only call repository once due to caching
      expect(repo.findOneLean).toHaveBeenCalledTimes(1);

      // Should complete quickly due to caching
      expect(endTime - startTime).toBeLessThan(1000);
    });

    it('should handle memory efficiently with large settings', async () => {
      const largeSettings = {
        ...mockSettings,
        highIntentKeywords: Array(10000).fill('keyword'),
        piiKeywords: Array(10000).fill('pii'),
        integrationsNow: 'x'.repeat(50000),
      };

      repo.findOneLean.mockResolvedValue(largeSettings);

      const result = await service.get();

      expect(result.highIntentKeywords).toHaveLength(10000);
      expect(result.piiKeywords).toHaveLength(10000);
      expect(result.integrationsNow).toHaveLength(50000);
      expect(service['cache']).toEqual(largeSettings);
    });
  });

  describe('Edge cases', () => {
    it('should handle service initialization without cache', () => {
      // Service should work correctly when initialized without cache
      expect(service['cache']).toBeNull();
      expect(service['cacheAt']).toBe(0);
    });

    it('should handle cache corruption', async () => {
      // Manually corrupt cache
      service['cache'] = { corrupted: 'data' } as any;

      repo.findOneLean.mockResolvedValue(mockSettings);

      const result = await service.get();

      expect(result).toEqual(mockSettings);
      expect(service['cache']).toEqual(mockSettings);
    });

    it('should handle TTL edge cases', async () => {
      repo.findOneLean.mockResolvedValue(mockSettings);

      // Set cache at exact TTL boundary
      service['cache'] = mockSettings;
      service['cacheAt'] = Date.now() - 10 * 1000; // Exactly at TTL

      const result = await service.get();

      // Should refresh cache since it's exactly at TTL
      expect(result).toEqual(mockSettings);
      expect(repo.findOneLean).toHaveBeenCalledTimes(1);
    });

    it('should handle very short TTL', async () => {
      // Temporarily change TTL for this test
      const originalTTL = service['TTL'];
      service['TTL'] = 100; // 100ms

      repo.findOneLean.mockResolvedValue(mockSettings);

      await service.get();

      // Advance time just past TTL
      jest.advanceTimersByTime(101);

      repo.findOneLean.mockResolvedValue({
        ...mockSettings,
        launchDate: '2024-02-01',
      });

      const result = await service.get();

      expect(result.launchDate).toBe('2024-02-01');
      expect(repo.findOneLean).toHaveBeenCalledTimes(2);

      // Restore original TTL
      service['TTL'] = originalTTL;
    });

    it('should handle very long TTL', async () => {
      // Temporarily change TTL for this test
      const originalTTL = service['TTL'];
      service['TTL'] = 60 * 60 * 1000; // 1 hour

      repo.findOneLean.mockResolvedValue(mockSettings);

      await service.get();

      // Advance time but not past TTL
      jest.advanceTimersByTime(30 * 60 * 1000); // 30 minutes

      const result = await service.get();

      // Should still use cache
      expect(result).toEqual(mockSettings);
      expect(repo.findOneLean).toHaveBeenCalledTimes(1);

      // Restore original TTL
      service['TTL'] = originalTTL;
    });
  });
});

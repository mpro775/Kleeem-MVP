import { getModelToken } from '@nestjs/mongoose';
import { Test, type TestingModule } from '@nestjs/testing';

import { BotRuntimeSettings } from '../botRuntimeSettings.schema';
import { SettingsMongoRepository } from '../repositories/settings.mongo.repository';

import type { Model } from 'mongoose';

describe('SettingsMongoRepository', () => {
  let repository: SettingsMongoRepository;
  let model: jest.Mocked<Model<BotRuntimeSettings>>;

  const mockSettings: BotRuntimeSettings = {
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

  beforeEach(async () => {
    const mockModel = {
      findOne: jest.fn(),
      create: jest.fn(),
      findOneAndUpdate: jest.fn(),
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SettingsMongoRepository,
        {
          provide: getModelToken(BotRuntimeSettings.name),
          useValue: mockModel,
        },
      ],
    }).compile();

    repository = module.get<SettingsMongoRepository>(SettingsMongoRepository);
    model = module.get(getModelToken(BotRuntimeSettings.name));
  });

  describe('findOneLean', () => {
    it('should return settings when found', async () => {
      model.findOne.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockSettings),
        }),
      } as any);

      const result = await repository.findOneLean();

      expect(model.findOne).toHaveBeenCalledWith();
      expect(result).toEqual(mockSettings);
    });

    it('should return null when no settings found', async () => {
      model.findOne.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(null),
        }),
      } as any);

      const result = await repository.findOneLean();

      expect(model.findOne).toHaveBeenCalledWith();
      expect(result).toBeNull();
    });

    it('should handle database errors', async () => {
      model.findOne.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest
            .fn()
            .mockRejectedValue(new Error('Database connection failed')),
        }),
      } as any);

      await expect(repository.findOneLean()).rejects.toThrow(
        'Database connection failed',
      );
    });

    it('should handle malformed response data', async () => {
      model.findOne.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue('invalid_data'),
        }),
      } as any);

      const result = await repository.findOneLean();

      expect(result).toBe('invalid_data');
    });
  });

  describe('create', () => {
    it('should create new settings successfully', async () => {
      const settingsData = {
        launchDate: '2024-02-01T00:00:00.000Z',
        applyUrl: 'https://new-url.com/apply',
      };

      const createdSettings = { ...mockSettings, ...settingsData };

      model.create.mockResolvedValue(createdSettings as any);

      const result = await repository.create(settingsData);

      expect(model.create).toHaveBeenCalledWith(settingsData);
      expect(result).toEqual(createdSettings);
    });

    it('should handle creation with empty data', async () => {
      const emptyData = {};

      model.create.mockResolvedValue(mockSettings as any);

      const result = await repository.create(emptyData);

      expect(model.create).toHaveBeenCalledWith(emptyData);
      expect(result).toEqual(mockSettings);
    });

    it('should handle creation errors', async () => {
      const settingsData = {
        launchDate: '2024-02-01T00:00:00.000Z',
      };

      model.create.mockRejectedValue(new Error('Creation failed'));

      await expect(repository.create(settingsData)).rejects.toThrow(
        'Creation failed',
      );
    });

    it('should handle validation errors during creation', async () => {
      const invalidData = {
        ctaEvery: -1, // Invalid value
      };

      model.create.mockRejectedValue(new Error('ValidationError'));

      await expect(repository.create(invalidData)).rejects.toThrow(
        'ValidationError',
      );
    });

    it('should handle large data objects', async () => {
      const largeData = {
        integrationsNow: 'x'.repeat(10000),
        highIntentKeywords: Array(1000).fill('keyword'),
        piiKeywords: Array(1000).fill('pii'),
      };

      const largeSettings = { ...mockSettings, ...largeData };

      model.create.mockResolvedValue(largeSettings as any);

      const result = await repository.create(largeData);

      expect(result.integrationsNow).toHaveLength(10000);
      expect(result.highIntentKeywords).toHaveLength(1000);
      expect(result.piiKeywords).toHaveLength(1000);
    });

    it('should handle special characters in data', async () => {
      const specialData = {
        trialOffer: 'شهر مجاني كامل! 💯 مع باقة تجريبية 🚀',
        yemenPositioning: 'خدمة عملاء متميزة في اليمن 🇾🇪',
      };

      const specialSettings = { ...mockSettings, ...specialData };

      model.create.mockResolvedValue(specialSettings as any);

      const result = await repository.create(specialData);

      expect(result.trialOffer).toContain('💯');
      expect(result.trialOffer).toContain('🚀');
      expect(result.yemenPositioning).toContain('🇾🇪');
    });
  });

  describe('findOneAndUpdate', () => {
    it('should update settings successfully', async () => {
      const updateData = {
        launchDate: '2024-03-01T00:00:00.000Z',
        trialOffer: 'عرض محدث',
      };

      const updatedSettings = { ...mockSettings, ...updateData };

      model.findOneAndUpdate.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(updatedSettings),
        }),
      } as any);

      const result = await repository.findOneAndUpdate(updateData);

      expect(model.findOneAndUpdate).toHaveBeenCalledWith({}, updateData, {
        upsert: true,
        new: true,
      });
      expect(result).toEqual(updatedSettings);
    });

    it('should handle partial updates', async () => {
      const partialUpdate = {
        ctaEvery: 5,
      };

      const updatedSettings = { ...mockSettings, ctaEvery: 5 };

      model.findOneAndUpdate.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(updatedSettings),
        }),
      } as any);

      const result = await repository.findOneAndUpdate(partialUpdate);

      expect(result.ctaEvery).toBe(5);
      // Other fields should remain unchanged
      expect(result.launchDate).toBe(mockSettings.launchDate);
      expect(result.applyUrl).toBe(mockSettings.applyUrl);
    });

    it('should handle empty update data', async () => {
      const emptyUpdate = {};

      const updatedSettings = { ...mockSettings };

      model.findOneAndUpdate.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(updatedSettings),
        }),
      } as any);

      const result = await repository.findOneAndUpdate(emptyUpdate);

      expect(result).toEqual(mockSettings);
      expect(model.findOneAndUpdate).toHaveBeenCalledWith({}, emptyUpdate, {
        upsert: true,
        new: true,
      });
    });

    it('should handle update errors', async () => {
      const updateData = {
        launchDate: '2024-02-01T00:00:00.000Z',
      };

      model.findOneAndUpdate.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockRejectedValue(new Error('Update failed')),
        }),
      } as any);

      await expect(repository.findOneAndUpdate(updateData)).rejects.toThrow(
        'Update failed',
      );
    });

    it('should handle concurrent updates', async () => {
      const updateData1 = { launchDate: '2024-02-01T00:00:00.000Z' };
      const updateData2 = { applyUrl: 'https://new-url.com/apply' };

      model.findOneAndUpdate
        .mockReturnValueOnce({
          lean: jest.fn().mockReturnValue({
            exec: jest
              .fn()
              .mockResolvedValue({ ...mockSettings, ...updateData1 }),
          }),
        } as any)
        .mockReturnValueOnce({
          lean: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue({
              ...mockSettings,
              ...updateData1,
              ...updateData2,
            }),
          }),
        } as any);

      const [result1, result2] = await Promise.all([
        repository.findOneAndUpdate(updateData1),
        repository.findOneAndUpdate(updateData2),
      ]);

      expect(result1.launchDate).toBe('2024-02-01T00:00:00.000Z');
      expect(result2.applyUrl).toBe('https://new-url.com/apply');
      expect(model.findOneAndUpdate).toHaveBeenCalledTimes(2);
    });

    it('should handle upsert functionality', async () => {
      const updateData = {
        launchDate: '2024-02-01T00:00:00.000Z',
      };

      // First call - no existing document
      model.findOneAndUpdate.mockReturnValueOnce({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(null),
        }),
      } as any);

      // Second call - should create new document
      model.findOneAndUpdate.mockReturnValueOnce({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue({ ...mockSettings, ...updateData }),
        }),
      } as any);

      // First update should return null (no existing document)
      const result1 = await repository.findOneAndUpdate(updateData);
      expect(result1).toBeNull();

      // Second update should create and return the document
      const result2 = await repository.findOneAndUpdate(updateData);
      expect(result2?.launchDate).toBe('2024-02-01T00:00:00.000Z');
    });

    it('should handle complex update data', async () => {
      const complexUpdate = {
        highIntentKeywords: [
          'ابدأ',
          'سجّل',
          'اطلب',
          'تسجيل',
          'launch',
          'apply',
        ],
        piiKeywords: ['اسم', 'هاتف', 'بريد', 'عنوان', 'هوية'],
        integrationsNow: 'سلة، زد، متجر إلكتروني متطور',
        trialOffer: 'شهر مجاني كامل ثم باقة تجريبية محدودة',
      };

      const updatedSettings = { ...mockSettings, ...complexUpdate };

      model.findOneAndUpdate.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(updatedSettings),
        }),
      } as any);

      const result = await repository.findOneAndUpdate(complexUpdate);

      expect(result?.highIntentKeywords).toHaveLength(6);
      expect(result?.piiKeywords).toHaveLength(5);
      expect(result?.integrationsNow).toContain('متطور');
      expect(result?.trialOffer).toContain('شهر مجاني');
    });

    it('should handle update with array modifications', async () => {
      const arrayUpdate = {
        highIntentKeywords: ['ابدأ', 'سجّل'],
        piiKeywords: ['اسم', 'هاتف'],
      };

      const updatedSettings = { ...mockSettings, ...arrayUpdate };

      model.findOneAndUpdate.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(updatedSettings),
        }),
      } as any);

      const result = await repository.findOneAndUpdate(arrayUpdate);

      expect(result?.highIntentKeywords).toEqual(['ابدأ', 'سجّل']);
      expect(result?.piiKeywords).toEqual(['اسم', 'هاتف']);
    });

    it('should handle numeric field updates', async () => {
      const numericUpdate = {
        ctaEvery: 7,
      };

      const updatedSettings = { ...mockSettings, ctaEvery: 7 };

      model.findOneAndUpdate.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(updatedSettings),
        }),
      } as any);

      const result = await repository.findOneAndUpdate(numericUpdate);

      expect(result?.ctaEvery).toBe(7);
    });

    it('should handle string field updates', async () => {
      const stringUpdate = {
        integrationsNow: 'تحديث التكاملات',
        trialOffer: 'عرض تجريبي محدث',
      };

      const updatedSettings = { ...mockSettings, ...stringUpdate };

      model.findOneAndUpdate.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(updatedSettings),
        }),
      } as any);

      const result = await repository.findOneAndUpdate(stringUpdate);

      expect(result?.integrationsNow).toBe('تحديث التكاملات');
      expect(result?.trialOffer).toBe('عرض تجريبي محدث');
    });

    it('should handle update errors gracefully', async () => {
      const updateData = {
        launchDate: '2024-02-01T00:00:00.000Z',
      };

      model.findOneAndUpdate.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest
            .fn()
            .mockRejectedValue(new Error('Update operation failed')),
        }),
      } as any);

      await expect(repository.findOneAndUpdate(updateData)).rejects.toThrow(
        'Update operation failed',
      );
    });

    it('should handle network timeout errors', async () => {
      const updateData = {
        launchDate: '2024-02-01T00:00:00.000Z',
      };

      model.findOneAndUpdate.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockRejectedValue(new Error('Network timeout')),
        }),
      } as any);

      await expect(repository.findOneAndUpdate(updateData)).rejects.toThrow(
        'Network timeout',
      );
    });

    it('should handle validation errors during update', async () => {
      const invalidUpdate = {
        ctaEvery: -1, // Invalid negative value
        launchDate: 'invalid-date-format',
      };

      model.findOneAndUpdate.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockRejectedValue(new Error('ValidationError')),
        }),
      } as any);

      await expect(repository.findOneAndUpdate(invalidUpdate)).rejects.toThrow(
        'ValidationError',
      );
    });

    it('should handle large update payloads', async () => {
      const largeUpdate = {
        integrationsNow: 'x'.repeat(100000),
        highIntentKeywords: Array(10000).fill('keyword'),
        piiKeywords: Array(10000).fill('pii-keyword'),
      };

      const largeSettings = { ...mockSettings, ...largeUpdate };

      model.findOneAndUpdate.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(largeSettings),
        }),
      } as any);

      const result = await repository.findOneAndUpdate(largeUpdate);

      expect(result?.integrationsNow).toHaveLength(100000);
      expect(result?.highIntentKeywords).toHaveLength(10000);
      expect(result?.piiKeywords).toHaveLength(10000);
    });
  });

  describe('Integration scenarios', () => {
    it('should handle complete settings lifecycle', async () => {
      // Initially no settings exist
      model.findOne.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(null),
        }),
      } as any);

      // Create initial settings
      model.create.mockResolvedValue(mockSettings as any);

      const created = await repository.create({
        launchDate: '2024-01-01T00:00:00.000Z',
      });

      expect(created.launchDate).toBe('2024-01-01T00:00:00.000Z');

      // Update settings
      const updateData = {
        trialOffer: 'عرض محدث',
        ctaEvery: 5,
      };

      model.findOneAndUpdate.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue({ ...mockSettings, ...updateData }),
        }),
      } as any);

      const updated = await repository.findOneAndUpdate(updateData);

      expect(updated?.trialOffer).toBe('عرض محدث');
      expect(updated?.ctaEvery).toBe(5);

      // Verify final state
      model.findOne.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(updated),
        }),
      } as any);

      const final = await repository.findOneLean();
      expect(final?.trialOffer).toBe('عرض محدث');
      expect(final?.ctaEvery).toBe(5);
    });

    it('should handle concurrent operations safely', async () => {
      const operations = [
        repository.findOneLean(),
        repository.findOneAndUpdate({ ctaEvery: 5 }),
        repository.findOneLean(),
        repository.create({ launchDate: '2024-02-01T00:00:00.000Z' }),
      ];

      model.findOne.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockSettings),
        }),
      } as any);

      model.findOneAndUpdate.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue({ ...mockSettings, ctaEvery: 5 }),
        }),
      } as any);

      model.create.mockResolvedValue(mockSettings as any);

      const results = await Promise.all(operations);

      expect(results).toHaveLength(4);
      expect(results[0]).toEqual(mockSettings); // findOneLean
      expect(results[1]?.ctaEvery).toBe(5); // findOneAndUpdate
      expect(results[2]).toEqual(mockSettings); // findOneLean after update
      expect(results[3]).toEqual(mockSettings); // create
    });

    it('should handle repository method chaining', async () => {
      // Test that method chaining works correctly
      model.findOne.mockReturnValue({
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockSettings),
      } as any);

      const result = await repository.findOneLean();

      expect(result).toEqual(mockSettings);

      // Verify the chain was called correctly
      expect(model.findOne).toHaveBeenCalledWith();
    });
  });

  describe('Error handling', () => {
    it('should handle MongoDB connection errors', async () => {
      model.findOne.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockRejectedValue(new Error('MongoNetworkError')),
        }),
      } as any);

      await expect(repository.findOneLean()).rejects.toThrow(
        'MongoNetworkError',
      );
    });

    it('should handle validation errors', async () => {
      const invalidData = {
        ctaEvery: 'not_a_number',
        launchDate: 'invalid_date',
      } as any;

      model.create.mockRejectedValue(new Error('ValidationError'));

      await expect(repository.create(invalidData)).rejects.toThrow(
        'ValidationError',
      );
    });

    it('should handle timeout errors', async () => {
      model.findOneAndUpdate.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockRejectedValue(new Error('Operation timed out')),
        }),
      } as any);

      await expect(repository.findOneAndUpdate({})).rejects.toThrow(
        'Operation timed out',
      );
    });

    it('should handle duplicate key errors', async () => {
      model.create.mockRejectedValue(new Error('E11000 duplicate key error'));

      await expect(repository.create({})).rejects.toThrow(
        'E11000 duplicate key error',
      );
    });

    it('should handle malformed query responses', async () => {
      model.findOne.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(undefined),
        }),
      } as any);

      const result = await repository.findOneLean();

      expect(result).toBeUndefined();
    });

    it('should handle null model responses', async () => {
      model.findOne.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(null),
        }),
      } as any);

      const result = await repository.findOneLean();

      expect(result).toBeNull();
    });
  });

  describe('Performance considerations', () => {
    it('should handle large dataset operations efficiently', async () => {
      const largeSettings = {
        ...mockSettings,
        highIntentKeywords: Array(10000).fill('keyword'),
        piiKeywords: Array(10000).fill('pii-keyword'),
        integrationsNow: 'x'.repeat(100000),
      };

      model.findOne.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(largeSettings),
        }),
      } as any);

      const startTime = Date.now();
      const result = await repository.findOneLean();
      const endTime = Date.now();

      expect(result?.highIntentKeywords).toHaveLength(10000);
      expect(result?.integrationsNow).toHaveLength(100000);

      // Should complete within reasonable time
      expect(endTime - startTime).toBeLessThan(1000);
    });

    it('should handle multiple rapid operations', async () => {
      model.findOne.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockSettings),
        }),
      } as any);

      model.findOneAndUpdate.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue({ ...mockSettings, ctaEvery: 5 }),
        }),
      } as any);

      const startTime = Date.now();

      // Perform many operations rapidly
      const operations: Promise<BotRuntimeSettings | null>[] = [];
      for (let i = 0; i < 100; i++) {
        operations.push(repository.findOneLean());
      }

      const results = await Promise.all(operations);
      const endTime = Date.now();

      expect(results).toHaveLength(100);
      results.forEach((result) => {
        expect(result).toEqual(mockSettings);
      });

      // Should complete within reasonable time
      expect(endTime - startTime).toBeLessThan(2000);
    });
  });

  describe('Edge cases', () => {
    it('should handle empty database responses', async () => {
      model.findOne.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue({}),
        }),
      } as any);

      const result = await repository.findOneLean();

      expect(result).toEqual({});
    });

    it('should handle undefined field values', async () => {
      const settingsWithUndefined = {
        ...mockSettings,
        integrationsNow: undefined,
        trialOffer: undefined,
      };

      model.findOne.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(settingsWithUndefined),
        }),
      } as any);

      const result = await repository.findOneLean();

      expect(result?.integrationsNow).toBeUndefined();
      expect(result?.trialOffer).toBeUndefined();
    });

    it('should handle zero values correctly', async () => {
      const zeroValueSettings = {
        ...mockSettings,
        ctaEvery: 0,
      };

      model.findOne.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(zeroValueSettings),
        }),
      } as any);

      const result = await repository.findOneLean();

      expect(result?.ctaEvery).toBe(0);
    });

    it('should handle negative numeric values', async () => {
      const negativeValueSettings = {
        ...mockSettings,
        ctaEvery: -1,
      };

      model.findOne.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(negativeValueSettings),
        }),
      } as any);

      const result = await repository.findOneLean();

      expect(result?.ctaEvery).toBe(-1);
    });

    it('should handle empty string values', async () => {
      const emptyStringSettings = {
        ...mockSettings,
        integrationsNow: '',
        trialOffer: '',
      };

      model.findOne.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(emptyStringSettings),
        }),
      } as any);

      const result = await repository.findOneLean();

      expect(result?.integrationsNow).toBe('');
      expect(result?.trialOffer).toBe('');
    });

    it('should handle empty array values', async () => {
      const emptyArraySettings = {
        ...mockSettings,
        highIntentKeywords: [],
        piiKeywords: [],
      };

      model.findOne.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(emptyArraySettings),
        }),
      } as any);

      const result = await repository.findOneLean();

      expect(result?.highIntentKeywords).toEqual([]);
      expect(result?.piiKeywords).toEqual([]);
    });

    it('should handle special characters in data', async () => {
      const specialCharSettings = {
        ...mockSettings,
        trialOffer: 'شهر مجاني كامل! 💯 مع باقة تجريبية 🚀',
        yemenPositioning: 'خدمة عملاء متميزة في اليمن 🇾🇪',
      };

      model.findOne.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(specialCharSettings),
        }),
      } as any);

      const result = await repository.findOneLean();

      expect(result?.trialOffer).toContain('💯');
      expect(result?.trialOffer).toContain('🚀');
      expect(result?.yemenPositioning).toContain('🇾🇪');
    });

    it('should handle unicode text correctly', async () => {
      const unicodeSettings = {
        ...mockSettings,
        yemenPositioning:
          'يعالج فجوة خدمة العملاء بالمتاجر في اليمن ويُركّز على احتياجات السوق المحلي المتطورة',
        integrationsNow: 'سلة، زد، وأدوات أخرى محلية متميزة',
      };

      model.findOne.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(unicodeSettings),
        }),
      } as any);

      const result = await repository.findOneLean();

      expect(result?.yemenPositioning).toContain('يُركّز');
      expect(result?.integrationsNow).toContain('متطورة');
    });

    it('should handle very large string values', async () => {
      const largeStringSettings = {
        ...mockSettings,
        integrationsNow: 'x'.repeat(1000000), // 1MB string
      };

      model.findOne.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(largeStringSettings),
        }),
      } as any);

      const result = await repository.findOneLean();

      expect(result?.integrationsNow).toHaveLength(1000000);
    });

    it('should handle very large array values', async () => {
      const largeArraySettings = {
        ...mockSettings,
        highIntentKeywords: Array(100000).fill('keyword'),
      };

      model.findOne.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(largeArraySettings),
        }),
      } as any);

      const result = await repository.findOneLean();

      expect(result?.highIntentKeywords).toHaveLength(100000);
    });
  });

  describe('Method signatures compliance', () => {
    it('should implement SettingsRepository interface correctly', () => {
      // Verify that the repository implements all required methods
      expect(typeof repository.findOneLean).toBe('function');
      expect(typeof repository.create).toBe('function');
      expect(typeof repository.findOneAndUpdate).toBe('function');

      // Verify method signatures match the interface
      expect(repository.findOneLean.length).toBe(0); // No parameters
      expect(repository.create.length).toBe(1); // One parameter (data)
      expect(repository.findOneAndUpdate.length).toBe(1); // One parameter (patch)
    });

    it('should return correct return types', async () => {
      // findOneLean should return BotRuntimeSettings | null
      model.findOne.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockSettings),
        }),
      } as any);

      const findResult = await repository.findOneLean();
      expect(findResult).toBeDefined();

      // create should return BotRuntimeSettings
      model.create.mockResolvedValue(mockSettings as any);

      const createResult = await repository.create({});
      expect(createResult).toBeDefined();

      // findOneAndUpdate should return BotRuntimeSettings
      model.findOneAndUpdate.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockSettings),
        }),
      } as any);

      const updateResult = await repository.findOneAndUpdate({});
      expect(updateResult).toBeDefined();
    });

    it('should handle method parameter types correctly', async () => {
      const partialSettings = {
        launchDate: '2024-02-01T00:00:00.000Z',
        ctaEvery: 5,
      };

      // create should accept Partial<BotRuntimeSettings>
      model.create.mockResolvedValue({
        ...mockSettings,
        ...partialSettings,
      } as any);

      const createResult = await repository.create(partialSettings);
      expect(createResult.launchDate).toBe('2024-02-01T00:00:00.000Z');

      // findOneAndUpdate should accept Partial<BotRuntimeSettings>
      model.findOneAndUpdate.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest
            .fn()
            .mockResolvedValue({ ...mockSettings, ...partialSettings }),
        }),
      } as any);

      const updateResult = await repository.findOneAndUpdate(partialSettings);
      expect(updateResult?.launchDate).toBe('2024-02-01T00:00:00.000Z');
    });
  });

  describe('Data consistency', () => {
    it('should maintain data integrity across operations', async () => {
      // Create initial settings
      model.create.mockResolvedValue(mockSettings as any);

      const created = await repository.create({
        launchDate: '2024-01-01T00:00:00.000Z',
      });

      expect(created.launchDate).toBe('2024-01-01T00:00:00.000Z');
      expect(created.applyUrl).toBe('https://example.com/apply'); // Default value

      // Update settings
      const updateData = {
        trialOffer: 'عرض محدث',
      };

      model.findOneAndUpdate.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue({ ...created, ...updateData }),
        }),
      } as any);

      const updated = await repository.findOneAndUpdate(updateData);

      expect(updated?.trialOffer).toBe('عرض محدث');
      expect(updated?.launchDate).toBe('2024-01-01T00:00:00.000Z'); // Should be preserved
      expect(updated?.applyUrl).toBe('https://example.com/apply'); // Should be preserved
    });

    it('should handle type conversions correctly', async () => {
      // Test that numeric strings are handled properly
      const stringNumberData = {
        ctaEvery: '5' as any, // String that should be converted to number
      };

      model.findOneAndUpdate.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue({ ...mockSettings, ctaEvery: 5 }),
        }),
      } as any);

      const result = await repository.findOneAndUpdate(stringNumberData);

      expect(result?.ctaEvery).toBe(5); // Should be converted to number
    });

    it('should preserve array types correctly', async () => {
      const arrayData = {
        highIntentKeywords: ['ابدأ', 'سجّل'],
        piiKeywords: ['اسم', 'هاتف'],
      };

      model.findOneAndUpdate.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue({ ...mockSettings, ...arrayData }),
        }),
      } as any);

      const result = await repository.findOneAndUpdate(arrayData);

      expect(Array.isArray(result?.highIntentKeywords)).toBe(true);
      expect(Array.isArray(result?.piiKeywords)).toBe(true);
      expect(result?.highIntentKeywords).toEqual(['ابدأ', 'سجّل']);
      expect(result?.piiKeywords).toEqual(['اسم', 'هاتف']);
    });
  });
});

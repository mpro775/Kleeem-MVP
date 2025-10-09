import { getModelToken } from '@nestjs/mongoose';
import { Test, type TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';

import { Merchant } from '../../schemas/merchant.schema';
import { MongoPromptVersionRepository } from '../mongo-prompt-version.repository';

import type { Model } from 'mongoose';

describe('MongoPromptVersionRepository', () => {
  let repository: MongoPromptVersionRepository;
  let merchantModel: jest.Mocked<Model<Merchant>>;

  beforeEach(async () => {
    const mockMerchantModel = {
      findById: jest.fn(),
      updateOne: jest.fn(),
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MongoPromptVersionRepository,
        {
          provide: getModelToken(Merchant.name),
          useValue: mockMerchantModel,
        },
      ],
    }).compile();

    repository = module.get<MongoPromptVersionRepository>(
      MongoPromptVersionRepository,
    );
    merchantModel = module.get(getModelToken(Merchant.name));
  });

  describe('Basic functionality', () => {
    it('should be instantiable', () => {
      expect(repository).toBeInstanceOf(MongoPromptVersionRepository);
      expect(repository).toBeDefined();
    });

    it('should have all required methods', () => {
      expect(typeof repository.getOrFail).toBe('function');
      expect(typeof repository.getAdvancedHistory).toBe('function');
      expect(typeof repository.appendAdvancedHistory).toBe('function');
      expect(typeof repository.setCurrentAdvancedConfig).toBe('function');
    });

    it('should have correct class name and structure', () => {
      expect(repository.constructor.name).toBe('MongoPromptVersionRepository');
      expect(repository).toHaveProperty('merchantModel');
    });
  });

  describe('getOrFail', () => {
    const merchantId = '507f1f77bcf86cd799439011';

    it('should return merchant when found', async () => {
      // Arrange
      const mockMerchant = {
        _id: new Types.ObjectId(merchantId),
        name: 'Test Merchant',
        advancedConfigHistory: [],
      };
      merchantModel.findById.mockResolvedValue(mockMerchant as any);

      // Act
      const result = await repository.getOrFail(merchantId);

      // Assert
      expect(merchantModel.findById).toHaveBeenCalledWith(merchantId);
      expect(result).toEqual(mockMerchant);
    });

    it('should throw NotFoundException when merchant not found', async () => {
      // Arrange
      merchantModel.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(repository.getOrFail(merchantId)).rejects.toThrow(
        'Merchant not found',
      );
    });

    it('should handle database errors', async () => {
      // Arrange
      const error = new Error('Database connection failed');
      merchantModel.findById.mockRejectedValue(error);

      // Act & Assert
      await expect(repository.getOrFail(merchantId)).rejects.toThrow(
        'Database connection failed',
      );
    });
  });

  describe('getAdvancedHistory', () => {
    const merchantId = '507f1f77bcf86cd799439011';

    it('should return advanced config history when merchant has history', async () => {
      // Arrange
      const mockHistory = [
        {
          template: 'Template 1',
          note: 'First version',
          updatedAt: new Date('2024-01-01'),
        },
        {
          template: 'Template 2',
          note: 'Second version',
          updatedAt: new Date('2024-01-02'),
        },
      ];
      const mockMerchant = {
        _id: new Types.ObjectId(merchantId),
        advancedConfigHistory: mockHistory,
      };
      const mockQuery = {
        lean: jest.fn().mockResolvedValue(mockMerchant),
      };
      merchantModel.findById.mockReturnValue(mockQuery as any);

      // Act
      const result = await repository.getAdvancedHistory(merchantId);

      // Assert
      expect(merchantModel.findById).toHaveBeenCalledWith(
        merchantId,
        'advancedConfigHistory',
      );
      expect(mockQuery.lean).toHaveBeenCalled();
      expect(result).toEqual(mockHistory);
    });

    it('should return empty array when merchant has no history', async () => {
      // Arrange
      const mockMerchant = {
        _id: new Types.ObjectId(merchantId),
        advancedConfigHistory: null,
      };
      const mockQuery = {
        lean: jest.fn().mockResolvedValue(mockMerchant),
      };
      merchantModel.findById.mockReturnValue(mockQuery as any);

      // Act
      const result = await repository.getAdvancedHistory(merchantId);

      // Assert
      expect(result).toEqual([]);
    });

    it('should return empty array when merchant not found', async () => {
      // Arrange
      const mockQuery = {
        lean: jest.fn().mockResolvedValue(null),
      };
      merchantModel.findById.mockReturnValue(mockQuery as any);

      // Act
      const result = await repository.getAdvancedHistory(merchantId);

      // Assert
      expect(result).toEqual([]);
    });

    it('should return empty array when advancedConfigHistory is not an array', async () => {
      // Arrange
      const mockMerchant = {
        _id: new Types.ObjectId(merchantId),
        advancedConfigHistory: 'not an array',
      };
      const mockQuery = {
        lean: jest.fn().mockResolvedValue(mockMerchant),
      };
      merchantModel.findById.mockReturnValue(mockQuery as any);

      // Act
      const result = await repository.getAdvancedHistory(merchantId);

      // Assert
      expect(result).toEqual([]);
    });

    it('should handle empty history array', async () => {
      // Arrange
      const mockMerchant = {
        _id: new Types.ObjectId(merchantId),
        advancedConfigHistory: [],
      };
      const mockQuery = {
        lean: jest.fn().mockResolvedValue(mockMerchant),
      };
      merchantModel.findById.mockReturnValue(mockQuery as any);

      // Act
      const result = await repository.getAdvancedHistory(merchantId);

      // Assert
      expect(result).toEqual([]);
    });

    it('should handle database errors', async () => {
      // Arrange
      const error = new Error('Database query failed');
      const mockQuery = {
        lean: jest.fn().mockRejectedValue(error),
      };
      merchantModel.findById.mockReturnValue(mockQuery as any);

      // Act & Assert
      await expect(repository.getAdvancedHistory(merchantId)).rejects.toThrow(
        'Database query failed',
      );
    });
  });

  describe('appendAdvancedHistory', () => {
    const merchantId = '507f1f77bcf86cd799439011';
    const historyEntry = {
      template: 'New template content',
      note: 'Updated template',
      updatedAt: new Date('2024-01-03'),
    };

    it('should append entry to advanced config history', async () => {
      // Arrange
      merchantModel.updateOne.mockResolvedValue({ matchedCount: 1 } as any);

      // Act
      await repository.appendAdvancedHistory(merchantId, historyEntry);

      // Assert
      expect(merchantModel.updateOne).toHaveBeenCalledWith(
        { _id: merchantId },
        { $push: { advancedConfigHistory: historyEntry } },
      );
    });

    it('should handle entry without note', async () => {
      // Arrange
      const entryWithoutNote = {
        template: 'Template without note',
        updatedAt: new Date(),
      };
      merchantModel.updateOne.mockResolvedValue({ matchedCount: 1 } as any);

      // Act
      await repository.appendAdvancedHistory(merchantId, entryWithoutNote);

      // Assert
      expect(merchantModel.updateOne).toHaveBeenCalledWith(
        { _id: merchantId },
        { $push: { advancedConfigHistory: entryWithoutNote } },
      );
    });

    it('should handle database errors', async () => {
      // Arrange
      const error = new Error('Update failed');
      merchantModel.updateOne.mockRejectedValue(error);

      // Act & Assert
      await expect(
        repository.appendAdvancedHistory(merchantId, historyEntry),
      ).rejects.toThrow('Update failed');
    });
  });

  describe('setCurrentAdvancedConfig', () => {
    const merchantId = '507f1f77bcf86cd799439011';

    it('should set current advanced config with all fields', async () => {
      // Arrange
      const configData = {
        template: 'Current template',
        updatedAt: new Date('2024-01-03'),
        note: 'Current version note',
      };
      merchantModel.updateOne.mockResolvedValue({ matchedCount: 1 } as any);

      // Act
      await repository.setCurrentAdvancedConfig(merchantId, configData);

      // Assert
      expect(merchantModel.updateOne).toHaveBeenCalledWith(
        { _id: merchantId },
        {
          $set: {
            'currentAdvancedConfig.template': configData.template,
            'currentAdvancedConfig.updatedAt': configData.updatedAt,
            'currentAdvancedConfig.note': configData.note,
          },
        },
      );
    });

    it('should set current advanced config with null note', async () => {
      // Arrange
      const configData = {
        template: 'Current template',
        updatedAt: new Date('2024-01-03'),
        note: null as unknown as string | undefined,
      };
      merchantModel.updateOne.mockResolvedValue({ matchedCount: 1 } as any);

      // Act
      await repository.setCurrentAdvancedConfig(
        merchantId,
        configData as unknown as {
          template: string;
          updatedAt: Date;
          note?: string;
        },
      );

      // Assert
      expect(merchantModel.updateOne).toHaveBeenCalledWith(
        { _id: merchantId },
        {
          $set: {
            'currentAdvancedConfig.template': configData.template,
            'currentAdvancedConfig.updatedAt': configData.updatedAt,
            'currentAdvancedConfig.note': configData.note ?? '',
          },
        },
      );
    });

    it('should set current advanced config with undefined note', async () => {
      // Arrange
      const configData = {
        template: 'Current template',
        updatedAt: new Date('2024-01-03'),
        note: null as unknown as string | undefined,
      };
      merchantModel.updateOne.mockResolvedValue({ matchedCount: 1 } as any);

      // Act
      await repository.setCurrentAdvancedConfig(
        merchantId,
        configData as unknown as {
          template: string;
          updatedAt: Date;
          note?: string;
        },
      );

      // Assert
      expect(merchantModel.updateOne).toHaveBeenCalledWith(
        { _id: merchantId },
        {
          $set: {
            'currentAdvancedConfig.template': configData.template,
            'currentAdvancedConfig.updatedAt': configData.updatedAt,
            'currentAdvancedConfig.note': configData.note ?? '',
          },
        },
      );
    });

    it('should handle database errors', async () => {
      // Arrange
      const configData = {
        template: 'Current template',
        updatedAt: new Date(),
        note: 'Note',
      };
      const error = new Error('Set config failed');
      merchantModel.updateOne.mockRejectedValue(error);

      // Act & Assert
      await expect(
        repository.setCurrentAdvancedConfig(merchantId, configData),
      ).rejects.toThrow('Set config failed');
    });
  });
});

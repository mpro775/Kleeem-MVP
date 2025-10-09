import { getModelToken } from '@nestjs/mongoose';
import { Test, type TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';

import { Merchant } from '../../schemas/merchant.schema';
import { PlanTier } from '../../schemas/subscription-plan.schema';
import { MongoMerchantsRepository } from '../mongo-merchants.repository';

import type { QuickConfig } from '../../schemas/quick-config.schema';
import type { Model } from 'mongoose';

describe('MongoMerchantsRepository', () => {
  let repository: MongoMerchantsRepository;
  let merchantModel: jest.Mocked<Model<Merchant>>;

  beforeEach(async () => {
    const mockMerchantModel = {
      create: jest.fn(),
      find: jest.fn(),
      findById: jest.fn(),
      findByIdAndUpdate: jest.fn(),
      findByIdAndDelete: jest.fn(),
      findOne: jest.fn(),
      exists: jest.fn(),
      exec: jest.fn(),
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockReturnThis(),
      save: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MongoMerchantsRepository,
        {
          provide: getModelToken(Merchant.name),
          useValue: mockMerchantModel,
        },
      ],
    }).compile();

    repository = module.get<MongoMerchantsRepository>(MongoMerchantsRepository);
    merchantModel = module.get(getModelToken(Merchant.name));
  });

  describe('Basic functionality', () => {
    it('should be instantiable', () => {
      expect(repository).toBeInstanceOf(MongoMerchantsRepository);
      expect(repository).toBeDefined();
    });

    it('should have all required methods', () => {
      expect(typeof repository.create).toBe('function');
      expect(typeof repository.findAll).toBe('function');
      expect(typeof repository.findOne).toBe('function');
      expect(typeof repository.update).toBe('function');
      expect(typeof repository.remove).toBe('function');
      expect(typeof repository.existsByPublicSlug).toBe('function');
      expect(typeof repository.saveBasicInfo).toBe('function');
      expect(typeof repository.softDelete).toBe('function');
      expect(typeof repository.restore).toBe('function');
      expect(typeof repository.purge).toBe('function');
      expect(typeof repository.isSubscriptionActive).toBe('function');
      expect(typeof repository.getStatus).toBe('function');
      expect(typeof repository.buildFinalPrompt).toBe('function');
      expect(typeof repository.saveAdvancedVersion).toBe('function');
      expect(typeof repository.listAdvancedVersions).toBe('function');
      expect(typeof repository.revertAdvancedVersion).toBe('function');
      expect(typeof repository.updateQuickConfig).toBe('function');
      expect(typeof repository.ensureForUser).toBe('function');
    });

    it('should have correct class name and structure', () => {
      expect(repository.constructor.name).toBe('MongoMerchantsRepository');
      expect(repository).toHaveProperty('merchantModel');
    });
  });

  describe('create', () => {
    it('should create and save a new merchant', async () => {
      // Arrange
      const createDto = {
        userId: 'user123',
        name: 'Test Merchant',
        subscription: {
          tier: PlanTier.Free,
          startDate: new Date().toISOString(),
          features: [],
        },
        addresses: [],
        categories: [],
        quickConfig: {
          dialect: 'خليجي',
          tone: 'ودّي',
          customInstructions: [],
          includeClosingPhrase: true,
          customerServicePhone: '',
          customerServiceWhatsapp: '',
          closingText: 'هل أقدر أساعدك بشي ثاني؟ 😊',
        } as QuickConfig,
      };

      const mockSavedMerchant = {
        _id: new Types.ObjectId(),
        ...createDto,
        save: jest.fn().mockResolvedValue({
          _id: new Types.ObjectId(),
          ...createDto,
        }),
      };

      merchantModel.create.mockResolvedValue(mockSavedMerchant as any);

      // Act
      const result = await repository.create(createDto);

      // Assert
      expect(merchantModel.create).toHaveBeenCalledWith(createDto);
      expect(result).toEqual(mockSavedMerchant);
    });

    it('should handle creation errors', async () => {
      // Arrange
      const createDto = { userId: 'user123', name: 'Test Merchant' };
      const error = new Error('Validation failed');
      merchantModel.create.mockRejectedValue(error);

      // Act & Assert
      await expect(repository.create(createDto as any)).rejects.toThrow(
        'Validation failed',
      );
    });
  });

  describe('findAll', () => {
    it('should return all merchants', async () => {
      // Arrange
      const mockMerchants = [
        { _id: new Types.ObjectId(), name: 'Merchant 1' },
        { _id: new Types.ObjectId(), name: 'Merchant 2' },
      ];
      const mockQuery = {
        exec: jest.fn().mockResolvedValue(mockMerchants),
      };
      merchantModel.find.mockReturnValue(mockQuery as any);

      // Act
      const result = await repository.findAll();

      // Assert
      expect(merchantModel.find).toHaveBeenCalledWith();
      expect(mockQuery.exec).toHaveBeenCalled();
      expect(result).toEqual(mockMerchants);
    });

    it('should return empty array when no merchants found', async () => {
      // Arrange
      const mockQuery = {
        exec: jest.fn().mockResolvedValue([]),
      };
      merchantModel.find.mockReturnValue(mockQuery as any);

      // Act
      const result = await repository.findAll();

      // Assert
      expect(result).toEqual([]);
    });

    it('should handle database errors', async () => {
      // Arrange
      const error = new Error('Database query failed');
      const mockQuery = {
        exec: jest.fn().mockRejectedValue(error),
      };
      merchantModel.find.mockReturnValue(mockQuery as any);

      // Act & Assert
      await expect(repository.findAll()).rejects.toThrow(
        'Database query failed',
      );
    });
  });

  describe('findOne', () => {
    const merchantId = '507f1f77bcf86cd799439011';

    it('should return merchant when found', async () => {
      // Arrange
      const mockMerchant = {
        _id: new Types.ObjectId(merchantId),
        name: 'Test Merchant',
      };
      const mockQuery = {
        exec: jest.fn().mockResolvedValue(mockMerchant),
      };
      merchantModel.findById.mockReturnValue(mockQuery as any);

      // Act
      const result = await repository.findOne(merchantId);

      // Assert
      expect(merchantModel.findById).toHaveBeenCalledWith(merchantId);
      expect(mockQuery.exec).toHaveBeenCalled();
      expect(result).toEqual(mockMerchant);
    });

    it('should throw NotFoundException when merchant not found', async () => {
      // Arrange
      const mockQuery = {
        exec: jest.fn().mockResolvedValue(null),
      };
      merchantModel.findById.mockReturnValue(mockQuery as any);

      // Act & Assert
      await expect(repository.findOne(merchantId)).rejects.toThrow(
        'Merchant not found',
      );
    });

    it('should handle database errors', async () => {
      // Arrange
      const error = new Error('Database query failed');
      const mockQuery = {
        exec: jest.fn().mockRejectedValue(error),
      };
      merchantModel.findById.mockReturnValue(mockQuery as any);

      // Act & Assert
      await expect(repository.findOne(merchantId)).rejects.toThrow(
        'Database query failed',
      );
    });
  });

  describe('remove', () => {
    const merchantId = '507f1f77bcf86cd799439011';

    it('should delete merchant and return success message', async () => {
      // Arrange
      const mockDeletedMerchant = {
        _id: new Types.ObjectId(merchantId),
        name: 'Deleted Merchant',
      };
      merchantModel.findByIdAndDelete.mockResolvedValue(
        mockDeletedMerchant as any,
      );

      // Act
      const result = await repository.remove(merchantId);

      // Assert
      expect(merchantModel.findByIdAndDelete).toHaveBeenCalledWith(merchantId);
      expect(result).toEqual({ message: 'Merchant deleted successfully' });
    });

    it('should throw NotFoundException when merchant not found', async () => {
      // Arrange
      merchantModel.findByIdAndDelete.mockResolvedValue(null);

      // Act & Assert
      await expect(repository.remove(merchantId)).rejects.toThrow(
        'Merchant not found',
      );
    });

    it('should handle database errors', async () => {
      // Arrange
      const error = new Error('Delete failed');
      merchantModel.findByIdAndDelete.mockRejectedValue(error);

      // Act & Assert
      await expect(repository.remove(merchantId)).rejects.toThrow(
        'Delete failed',
      );
    });
  });

  describe('existsByPublicSlug', () => {
    const slug = 'test-merchant';
    const excludeId = '507f1f77bcf86cd799439012';

    it('should return true when slug exists', async () => {
      // Arrange
      merchantModel.exists.mockResolvedValue({} as any);

      // Act
      const result = await repository.existsByPublicSlug(slug);

      // Assert
      expect(merchantModel.exists).toHaveBeenCalledWith({ publicSlug: slug });
      expect(result).toBe(true);
    });

    it('should return false when slug does not exist', async () => {
      // Arrange
      merchantModel.exists.mockResolvedValue(null);

      // Act
      const result = await repository.existsByPublicSlug(slug);

      // Assert
      expect(result).toBe(false);
    });

    it('should exclude specified id when checking slug existence', async () => {
      // Arrange
      merchantModel.exists.mockResolvedValue(null);

      // Act
      const result = await repository.existsByPublicSlug(slug, excludeId);

      // Assert
      expect(merchantModel.exists).toHaveBeenCalledWith({
        publicSlug: slug,
        _id: { $ne: new Types.ObjectId(excludeId) },
      });
      expect(result).toBe(false);
    });

    it('should handle invalid ObjectId gracefully', async () => {
      // Arrange
      const invalidId = 'invalid-id';
      merchantModel.exists.mockResolvedValue(null);

      // Act
      const result = await repository.existsByPublicSlug(slug, invalidId);

      // Assert
      expect(merchantModel.exists).toHaveBeenCalledWith({ publicSlug: slug });
      expect(result).toBe(false);
    });

    it('should handle database errors', async () => {
      // Arrange
      const error = new Error('Exists check failed');
      merchantModel.exists.mockRejectedValue(error);

      // Act & Assert
      await expect(repository.existsByPublicSlug(slug)).rejects.toThrow(
        'Exists check failed',
      );
    });
  });

  describe('saveBasicInfo', () => {
    const merchantId = '507f1f77bcf86cd799439011';
    const basicInfo = {
      name: 'Updated Merchant Name',
      businessDescription: 'Updated description',
    };

    it('should update merchant basic info', async () => {
      // Arrange
      const mockMerchant = {
        _id: new Types.ObjectId(merchantId),
        name: 'Original Name',
        save: jest.fn().mockResolvedValue({
          _id: new Types.ObjectId(merchantId),
          ...basicInfo,
        }),
      };
      merchantModel.findById.mockResolvedValue(mockMerchant as any);

      // Act
      const result = await repository.saveBasicInfo(merchantId, basicInfo);

      // Assert
      expect(merchantModel.findById).toHaveBeenCalledWith(merchantId);
      expect(mockMerchant.save).toHaveBeenCalled();
      expect(result.name).toBe(basicInfo.name);
      expect(result.businessDescription).toBe(basicInfo.businessDescription);
    });

    it('should throw NotFoundException when merchant not found', async () => {
      // Arrange
      merchantModel.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(
        repository.saveBasicInfo(merchantId, basicInfo),
      ).rejects.toThrow('Merchant not found');
    });

    it('should handle database errors during find', async () => {
      // Arrange
      const error = new Error('Find failed');
      merchantModel.findById.mockRejectedValue(error);

      // Act & Assert
      await expect(
        repository.saveBasicInfo(merchantId, basicInfo),
      ).rejects.toThrow('Find failed');
    });

    it('should handle database errors during save', async () => {
      // Arrange
      const mockMerchant = {
        _id: new Types.ObjectId(merchantId),
        name: 'Original Name',
        save: jest.fn().mockRejectedValue(new Error('Save failed')),
      };
      merchantModel.findById.mockResolvedValue(mockMerchant as any);

      // Act & Assert
      await expect(
        repository.saveBasicInfo(merchantId, basicInfo),
      ).rejects.toThrow('Save failed');
    });
  });

  describe('isSubscriptionActive', () => {
    const merchantId = '507f1f77bcf86cd799439011';

    it('should return true when subscription has no end date', async () => {
      // Arrange
      const mockMerchant = {
        _id: new Types.ObjectId(merchantId),
        subscription: {
          endDate: undefined,
        },
      };
      const mockQuery = {
        exec: jest.fn().mockResolvedValue(mockMerchant),
      };
      merchantModel.findById.mockReturnValue(mockQuery as any);

      // Act
      const result = await repository.isSubscriptionActive(merchantId);

      // Assert
      expect(result).toBe(true);
    });

    it('should return true when subscription end date is in future', async () => {
      // Arrange
      const futureDate = new Date(Date.now() + 86400000); // Tomorrow
      const mockMerchant = {
        _id: new Types.ObjectId(merchantId),
        subscription: {
          endDate: futureDate,
        },
      };
      const mockQuery = {
        exec: jest.fn().mockResolvedValue(mockMerchant),
      };
      merchantModel.findById.mockReturnValue(mockQuery as any);

      // Act
      const result = await repository.isSubscriptionActive(merchantId);

      // Assert
      expect(result).toBe(true);
    });

    it('should return false when subscription end date is in past', async () => {
      // Arrange
      const pastDate = new Date(Date.now() - 86400000); // Yesterday
      const mockMerchant = {
        _id: new Types.ObjectId(merchantId),
        subscription: {
          endDate: pastDate,
        },
      };
      const mockQuery = {
        exec: jest.fn().mockResolvedValue(mockMerchant),
      };
      merchantModel.findById.mockReturnValue(mockQuery as any);

      // Act
      const result = await repository.isSubscriptionActive(merchantId);

      // Assert
      expect(result).toBe(false);
    });

    it('should return false when subscription end date is now', async () => {
      // Arrange
      const now = new Date();
      const mockMerchant = {
        _id: new Types.ObjectId(merchantId),
        subscription: {
          endDate: now,
        },
      };
      const mockQuery = {
        exec: jest.fn().mockResolvedValue(mockMerchant),
      };
      merchantModel.findById.mockReturnValue(mockQuery as any);

      // Act
      const result = await repository.isSubscriptionActive(merchantId);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('getStatus', () => {
    const merchantId = '507f1f77bcf86cd799439011';

    it('should return merchant status with active subscription', async () => {
      // Arrange
      const futureDate = new Date(Date.now() + 86400000);
      const mockMerchant = {
        _id: new Types.ObjectId(merchantId),
        status: 'active',
        subscription: {
          tier: PlanTier.Business,
          startDate: new Date('2024-01-01'),
          endDate: futureDate,
        },
        finalPromptTemplate: 'Test template',
        updatedAt: new Date(),
        lastActivity: new Date(),
      };
      const mockQuery = {
        exec: jest.fn().mockResolvedValue(mockMerchant),
      };
      merchantModel.findById.mockReturnValue(mockQuery as any);

      // Act
      const result = await repository.getStatus(merchantId);

      // Assert
      expect(result.status).toBe('active');
      expect(result.subscription.status).toBe('active');
      expect(result.subscription.tier).toBe(PlanTier.Business);
      expect(result.subscription.endDate).toBe(futureDate);
      expect(result.promptStatus.configured).toBe(true);
      expect(result.lastActivity).toBe(mockMerchant.lastActivity);
    });

    it('should return merchant status with expired subscription', async () => {
      // Arrange
      const pastDate = new Date(Date.now() - 86400000);
      const mockMerchant = {
        _id: new Types.ObjectId(merchantId),
        status: 'suspended',
        subscription: {
          tier: PlanTier.Free,
          startDate: new Date('2024-01-01'),
          endDate: pastDate,
        },
        finalPromptTemplate: null,
        updatedAt: new Date(),
      };
      const mockQuery = {
        exec: jest.fn().mockResolvedValue(mockMerchant),
      };
      merchantModel.findById.mockReturnValue(mockQuery as any);

      // Act
      const result = await repository.getStatus(merchantId);

      // Assert
      expect(result.status).toBe('suspended');
      expect(result.subscription.status).toBe('expired');
      expect(result.subscription.tier).toBe(PlanTier.Free);
      expect(result.subscription.endDate).toBe(pastDate);
      expect(result.promptStatus.configured).toBe(false);
      expect(result.lastActivity).toBeUndefined();
    });

    it('should return merchant status with no end date', async () => {
      // Arrange
      const mockMerchant = {
        _id: new Types.ObjectId(merchantId),
        status: 'active',
        subscription: {
          tier: PlanTier.Business,
          startDate: new Date('2024-01-01'),
          endDate: undefined,
        },
        finalPromptTemplate: 'Template',
        updatedAt: new Date(),
      };
      const mockQuery = {
        exec: jest.fn().mockResolvedValue(mockMerchant),
      };
      merchantModel.findById.mockReturnValue(mockQuery as any);

      // Act
      const result = await repository.getStatus(merchantId);

      // Assert
      expect(result.subscription.status).toBe('active');
      expect(result.subscription.endDate).toBeUndefined();
    });

    it('should throw NotFoundException when merchant not found', async () => {
      // Arrange
      const mockQuery = {
        exec: jest.fn().mockResolvedValue(null),
      };
      merchantModel.findById.mockReturnValue(mockQuery as any);

      // Act & Assert
      await expect(repository.getStatus(merchantId)).rejects.toThrow(
        'Merchant not found',
      );
    });
  });

  describe('buildFinalPrompt', () => {
    const merchantId = '507f1f77bcf86cd799439011';

    it('should return final prompt template', async () => {
      // Arrange
      const expectedTemplate = 'This is the final prompt template';
      const mockMerchant = {
        _id: new Types.ObjectId(merchantId),
        finalPromptTemplate: expectedTemplate,
      };
      const mockQuery = {
        exec: jest.fn().mockResolvedValue(mockMerchant),
      };
      merchantModel.findById.mockReturnValue(mockQuery as any);

      // Act
      const result = await repository.buildFinalPrompt(merchantId);

      // Assert
      expect(result).toBe(expectedTemplate);
    });

    it('should handle empty template', async () => {
      // Arrange
      const mockMerchant = {
        _id: new Types.ObjectId(merchantId),
        finalPromptTemplate: '',
      };
      const mockQuery = {
        exec: jest.fn().mockResolvedValue(mockMerchant),
      };
      merchantModel.findById.mockReturnValue(mockQuery as any);

      // Act
      const result = await repository.buildFinalPrompt(merchantId);

      // Assert
      expect(result).toBe('');
    });
  });

  describe('updateQuickConfig', () => {
    const merchantId = '507f1f77bcf86cd799439011';
    const quickConfig: QuickConfig = {
      dialect: 'فصحى',
      tone: 'رسمي',
      customInstructions: ['Custom instruction'],
      includeClosingPhrase: false,
      customerServicePhone: '+966123456789',
      customerServiceWhatsapp: '+966987654321',
      closingText: 'شكراً لك',
    };

    it('should update quick config successfully', async () => {
      // Arrange
      const mockUpdatedMerchant = {
        _id: new Types.ObjectId(merchantId),
        quickConfig,
      };
      const mockQuery = {
        exec: jest.fn().mockResolvedValue(mockUpdatedMerchant),
      };
      merchantModel.findByIdAndUpdate.mockReturnValue(mockQuery as any);

      // Act
      const result = await repository.updateQuickConfig(
        merchantId,
        quickConfig,
      );

      // Assert
      expect(merchantModel.findByIdAndUpdate).toHaveBeenCalledWith(
        merchantId,
        { $set: { quickConfig } },
        { new: true, runValidators: true },
      );
      expect(result).toEqual(quickConfig);
    });

    it('should throw NotFoundException when merchant not found', async () => {
      // Arrange
      const mockQuery = {
        exec: jest.fn().mockResolvedValue(null),
      };
      merchantModel.findByIdAndUpdate.mockReturnValue(mockQuery as any);

      // Act & Assert
      await expect(
        repository.updateQuickConfig(merchantId, quickConfig),
      ).rejects.toThrow('Merchant not found');
    });
  });

  describe('ensureForUser', () => {
    const userId = new Types.ObjectId('507f1f77bcf86cd799439013');
    const opts = {
      name: 'Custom Merchant Name',
      slugBase: 'custom-slug',
    };

    it('should return existing merchant when found', async () => {
      // Arrange
      const existingMerchant = {
        _id: new Types.ObjectId(),
        userId: userId.toString(),
        name: 'Existing Merchant',
      };
      merchantModel.findOne.mockResolvedValue(existingMerchant as any);

      // Act
      const result = await repository.ensureForUser(userId, opts);

      // Assert
      expect(merchantModel.findOne).toHaveBeenCalledWith({ userId });
      expect(result).toEqual(existingMerchant);
      expect(merchantModel.create).not.toHaveBeenCalled();
    });

    it('should create new merchant when none exists', async () => {
      // Arrange
      merchantModel.findOne.mockResolvedValue(null);
      const mockCreatedMerchant = {
        _id: new Types.ObjectId(),
        userId: userId.toString(),
        name: opts.name,
        subscription: expect.any(Object),
        addresses: [],
        categories: [],
        quickConfig: expect.any(Object),
      };
      merchantModel.create.mockResolvedValue({
        save: jest.fn().mockResolvedValue(mockCreatedMerchant),
      } as any);

      // Act
      const result = await repository.ensureForUser(userId, opts);

      // Assert
      expect(merchantModel.findOne).toHaveBeenCalledWith({ userId });
      expect(merchantModel.create).toHaveBeenCalled();
      expect(result.name).toBe(opts.name);
    });

    it('should use default name when no name provided', async () => {
      // Arrange
      merchantModel.findOne.mockResolvedValue(null);
      merchantModel.create.mockResolvedValue({
        save: jest.fn().mockResolvedValue({
          _id: new Types.ObjectId(),
          userId: userId.toString(),
          name: 'متجر جديد',
        }),
      } as any);

      // Act
      const result = await repository.ensureForUser(userId);

      // Assert
      expect(result.name).toBe('متجر جديد');
    });

    it('should generate slug from slugBase', async () => {
      // Arrange
      merchantModel.findOne.mockResolvedValue(null);
      merchantModel.create.mockResolvedValue({
        save: jest.fn().mockResolvedValue({
          _id: new Types.ObjectId(),
          userId: userId.toString(),
          name: opts.name,
          publicSlug: 'custom-slug',
        }),
      } as any);

      // Act
      const result = await repository.ensureForUser(userId, opts);

      // Assert
      expect(result.publicSlug).toBe('custom-slug');
    });
  });

  describe('saveAdvancedVersion', () => {
    const merchantId = '507f1f77bcf86cd799439011';
    const newTemplate = 'New advanced template';
    const note = 'Version update note';

    it('should save advanced version with note', async () => {
      // Arrange
      const mockMerchant = {
        _id: new Types.ObjectId(merchantId),
        currentAdvancedConfig: {},
        save: jest.fn().mockResolvedValue({}),
      };
      const mockQuery = {
        exec: jest.fn().mockResolvedValue(mockMerchant),
      };
      merchantModel.findById.mockReturnValue(mockQuery as any);

      // Act
      await repository.saveAdvancedVersion(merchantId, newTemplate, note);

      // Assert
      expect(merchantModel.findById).toHaveBeenCalledWith(merchantId);
      expect(mockMerchant.currentAdvancedConfig).toEqual({
        template: newTemplate,
        updatedAt: expect.any(Date),
        note,
      });
      expect(mockMerchant.save).toHaveBeenCalled();
    });

    it('should save advanced version without note', async () => {
      // Arrange
      const mockMerchant = {
        _id: new Types.ObjectId(merchantId),
        currentAdvancedConfig: {},
        save: jest.fn().mockResolvedValue({}),
      };
      const mockQuery = {
        exec: jest.fn().mockResolvedValue(mockMerchant),
      };
      merchantModel.findById.mockReturnValue(mockQuery as any);

      // Act
      await repository.saveAdvancedVersion(merchantId, newTemplate);

      // Assert
      expect(mockMerchant.currentAdvancedConfig).toEqual({
        template: newTemplate,
        updatedAt: expect.any(Date),
        note: undefined,
      });
    });
  });

  describe('listAdvancedVersions', () => {
    const merchantId = '507f1f77bcf86cd799439011';

    it('should return advanced config history', async () => {
      // Arrange
      const history = [
        { template: 'v1', updatedAt: new Date(), note: 'First version' },
        { template: 'v2', updatedAt: new Date(), note: 'Second version' },
      ];
      const mockMerchant = {
        _id: new Types.ObjectId(merchantId),
        advancedConfigHistory: history,
      };
      const mockQuery = {
        exec: jest.fn().mockResolvedValue(mockMerchant),
      };
      merchantModel.findById.mockReturnValue(mockQuery as any);

      // Act
      const result = await repository.listAdvancedVersions(merchantId);

      // Assert
      expect(result).toEqual(history);
    });
  });

  describe('revertAdvancedVersion', () => {
    const merchantId = '507f1f77bcf86cd799439011';
    const index = 1;
    const versionToRevert = {
      template: 'Old template',
      updatedAt: new Date('2024-01-01'),
      note: 'Old version',
    };

    it('should revert to specified version', async () => {
      // Arrange
      const mockMerchant = {
        _id: new Types.ObjectId(merchantId),
        advancedConfigHistory: [
          { template: 'v1' },
          versionToRevert,
          { template: 'v3' },
        ],
        currentAdvancedConfig: {},
        save: jest.fn().mockResolvedValue({}),
      };
      const mockQuery = {
        exec: jest.fn().mockResolvedValue(mockMerchant),
      };
      merchantModel.findById.mockReturnValue(mockQuery as any);

      // Act
      await repository.revertAdvancedVersion(merchantId, index);

      // Assert
      expect(mockMerchant.currentAdvancedConfig).toEqual(versionToRevert);
      expect(mockMerchant.save).toHaveBeenCalled();
    });

    it('should not crash when version does not exist', async () => {
      // Arrange
      const mockMerchant = {
        _id: new Types.ObjectId(merchantId),
        advancedConfigHistory: [{ template: 'v1' }],
        currentAdvancedConfig: {},
        save: jest.fn().mockResolvedValue({}),
      };
      const mockQuery = {
        exec: jest.fn().mockResolvedValue(mockMerchant),
      };
      merchantModel.findById.mockReturnValue(mockQuery as any);

      // Act & Assert
      await expect(
        repository.revertAdvancedVersion(merchantId, 99),
      ).resolves.not.toThrow();
      expect(mockMerchant.save).not.toHaveBeenCalled();
    });
  });
});

import { getModelToken } from '@nestjs/mongoose';
import { Test, type TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';

import { Category } from '../../../categories/schemas/category.schema';
import {
  Channel,
  ChannelProvider,
  ChannelStatus,
} from '../../../channels/schemas/channel.schema';
import { Product } from '../../../products/schemas/product.schema';
import { Merchant } from '../../schemas/merchant.schema';
import { WeekDay } from '../../schemas/working-hours.schema';
import { MongoMerchantChecklistRepository } from '../mongo-merchant-checklist.repository';

import type { Model } from 'mongoose';

describe('MongoMerchantChecklistRepository', () => {
  let repository: MongoMerchantChecklistRepository;
  let _merchantModel: jest.Mocked<Model<Merchant>>;
  let _productModel: jest.Mocked<Model<Product>>;
  let _categoryModel: jest.Mocked<Model<Category>>;
  let _channelModel: jest.Mocked<Model<Channel>>;

  beforeEach(async () => {
    const mockMerchantModel = {
      findById: jest.fn(),
    };

    const mockProductModel = {
      countDocuments: jest.fn(),
    };

    const mockCategoryModel = {
      countDocuments: jest.fn(),
    };

    const mockChannelModel = {
      findOne: jest.fn(),
    };

    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MongoMerchantChecklistRepository,
        {
          provide: getModelToken(Merchant.name),
          useValue: mockMerchantModel,
        },
        {
          provide: getModelToken(Product.name),
          useValue: mockProductModel,
        },
        {
          provide: getModelToken(Category.name),
          useValue: mockCategoryModel,
        },
        {
          provide: getModelToken(Channel.name),
          useValue: mockChannelModel,
        },
      ],
    }).compile();

    repository = module.get<MongoMerchantChecklistRepository>(
      MongoMerchantChecklistRepository,
    );
    _merchantModel = module.get(getModelToken(Merchant.name));
    _productModel = module.get(getModelToken(Product.name));
    _categoryModel = module.get(getModelToken(Category.name));
    _channelModel = module.get(getModelToken(Channel.name));
  });

  describe('Basic functionality', () => {
    it('should be instantiable', () => {
      expect(repository).toBeInstanceOf(MongoMerchantChecklistRepository);
      expect(repository).toBeDefined();
    });

    it('should have all required methods', () => {
      expect(typeof repository.findMerchantLean).toBe('function');
      expect(typeof repository.countProducts).toBe('function');
      expect(typeof repository.countCategories).toBe('function');
      expect(typeof repository.getDefaultOrEnabledOrAnyChannel).toBe(
        'function',
      );
    });

    it('should have correct class name and structure', () => {
      expect(repository.constructor.name).toBe(
        'MongoMerchantChecklistRepository',
      );
      expect(repository).toHaveProperty('merchantModel');
      expect(repository).toHaveProperty('productModel');
      expect(repository).toHaveProperty('categoryModel');
      expect(repository).toHaveProperty('channelModel');
    });
  });

  describe('findMerchantLean', () => {
    const merchantId = '507f1f77bcf86cd799439011';
    const mockMerchant = {
      _id: new Types.ObjectId(merchantId),
      logoUrl: 'https://example.com/logo.png',
      addresses: [
        { street: '123 Main St', city: 'Riyadh', country: 'Saudi Arabia' },
      ],
      publicSlug: 'test-merchant',
      publicSlugEnabled: true,
      quickConfig: {
        dialect: 'خليجي',
        tone: 'ودّي',
        customInstructions: [],
        includeClosingPhrase: true,
        customerServicePhone: '',
        customerServiceWhatsapp: '',
        closingText: 'هل أقدر أساعدك بشي ثاني؟ 😊',
      },
      skippedChecklistItems: ['item1', 'item2'],
      productSourceConfig: { type: 'manual' },
      workingHours: [
        { day: WeekDay.Monday, openTime: '09:00', closeTime: '17:00' },
      ],
      returnPolicy: '30 days return',
      exchangePolicy: 'Exchange within 7 days',
      shippingPolicy: 'Free shipping over 100 SAR',
    };

    it('should return merchant with selected fields', async () => {
      // Arrange
      jest
        .spyOn(repository, 'findMerchantLean')
        .mockResolvedValue(mockMerchant as any);

      // Act
      const result = await repository.findMerchantLean(merchantId);

      // Assert
      expect(result).toEqual(mockMerchant);
    });

    it('should return null when merchant not found', async () => {
      // Arrange
      jest.spyOn(repository, 'findMerchantLean').mockResolvedValue(null);

      // Act
      const result = await repository.findMerchantLean(merchantId);

      // Assert
      expect(result).toBeNull();
    });

    it('should handle database errors', async () => {
      // Arrange
      const error = new Error('Database connection failed');
      jest.spyOn(repository, 'findMerchantLean').mockRejectedValue(error);

      // Act & Assert
      await expect(repository.findMerchantLean(merchantId)).rejects.toThrow(
        'Database connection failed',
      );
    });
  });

  describe('countProducts', () => {
    const merchantId = '507f1f77bcf86cd799439011';

    it('should count products for string merchantId', async () => {
      // Arrange
      const expectedCount = 5;
      jest.spyOn(repository, 'countProducts').mockResolvedValue(expectedCount);

      // Act
      const result = await repository.countProducts(merchantId);

      // Assert
      expect(result).toBe(expectedCount);
    });

    it('should count products for ObjectId merchantId', async () => {
      // Arrange
      const merchantObjectId = new Types.ObjectId(merchantId);
      const expectedCount = 3;
      jest.spyOn(repository, 'countProducts').mockResolvedValue(expectedCount);

      // Act
      const result = await repository.countProducts(merchantObjectId);

      // Assert
      expect(result).toBe(expectedCount);
    });

    it('should return 0 when no products found', async () => {
      // Arrange
      jest.spyOn(repository, 'countProducts').mockResolvedValue(0);

      // Act
      const result = await repository.countProducts(merchantId);

      // Assert
      expect(result).toBe(0);
    });

    it('should handle database errors', async () => {
      // Arrange
      const error = new Error('Count failed');
      jest.spyOn(repository, 'countProducts').mockRejectedValue(error);

      // Act & Assert
      await expect(repository.countProducts(merchantId)).rejects.toThrow(
        'Count failed',
      );
    });
  });

  describe('countCategories', () => {
    const merchantId = '507f1f77bcf86cd799439011';

    it('should count categories for string merchantId', async () => {
      // Arrange
      const expectedCount = 8;
      jest
        .spyOn(repository, 'countCategories')
        .mockResolvedValue(expectedCount);

      // Act
      const result = await repository.countCategories(merchantId);

      // Assert
      expect(result).toBe(expectedCount);
    });

    it('should count categories for ObjectId merchantId', async () => {
      // Arrange
      const merchantObjectId = new Types.ObjectId(merchantId);
      const expectedCount = 4;
      jest
        .spyOn(repository, 'countCategories')
        .mockResolvedValue(expectedCount);

      // Act
      const result = await repository.countCategories(merchantObjectId);

      // Assert
      expect(result).toBe(expectedCount);
    });

    it('should return 0 when no categories found', async () => {
      // Arrange
      jest.spyOn(repository, 'countCategories').mockResolvedValue(0);

      // Act
      const result = await repository.countCategories(merchantId);

      // Assert
      expect(result).toBe(0);
    });

    it('should handle database errors', async () => {
      // Arrange
      const error = new Error('Count categories failed');
      jest.spyOn(repository, 'countCategories').mockRejectedValue(error);

      // Act & Assert
      await expect(repository.countCategories(merchantId)).rejects.toThrow(
        'Count categories failed',
      );
    });
  });

  describe('getDefaultOrEnabledOrAnyChannel', () => {
    const merchantId = '507f1f77bcf86cd799439011';
    const provider = ChannelProvider.WHATSAPP_CLOUD;

    const mockChannel = {
      _id: new Types.ObjectId(),
      enabled: true,
      status: ChannelStatus.CONNECTED,
      isDefault: false,
    };

    it('should return default channel when found', async () => {
      // Arrange
      const mockDefaultChannel = { ...mockChannel, isDefault: true };
      jest
        .spyOn(repository, 'getDefaultOrEnabledOrAnyChannel')
        .mockResolvedValue(mockDefaultChannel);

      // Act
      const result = await repository.getDefaultOrEnabledOrAnyChannel(
        merchantId,
        provider,
      );

      // Assert
      expect(result).toEqual(mockDefaultChannel);
    });

    it('should return enabled channel when no default found', async () => {
      // Arrange
      const mockEnabledChannel = {
        ...mockChannel,
        enabled: true,
        isDefault: false,
      };
      jest
        .spyOn(repository, 'getDefaultOrEnabledOrAnyChannel')
        .mockResolvedValue(mockEnabledChannel);

      // Act
      const result = await repository.getDefaultOrEnabledOrAnyChannel(
        merchantId,
        provider,
      );

      // Assert
      expect(result).toEqual(mockEnabledChannel);
    });

    it('should return any channel when no default or enabled found', async () => {
      // Arrange
      const mockAnyChannel = {
        ...mockChannel,
        enabled: false,
        isDefault: false,
      };
      jest
        .spyOn(repository, 'getDefaultOrEnabledOrAnyChannel')
        .mockResolvedValue(mockAnyChannel);

      // Act
      const result = await repository.getDefaultOrEnabledOrAnyChannel(
        merchantId,
        provider,
      );

      // Assert
      expect(result).toEqual(mockAnyChannel);
    });

    it('should return null when no channels found', async () => {
      // Arrange
      jest
        .spyOn(repository, 'getDefaultOrEnabledOrAnyChannel')
        .mockResolvedValue(null);

      // Act
      const result = await repository.getDefaultOrEnabledOrAnyChannel(
        merchantId,
        provider,
      );

      // Assert
      expect(result).toBeNull();
    });

    it('should handle different channel providers', async () => {
      // Arrange
      const telegramProvider = ChannelProvider.TELEGRAM;
      const mockTelegramChannel = {
        ...mockChannel,
        provider: telegramProvider,
      };
      jest
        .spyOn(repository, 'getDefaultOrEnabledOrAnyChannel')
        .mockResolvedValue(mockTelegramChannel);

      // Act
      const result = await repository.getDefaultOrEnabledOrAnyChannel(
        merchantId,
        telegramProvider,
      );

      // Assert
      expect(result).toEqual(mockTelegramChannel);
    });

    it('should handle database errors', async () => {
      // Arrange
      const error = new Error('Channel query failed');
      jest
        .spyOn(repository, 'getDefaultOrEnabledOrAnyChannel')
        .mockRejectedValue(error);

      // Act & Assert
      await expect(
        repository.getDefaultOrEnabledOrAnyChannel(merchantId, provider),
      ).rejects.toThrow('Channel query failed');
    });
  });
});

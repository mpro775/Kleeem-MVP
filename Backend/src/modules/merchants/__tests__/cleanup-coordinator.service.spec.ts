import { Test, TestingModule } from '@nestjs/testing';
import { CleanupCoordinatorService } from '../cleanup-coordinator.service';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';

describe('CleanupCoordinatorService', () => {
  let service: CleanupCoordinatorService;
  let merchantModel: jest.Mocked<Model<any>>;
  let productModel: jest.Mocked<Model<any>>;
  let categoryModel: jest.Mocked<Model<any>>;
  let userModel: jest.Mocked<Model<any>>;
  let channelModel: jest.Mocked<Model<any>>;
  let chatWidgetModel: jest.Mocked<Model<any>>;
  let storefrontModel: jest.Mocked<Model<any>>;

  beforeEach(async () => {
    const mockModel = {
      deleteMany: jest.fn(),
      find: jest.fn(),
      countDocuments: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CleanupCoordinatorService,
        { provide: getModelToken('Merchant'), useValue: mockModel },
        { provide: getModelToken('Product'), useValue: mockModel },
        { provide: getModelToken('Category'), useValue: mockModel },
        { provide: getModelToken('User'), useValue: mockModel },
        { provide: getModelToken('Channel'), useValue: mockModel },
        { provide: getModelToken('ChatWidgetSettings'), useValue: mockModel },
        { provide: getModelToken('Storefront'), useValue: mockModel },
      ],
    }).compile();

    service = module.get<CleanupCoordinatorService>(CleanupCoordinatorService);
    merchantModel = module.get(getModelToken('Merchant'));
    productModel = module.get(getModelToken('Product'));
    categoryModel = module.get(getModelToken('Category'));
    userModel = module.get(getModelToken('User'));
    channelModel = module.get(getModelToken('Channel'));
    chatWidgetModel = module.get(getModelToken('ChatWidgetSettings'));
    storefrontModel = module.get(getModelToken('Storefront'));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('cleanupMerchantData', () => {
    const merchantId = '64a00000000000000000001';

    it('should cleanup all merchant-related data', async () => {
      // Mock successful deletions
      productModel.deleteMany.mockResolvedValue({ deletedCount: 5 } as any);
      categoryModel.deleteMany.mockResolvedValue({ deletedCount: 3 } as any);
      userModel.deleteMany.mockResolvedValue({ deletedCount: 2 } as any);
      channelModel.deleteMany.mockResolvedValue({ deletedCount: 1 } as any);
      chatWidgetModel.deleteMany.mockResolvedValue({ deletedCount: 1 } as any);
      storefrontModel.deleteMany.mockResolvedValue({ deletedCount: 1 } as any);
      merchantModel.deleteMany.mockResolvedValue({ deletedCount: 1 } as any);

      const result = await service.cleanupMerchantData(merchantId);

      expect(productModel.deleteMany).toHaveBeenCalledWith({ merchantId });
      expect(categoryModel.deleteMany).toHaveBeenCalledWith({ merchantId });
      expect(userModel.deleteMany).toHaveBeenCalledWith({ merchantId });
      expect(channelModel.deleteMany).toHaveBeenCalledWith({ merchantId });
      expect(chatWidgetModel.deleteMany).toHaveBeenCalledWith({ merchantId });
      expect(storefrontModel.deleteMany).toHaveBeenCalledWith({ merchantId });
      expect(merchantModel.deleteMany).toHaveBeenCalledWith({
        _id: merchantId,
      });

      expect(result).toEqual({
        success: true,
        deletedCounts: {
          products: 5,
          categories: 3,
          users: 2,
          channels: 1,
          chatWidgetSettings: 1,
          storefronts: 1,
          merchants: 1,
        },
      });
    });

    it('should handle errors during cleanup', async () => {
      const error = new Error('Database error');
      productModel.deleteMany.mockRejectedValue(error);

      const result = await service.cleanupMerchantData(merchantId);

      expect(result).toEqual({
        success: false,
        error: 'Database error',
      });
    });
  });

  describe('validateMerchantExists', () => {
    it('should return true if merchant exists', async () => {
      merchantModel.countDocuments.mockResolvedValue(1);

      const result = await service.validateMerchantExists(
        '64a00000000000000000001',
      );

      expect(merchantModel.countDocuments).toHaveBeenCalledWith({
        _id: '64a00000000000000000001',
      });
      expect(result).toBe(true);
    });

    it('should return false if merchant does not exist', async () => {
      merchantModel.countDocuments.mockResolvedValue(0);

      const result = await service.validateMerchantExists(
        '64a00000000000000000001',
      );

      expect(result).toBe(false);
    });
  });

  describe('getMerchantDataSummary', () => {
    it('should return data summary for merchant', async () => {
      const merchantId = '64a00000000000000000001';

      productModel.countDocuments.mockResolvedValue(10);
      categoryModel.countDocuments.mockResolvedValue(5);
      userModel.countDocuments.mockResolvedValue(3);
      channelModel.countDocuments.mockResolvedValue(2);
      chatWidgetModel.countDocuments.mockResolvedValue(1);
      storefrontModel.countDocuments.mockResolvedValue(1);

      const result = await service.getMerchantDataSummary(merchantId);

      expect(result).toEqual({
        merchantId,
        counts: {
          products: 10,
          categories: 5,
          users: 3,
          channels: 2,
          chatWidgetSettings: 1,
          storefronts: 1,
        },
      });
    });
  });
});

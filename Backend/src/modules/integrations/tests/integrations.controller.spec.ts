import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { IntegrationsController } from '../integrations.controller';
import { Integration } from '../schemas/integration.schema';
import { Merchant } from '../../merchants/schemas/merchant.schema';

describe('IntegrationsController', () => {
  let controller: IntegrationsController;
  let integrationModel: any;
  let merchantModel: any;

  const mockIntegrationModel = {
    findOne: jest.fn(),
  };

  const mockMerchantModel = {
    findById: jest.fn(),
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [IntegrationsController],
      providers: [
        {
          provide: getModelToken(Integration.name),
          useValue: mockIntegrationModel,
        },
        {
          provide: getModelToken(Merchant.name),
          useValue: mockMerchantModel,
        },
      ],
    }).compile();

    controller = module.get<IntegrationsController>(IntegrationsController);
    integrationModel = module.get(getModelToken(Integration.name));
    merchantModel = module.get(getModelToken(Merchant.name));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('status', () => {
    const mockMerchantId = new Types.ObjectId();
    const mockUserId = 'user123';

    it('should return internal product source with skipped flag when merchant uses internal products', async () => {
      // Arrange
      const req = {
        user: { userId: mockUserId, merchantId: mockMerchantId.toString() },
      };

      const mockMerchant = {
        _id: mockMerchantId,
        userId: mockUserId,
        productSource: 'internal',
      };

      merchantModel.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockMerchant),
      });

      // Act
      const result = await controller.status(req);

      // Assert
      expect(result).toEqual({
        productSource: 'internal',
        skipped: true,
      });
      expect(integrationModel.findOne).not.toHaveBeenCalled();
    });

    it('should return salla and zid status when merchant uses external products', async () => {
      // Arrange
      const req = {
        user: { userId: mockUserId, merchantId: mockMerchantId.toString() },
      };

      const now = new Date();
      const futureDate = new Date(now.getTime() + 60 * 60 * 1000); // +1 hour
      const pastDate = new Date(now.getTime() - 60 * 60 * 1000); // -1 hour

      const mockMerchant = {
        _id: mockMerchantId,
        userId: mockUserId,
        productSource: 'salla',
        productSourceConfig: {
          salla: {
            active: true,
            lastSync: pastDate,
          },
          zid: {
            active: false,
            lastSync: null,
          },
        },
      };

      const mockSallaIntegration = {
        _id: new Types.ObjectId(),
        merchantId: mockMerchantId,
        provider: 'salla',
        accessToken: 'valid_token',
        expiresAt: futureDate,
        lastSync: pastDate,
      };

      const mockZidIntegration = {
        _id: new Types.ObjectId(),
        merchantId: mockMerchantId,
        provider: 'zid',
        accessToken: 'expired_token',
        expiresAt: new Date(now.getTime() - 30 * 60 * 1000), // expired 30 min ago
        lastSync: null,
      };

      merchantModel.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockMerchant),
      });

      integrationModel.findOne
        .mockReturnValueOnce({
          lean: jest.fn().mockResolvedValue(mockSallaIntegration),
        })
        .mockReturnValueOnce({
          lean: jest.fn().mockResolvedValue(mockZidIntegration),
        });

      // Act
      const result = await controller.status(req);

      // Assert
      expect(result).toEqual({
        productSource: 'salla',
        salla: {
          active: true,
          connected: true, // valid token and not expired
          lastSync: pastDate.toISOString(),
        },
        zid: {
          active: false,
          connected: false, // expired token
          lastSync: null,
        },
      });
    });

    it('should handle merchant found by userId when merchantId is not provided', async () => {
      // Arrange
      const req = {
        user: { userId: mockUserId },
      };

      const mockMerchant = {
        _id: mockMerchantId,
        userId: mockUserId,
        productSource: 'internal',
      };

      merchantModel.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockMerchant),
      });

      // Act
      const result = await controller.status(req);

      // Assert
      expect(merchantModel.findOne).toHaveBeenCalledWith({
        userId: mockUserId,
      });
      expect(result.productSource).toBe('internal');
    });

    it('should handle missing integrations gracefully', async () => {
      // Arrange
      const req = {
        user: { userId: mockUserId, merchantId: mockMerchantId.toString() },
      };

      const mockMerchant = {
        _id: mockMerchantId,
        userId: mockUserId,
        productSource: 'zid',
        productSourceConfig: {
          salla: { active: false },
          zid: { active: true },
        },
      };

      merchantModel.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockMerchant),
      });

      // No integrations found
      integrationModel.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });

      // Act
      const result = await controller.status(req);

      // Assert
      expect(result).toEqual({
        productSource: 'zid',
        salla: {
          active: false,
          connected: false,
          lastSync: null,
        },
        zid: {
          active: true,
          connected: false,
          lastSync: null,
        },
      });
    });

    it('should throw NotFoundException when merchant is not found', async () => {
      // Arrange
      const req = {
        user: { userId: mockUserId, merchantId: mockMerchantId.toString() },
      };

      merchantModel.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });

      // Act & Assert
      await expect(controller.status(req)).rejects.toThrow(NotFoundException);
      await expect(controller.status(req)).rejects.toThrow(
        'Merchant not found',
      );
    });

    it('should handle integrations without expiration dates', async () => {
      // Arrange
      const req = {
        user: { userId: mockUserId, merchantId: mockMerchantId.toString() },
      };

      const mockMerchant = {
        _id: mockMerchantId,
        userId: mockUserId,
        productSource: 'salla',
        productSourceConfig: {
          salla: { active: true },
          zid: { active: false },
        },
      };

      const mockSallaIntegration = {
        _id: new Types.ObjectId(),
        merchantId: mockMerchantId,
        provider: 'salla',
        accessToken: 'valid_token',
        // No expiresAt property
      };

      merchantModel.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockMerchant),
      });

      integrationModel.findOne
        .mockReturnValueOnce({
          lean: jest.fn().mockResolvedValue(mockSallaIntegration),
        })
        .mockReturnValueOnce({
          lean: jest.fn().mockResolvedValue(null),
        });

      // Act
      const result = await controller.status(req);

      // Assert
      expect((result as any).salla.connected).toBe(true); // Should be connected when no expiration
    });

    it('should handle default productSource when not specified', async () => {
      // Arrange
      const req = {
        user: { userId: mockUserId, merchantId: mockMerchantId.toString() },
      };

      const mockMerchant = {
        _id: mockMerchantId,
        userId: mockUserId,
        // No productSource property - should default to 'internal'
      };

      merchantModel.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockMerchant),
      });

      // Act
      const result = await controller.status(req);

      // Assert
      expect(result).toEqual({
        productSource: 'internal',
        skipped: true,
      });
    });
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});

import { Test, type TestingModule } from '@nestjs/testing';

import { MerchantsController } from '../merchants.controller';
import { MerchantsService } from '../merchants.service';

describe('MerchantsController - Basic Tests', () => {
  let controller: MerchantsController;
  let merchantsService: jest.Mocked<MerchantsService>;

  const mockMerchant = {
    _id: '64a00000000000000000001',
    name: 'Test Merchant',
    email: 'test@merchant.com',
    slug: 'test-merchant',
    status: 'active',
  };

  beforeEach(async () => {
    const mockMerchantsService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MerchantsController],
      providers: [
        { provide: MerchantsService, useValue: mockMerchantsService },
      ],
    }).compile();

    controller = module.get<MerchantsController>(MerchantsController);
    merchantsService = module.get(MerchantsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a merchant', async () => {
      merchantsService.create.mockResolvedValue(mockMerchant as any);

      const result = await controller.create({
        name: 'New Merchant',
        email: 'new@merchant.com',
        subscription: {
          tier: 'free' as any,
          startDate: '2025-01-01T00:00:00.000Z',
          features: ['Basic features'],
        },
        userId: 'user1',
      } as any);

      expect(merchantsService.create.bind(merchantsService)).toHaveBeenCalled();
      expect(result).toEqual(mockMerchant);
    });
  });

  describe('findAll', () => {
    it('should return all merchants', async () => {
      const merchants = [mockMerchant];
      merchantsService.findAll.mockResolvedValue(merchants as any);

      const result = await controller.findAll();

      expect(
        merchantsService.findAll.bind(merchantsService),
      ).toHaveBeenCalled();
      expect(result).toEqual(merchants);
    });
  });

  describe('findOne', () => {
    it('should return a merchant by id', async () => {
      merchantsService.findOne.mockResolvedValue(mockMerchant as any);

      const result = await controller.findOne('64a00000000000000000001');

      expect(
        merchantsService.findOne.bind(merchantsService),
      ).toHaveBeenCalledWith('64a00000000000000000001');
      expect(result).toEqual(mockMerchant);
    });
  });

  describe('update', () => {
    it('should update a merchant', async () => {
      const updatedMerchant = { ...mockMerchant, name: 'Updated Merchant' };
      merchantsService.update.mockResolvedValue(updatedMerchant as any);

      const result = await controller.update(
        '64a00000000000000000001',
        { name: 'Updated Merchant' } as any,
        null as any,
        { role: 'ADMIN' } as any,
      );

      expect(
        merchantsService.update.bind(merchantsService),
      ).toHaveBeenCalledWith('64a00000000000000000001', {
        name: 'Updated Merchant',
      });
      expect(result).toEqual(updatedMerchant);
    });
  });
});

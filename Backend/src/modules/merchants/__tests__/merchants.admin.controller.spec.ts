import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Types } from 'mongoose';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';

import { QueryAdminMerchantsDto } from '../dto/query-admin-merchants.dto';
import { MerchantsAdminController } from '../merchants.admin.controller';
import { MerchantsService } from '../merchants.service';

import type { UpdateMerchantAdminDto } from '../dto/update-merchant-admin.dto';

describe('MerchantsAdminController', () => {
  let controller: MerchantsAdminController;
  let service: jest.Mocked<MerchantsService>;

  const mockMerchantLean = {
    _id: new Types.ObjectId(),
    name: 'متجر تجريبي',
    userId: new Types.ObjectId(),
    status: 'active',
    active: true,
    deletedAt: null,
    publicSlug: 'test-store',
    subscription: { tier: 'free', endDate: new Date() },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockMerchantDoc = {
    _id: mockMerchantLean._id,
    name: mockMerchantLean.name,
    userId: mockMerchantLean.userId,
    status: 'active',
    active: true,
    findOne: jest.fn(),
    save: jest.fn(),
  } as any;

  const mockStats = {
    total: 25,
    activeCount: 20,
    inactiveCount: 5,
    byStatus: { active: 18, inactive: 4, suspended: 3 },
  };

  const mockService = {
    listAllAdmin: jest.fn(),
    getStatsAdmin: jest.fn(),
    findOne: jest.fn(),
    updateAdmin: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module = await Test.createTestingModule({
      controllers: [MerchantsAdminController],
      providers: [
        {
          provide: MerchantsService,
          useValue: mockService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<MerchantsAdminController>(MerchantsAdminController);
    service = module.get(MerchantsService);
  });

  describe('GET admin/merchants (list)', () => {
    it('should return paginated merchants with default query', async () => {
      const query = new QueryAdminMerchantsDto();
      query.limit = 30;
      query.page = 1;
      const expected = { items: [mockMerchantLean], total: 1 };
      mockService.listAllAdmin.mockResolvedValue(expected);

      const result = await controller.list(query);

      expect(service.listAllAdmin).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 30, page: 1 }),
      );
      expect(result).toEqual(expected);
    });

    it('should pass status, active, includeDeleted filters', async () => {
      const query = new QueryAdminMerchantsDto();
      query.status = 'active';
      query.active = true;
      query.includeDeleted = true;
      query.limit = 20;
      query.page = 2;
      mockService.listAllAdmin.mockResolvedValue({ items: [], total: 0 });

      await controller.list(query);

      expect(service.listAllAdmin).toHaveBeenCalledWith({
        limit: 20,
        page: 2,
        status: 'active',
        active: true,
        includeDeleted: true,
      });
    });
  });

  describe('GET admin/merchants/stats', () => {
    it('should return stats from service', async () => {
      mockService.getStatsAdmin.mockResolvedValue(mockStats);

      const result = await controller.getStats();

      expect(service.getStatsAdmin).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockStats);
    });
  });

  describe('GET admin/merchants/:id (getOne)', () => {
    it('should return merchant when found', async () => {
      mockService.findOne.mockResolvedValue(mockMerchantDoc);

      const result = await controller.getOne(mockMerchantLean._id.toString());

      expect(service.findOne).toHaveBeenCalledWith(
        mockMerchantLean._id.toString(),
      );
      expect(result).toEqual(mockMerchantDoc);
    });

    it('should throw BadRequestException when id is invalid', async () => {
      await expect(controller.getOne('invalid-id')).rejects.toThrow(
        'معرف التاجر غير صالح',
      );
      expect(service.findOne).not.toHaveBeenCalled();
    });

    it('should throw when merchant not found', async () => {
      mockService.findOne.mockRejectedValue(
        new NotFoundException('Merchant not found'),
      );

      await expect(
        controller.getOne('507f1f77bcf86cd799439011'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('PATCH admin/merchants/:id', () => {
    it('should update and return merchant', async () => {
      const dto: UpdateMerchantAdminDto = {
        active: false,
        status: 'suspended',
      };
      mockService.updateAdmin.mockResolvedValue({
        ...mockMerchantDoc,
        ...dto,
      });

      const result = await controller.update(
        mockMerchantLean._id.toString(),
        dto,
      );

      expect(service.updateAdmin).toHaveBeenCalledWith(
        mockMerchantLean._id.toString(),
        dto,
      );
      expect(result.active).toBe(false);
      expect(result.status).toBe('suspended');
    });

    it('should throw BadRequestException when id is invalid', async () => {
      await expect(
        controller.update('invalid', { active: true }),
      ).rejects.toThrow(BadRequestException);
      expect(service.updateAdmin).not.toHaveBeenCalled();
    });
  });
});

import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Types } from 'mongoose';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';

import { MerchantAuditService } from '../../merchants/services/merchant-audit.service';
import { QueryAdminUsageDto } from '../dto/query-admin-usage.dto';
import { UsageAdminController } from '../usage.admin.controller';
import { UsageService } from '../usage.service';

describe('UsageAdminController', () => {
  let controller: UsageAdminController;
  let service: jest.Mocked<UsageService>;

  const merchantId = new Types.ObjectId();
  const mockUsageItem = {
    merchantId,
    monthKey: '2025-02',
    messagesUsed: 150,
  };

  const mockStats = {
    monthKey: '2025-02',
    totalMessagesUsed: 5000,
    merchantCount: 42,
  };

  const mockService = {
    listAllAdminWithLimits: jest.fn(),
    getStatsAdmin: jest.fn(),
    getUsage: jest.fn(),
    getAlertsAdmin: jest.fn(),
    getReportAdmin: jest.fn(),
    resetUsage: jest.fn(),
    monthKeyFrom: jest.fn(() => '2025-02'),
  };

  const mockAuditService = {
    log: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockService.monthKeyFrom.mockReturnValue('2025-02');

    const module = await Test.createTestingModule({
      controllers: [UsageAdminController],
      providers: [
        { provide: UsageService, useValue: mockService },
        { provide: MerchantAuditService, useValue: mockAuditService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<UsageAdminController>(UsageAdminController);
    service = module.get(UsageService);
  });

  describe('GET admin/usage (list)', () => {
    it('should return paginated usage list with limits', async () => {
      const query = new QueryAdminUsageDto();
      query.limit = 30;
      query.page = 1;
      const expected = {
        items: [
          {
            ...mockUsageItem,
            messageLimit: 1000,
            usagePercent: 15,
            isUnlimited: false,
          },
        ],
        total: 1,
      };
      mockService.listAllAdminWithLimits.mockResolvedValue(expected);

      const result = await controller.list(query);

      expect(service.listAllAdminWithLimits).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 30, page: 1 }),
      );
      expect(result).toEqual(expected);
    });

    it('should pass monthKey filter', async () => {
      const query = new QueryAdminUsageDto();
      query.monthKey = '2025-01';
      query.limit = 20;
      query.page = 2;
      mockService.listAllAdminWithLimits.mockResolvedValue({
        items: [],
        total: 0,
      });

      await controller.list(query);

      expect(service.listAllAdminWithLimits).toHaveBeenCalledWith(
        expect.objectContaining({
          monthKey: '2025-01',
          limit: 20,
          page: 2,
        }),
      );
    });
  });

  describe('GET admin/usage/stats', () => {
    it('should return stats from service', async () => {
      mockService.getStatsAdmin.mockResolvedValue(mockStats);

      const result = await controller.getStats();

      expect(service.getStatsAdmin).toHaveBeenCalledWith(undefined);
      expect(result).toEqual(mockStats);
    });

    it('should pass monthKey when provided', async () => {
      mockService.getStatsAdmin.mockResolvedValue({
        ...mockStats,
        monthKey: '2025-01',
      });

      await controller.getStats('2025-01');

      expect(service.getStatsAdmin).toHaveBeenCalledWith('2025-01');
    });
  });

  describe('GET admin/usage/:merchantId', () => {
    it('should return usage when found', async () => {
      mockService.getUsage.mockResolvedValue(mockUsageItem);

      const result = await controller.getUsage(
        merchantId.toString(),
        '2025-02',
      );

      expect(service.getUsage).toHaveBeenCalledWith(
        merchantId.toString(),
        '2025-02',
      );
      expect(result).toEqual(mockUsageItem);
    });

    it('should throw BadRequestException when merchantId is invalid', async () => {
      await expect(controller.getUsage('invalid-id')).rejects.toThrow(
        BadRequestException,
      );
      await expect(controller.getUsage('invalid-id')).rejects.toThrow(
        'معرف التاجر غير صالح',
      );
      expect(service.getUsage).not.toHaveBeenCalled();
    });

    it('should throw when merchant not found', async () => {
      mockService.getUsage.mockRejectedValue(
        new NotFoundException('Merchant not found'),
      );

      await expect(
        controller.getUsage('507f1f77bcf86cd799439011'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});

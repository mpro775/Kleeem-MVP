import { Test } from '@nestjs/testing';

import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';

import { AdminReportsController } from '../admin-reports.controller';
import { AdminReportsService } from '../admin-reports.service';

describe('AdminReportsController', () => {
  let controller: AdminReportsController;
  let service: jest.Mocked<AdminReportsService>;

  const mockReportsService = {
    getMerchantActivity: jest.fn(),
    getSignupsReport: jest.fn(),
    getKleemSummary: jest.fn(),
    getUsageByPlan: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module = await Test.createTestingModule({
      controllers: [AdminReportsController],
      providers: [
        {
          provide: AdminReportsService,
          useValue: mockReportsService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AdminReportsController>(AdminReportsController);
    service = module.get(AdminReportsService);
  });

  describe('GET admin/reports/merchant-activity/:merchantId', () => {
    it('should return merchant activity from service', async () => {
      const mock = {
        merchantId: '507f1f77bcf86cd799439011',
        merchantName: 'متجر اختبار',
        lastActivity: new Date('2025-02-10'),
        conversationCount: 42,
        channelsTotal: 2,
        channelsEnabled: 1,
        channelsConnected: 1,
      };
      mockReportsService.getMerchantActivity.mockResolvedValue(mock);

      const result = await controller.getMerchantActivity(mock.merchantId);

      expect(service.getMerchantActivity).toHaveBeenCalledWith(mock.merchantId);
      expect(result).toEqual(mock);
    });
  });

  describe('GET admin/reports/signups', () => {
    it('should return signups report from service', async () => {
      const mock = {
        merchants: [{ date: '2025-02-01', count: 5 }],
        users: [{ date: '2025-02-01', count: 12 }],
        summary: { totalMerchants: 5, totalUsers: 12 },
      };
      mockReportsService.getSignupsReport.mockResolvedValue(mock);

      const result = await controller.getSignupsReport('2025-02-01', '2025-02-10');

      expect(service.getSignupsReport).toHaveBeenCalledWith({
        from: '2025-02-01',
        to: '2025-02-10',
      });
      expect(result).toEqual(mock);
    });
  });

  describe('GET admin/reports/kleem-summary', () => {
    it('should return kleem summary from service', async () => {
      const mock = {
        missingOpen: 15,
        missingResolved: 8,
        missingTotal: 23,
      };
      mockReportsService.getKleemSummary.mockResolvedValue(mock);

      const result = await controller.getKleemSummary();

      expect(service.getKleemSummary).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mock);
    });
  });

  describe('GET admin/reports/usage-by-plan', () => {
    it('should return usage by plan from service', async () => {
      const mock = {
        byPlan: [{ planName: 'limit_1000', tier: 'limit_1000', merchantCount: 10, totalMessagesUsed: 5000, avgMessagesPerMerchant: 500 }],
        summary: { totalMerchants: 10, totalMessagesUsed: 5000 },
      };
      mockReportsService.getUsageByPlan.mockResolvedValue(mock);

      const result = await controller.getUsageByPlan('2025-02');

      expect(service.getUsageByPlan).toHaveBeenCalledWith('2025-02');
      expect(result).toEqual(mock);
    });

    it('should call service without monthKey when omitted', async () => {
      mockReportsService.getUsageByPlan.mockResolvedValue({ byPlan: [], summary: { totalMerchants: 0, totalMessagesUsed: 0 } });

      await controller.getUsageByPlan(undefined);

      expect(service.getUsageByPlan).toHaveBeenCalledWith(undefined);
    });
  });
});

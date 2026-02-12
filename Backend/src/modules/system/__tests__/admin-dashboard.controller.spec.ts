import { Test } from '@nestjs/testing';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';

import { AdminDashboardController } from '../admin-dashboard.controller';
import { AdminDashboardService } from '../admin-dashboard.service';

describe('AdminDashboardController', () => {
  let controller: AdminDashboardController;
  let service: jest.Mocked<AdminDashboardService>;

  const mockStats = {
    merchants: {
      total: 100,
      activeCount: 85,
      inactiveCount: 15,
      byStatus: { active: 80, inactive: 12, suspended: 8 },
    },
    users: {
      total: 250,
      activeCount: 230,
      inactiveCount: 20,
      byRole: { ADMIN: 3, MERCHANT: 100, MEMBER: 147 },
    },
    usage: {
      monthKey: '2025-02',
      totalMessagesUsed: 15000,
      merchantCount: 42,
    },
  };

  const mockDashboardService = {
    getStats: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module = await Test.createTestingModule({
      controllers: [AdminDashboardController],
      providers: [
        {
          provide: AdminDashboardService,
          useValue: mockDashboardService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AdminDashboardController>(AdminDashboardController);
    service = module.get(AdminDashboardService);
  });

  describe('GET admin/dashboard', () => {
    it('should return aggregated stats from service', async () => {
      mockDashboardService.getStats.mockResolvedValue(mockStats);

      const result = await controller.getStats();

      expect(service.getStats).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockStats);
      expect(result.merchants.total).toBe(100);
      expect(result.users.total).toBe(250);
      expect(result.usage.monthKey).toBe('2025-02');
      expect(result.usage.totalMessagesUsed).toBe(15000);
    });
  });
});

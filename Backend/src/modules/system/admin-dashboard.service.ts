// src/modules/system/admin-dashboard.service.ts
import { Injectable } from '@nestjs/common';

import { MerchantsService } from '../merchants/merchants.service';
import { UsersService } from '../users/users.service';
import { UsageService } from '../usage/usage.service';

export type DashboardTrendsPeriod = '7d' | '30d';

export interface DashboardTrendsDto {
  period: DashboardTrendsPeriod;
  merchants: { date: string; count: number }[];
  users: { date: string; count: number }[];
  usage: { monthKey: string; totalMessagesUsed: number }[];
}

export interface DashboardStatsDto {
  merchants: {
    total: number;
    activeCount: number;
    inactiveCount: number;
    byStatus: Record<string, number>;
  };
  users: {
    total: number;
    activeCount: number;
    inactiveCount: number;
    byRole: Record<string, number>;
  };
  usage: {
    monthKey: string;
    totalMessagesUsed: number;
    merchantCount: number;
  };
}

@Injectable()
export class AdminDashboardService {
  constructor(
    private readonly merchantsService: MerchantsService,
    private readonly usersService: UsersService,
    private readonly usageService: UsageService,
  ) {}

  async getStats(): Promise<DashboardStatsDto> {
    const [merchants, users, usage] = await Promise.all([
      this.merchantsService.getStatsAdmin(),
      this.usersService.getStatsAdmin(),
      this.usageService.getStatsAdmin(),
    ]);

    return {
      merchants: {
        total: merchants.total,
        activeCount: merchants.activeCount,
        inactiveCount: merchants.inactiveCount,
        byStatus: merchants.byStatus,
      },
      users: {
        total: users.total,
        activeCount: users.activeCount,
        inactiveCount: users.inactiveCount,
        byRole: users.byRole,
      },
      usage: {
        monthKey: usage.monthKey,
        totalMessagesUsed: usage.totalMessagesUsed,
        merchantCount: usage.merchantCount,
      },
    };
  }

  async getTrends(period: DashboardTrendsPeriod): Promise<DashboardTrendsDto> {
    const [merchants, users, usage] = await Promise.all([
      this.merchantsService.getTrendsAdmin(period),
      this.usersService.getTrendsAdmin(period),
      this.usageService.getTrendsAdmin(period),
    ]);

    return {
      period,
      merchants,
      users,
      usage,
    };
  }
}

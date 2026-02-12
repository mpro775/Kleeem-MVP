import { Injectable, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';

import { AnalyticsService } from '../analytics/analytics.service';
import { QueryKleemMissingResponsesDto } from '../analytics/dto/query-kleem-missing-responses.dto';
import { ChannelsService } from '../channels/channels.service';
import { MerchantsService } from '../merchants/merchants.service';
import { MessageService } from '../messaging/message.service';
import { PlansService } from '../plans/plans.service';
import { UsageService } from '../usage/usage.service';
import { UsersService } from '../users/users.service';

const ADMIN_USAGE_MAX_LIMIT = 5000;

@Injectable()
export class AdminReportsService {
  constructor(
    private readonly merchantsService: MerchantsService,
    private readonly usersService: UsersService,
    private readonly usageService: UsageService,
    private readonly messageService: MessageService,
    private readonly channelsService: ChannelsService,
    private readonly plansService: PlansService,
    private readonly analyticsService: AnalyticsService,
  ) {}

  /** و.1: تقرير نشاط تاجر */
  async getMerchantActivity(merchantId: string): Promise<{
    merchantId: string;
    merchantName?: string;
    lastActivity?: Date;
    conversationCount: number;
    channelsTotal: number;
    channelsEnabled: number;
    channelsConnected: number;
  }> {
    if (!Types.ObjectId.isValid(merchantId)) {
      throw new NotFoundException('التاجر غير موجود');
    }
    const [merchant, conversationCount, channelsCount] = await Promise.all([
      this.merchantsService.findOne(merchantId),
      this.messageService.countSessionsByMerchant(merchantId),
      this.channelsService.countByMerchant(merchantId),
    ]);

    const m = merchant as { name?: string; lastActivity?: Date };

    const result: {
      merchantId: string;
      merchantName?: string;
      lastActivity?: Date;
      conversationCount: number;
      channelsTotal: number;
      channelsEnabled: number;
      channelsConnected: number;
    } = {
      merchantId,
      conversationCount,
      channelsTotal: channelsCount.total,
      channelsEnabled: channelsCount.enabled,
      channelsConnected: channelsCount.connected,
    };

    if (m?.name !== undefined) {
      result.merchantName = m.name;
    }
    if (m?.lastActivity !== undefined) {
      result.lastActivity = m.lastActivity;
    }

    return result;
  }

  /** و.2: تقرير التحويلات/التسجيل */
  async getSignupsReport(params: {
    from?: string; // YYYY-MM-DD
    to?: string; // YYYY-MM-DD
  }): Promise<{
    merchants: { date: string; count: number }[];
    users: { date: string; count: number }[];
    summary: { totalMerchants: number; totalUsers: number };
  }> {
    if (!params.from || !params.to) {
      return {
        merchants: [],
        users: [],
        summary: { totalMerchants: 0, totalUsers: 0 },
      };
    }
    const fromDate = new Date(params.from);
    const toDate = new Date(params.to);
    if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
      return {
        merchants: [],
        users: [],
        summary: { totalMerchants: 0, totalUsers: 0 },
      };
    }

    const fromStr = params.from.slice(0, 10);
    const toStr = params.to.slice(0, 10);

    const [merchants, users] = await Promise.all([
      this.merchantsService.getTrendsByDateRange(fromStr, toStr),
      this.usersService.getTrendsByDateRange(fromStr, toStr),
    ]);

    const totalMerchants = merchants.reduce((s, m) => s + m.count, 0);
    const totalUsers = users.reduce((s, u) => s + u.count, 0);

    return {
      merchants,
      users,
      summary: { totalMerchants, totalUsers },
    };
  }

  /** و.3: ملخص تحليلات كليم */
  async getKleemSummary(): Promise<{
    missingOpen: number;
    missingResolved: number;
    missingTotal: number;
  }> {
    const baseDto = (
      resolved: 'true' | 'false',
    ): QueryKleemMissingResponsesDto =>
      Object.assign(new QueryKleemMissingResponsesDto(), {
        limit: 1,
        page: 1,
        resolved,
      });
    const [openRes, resolvedRes] = await Promise.all([
      this.analyticsService.listKleemMissing(baseDto('false')),
      this.analyticsService.listKleemMissing(baseDto('true')),
    ]);
    const missingOpen = openRes.total;
    const missingResolved = resolvedRes.total;
    return {
      missingOpen,
      missingResolved,
      missingTotal: missingOpen + missingResolved,
    };
  }

  /** و.4: تقرير الاستخدام حسب الخطة */
  async getUsageByPlan(monthKey?: string): Promise<{
    byPlan: Array<{
      planName: string;
      tier: string;
      merchantCount: number;
      totalMessagesUsed: number;
      avgMessagesPerMerchant: number;
    }>;
    summary: { totalMerchants: number; totalMessagesUsed: number };
  }> {
    const key = monthKey ?? this.usageService.monthKeyFrom();
    const { items } = await this.usageService.listAllAdminWithLimits({
      monthKey: key,
      limit: ADMIN_USAGE_MAX_LIMIT,
      page: 1,
    });

    const planMap = new Map<
      string,
      { merchantCount: number; totalMessages: number }
    >();
    for (const item of items) {
      const tier = item.isUnlimited
        ? 'unlimited'
        : item.messageLimit
          ? `limit_${item.messageLimit}`
          : 'free';
      const existing = planMap.get(tier) ?? {
        merchantCount: 0,
        totalMessages: 0,
      };
      existing.merchantCount += 1;
      existing.totalMessages += item.messagesUsed;
      planMap.set(tier, existing);
    }

    const byPlan = Array.from(planMap.entries()).map(([tier, data]) => ({
      planName: tier,
      tier,
      merchantCount: data.merchantCount,
      totalMessagesUsed: data.totalMessages,
      avgMessagesPerMerchant:
        data.merchantCount > 0
          ? Math.round(data.totalMessages / data.merchantCount)
          : 0,
    }));

    const summary = {
      totalMerchants: items.length,
      totalMessagesUsed: items.reduce((s, i) => s + i.messagesUsed, 0),
    };

    return { byPlan, summary };
  }
}

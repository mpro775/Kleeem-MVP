import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  Inject,
} from '@nestjs/common';
import dayjs from 'dayjs';
import { RootFilterQuery, Types } from 'mongoose';

import { FaqService } from '../faq/faq.service';
import { NotificationsService } from '../notifications/notifications.service';

import { AddToKnowledgeDto } from './dto/add-to-knowledge.dto';
import { CreateKleemMissingResponseDto } from './dto/create-kleem-missing-response.dto';
import { CreateMissingResponseDto } from './dto/create-missing-response.dto';
import { QueryKleemMissingResponsesDto } from './dto/query-kleem-missing-responses.dto';
import { AnalyticsRepository } from './repositories/analytics.repository';
import {
  UpdateKleemMissingDto,
  StatsResult,
} from './repositories/analytics.repository';
import { KleemMissingResponseDocument } from './schemas/kleem-missing-response.schema';
import { MissingResponseDocument } from './schemas/missing-response.schema';
export interface KeywordCount {
  keyword: string;
  count: number;
}
export interface ChannelCount {
  channel: string;
  count: number;
}
export interface TopProduct {
  productId: string;
  name: string;
  count: number;
}
export interface Overview {
  sessions: { count: number; changePercent: number | null };
  messages: number;
  topKeywords: KeywordCount[];
  topProducts: TopProduct[];
  channels: { total: number; breakdown: ChannelCount[] };
  orders: {
    count: number;
    changePercent: number | null;
    byStatus: Record<string, number>;
    totalSales: number;
  };
  csat?: number;
  firstResponseTimeSec?: number | null;
  missingOpen?: number;
  storeExtras?: { paidOrders: number; aov: number | null };
}

type ListParams = {
  merchantId: string;
  page?: number;
  limit?: number;
  resolved?: 'all' | 'true' | 'false';
  channel?: 'telegram' | 'whatsapp' | 'webchat' | 'all';
  type?: 'missing_response' | 'unavailable_product' | 'all';
  search?: string;
  from?: string;
  to?: string;
};

type Query = Record<string, unknown>;

function buildBaseQuery(merchantId: string): Query {
  return { merchant: new Types.ObjectId(merchantId) };
}

function applyResolvedFilter(q: Query, resolved: ListParams['resolved']): void {
  if (resolved !== 'all') {
    q.resolved = resolved === 'true';
  }
}

function applyChannelFilter(q: Query, channel: ListParams['channel']): void {
  if (channel !== 'all') {
    q.channel = channel;
  }
}

function applyTypeFilter(q: Query, type: ListParams['type']): void {
  if (type !== 'all') {
    q.type = type;
  }
}

function applyDateFilter(q: Query, from?: string, to?: string): void {
  if (!from && !to) return;
  q.createdAt = {};
  if (from) (q.createdAt as Record<string, Date>).$gte = new Date(from);
  if (to) (q.createdAt as Record<string, Date>).$lte = new Date(to);
}

function applySearchFilter(q: Query, search?: string): void {
  if (!search?.trim()) return;
  q.$or = [
    { question: { $regex: search, $options: 'i' } },
    { botReply: { $regex: search, $options: 'i' } },
    { aiAnalysis: { $regex: search, $options: 'i' } },
    { sessionId: { $regex: search, $options: 'i' } },
    { customerId: { $regex: search, $options: 'i' } },
  ];
}

@Injectable()
export class AnalyticsService {
  constructor(
    @Inject('AnalyticsRepository')
    private readonly repo: AnalyticsRepository,
    private faqService: FaqService,
    private notificationsService: NotificationsService,
  ) {}

  private getPeriodDates(period: 'week' | 'month' | 'quarter') {
    const now = dayjs();
    if (period === 'week')
      return { start: now.startOf('week').toDate(), end: now.toDate() };
    if (period === 'month')
      return { start: now.startOf('month').toDate(), end: now.toDate() };
    const qStart = Math.floor(now.month() / 3) * 3;
    const start = now.month(qStart).startOf('month').toDate();
    return { start, end: now.toDate() };
  }

  private getPrevPeriodDates(
    start: Date,
    period: 'week' | 'month' | 'quarter',
  ) {
    const s = dayjs(start);
    if (period === 'week')
      return { prevStart: s.subtract(1, 'week').toDate(), prevEnd: s.toDate() };
    if (period === 'month')
      return {
        prevStart: s.subtract(1, 'month').toDate(),
        prevEnd: s.toDate(),
      };
    return { prevStart: s.subtract(3, 'month').toDate(), prevEnd: s.toDate() };
  }

  private summarizeMissingStats(
    rows: Array<{
      _id: string;
      channels: Array<{ channel: string; resolved: boolean; count: number }>;
      total: number;
    }>,
  ) {
    const totals = {
      total: 0,
      unresolved: 0,
      byChannel: {} as Record<string, number>,
    };
    for (const d of rows) {
      totals.total += d.total ?? 0;
      for (const c of d.channels ?? []) {
        totals.byChannel[c.channel] =
          (totals.byChannel[c.channel] ?? 0) + c.count;
        if (c.resolved === false) totals.unresolved += c.count;
      }
    }
    const topChannel = Object.entries(totals.byChannel).sort(
      (a, b) => b[1] - a[1],
    )[0]?.[0];
    return { ...totals, topChannel };
  }

  async getOverview(
    merchantId: string,
    period: 'week' | 'month' | 'quarter',
  ): Promise<Overview> {
    const { start, end } = this.getPeriodDates(period);
    const { prevStart, prevEnd } = this.getPrevPeriodDates(start, period);
    const mId = new Types.ObjectId(merchantId);

    const [currSessions, prevSessions] = await Promise.all([
      this.repo.countSessions(mId, start, end),
      this.repo.countSessions(mId, prevStart, prevEnd),
    ]);
    const changePercent =
      prevSessions > 0
        ? Math.round(((currSessions - prevSessions) / prevSessions) * 100)
        : null;

    const totalMessages = await this.repo.aggregateTotalMessages(
      mId,
      start,
      end,
    );

    const [currOrders, prevOrders] = await Promise.all([
      this.repo.countOrders(mId, start, end),
      this.repo.countOrders(mId, prevStart, prevEnd),
    ]);
    const ordersChangePercent =
      prevOrders > 0
        ? Math.round(((currOrders - prevOrders) / prevOrders) * 100)
        : null;
    const ordersByStatus = await this.repo.aggregateOrdersByStatus(
      mId,
      start,
      end,
    );
    const totalSales = await this.repo.sumNonCanceledSales(mId, start, end);

    const [topKeywords, topProducts] = await Promise.all([
      this.repo.topKeywords(mId, start, end, 10),
      this.repo.topProducts(mId, start, end, 3),
    ]);

    const [enabledSet, channelsUsage] = await Promise.all([
      this.repo.getEnabledLogicalChannels(mId),
      this.repo.channelsUsage(mId, start, end),
    ]);

    const breakdown = Array.from(enabledSet).map<ChannelCount>((ch) => ({
      channel: ch,
      count: channelsUsage.find((c) => c.channel === ch)?.count || 0,
    }));

    const [csat, frt, missingOpen, paidOrders, revenue] = await Promise.all([
      this.repo.getCsat(mId, start, end),
      this.repo.getFirstResponseTimeSec(mId, start, end),
      this.repo.countMissingOpen(mId),
      this.repo.countPaidOrders(mId, start, end),
      this.repo.sumNonCanceledSales(mId, start, end),
    ]);
    const aov =
      paidOrders > 0 ? Number((revenue / paidOrders).toFixed(2)) : null;

    return {
      sessions: { count: currSessions, changePercent },
      messages: totalMessages,
      topKeywords,
      topProducts,
      channels: { total: enabledSet.size, breakdown },
      orders: {
        count: currOrders,
        changePercent: ordersChangePercent,
        byStatus: ordersByStatus,
        totalSales,
      },
      ...(csat && { csat }),
      ...(frt !== undefined && { firstResponseTimeSec: frt }),
      missingOpen,
      storeExtras: { paidOrders, aov },
    };
  }

  async getMessagesTimeline(
    merchantId: string,
    period: 'week' | 'month' | 'quarter' = 'week',
    groupBy: 'day' | 'hour' = 'day',
  ): Promise<Array<{ _id: string; count: number }>> {
    const { start, end } = this.getPeriodDates(period);
    return this.repo.messagesTimeline(
      new Types.ObjectId(merchantId),
      start,
      end,
      groupBy,
    );
  }

  async getTopKeywords(
    merchantId: string,
    period: 'week' | 'month' | 'quarter',
    limit = 10,
  ): Promise<KeywordCount[]> {
    const { start, end } = this.getPeriodDates(period);
    return this.repo.getTopKeywords(
      new Types.ObjectId(merchantId),
      start,
      end,
      limit,
    );
  }

  async getProductsCount(merchantId: string): Promise<number> {
    return this.repo.countProducts(new Types.ObjectId(merchantId));
  }

  async createFromWebhook(
    dto: CreateMissingResponseDto,
  ): Promise<MissingResponseDocument> {
    return this.repo.createMissingFromWebhook(dto);
  }

  async listMissingResponses(params: ListParams): Promise<{
    items: MissingResponseDocument[];
    total: number;
    page: number;
    limit: number;
  }> {
    const {
      merchantId,
      page = 1,
      limit = 20,
      resolved = 'all',
      channel = 'all',
      type = 'all',
      search,
      from,
      to,
    } = params;

    const q: Query = buildBaseQuery(merchantId);

    applyResolvedFilter(q, resolved);
    applyChannelFilter(q, channel);
    applyTypeFilter(q, type);
    applyDateFilter(q, from, to);
    applySearchFilter(q, search);

    const skip = (page - 1) * limit;
    const { items, total } = await this.repo.listMissingResponses(
      q,
      skip,
      limit,
    );

    return { items, total, page, limit };
  }

  async markResolved(
    id: string,
    userId?: string,
  ): Promise<MissingResponseDocument> {
    return this.repo.markMissingResolved(id, userId);
  }

  async bulkResolveMarch(
    ids: string[],
    userId?: string,
  ): Promise<{ updated: number }> {
    // (حافظنا على الاسم كما هو)
    return this.repo.bulkResolveMissing(ids, userId);
  }

  async stats(merchantId: string, days = 7): Promise<StatsResult[]> {
    const from = new Date();
    from.setDate(from.getDate() - days);
    return this.repo.statsMissing(merchantId, from);
  }

  async addToKnowledge(params: {
    merchantId: string;
    missingId: string;
    payload: AddToKnowledgeDto;
    userId?: string;
  }): Promise<{
    success: boolean;
    faqId: string | undefined;
    missingResponseId: string;
    resolved: boolean;
  }> {
    const { merchantId, missingId, payload, userId } = params;

    // نحتاج التأكد من ملكية الـ missing قبل إنشاء FAQ
    const list = await this.repo.listMissingResponses(
      { _id: new Types.ObjectId(missingId) },
      0,
      1,
    );
    const doc = list.items[0];
    if (!doc) throw new NotFoundException('Missing response not found');
    if (doc.merchant?.toString() !== merchantId)
      throw new ForbiddenException('Not your resource');

    const created = await this.faqService.createMany(merchantId, [
      { question: payload.question ?? '', answer: payload.answer ?? '' },
    ]);

    await this.repo.markMissingResolved(missingId, userId);

    const faqId = created[0]
      ? String((created[0] as { _id: unknown })._id)
      : undefined;
    return {
      success: true,
      faqId,
      missingResponseId: String(doc._id),
      resolved: true,
    };
  }

  async createKleemFromWebhook(
    dto: CreateKleemMissingResponseDto,
  ): Promise<KleemMissingResponseDocument> {
    return this.repo.createKleemFromWebhook(dto);
  }

  async getTopProducts(
    merchantId: string,
    period: 'week' | 'month' | 'quarter',
    limit = 5,
  ): Promise<TopProduct[]> {
    const { start, end } = this.getPeriodDates(period);
    return this.repo.topProducts(
      new Types.ObjectId(merchantId),
      start,
      end,
      limit,
    );
  }

  async listKleemMissing(
    dto: QueryKleemMissingResponsesDto,
  ): Promise<{ items: KleemMissingResponseDocument[]; total: number }> {
    const {
      page,
      limit,
      channel,
      resolved,
      q,
      sessionId,
      customerId,
      from,
      to,
    } = dto;
    const filter: RootFilterQuery<KleemMissingResponseDocument> = {};
    if (channel) filter.channel = channel;
    if (resolved === 'true') filter.resolved = true;
    if (resolved === 'false') filter.resolved = false;
    if (sessionId) filter.sessionId = sessionId;
    if (customerId) filter.customerId = customerId;
    if (from || to) {
      (filter as Record<string, unknown>).createdAt = {
        ...(from && { $gte: new Date(from) }),
        ...(to && { $lte: new Date(to) }),
      };
    }
    if (q) {
      filter.$or = [
        { question: { $regex: q, $options: 'i' } },
        { aiAnalysis: { $regex: q, $options: 'i' } },
        { manualReply: { $regex: q, $options: 'i' } },
        { category: { $regex: q, $options: 'i' } },
      ];
    }

    const skip = (page - 1) * limit;
    const { items, total } = await this.repo.listKleemMissing(
      filter,
      skip,
      limit,
    );
    return { items, total };
  }

  async updateKleemMissing(
    id: string,
    update: Partial<
      Pick<
        Awaited<ReturnType<typeof this.repo.updateKleemMissing>>,
        'resolved' | 'manualReply' | 'category'
      >
    >,
  ): Promise<KleemMissingResponseDocument> {
    return this.repo.updateKleemMissing(id, update as UpdateKleemMissingDto);
  }

  async bulkResolve(ids: string[]): Promise<{ updated: number }> {
    return this.repo.bulkResolveKleem(ids);
  }

  async notifyMissingStatsToUser(params: {
    merchantId: string;
    userId: string;
    days?: number;
  }): Promise<{ sent: boolean; summary: StatsResult }> {
    const { merchantId, userId, days = 7 } = params;
    const statsRows = await this.stats(merchantId, days);
    const s = this.summarizeMissingStats(
      statsRows as {
        _id: string;
        channels: { channel: string; resolved: boolean; count: number }[];
        total: number;
      }[],
    );

    const title = `ملخّص الرسائل المفقودة (آخر ${days} يوم)`;
    const parts = [
      `الإجمالي: ${s.total}`,
      `غير محلولة: ${s.unresolved}`,
      s.topChannel ? `الأكثر عبر: ${s.topChannel}` : undefined,
    ].filter(Boolean);
    const body = parts.join(' — ');

    await this.notificationsService.notifyUser(userId, {
      type: 'missingResponses.stats',
      title,
      body,
      merchantId,
      severity: s.unresolved > 0 ? 'warning' : 'info',
      data: { days, summary: s, rows: statsRows },
    });

    return { sent: true, summary: s };
  }
}

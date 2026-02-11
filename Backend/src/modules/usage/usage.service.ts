// src/modules/usage/usage.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { toCsv } from '../../common/utils/csv.utils';
import { InjectModel } from '@nestjs/mongoose';
import { InjectConnection } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Connection } from 'mongoose';
import { PaymentRequiredException } from 'src/common/exceptions/payment-required.exception';
import {
  Merchant,
  MerchantDocument,
} from 'src/modules/merchants/schemas/merchant.schema';
import { PlansService } from 'src/modules/plans/plans.service';

import { Plan } from '../plans/schemas/plan.schema';

// ثوابت لتجنب الأرقام السحرية
const MINUTES_IN_HOUR = 60;
const SECONDS_IN_MINUTE = 60;
const MS_IN_SECOND = 1000;
const TIMEZONE_OFFSET_HOURS = 3; // Asia/Aden +03
const TIMEZONE_OFFSET_MS =
  TIMEZONE_OFFSET_HOURS * MINUTES_IN_HOUR * SECONDS_IN_MINUTE * MS_IN_SECOND;

import {
  UsageCounter,
  UsageCounterDocument,
} from './schemas/usage-counter.schema';
import { UsageLimitResolver } from './usage-limit.resolver';

@Injectable()
export class UsageService {
  constructor(
    @InjectModel(UsageCounter.name)
    private usageModel: Model<UsageCounterDocument>,
    @InjectModel(Merchant.name) private merchantModel: Model<MerchantDocument>,
    private readonly plansService: PlansService,
    private readonly limitResolver: UsageLimitResolver,

    @InjectConnection() private readonly connection: Connection,
  ) {}
  monthKeyFrom(date = new Date()): string {
    const d = new Date(date.getTime() + TIMEZONE_OFFSET_MS);
    const year = d.getUTCFullYear();
    const month = String(d.getUTCMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }

  private async getMerchantOrThrow(merchantId: string) {
    const m = await this.merchantModel.findById(merchantId);
    if (!m) throw new NotFoundException('Merchant not found');
    return m;
  }

  async consumeMessages(
    merchantId: string,
    n = 1,
  ): Promise<{ monthKey: string; messagesUsed: number; limit: number }> {
    const monthKey = this.monthKeyFrom();
    const mId = new Types.ObjectId(merchantId);

    const merchant = await this.getMerchantOrThrow(merchantId);
    const { limit: messageLimit } =
      await this.limitResolver.resolveForMerchant(merchant);

    const session = await this.connection.startSession();
    try {
      session.startTransaction();

      const doc = await this.usageModel.findOneAndUpdate(
        { merchantId: mId, monthKey },
        { $setOnInsert: { merchantId: mId, monthKey, messagesUsed: 0 } },
        { upsert: true, new: true, session },
      );
      if (!doc) throw new Error('Failed to create or find usage document');

      if (doc.messagesUsed + n > messageLimit) {
        throw new PaymentRequiredException(
          'تم استهلاك الحد الشهري للرسائل، فضلاً قم بالترقية.',
        );
      }

      doc.messagesUsed += n;
      await doc.save({ session });

      await session.commitTransaction();
      return { monthKey, messagesUsed: doc.messagesUsed, limit: messageLimit };
    } catch (e) {
      await session.abortTransaction();
      throw e;
    } finally {
      await session.endSession();
    }
  }

  async getUsage(
    merchantId: string,
    monthKey?: string,
  ): Promise<{
    merchantId: Types.ObjectId | string;
    monthKey: string;
    messagesUsed: number;
  }> {
    const key = monthKey ?? this.monthKeyFrom();
    const doc = await this.usageModel
      .findOne({ merchantId, monthKey: key })
      .lean();
    return doc ?? { merchantId, monthKey: key, messagesUsed: 0 };
  }

  async getPlanAndLimit(merchantId: string): Promise<{
    plan: Plan | null;
    messageLimit: number;
    isUnlimited: boolean;
  }> {
    const merchant = await this.merchantModel.findById(merchantId).lean();
    if (!merchant) throw new NotFoundException('Merchant not found');

    // نتوقع وجود subscription.planId
    const planId = merchant.subscription?.planId;
    if (!planId) {
      // خيار: اعتبرها Free بحد أدنى أو Unlimited (حسب سياستك)
      return { plan: null, messageLimit: 0, isUnlimited: true };
    }
    const plan = await this.plansService.findById(String(planId));
    // إن لم يحدد plan.messageLimit => اعتبر غير محدود
    const isUnlimited =
      typeof plan.messageLimit !== 'number' || plan.messageLimit < 0;
    const messageLimit = isUnlimited
      ? Number.MAX_SAFE_INTEGER
      : plan.messageLimit!;
    return { plan, messageLimit, isUnlimited };
  }

  // لإعادة التعيين اليدوي (نادراً ما تحتاجها مع monthKey)
  async resetUsage(
    merchantId: string,
    monthKey?: string,
  ): Promise<{
    merchantId: Types.ObjectId | string;
    monthKey: string;
    messagesUsed: number;
  }> {
    const key = monthKey ?? this.monthKeyFrom();
    await this.usageModel.updateOne(
      { merchantId, monthKey: key },
      { $set: { messagesUsed: 0 } },
      { upsert: true },
    );
    return this.getUsage(merchantId, key);
  }

  /** قائمة استهلاك التجار للأدمن (ترقيم صفحي + فلترة شهر) */
  async listAllAdmin(params: {
    monthKey?: string;
    limit: number;
    page: number;
    sortBy?: 'messagesUsed' | 'merchantId';
    sortOrder?: 'asc' | 'desc';
  }): Promise<{
    items: Array<{
      merchantId: Types.ObjectId | string;
      monthKey: string;
      messagesUsed: number;
    }>;
    total: number;
  }> {
    const key = params.monthKey ?? this.monthKeyFrom();
    const {
      limit,
      page,
      sortBy = 'messagesUsed',
      sortOrder = 'desc',
    } = params;
    const filter = { monthKey: key };
    const sortDir = sortOrder === 'asc' ? 1 : -1;
    const sortField = sortBy === 'merchantId' ? 'merchantId' : 'messagesUsed';

    const [rawItems, total] = await Promise.all([
      this.usageModel
        .find(filter)
        .sort({ [sortField]: sortDir })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean()
        .exec(),
      this.usageModel.countDocuments(filter).exec(),
    ]);

    const items = rawItems.map(
      (d: { merchantId: Types.ObjectId; monthKey: string; messagesUsed: number }) => ({
        merchantId: d.merchantId,
        monthKey: d.monthKey,
        messagesUsed: d.messagesUsed,
      }),
    );

    return { items, total };
  }

  /** إحصائيات استهلاك للأدمن (شهر معيّن أو الحالي) */
  async getStatsAdmin(monthKey?: string): Promise<{
    monthKey: string;
    totalMessagesUsed: number;
    merchantCount: number;
  }> {
    const key = monthKey ?? this.monthKeyFrom();
    const docs = await this.usageModel
      .find({ monthKey: key })
      .select('messagesUsed')
      .lean()
      .exec();
    const totalMessagesUsed = docs.reduce((sum, d) => sum + (d.messagesUsed ?? 0), 0);
    return {
      monthKey: key,
      totalMessagesUsed,
      merchantCount: docs.length,
    };
  }

  /** ترند استهلاك شهري للأدمن (آخر N أشهر) */
  async getTrendsAdmin(period: '7d' | '30d'): Promise<
    { monthKey: string; totalMessagesUsed: number }[]
  > {
    const monthsCount = period === '7d' ? 3 : 6;
    const keys: string[] = [];
    const now = new Date();
    for (let i = 0; i < monthsCount; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      keys.push(this.monthKeyFrom(d));
    }

    const docs = await this.usageModel
      .aggregate<{ _id: string; totalMessagesUsed: number }>([
        { $match: { monthKey: { $in: keys } } },
        {
          $group: {
            _id: '$monthKey',
            totalMessagesUsed: { $sum: '$messagesUsed' },
          },
        },
        { $sort: { _id: 1 } },
        {
          $project: {
            monthKey: '$_id',
            totalMessagesUsed: 1,
            _id: 0,
          },
        },
      ])
      .exec();

    return docs;
  }

  async exportCsv(params: { monthKey?: string }): Promise<string> {
    const { items } = await this.listAllAdminWithLimits({
      monthKey: params.monthKey,
      limit: 5000,
      page: 1,
    });
    const headers = [
      'merchantId',
      'merchantName',
      'monthKey',
      'messagesUsed',
      'messageLimit',
      'usagePercent',
    ];
    const rows = items.map((u) => [
      u.merchantId?.toString?.() ?? String(u.merchantId),
      u.merchantName ?? '',
      u.monthKey ?? '',
      u.messagesUsed ?? 0,
      u.messageLimit ?? 0,
      u.usagePercent != null ? String(u.usagePercent) : '',
    ]);
    return toCsv(headers, rows);
  }

  /** ج.1: تنبيهات تجار تجاوزوا الحد أو قاربوه */
  async getAlertsAdmin(params: {
    monthKey?: string;
    /** نسبة للتجاوز (مثلاً 80 = قارب 80%+) */
    thresholdPercent?: number;
    limit?: number;
  }): Promise<{
    items: Array<{
      merchantId: Types.ObjectId;
      merchantName?: string;
      monthKey: string;
      messagesUsed: number;
      messageLimit: number;
      usagePercent: number;
      status: 'exceeded' | 'near';
    }>;
    total: number;
  }> {
    const key = params.monthKey ?? this.monthKeyFrom();
    const threshold = Math.min(100, Math.max(0, params.thresholdPercent ?? 80));
    const limit = params.limit ?? 100;

    const docs = await this.usageModel
      .find({ monthKey: key })
      .sort({ messagesUsed: -1 })
      .limit(limit * 2) // fetch more to filter
      .lean()
      .exec();

    const result: Array<{
      merchantId: Types.ObjectId;
      merchantName?: string;
      monthKey: string;
      messagesUsed: number;
      messageLimit: number;
      usagePercent: number;
      status: 'exceeded' | 'near';
    }> = [];

    for (const d of docs as Array<{ merchantId: Types.ObjectId; messagesUsed: number }>) {
      const merchant = await this.merchantModel.findById(d.merchantId).lean();
      if (!merchant) continue;

      const { limit: messageLimit } =
        await this.limitResolver.resolveForMerchant(
          merchant as unknown as MerchantDocument,
        );
      if (messageLimit >= Number.MAX_SAFE_INTEGER - 1) continue; // unlimited

      const messagesUsed = d.messagesUsed ?? 0;
      const usagePercent =
        messageLimit > 0 ? (messagesUsed / messageLimit) * 100 : 0;

      if (usagePercent >= 100) {
        result.push({
          merchantId: d.merchantId,
          merchantName: (merchant as { name?: string }).name,
          monthKey: key,
          messagesUsed,
          messageLimit,
          usagePercent: Math.round(usagePercent * 100) / 100,
          status: 'exceeded',
        });
      } else if (usagePercent >= threshold) {
        result.push({
          merchantId: d.merchantId,
          merchantName: (merchant as { name?: string }).name,
          monthKey: key,
          messagesUsed,
          messageLimit,
          usagePercent: Math.round(usagePercent * 100) / 100,
          status: 'near',
        });
      }
      if (result.length >= limit) break;
    }

    return { items: result, total: result.length };
  }

  /** ج.3: تقرير استهلاك لفترة مخصصة (أشهر متعددة) */
  async getReportAdmin(params: {
    from: string; // YYYY-MM
    to: string; // YYYY-MM
  }): Promise<{
    byMonth: Array<{
      monthKey: string;
      totalMessagesUsed: number;
      merchantCount: number;
    }>;
    summary: { totalMessagesUsed: number; monthsCount: number };
  }> {
    const fromMatch = /^\d{4}-(0[1-9]|1[0-2])$/.test(params.from)
      ? params.from
      : this.monthKeyFrom();
    const toMatch = /^\d{4}-(0[1-9]|1[0-2])$/.test(params.to)
      ? params.to
      : this.monthKeyFrom();

    const keys: string[] = [];
    const [fromY, fromM] = fromMatch.split('-').map(Number);
    const [toY, toM] = toMatch.split('-').map(Number);
    const fromDate = new Date(fromY, fromM - 1, 1);
    const toDate = new Date(toY, toM - 1, 1);
    if (fromDate > toDate) {
      return { byMonth: [], summary: { totalMessagesUsed: 0, monthsCount: 0 } };
    }
    for (let d = new Date(fromDate); d <= toDate; d.setMonth(d.getMonth() + 1)) {
      keys.push(this.monthKeyFrom(d));
    }

    const docs = await this.usageModel
      .aggregate<{ _id: string; totalMessagesUsed: number; merchantCount: number }>([
        { $match: { monthKey: { $in: keys } } },
        {
          $group: {
            _id: '$monthKey',
            totalMessagesUsed: { $sum: '$messagesUsed' },
            merchantCount: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
        {
          $project: {
            monthKey: '$_id',
            totalMessagesUsed: 1,
            merchantCount: 1,
            _id: 0,
          },
        },
      ])
      .exec();

    const byMonth = docs.map((x) => ({
      monthKey: x.monthKey ?? x._id,
      totalMessagesUsed: x.totalMessagesUsed ?? 0,
      merchantCount: x.merchantCount ?? 0,
    }));

    const totalMessagesUsed = byMonth.reduce((s, m) => s + m.totalMessagesUsed, 0);
    return {
      byMonth,
      summary: {
        totalMessagesUsed,
        monthsCount: byMonth.length,
      },
    };
  }

  /** ج.4: قائمة استهلاك مع الحد ونسبة الاستهلاك */
  async listAllAdminWithLimits(params: {
    monthKey?: string;
    limit: number;
    page: number;
    sortBy?: 'messagesUsed' | 'merchantId' | 'usagePercent';
    sortOrder?: 'asc' | 'desc';
  }): Promise<{
    items: Array<{
      merchantId: Types.ObjectId | string;
      merchantName?: string;
      monthKey: string;
      messagesUsed: number;
      messageLimit: number;
      usagePercent: number | null;
      isUnlimited: boolean;
    }>;
    total: number;
  }> {
    const key = params.monthKey ?? this.monthKeyFrom();
    const {
      limit,
      page,
      sortBy = 'messagesUsed',
      sortOrder = 'desc',
    } = params;

    const filter = { monthKey: key };
    const dbSortField =
      sortBy === 'merchantId' ? 'merchantId' : 'messagesUsed';
    const sortDir = sortOrder === 'asc' ? 1 : -1;
    const needsUsageSort = sortBy === 'usagePercent';

    const [rawItems, total] = await Promise.all([
      this.usageModel
        .find(filter)
        .sort(needsUsageSort ? { messagesUsed: -1 } : { [dbSortField]: sortDir })
        .skip(needsUsageSort ? 0 : (page - 1) * limit)
        .limit(needsUsageSort ? 2000 : limit)
        .lean()
        .exec(),
      this.usageModel.countDocuments(filter).exec(),
    ]);

    const items: Array<{
      merchantId: Types.ObjectId | string;
      merchantName?: string;
      monthKey: string;
      messagesUsed: number;
      messageLimit: number;
      usagePercent: number | null;
      isUnlimited: boolean;
    }> = [];

    for (const d of rawItems as Array<{
      merchantId: Types.ObjectId;
      messagesUsed: number;
    }>) {
      const merchant = await this.merchantModel.findById(d.merchantId).lean();
      const messagesUsed = d.messagesUsed ?? 0;
      let messageLimit = 0;
      let isUnlimited = true;
      if (merchant) {
        const resolved =
          await this.limitResolver.resolveForMerchant(
            merchant as unknown as MerchantDocument,
          );
        messageLimit = resolved.limit;
        isUnlimited = resolved.isUnlimited;
      }
      const usagePercent =
        !isUnlimited && messageLimit > 0
          ? Math.round((messagesUsed / messageLimit) * 10000) / 100
          : null;

      items.push({
        merchantId: d.merchantId,
        merchantName: (merchant as { name?: string })?.name,
        monthKey: key,
        messagesUsed,
        messageLimit: isUnlimited ? 0 : messageLimit,
        usagePercent,
        isUnlimited,
      });
    }

    if (sortBy === 'usagePercent' && items.length) {
      items.sort((a, b) => {
        const ap = a.usagePercent ?? -1;
        const bp = b.usagePercent ?? -1;
        return sortOrder === 'asc' ? ap - bp : bp - ap;
      });
      return {
        items: items.slice((page - 1) * limit, page * limit),
        total,
      };
    }

    return { items, total };
  }
}

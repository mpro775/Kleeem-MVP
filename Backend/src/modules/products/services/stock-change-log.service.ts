// src/modules/products/services/stock-change-log.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import {
  StockChangeLog,
  StockChangeLogDocument,
  StockChangeType,
} from '../schemas/stock-change-log.schema';

const DEFAULT_LIMIT = 20;

const OLD_STOCK_CHANGE_LOG_DAYS = 90;

export interface LogChangeParams {
  merchantId: string;
  productId: string;
  productName: string;
  variantSku?: string | null;
  previousStock: number;
  newStock: number;
  changeType: StockChangeType;
  reason?: string | null;
  changedBy: string;
  changedByName: string;
  orderId?: string | null;
}

export interface StockHistoryQuery {
  productId?: string;
  merchantId?: string;
  changeType?: StockChangeType;
  limit?: number;
  page?: number;
}

export interface StockHistoryResult {
  items: StockChangeLogDocument[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

@Injectable()
export class StockChangeLogService {
  private readonly logger = new Logger(StockChangeLogService.name);

  constructor(
    @InjectModel(StockChangeLog.name)
    private readonly model: Model<StockChangeLogDocument>,
  ) {}

  /**
   * تسجيل تغيير في المخزون
   */
  async logChange(params: LogChangeParams): Promise<StockChangeLogDocument> {
    const changeAmount = params.newStock - params.previousStock;

    const log = new this.model({
      merchantId: new Types.ObjectId(params.merchantId),
      productId: new Types.ObjectId(params.productId),
      productName: params.productName,
      variantSku: params.variantSku ?? null,
      previousStock: params.previousStock,
      newStock: params.newStock,
      changeAmount,
      changeType: params.changeType,
      reason: params.reason ?? null,
      changedBy: new Types.ObjectId(params.changedBy),
      changedByName: params.changedByName,
      orderId: params.orderId ? new Types.ObjectId(params.orderId) : null,
      changedAt: new Date(),
    });

    const saved = await log.save();

    this.logger.log(
      `Stock change logged: ${params.productName} (${params.productId}) ` +
        `${params.previousStock} -> ${params.newStock} (${changeAmount > 0 ? '+' : ''}${changeAmount}) ` +
        `by ${params.changedByName}`,
    );

    return saved;
  }

  /**
   * جلب سجل تغييرات منتج معين
   */
  async getProductHistory(
    productId: string,
    limit = DEFAULT_LIMIT,
    page = 1,
  ): Promise<StockHistoryResult> {
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.model
        .find({ productId: new Types.ObjectId(productId) })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.model.countDocuments({ productId: new Types.ObjectId(productId) }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      hasMore: skip + items.length < total,
    };
  }

  /**
   * جلب سجل تغييرات التاجر
   */
  async getMerchantHistory(
    merchantId: string,
    query: StockHistoryQuery = {},
  ): Promise<StockHistoryResult> {
    const limit = query.limit ?? DEFAULT_LIMIT;
    const page = query.page ?? 1;
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {
      merchantId: new Types.ObjectId(merchantId),
    };

    if (query.productId) {
      filter.productId = new Types.ObjectId(query.productId);
    }

    if (query.changeType) {
      filter.changeType = query.changeType;
    }

    const [items, total] = await Promise.all([
      this.model
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.model.countDocuments(filter),
    ]);

    return {
      items,
      total,
      page,
      limit,
      hasMore: skip + items.length < total,
    };
  }

  /**
   * جلب آخر تغييرات التاجر (للداشبورد)
   */
  async getRecentChanges(
    merchantId: string,
    limit = DEFAULT_LIMIT,
  ): Promise<StockChangeLogDocument[]> {
    return this.model
      .find({ merchantId: new Types.ObjectId(merchantId) })
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();
  }

  /**
   * حذف سجلات قديمة (للصيانة)
   */
  async deleteOldLogs(
    merchantId: string,
    olderThanDays = OLD_STOCK_CHANGE_LOG_DAYS,
  ): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const result = await this.model.deleteMany({
      merchantId: new Types.ObjectId(merchantId),
      createdAt: { $lt: cutoffDate },
    });

    this.logger.log(
      `Deleted ${result.deletedCount} old stock change logs for merchant ${merchantId}`,
    );

    return result.deletedCount;
  }
}

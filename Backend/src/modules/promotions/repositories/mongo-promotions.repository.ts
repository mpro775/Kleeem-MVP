// src/modules/promotions/repositories/mongo-promotions.repository.ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import {
  Promotion,
  PromotionDocument,
  PromotionStatus,
} from '../schemas/promotion.schema';

import { PromotionsRepository } from './promotions.repository';

@Injectable()
export class MongoPromotionsRepository implements PromotionsRepository {
  constructor(
    @InjectModel(Promotion.name)
    private readonly promotionModel: Model<PromotionDocument>,
  ) {}

  async create(data: Partial<Promotion>): Promise<Promotion> {
    const promotion = new this.promotionModel(data);
    return promotion.save();
  }

  async findById(id: string): Promise<Promotion | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    return this.promotionModel.findById(id).lean().exec();
  }

  async findByMerchant(
    merchantId: string,
    options: {
      status?: string;
      limit?: number;
      skip?: number;
    } = {},
  ): Promise<{ promotions: Promotion[]; total: number }> {
    if (!Types.ObjectId.isValid(merchantId)) {
      return { promotions: [], total: 0 };
    }

    const query: Record<string, unknown> = {
      merchantId: new Types.ObjectId(merchantId),
    };

    if (options.status) {
      query.status = options.status;
    }

    const limit = options.limit || 20;
    const skip = options.skip || 0;

    const [promotions, total] = await Promise.all([
      this.promotionModel
        .find(query)
        .sort({ priority: -1, createdAt: -1 })
        .limit(limit)
        .skip(skip)
        .lean()
        .exec(),
      this.promotionModel.countDocuments(query).exec(),
    ]);

    return { promotions, total };
  }

  async findActivePromotions(merchantId: string): Promise<Promotion[]> {
    if (!Types.ObjectId.isValid(merchantId)) return [];

    const now = new Date();

    return this.promotionModel
      .find({
        merchantId: new Types.ObjectId(merchantId),
        status: { $ne: PromotionStatus.INACTIVE },
        // التاريخ: يجب أن يبدأ الآن أو بلا تاريخ بداية
        $or: [{ startDate: null }, { startDate: { $lte: now } }],
        // التاريخ: لم ينتهِ بعد أو بلا تاريخ نهاية
        $and: [{ $or: [{ endDate: null }, { endDate: { $gte: now } }] }],
        // حد الاستخدام: غير محدود أو لم يصل الحد
        $expr: {
          $or: [
            { $eq: ['$usageLimit', null] },
            {
              $lt: [{ $ifNull: ['$timesUsed', 0] }, '$usageLimit'],
            },
          ],
        },
      })
      .sort({ priority: -1 })
      .lean()
      .exec();
  }

  async update(
    id: string,
    data: Partial<Promotion>,
  ): Promise<Promotion | null> {
    if (!Types.ObjectId.isValid(id)) return null;

    return this.promotionModel
      .findByIdAndUpdate(id, { $set: data }, { new: true })
      .lean()
      .exec();
  }

  async delete(id: string): Promise<boolean> {
    if (!Types.ObjectId.isValid(id)) return false;

    const result = await this.promotionModel.findByIdAndDelete(id).exec();
    return !!result;
  }

  async incrementUsage(
    id: string,
    discountAmount: number,
  ): Promise<Promotion | null> {
    if (!Types.ObjectId.isValid(id)) return null;

    const updated = await this.promotionModel
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(id),
          $or: [
            { usageLimit: null },
            {
              $expr: {
                $lt: [{ $ifNull: ['$timesUsed', 0] }, '$usageLimit'],
              },
            },
          ],
        },
        [
          {
            $set: {
              timesUsed: { $add: [{ $ifNull: ['$timesUsed', 0] }, 1] },
              totalDiscountGiven: {
                $add: [{ $ifNull: ['$totalDiscountGiven', 0] }, discountAmount],
              },
            },
          },
          {
            $set: {
              status: {
                $cond: [
                  {
                    $and: [
                      { $ne: ['$usageLimit', null] },
                      {
                        $gte: [{ $ifNull: ['$timesUsed', 0] }, '$usageLimit'],
                      },
                    ],
                  },
                  PromotionStatus.EXPIRED,
                  '$status',
                ],
              },
            },
          },
        ],
        { new: true },
      )
      .lean()
      .exec();

    return updated;
  }
}

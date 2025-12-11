import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Model } from 'mongoose';

import {
  Promotion,
  PromotionDocument,
  PromotionStatus,
} from './schemas/promotion.schema';

@Injectable()
export class PromotionsCron {
  private readonly logger = new Logger(PromotionsCron.name);

  constructor(
    @InjectModel(Promotion.name)
    private readonly promotionModel: Model<PromotionDocument>,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async refreshStatuses(): Promise<void> {
    const now = new Date();

    // تفعيل العروض المجدولة التي حان وقتها
    const activateResult = await this.promotionModel.updateMany(
      {
        status: PromotionStatus.SCHEDULED,
        startDate: { $ne: null, $lte: now },
      },
      { $set: { status: PromotionStatus.ACTIVE } },
    );

    // إيقاف العروض المنتهية زمنياً
    const expireByTimeResult = await this.promotionModel.updateMany(
      {
        status: { $in: [PromotionStatus.ACTIVE, PromotionStatus.SCHEDULED] },
        endDate: { $ne: null, $lt: now },
      },
      { $set: { status: PromotionStatus.EXPIRED } },
    );

    // إيقاف العروض التي تجاوزت حد الاستخدام
    const expireByUsageResult = await this.promotionModel.updateMany(
      {
        status: PromotionStatus.ACTIVE,
        usageLimit: { $ne: null },
        $expr: { $gte: ['$timesUsed', '$usageLimit'] },
      },
      { $set: { status: PromotionStatus.EXPIRED } },
    );

    const modified =
      (activateResult.modifiedCount || 0) +
      (expireByTimeResult.modifiedCount || 0) +
      (expireByUsageResult.modifiedCount || 0);

    if (modified > 0) {
      this.logger.log(
        `Promotions status refreshed. Activated: ${activateResult.modifiedCount || 0}, expiredByTime: ${expireByTimeResult.modifiedCount || 0}, expiredByUsage: ${expireByUsageResult.modifiedCount || 0}`,
      );
    }
  }
}

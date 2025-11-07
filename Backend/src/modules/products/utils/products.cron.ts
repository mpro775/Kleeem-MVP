import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Model } from 'mongoose';

import { Product, ProductDocument } from '../schemas/product.schema';

@Injectable()
export class ProductsCron {
  private readonly logger = new Logger(ProductsCron.name);

  constructor(
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
  ) {}

  @Cron(CronExpression.EVERY_10_MINUTES)
  async disableExpiredOffers(): Promise<void> {
    const now = new Date();
    const res = await this.productModel.updateMany(
      {
        'offer.enabled': true,
        'offer.endAt': { $exists: true, $ne: null, $lt: now },
      },
      { $set: { 'offer.enabled': false } },
    );
    if (res.modifiedCount) {
      this.logger.log(`Offers disabled automatically: ${res.modifiedCount}`);
    }
  }

  /**
   * نشر المنتجات المؤجلة التي حان وقتها
   * يعمل كل 5 دقائق
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async publishScheduledProducts(): Promise<void> {
    const now = new Date();
    
    try {
      const res = await this.productModel.updateMany(
        {
          status: 'scheduled',
          scheduledPublishAt: { $exists: true, $ne: null, $lte: now },
        },
        {
          $set: {
            status: 'published',
            publishedAt: now,
          },
          $unset: { scheduledPublishAt: '' },
        },
      );

      if (res.modifiedCount > 0) {
        this.logger.log(
          `Published ${res.modifiedCount} scheduled product(s) automatically`,
        );
      }
    } catch (error) {
      this.logger.error(
        'Error publishing scheduled products',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}

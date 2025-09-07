import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Product, ProductDocument } from './schemas/product.schema';

@Injectable()
export class ProductsCron {
  private readonly logger = new Logger(ProductsCron.name);

  constructor(
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
  ) {}

  @Cron(CronExpression.EVERY_10_MINUTES)
  async disableExpiredOffers() {
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
}

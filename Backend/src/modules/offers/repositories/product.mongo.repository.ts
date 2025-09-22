import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import {
  Product,
  ProductDocument,
} from '../../products/schemas/product.schema';

import { ProductLean, ProductRepository } from './product.repository';

@Injectable()
export class ProductMongoRepository implements ProductRepository {
  constructor(
    @InjectModel(Product.name)
    private readonly model: Model<ProductDocument>,
  ) {}

  async findOffersByMerchant(
    merchantId: string,
    opts: { limit: number; offset: number },
  ): Promise<ProductLean[]> {
    const mId = new Types.ObjectId(merchantId);
    return this.model
      .find({
        merchantId: mId,
        'offer.enabled': true,
      })
      .sort({ updatedAt: -1 })
      .skip(opts.offset)
      .limit(opts.limit)
      .lean<ProductLean[]>()
      .exec();
  }
}

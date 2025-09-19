import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Product,
  ProductDocument,
} from '../../products/schemas/product.schema';
import {
  ProductEntity,
  StorefrontProductRepository,
} from './product.repository';

@Injectable()
export class StorefrontProductMongoRepository
  implements StorefrontProductRepository
{
  constructor(
    @InjectModel(Product.name)
    private readonly model: Model<ProductDocument>,
  ) {}

  async findActiveAvailableByMerchant(
    merchantId: string,
  ): Promise<ProductEntity[]> {
    return this.model
      .find({
        merchantId: new Types.ObjectId(merchantId),
        status: 'active',
        isAvailable: true,
      })
      .sort({ createdAt: -1 })
      .lean<ProductEntity[]>()
      .exec();
  }

  async updateManyByMerchantSet(
    merchantId: string,
    set: Partial<ProductEntity>,
  ): Promise<void> {
    await this.model
      .updateMany(
        { merchantId: new Types.ObjectId(merchantId) },
        { $set: set as any },
      )
      .exec();
  }

  async listIdsByMerchant(merchantId: string): Promise<string[]> {
    const ids = await this.model
      .find({ merchantId: new Types.ObjectId(merchantId) })
      .select('_id')
      .lean<{ _id: Types.ObjectId }[]>()
      .exec();
    return ids.map((d) => String(d._id));
  }

  async resaveById(id: string): Promise<void> {
    if (!Types.ObjectId.isValid(id)) return;
    const doc = await this.model.findById(id);
    if (!doc) return;
    await doc.save(); // trigger hooks if any
  }
}

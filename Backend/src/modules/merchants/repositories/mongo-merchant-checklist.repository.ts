import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Merchant, MerchantDocument } from '../schemas/merchant.schema';
import {
  Product,
  ProductDocument,
} from '../../products/schemas/product.schema';
import {
  Category,
  CategoryDocument,
} from '../../categories/schemas/category.schema';
import {
  Channel,
  ChannelDocument,
  ChannelProvider,
} from '../../channels/schemas/channel.schema';
import { MerchantChecklistRepository } from './merchant-checklist.repository';

@Injectable()
export class MongoMerchantChecklistRepository
  implements MerchantChecklistRepository
{
  constructor(
    @InjectModel(Merchant.name)
    private readonly merchantModel: Model<MerchantDocument>,
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
    @InjectModel(Category.name)
    private readonly categoryModel: Model<CategoryDocument>,
    @InjectModel(Channel.name)
    private readonly channelModel: Model<ChannelDocument>,
  ) {}

  async findMerchantLean(merchantId: string) {
    return this.merchantModel
      .findById(merchantId)
      .select([
        'logoUrl',
        'addresses',
        'publicSlug',
        'publicSlugEnabled',
        'quickConfig',
        'skippedChecklistItems',
        'productSourceConfig',
        'workingHours',
        'returnPolicy',
        'exchangePolicy',
        'shippingPolicy',
      ])
      .lean();
  }

  async countProducts(merchantId: string | Types.ObjectId) {
    const _id =
      typeof merchantId === 'string'
        ? new Types.ObjectId(merchantId)
        : merchantId;
    return this.productModel.countDocuments({ merchantId: _id });
  }

  async countCategories(merchantId: string | Types.ObjectId) {
    const _id =
      typeof merchantId === 'string'
        ? new Types.ObjectId(merchantId)
        : merchantId;
    return this.categoryModel.countDocuments({ merchantId: _id });
  }

  async getDefaultOrEnabledOrAnyChannel(
    merchantId: string,
    provider: ChannelProvider,
  ) {
    const q: any = {
      merchantId: new Types.ObjectId(merchantId),
      provider,
      deletedAt: null,
    };

    const def = await this.channelModel
      .findOne({ ...q, isDefault: true })
      .lean();
    if (def) return def;

    const enabled = await this.channelModel
      .findOne({ ...q, enabled: true })
      .sort({ updatedAt: -1 })
      .lean();
    if (enabled) return enabled;

    return this.channelModel.findOne(q).sort({ updatedAt: -1 }).lean();
  }
}

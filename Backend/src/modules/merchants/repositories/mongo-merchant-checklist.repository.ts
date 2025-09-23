import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, RootFilterQuery, Types } from 'mongoose';

import {
  Category,
  CategoryDocument,
} from '../../categories/schemas/category.schema';
import {
  Channel,
  ChannelDocument,
  ChannelProvider,
} from '../../channels/schemas/channel.schema';
import {
  Product,
  ProductDocument,
} from '../../products/schemas/product.schema';
import { Merchant, MerchantDocument } from '../schemas/merchant.schema';

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

  async findMerchantLean(
    merchantId: string,
  ): Promise<
    | (Pick<
        MerchantDocument,
        | '_id'
        | 'logoUrl'
        | 'addresses'
        | 'publicSlug'
        | 'publicSlugEnabled'
        | 'quickConfig'
        | 'skippedChecklistItems'
        | 'productSourceConfig'
        | 'workingHours'
        | 'returnPolicy'
        | 'exchangePolicy'
        | 'shippingPolicy'
      > &
        Record<string, unknown>)
    | null
  > {
    return this.merchantModel
      .findById(merchantId)
      .select([
        '_id',
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
      .lean() as Promise<
      | (Pick<
          MerchantDocument,
          | '_id'
          | 'logoUrl'
          | 'addresses'
          | 'publicSlug'
          | 'publicSlugEnabled'
          | 'quickConfig'
          | 'skippedChecklistItems'
          | 'productSourceConfig'
          | 'workingHours'
          | 'returnPolicy'
          | 'exchangePolicy'
          | 'shippingPolicy'
        > &
          Record<string, unknown>)
      | null
    >;
  }

  async countProducts(merchantId: string | Types.ObjectId): Promise<number> {
    const _id =
      typeof merchantId === 'string'
        ? new Types.ObjectId(merchantId)
        : merchantId;
    return this.productModel.countDocuments({ merchantId: _id });
  }

  async countCategories(merchantId: string | Types.ObjectId): Promise<number> {
    const _id =
      typeof merchantId === 'string'
        ? new Types.ObjectId(merchantId)
        : merchantId;
    return this.categoryModel.countDocuments({ merchantId: _id });
  }

  async getDefaultOrEnabledOrAnyChannel(
    merchantId: string,
    provider: ChannelProvider,
  ): Promise<
    | (Pick<ChannelDocument, 'enabled' | 'status' | 'isDefault'> &
        Record<string, unknown>)
    | null
  > {
    const q: RootFilterQuery<ChannelDocument> = {
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

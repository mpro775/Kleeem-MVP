// src/modules/public/slug-resolver.service.ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Merchant,
  MerchantDocument,
} from '../merchants/schemas/merchant.schema';
import {
  Channel,
  ChannelDocument,
  ChannelProvider,
} from '../channels/schemas/channel.schema';

@Injectable()
export class SlugResolverService {
  constructor(
    @InjectModel(Merchant.name) private merchants: Model<MerchantDocument>,
    @InjectModel(Channel.name) private channels: Model<ChannelDocument>,
  ) {}

  async resolve(slug: string) {
    const m = await this.merchants
      .findOne({ publicSlug: slug, publicSlugEnabled: true })
      .select('_id')
      .lean();
    if (!m) throw new Error('slug not found or disabled');
    const merchantId = String(m._id);

    const webchatDefault = await this.channels
      .findOne({
        merchantId: new Types.ObjectId(merchantId),
        provider: ChannelProvider.WEBCHAT,
        isDefault: true,
        deletedAt: null,
      })
      .select('_id')
      .lean();

    return {
      merchantId,
      webchatChannelId: webchatDefault?._id
        ? String(webchatDefault._id)
        : undefined,
    };
  }
}

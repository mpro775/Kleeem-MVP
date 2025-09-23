// src/modules/public/slug-resolver.service.ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import {
  Channel,
  ChannelDocument,
  ChannelProvider,
} from '../channels/schemas/channel.schema';
import {
  Merchant,
  MerchantDocument,
} from '../merchants/schemas/merchant.schema';

@Injectable()
export class SlugResolverService {
  constructor(
    @InjectModel(Merchant.name) private merchants: Model<MerchantDocument>,
    @InjectModel(Channel.name) private channels: Model<ChannelDocument>,
  ) {}

  async resolve(slug: string): Promise<{
    merchantId: string;
    webchatChannelId: string | undefined;
  }> {
    const m = await this.merchants
      .findOne({ publicSlug: slug, publicSlugEnabled: true })
      .select('_id')
      .lean();
    if (!m) throw new Error('slug not found or disabled');
    const merchantId = (m._id as Types.ObjectId).toString();

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
        ? (webchatDefault._id as Types.ObjectId).toString()
        : undefined,
    };
  }
}

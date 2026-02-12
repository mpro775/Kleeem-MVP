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
    const merchantId =
      m._id instanceof Types.ObjectId
        ? m._id.toHexString()
        : String(m._id as { toString?: () => string });

    const webchatDefault = await this.channels
      .findOne({
        merchantId: new Types.ObjectId(merchantId),
        provider: ChannelProvider.WEBCHAT,
        isDefault: true,
        deletedAt: null,
      })
      .select('_id')
      .lean();

    const webchatChannelId =
      webchatDefault?._id instanceof Types.ObjectId
        ? webchatDefault._id.toHexString()
        : webchatDefault?._id
          ? String(webchatDefault._id as { toString?: () => string })
          : undefined;

    return {
      merchantId,
      webchatChannelId,
    };
  }
}

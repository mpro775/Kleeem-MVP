import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import {
  Channel,
  ChannelDocument,
  ChannelProvider,
} from '../../channels/schemas/channel.schema';

import { ChannelLean, ChannelRepository } from './channel.repository';

@Injectable()
export class ChannelMongoRepository implements ChannelRepository {
  constructor(
    @InjectModel(Channel.name)
    private readonly model: Model<ChannelDocument>,
  ) {}

  private baseQuery(merchantId: string, provider: string) {
    return {
      merchantId: new Types.ObjectId(merchantId),
      provider,
      isDefault: true,
      deletedAt: null,
    } as Record<string, unknown>;
  }

  async findDefault(
    merchantId: string,
    provider: 'telegram' | 'whatsapp_cloud' | 'whatsapp_qr' | 'webchat',
  ): Promise<ChannelLean | null> {
    return this.model
      .findOne(this.baseQuery(merchantId, provider))
      .lean<ChannelLean>()
      .exec();
  }

  async findDefaultWithSecrets(
    merchantId: string,
    provider: 'telegram' | 'whatsapp_cloud' | 'whatsapp_qr' | 'webchat',
  ): Promise<ChannelLean | null> {
    const selectSecrets =
      '+botTokenEnc +accessTokenEnc +sessionId +appSecretEnc +verifyTokenHash';
    return this.model
      .findOne(this.baseQuery(merchantId, provider))
      .select(selectSecrets)
      .lean<ChannelLean>()
      .exec();
  }

  findDefaultWaCloudWithVerify(
    merchantId: string,
  ): Promise<Pick<ChannelLean, '_id' | 'verifyTokenHash'> | null> {
    return this.model
      .findOne(this.baseQuery(merchantId, ChannelProvider.WHATSAPP_CLOUD))
      .select('+verifyTokenHash')
      .lean()
      .exec() as Promise<Pick<ChannelLean, '_id' | 'verifyTokenHash'> | null>;
  }

  findDefaultWaCloudWithAppSecret(
    merchantId: string,
  ): Promise<Pick<ChannelLean, '_id' | 'appSecretEnc'> | null> {
    return this.model
      .findOne(this.baseQuery(merchantId, ChannelProvider.WHATSAPP_CLOUD))
      .select('+appSecretEnc')
      .lean()
      .exec() as Promise<Pick<ChannelLean, '_id' | 'appSecretEnc'> | null>;
  }
}

import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import {
  ClientSession,
  FilterQuery,
  HydratedDocument,
  Model,
  Types,
} from 'mongoose';

import { ChannelLean } from '../../webhooks/repositories/channel.repository';
import {
  Channel,
  ChannelDocument,
  ChannelProvider,
} from '../schemas/channel.schema';
import { ChannelStatus } from '../schemas/channel.schema';

import {
  ChannelsRepository,
  ChannelSecretsLean,
  ChannelsCountByMerchant,
  ListAllAdminParams,
  StatsAdminResult,
} from './channels.repository';

@Injectable()
export class MongoChannelsRepository implements ChannelsRepository {
  constructor(
    @InjectModel(Channel.name) private readonly model: Model<ChannelDocument>,
  ) {}

  async create(
    data: Partial<HydratedDocument<Channel>>,
  ): Promise<HydratedDocument<Channel>> {
    const doc = new this.model(data as unknown as ChannelDocument);
    await doc.save();
    return doc as HydratedDocument<Channel>;
  }

  async findById(
    id: string | Types.ObjectId,
  ): Promise<HydratedDocument<Channel> | null> {
    return this.model.findById(id);
  }

  async findLeanById(id: string | Types.ObjectId): Promise<ChannelLean | null> {
    return this.model.findById(id).lean() as Promise<ChannelLean | null>;
  }

  async findByIdWithSecrets(
    id: string | Types.ObjectId,
  ): Promise<ChannelSecretsLean | null> {
    return this.model
      .findById(id)
      .select(
        [
          '_id',
          'merchantId',
          'provider',
          'isDefault',
          'enabled',
          'deletedAt',
          'webhookUrl',

          // WhatsApp Cloud:
          'appSecretEnc',
          'verifyTokenHash',
          'accessTokenEnc',
          'phoneNumberId',

          // Telegram:
          'botTokenEnc',

          // WhatsApp QR:
          'sessionId',
        ].join(' '),
      )
      .lean<ChannelSecretsLean>()
      .exec();
  }

  async deleteOneById(id: string | Types.ObjectId): Promise<void> {
    await this.model.deleteOne({ _id: id } as FilterQuery<ChannelDocument>);
  }

  async listByMerchant(
    merchantId: Types.ObjectId,
    provider?: ChannelProvider,
  ): Promise<ChannelLean[]> {
    const q: FilterQuery<ChannelDocument> = { merchantId, deletedAt: null };
    if (provider) q.provider = provider;
    return this.model
      .find(q)
      .sort({ createdAt: 1 })
      .lean() as unknown as Promise<ChannelLean[]>;
  }

  async unsetDefaults(
    merchantId: Types.ObjectId,
    provider: ChannelProvider,
    exceptId?: Types.ObjectId,
  ): Promise<void> {
    const q: FilterQuery<ChannelDocument> = { merchantId, provider };
    if (exceptId) q._id = { $ne: exceptId };
    await this.model.updateMany(q, { $set: { isDefault: false } }).exec();
  }

  async findDefault(
    merchantId: Types.ObjectId,
    provider: ChannelProvider,
  ): Promise<ChannelLean | null> {
    return this.model
      .findOne({ merchantId, provider, isDefault: true, deletedAt: null })
      .lean() as unknown as Promise<ChannelLean | null>;
  }

  async listAllAdmin(
    params: ListAllAdminParams,
  ): Promise<{ items: ChannelLean[]; total: number }> {
    const { merchantId, provider, status, limit, page } = params;
    const filter: FilterQuery<ChannelDocument> = { deletedAt: null };
    if (merchantId) filter.merchantId = merchantId;
    if (provider) filter.provider = provider;
    if (status) filter.status = status;

    const [items, total] = await Promise.all([
      this.model
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean()
        .exec() as Promise<ChannelLean[]>,
      this.model.countDocuments(filter).exec(),
    ]);

    return { items, total };
  }

  async statsAdmin(): Promise<StatsAdminResult> {
    const baseMatch = { deletedAt: null };

    const [total, byProvider, byStatus] = await Promise.all([
      this.model.countDocuments(baseMatch).exec(),
      this.model
        .aggregate<{
          _id: string;
          count: number;
        }>([
          { $match: baseMatch },
          { $group: { _id: '$provider', count: { $sum: 1 } } },
        ])
        .exec(),
      this.model
        .aggregate<{
          _id: string;
          count: number;
        }>([
          { $match: baseMatch },
          { $group: { _id: '$status', count: { $sum: 1 } } },
        ])
        .exec(),
    ]);

    const byProviderMap: Record<string, number> = {};
    byProvider.forEach((p) => {
      byProviderMap[String(p._id)] = p.count;
    });
    const byStatusMap: Record<string, number> = {};
    byStatus.forEach((s) => {
      byStatusMap[String(s._id)] = s.count;
    });

    return {
      total,
      byProvider: byProviderMap,
      byStatus: byStatusMap,
    };
  }

  async countByMerchant(
    merchantId: Types.ObjectId,
  ): Promise<ChannelsCountByMerchant> {
    const filter: FilterQuery<ChannelDocument> = {
      merchantId,
      deletedAt: null,
    };
    const [total, enabled, connected] = await Promise.all([
      this.model.countDocuments(filter).exec(),
      this.model.countDocuments({ ...filter, enabled: true }).exec(),
      this.model
        .countDocuments({ ...filter, status: ChannelStatus.CONNECTED })
        .exec(),
    ]);
    return { total, enabled, connected };
  }

  async startSession(): Promise<ClientSession> {
    return this.model.db.startSession();
  }
}

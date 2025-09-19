import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, HydratedDocument, Model, Types } from 'mongoose';
import {
  Channel,
  ChannelDocument,
  ChannelProvider,
} from '../schemas/channel.schema';
import { ChannelsRepository } from './channels.repository';

@Injectable()
export class MongoChannelsRepository implements ChannelsRepository {
  constructor(
    @InjectModel(Channel.name) private readonly model: Model<ChannelDocument>,
  ) {}

  async create(
    data: Partial<HydratedDocument<Channel>>,
  ): Promise<HydratedDocument<Channel>> {
    const doc = new this.model(data as any);
    await doc.save();
    return doc as HydratedDocument<Channel>;
  }

  async findById(
    id: string | Types.ObjectId,
  ): Promise<HydratedDocument<Channel> | null> {
    return this.model.findById(id);
  }

  async findLeanById(id: string | Types.ObjectId) {
    return this.model.findById(id).lean();
  }

  async deleteOneById(id: string | Types.ObjectId): Promise<void> {
    await this.model.deleteOne({ _id: id } as any);
  }

  async listByMerchant(merchantId: Types.ObjectId, provider?: ChannelProvider) {
    const q: any = { merchantId, deletedAt: null };
    if (provider) q.provider = provider;
    return this.model.find(q).sort({ createdAt: 1 }).lean();
  }

  async unsetDefaults(
    merchantId: Types.ObjectId,
    provider: ChannelProvider,
    exceptId?: Types.ObjectId,
  ) {
    const q: any = { merchantId, provider };
    if (exceptId) q._id = { $ne: exceptId };
    await this.model.updateMany(q, { $set: { isDefault: false } }).exec();
  }

  async findDefault(merchantId: Types.ObjectId, provider: ChannelProvider) {
    return this.model
      .findOne({ merchantId, provider, isDefault: true, deletedAt: null })
      .lean();
  }

  async startSession(): Promise<ClientSession> {
    return this.model.db.startSession();
  }
}

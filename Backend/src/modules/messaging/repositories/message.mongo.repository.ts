import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import {
  ClientSession,
  Model,
  RootFilterQuery,
  Types,
  UpdateQuery,
} from 'mongoose';

import {
  MessageSession,
  MessageSessionDocument,
} from '../schemas/message.schema';

import {
  MessageItem,
  MessageRepository,
  MessageSessionEntity,
} from './message.repository';

@Injectable()
export class MessageMongoRepository implements MessageRepository {
  constructor(
    @InjectModel(MessageSession.name)
    private readonly model: Model<MessageSessionDocument>,
  ) {}

  async findByMerchantSessionChannel(
    merchantId: string,
    sessionId: string,
    channel?: string,
    opts?: { session?: ClientSession },
  ): Promise<MessageSessionEntity | null> {
    return this.model
      .findOne({
        merchantId: new Types.ObjectId(merchantId),
        sessionId,
        channel,
      })
      .session(opts?.session ?? null)
      .lean<MessageSessionEntity>()
      .exec();
  }

  async createSessionWithMessages(
    data: {
      merchantId: string;
      sessionId: string;
      channel?: string;
      messages: MessageItem[];
    },
    opts?: { session?: ClientSession },
  ): Promise<MessageSessionEntity> {
    const [doc] = await this.model.create(
      [
        {
          merchantId: new Types.ObjectId(data.merchantId),
          sessionId: data.sessionId,
          channel: data.channel,
          messages: data.messages,
        },
      ],
      { session: opts?.session },
    );
    return (await this.model.findById(doc._id).lean<MessageSessionEntity>())!;
  }

  async appendMessagesById(
    id: string,
    messages: MessageItem[],
    opts?: { session?: ClientSession },
  ): Promise<MessageSessionEntity> {
    await this.model.updateOne(
      { _id: new Types.ObjectId(id) },
      { $push: { messages: { $each: messages } } },
      opts?.session ? { session: opts.session } : {},
    );
    return (await this.model.findById(id).lean<MessageSessionEntity>().exec())!;
  }

  async findByWidgetSlugAndSession(
    slug: string,
    sessionId: string,
    channel: 'webchat',
  ): Promise<MessageSessionEntity | null> {
    const Widget = this.model.db.model('ChatWidgetSettings');
    const w = await Widget.findOne({
      $or: [{ widgetSlug: slug }, { publicSlug: slug }],
    })
      .select('merchantId')
      .lean();
    if (!w) return null;
    return this.model
      .findOne({
        merchantId: new Types.ObjectId(
          String((w as unknown as { merchantId: string }).merchantId),
        ),
        sessionId,
        channel,
      })
      .lean<MessageSessionEntity>()
      .exec();
  }

  async updateMessageRating(params: {
    sessionId: string;
    messageId: string;
    userId: string;
    rating: 0 | 1;
    feedback?: string;
    merchantId?: string;
  }): Promise<boolean> {
    const filter: RootFilterQuery<MessageSessionDocument> = {
      sessionId: params.sessionId,
      'messages._id': new Types.ObjectId(params.messageId),
    };

    const $set: Record<string, unknown> = {
      'messages.$.rating': params.rating,
      'messages.$.feedback': params.feedback ?? null,
      'messages.$.ratedBy': new Types.ObjectId(params.userId),
      'messages.$.ratedAt': new Date(),
    };
    if (params.merchantId) {
      $set.merchantId = new Types.ObjectId(params.merchantId);
    }

    const res = await this.model.updateOne(filter, { $set });
    return (res.matchedCount ?? 0) > 0;
  }

  async getMessageTextById(
    sessionId: string,
    messageId: string,
  ): Promise<string | undefined> {
    const doc = await this.model
      .findOne(
        { sessionId, 'messages._id': new Types.ObjectId(messageId) },
        { messages: { $elemMatch: { _id: new Types.ObjectId(messageId) } } },
      )
      .lean<{ messages?: Array<{ text?: string }> }>()
      .exec();
    return doc?.messages?.[0]?.text;
  }

  async findBySession(
    merchantId: string,
    sessionId: string,
  ): Promise<MessageSessionEntity | null> {
    return this.model
      .findOne({ merchantId: new Types.ObjectId(merchantId), sessionId })
      .lean<MessageSessionEntity>()
      .exec();
  }

  async findById(id: string): Promise<MessageSessionEntity | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    return this.model.findById(id).lean<MessageSessionEntity>().exec();
  }

  async setHandover(
    sessionId: string,
    merchantId: string,
    handoverToAgent: boolean,
  ): Promise<void> {
    await this.model.updateOne(
      { sessionId, merchantId: new Types.ObjectId(merchantId) },
      { $set: { handoverToAgent } },
    );
  }

  async updateById(
    id: string,
    patch: Partial<MessageSessionEntity>,
  ): Promise<MessageSessionEntity | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    return this.model
      .findByIdAndUpdate(id, patch as unknown as UpdateQuery<MessageSession>, {
        new: true,
      })
      .lean<MessageSessionEntity>()
      .exec();
  }

  async deleteById(id: string): Promise<boolean> {
    if (!Types.ObjectId.isValid(id)) return false;
    const res = await this.model
      .deleteOne({ _id: new Types.ObjectId(id) })
      .exec();
    return (res.deletedCount ?? 0) > 0;
  }

  async aggregateFrequentBadBotReplies(
    merchantId: string,
    limit = 10,
  ): Promise<Array<{ text: string; count: number; feedbacks: string[] }>> {
    const mid = new Types.ObjectId(merchantId);
    const agg = await this.model.aggregate([
      { $match: { merchantId: mid } },
      { $unwind: '$messages' },
      { $match: { 'messages.role': 'bot', 'messages.rating': 0 } },
      {
        $group: {
          _id: '$messages.text',
          count: { $sum: 1 },
          feedbacks: { $push: '$messages.feedback' },
        },
      },
      { $sort: { count: -1 } },
      { $limit: limit },
    ]);
    return agg.map(
      (item: { _id: string; count: number; feedbacks: string[] }) => ({
        text: item._id,
        count: item.count,
        feedbacks: (item.feedbacks || []).filter(Boolean),
      }),
    );
  }

  async findAll(filters: {
    merchantId?: string;
    channel?: string;
    limit: number;
    page: number;
  }): Promise<{ data: MessageSessionEntity[]; total: number }> {
    const query: RootFilterQuery<MessageSessionDocument> = {};
    if (filters.merchantId)
      query.merchantId = new Types.ObjectId(filters.merchantId);
    if (filters.channel) query.channel = filters.channel;

    const total = await this.model.countDocuments(query);
    const data = await this.model
      .find(query)
      .skip((filters.page - 1) * filters.limit)
      .limit(filters.limit)
      .sort({ updatedAt: -1 })
      .lean<MessageSessionEntity[]>()
      .exec();

    return { data, total };
  }
}

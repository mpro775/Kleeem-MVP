import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, PipelineStage } from 'mongoose';
import { BotChatSession } from '../schemas/botChats.schema';
import {
  AppendMessage,
  BotChatRepository,
  BotChatSessionLean,
} from './bot-chats.repository';

@Injectable()
export class BotChatsMongoRepository implements BotChatRepository {
  constructor(
    @InjectModel(BotChatSession.name)
    private readonly model: Model<BotChatSession>,
  ) {}

  async createOrAppend(
    sessionId: string,
    messages: AppendMessage[],
  ): Promise<BotChatSessionLean> {
    const doc = await this.model.findOne({ sessionId });
    const toInsert = messages.map((m) => ({
      role: m.role,
      text: m.text,
      metadata: m.metadata ?? {},
      timestamp: m.timestamp ?? new Date(),
    }));

    if (doc) {
      (doc as any).messages.push(...toInsert);
      doc.markModified('messages');
      const saved = await doc.save();
      return saved.toObject() as any;
    }
    const created = await this.model.create({
      sessionId,
      messages: toInsert,
    } as any);
    return created.toObject() as any;
  }

  async rateMessage(
    sessionId: string,
    msgIdx: number,
    rating: 0 | 1,
    feedback?: string,
  ): Promise<void> {
    const doc = await this.model.findOne({ sessionId });
    if (!doc || !(doc as any).messages[msgIdx]) {
      throw new Error('Message not found for rating');
    }
    (doc as any).messages[msgIdx].rating = rating;
    if (typeof feedback === 'string')
      (doc as any).messages[msgIdx].feedback = feedback;
    await doc.save();
  }

  async findBySession(sessionId: string): Promise<BotChatSessionLean | null> {
    return this.model.findOne({ sessionId }).lean<BotChatSessionLean>().exec();
  }

  async findAll(
    filter: FilterQuery<BotChatSession>,
    page: number,
    limit: number,
  ): Promise<{ data: BotChatSessionLean[]; total: number }> {
    const total = await this.model.countDocuments(filter);
    const data = await this.model
      .find(filter)
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ updatedAt: -1 })
      .lean<BotChatSessionLean[]>()
      .exec();

    return { data, total };
  }

  async aggregate(pipeline: PipelineStage[]) {
    return this.model.aggregate(pipeline);
  }

  async getFrequentBadBotReplies(limit = 10) {
    const agg = await this.model.aggregate([
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

    return agg.map((x) => ({
      text: x._id as string,
      count: x.count as number,
      feedbacks: (x.feedbacks as (string | null)[]).filter(Boolean) as string[],
    }));
  }

  async getTopQuestions(limit = 10) {
    const agg = await this.model.aggregate([
      { $unwind: '$messages' },
      { $match: { 'messages.role': 'user' } },
      { $group: { _id: '$messages.text', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: limit },
    ]);
    return agg.map((x) => ({
      question: x._id as string,
      count: x.count as number,
    }));
  }
}

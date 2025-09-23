import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, PipelineStage } from 'mongoose';

import { BotChatSession } from '../schemas/botChats.schema';

import {
  AppendMessage,
  BotChatRepository,
  BotChatSessionLean,
} from './bot-chats.repository';

// حارس نوع صغير
function isString(v: unknown): v is string {
  return typeof v === 'string';
}

// نتائج الـ aggregation لأنماطنا
type BadBotAggRow = {
  _id: string; // نص الردّ (رسالة البوت)
  count: number; // عدد التكرارات
  feedbacks: unknown[]; // قد تحتوي قيم غير نصية أو undefined
};

type TopQuestionAggRow = {
  _id: string; // السؤال
  count: number; // عدد التكرارات
};

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
      doc.messages.push(...toInsert);
      doc.markModified('messages');
      const saved = await doc.save();
      return saved.toObject() as BotChatSessionLean;
    }
    const created = await this.model.create({
      sessionId,
      messages: toInsert,
    });
    return created.toObject() as BotChatSessionLean;
  }

  async rateMessage(
    sessionId: string,
    msgIdx: number,
    rating: 0 | 1,
    feedback?: string,
  ): Promise<void> {
    const doc = await this.model.findOne({ sessionId });
    if (!doc || !doc.messages[msgIdx]) {
      throw new Error('Message not found for rating');
    }
    doc.messages[msgIdx].rating = rating;
    if (typeof feedback === 'string') doc.messages[msgIdx].feedback = feedback;
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

  async aggregate(pipeline: PipelineStage[]): Promise<unknown[]> {
    return this.model.aggregate(pipeline);
  }

  async getFrequentBadBotReplies(
    limit = 10,
  ): Promise<{ text: string; count: number; feedbacks: string[] }[]> {
    const agg = await this.model
      .aggregate<BadBotAggRow>([
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
      ])
      .allowDiskUse(true);

    return agg.map(({ _id, count, feedbacks }) => ({
      text: _id,
      count,
      feedbacks: feedbacks.filter(isString),
    }));
  }

  async getTopQuestions(
    limit = 10,
  ): Promise<{ question: string; count: number }[]> {
    const agg = await this.model
      .aggregate<TopQuestionAggRow>([
        { $unwind: '$messages' },
        { $match: { 'messages.role': 'user' } },
        { $group: { _id: '$messages.text', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: limit },
      ])
      .allowDiskUse(true);

    return agg.map(({ _id, count }) => ({
      question: _id,
      count,
    }));
  }
}

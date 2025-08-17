// src/modules/kleem/botChats/botChats.service.ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, PipelineStage } from 'mongoose';
import { BotChatSession } from './schemas/botChats.schema';
import { QueryBotRatingsDto } from './dto/query-bot-ratings.dto';

export interface AppendMessage {
  role: 'user' | 'bot';
  text: string;
  metadata?: Record<string, unknown>;
  timestamp?: Date;
}

@Injectable()
export class BotChatsService {
  constructor(
    @InjectModel(BotChatSession.name)
    private readonly botChatModel: Model<BotChatSession>,
  ) {}

  async createOrAppend(sessionId: string, messages: AppendMessage[]) {
    const doc = await this.botChatModel.findOne({ sessionId });
    const toInsert = messages.map((m) => ({
      role: m.role,
      text: m.text,
      metadata: m.metadata ?? {},
      timestamp: m.timestamp ?? new Date(),
    }));

    if (doc) {
      doc.messages.push(...toInsert);
      doc.markModified('messages');
      return doc.save();
    }
    return this.botChatModel.create({ sessionId, messages: toInsert });
  }

  async rateMessage(
    sessionId: string,
    msgIdx: number,
    rating: 0 | 1,
    feedback?: string,
  ) {
    const doc = await this.botChatModel.findOne({ sessionId });
    if (!doc || !doc.messages[msgIdx]) {
      throw new Error('Message not found for rating');
    }
    doc.messages[msgIdx].rating = rating;
    if (typeof feedback === 'string') doc.messages[msgIdx].feedback = feedback;
    await doc.save();
    return { status: 'ok' as const };
  }

  async findBySession(sessionId: string) {
    return this.botChatModel.findOne({ sessionId }).lean();
  }

  async findAll(page = 1, limit = 20, q?: string) {
    const filter: FilterQuery<BotChatSession> = {};
    if (q) (filter as any)['messages.text'] = { $regex: q, $options: 'i' };

    const total = await this.botChatModel.countDocuments(filter);
    const data = await this.botChatModel
      .find(filter)
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ updatedAt: -1 })
      .lean();

    return { data, total };
  }

  async listBotRatings(qry: QueryBotRatingsDto) {
    const { page, limit, rating, q, sessionId, from, to } = qry;
    const match: Record<string, any> = {
      'messages.role': 'bot',
      'messages.rating': { $ne: null },
    };
    if (rating === '1') match['messages.rating'] = 1;
    if (rating === '0') match['messages.rating'] = 0;
    if (sessionId) match['sessionId'] = sessionId;

    const textFilter: Record<string, any>[] = [];
    if (q) {
      textFilter.push({ 'messages.text': { $regex: q, $options: 'i' } });
      textFilter.push({ 'messages.feedback': { $regex: q, $options: 'i' } });
    }

    if (from || to) {
      match['messages.timestamp'] = {};
      if (from) match['messages.timestamp'].$gte = new Date(from);
      if (to) match['messages.timestamp'].$lte = new Date(to);
    }

    const pipeline: PipelineStage[] = [
      { $unwind: '$messages' },
      { $match: match },
      ...(textFilter.length ? [{ $match: { $or: textFilter } }] : []),
      { $sort: { 'messages.timestamp': -1 } },
      {
        $project: {
          _id: 0,
          id: {
            $concat: [
              { $toString: '$_id' },
              ':',
              { $toString: '$messages.timestamp' },
            ],
          }, // id اصطناعي للجدول
          sessionId: 1,
          updatedAt: 1,
          msgIdx: { $indexOfArray: ['$messages', '$messages'] }, // لا يعمل هكذا في التجميع — لذا لا نعيده (اختياري)
          message: '$messages.text',
          rating: '$messages.rating',
          feedback: '$messages.feedback',
          timestamp: '$messages.timestamp',
        },
      },
      {
        $facet: {
          items: [{ $skip: (page - 1) * limit }, { $limit: limit }],
          meta: [{ $count: 'total' }],
        },
      },
    ];

    const res = await this.botChatModel.aggregate(pipeline);
    const items = res[0]?.items ?? [];
    const total = res[0]?.meta?.[0]?.total ?? 0;
    return { items, total, page, limit };
  }

  // إحصائيات سريعة
  async botRatingsStats(from?: string, to?: string) {
    const match: Record<string, any> = {
      'messages.role': 'bot',
      'messages.rating': { $ne: null },
    };
    if (from || to) {
      match['messages.timestamp'] = {};
      if (from) match['messages.timestamp'].$gte = new Date(from);
      if (to) match['messages.timestamp'].$lte = new Date(to);
    }

    const [agg] = await this.botChatModel.aggregate([
      { $unwind: '$messages' },
      { $match: match },
      {
        $group: {
          _id: null,
          totalRated: { $sum: 1 },
          thumbsUp: {
            $sum: { $cond: [{ $eq: ['$messages.rating', 1] }, 1, 0] },
          },
          thumbsDown: {
            $sum: { $cond: [{ $eq: ['$messages.rating', 0] }, 1, 0] },
          },
        },
      },
      {
        $project: {
          _id: 0,
          totalRated: 1,
          thumbsUp: 1,
          thumbsDown: 1,
          upRate: {
            $cond: [
              { $gt: ['$totalRated', 0] },
              { $divide: ['$thumbsUp', '$totalRated'] },
              0,
            ],
          },
        },
      },
    ]);

    // Top أسوأ ردود (الأكثر 👎)
    const topBad = await this.getFrequentBadBotReplies(10);

    // توزيع أسبوعي (آخر 8 أسابيع)
    const weekly = await this.botChatModel.aggregate([
      { $unwind: '$messages' },
      { $match: match },
      {
        $group: {
          _id: {
            y: { $year: '$messages.timestamp' },
            w: { $isoWeek: '$messages.timestamp' },
          },
          total: { $sum: 1 },
          up: { $sum: { $cond: [{ $eq: ['$messages.rating', 1] }, 1, 0] } },
          down: { $sum: { $cond: [{ $eq: ['$messages.rating', 0] }, 1, 0] } },
        },
      },
      { $sort: { '_id.y': -1, '_id.w': -1 } },
      { $limit: 8 },
    ]);

    return {
      summary: agg ?? { totalRated: 0, thumbsUp: 0, thumbsDown: 0, upRate: 0 },
      weekly: weekly.reverse(),
      topBad,
    };
  }
  // إحصائيات
  async getTopQuestions(limit = 10) {
    const agg = await this.botChatModel.aggregate([
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

  async getFrequentBadBotReplies(limit = 10) {
    const agg = await this.botChatModel.aggregate([
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
}

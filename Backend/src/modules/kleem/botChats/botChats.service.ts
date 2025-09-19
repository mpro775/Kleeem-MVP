import { Inject, Injectable } from '@nestjs/common';
import { FilterQuery, PipelineStage } from 'mongoose';
import { BotChatSession } from './schemas/botChats.schema';
import { QueryBotRatingsDto } from './dto/query-bot-ratings.dto';
import {
  AppendMessage,
  BotChatRepository,
} from './repositories/bot-chats.repository';
import { BOT_CHAT_REPOSITORY } from './tokens';

@Injectable()
export class BotChatsService {
  constructor(
    @Inject(BOT_CHAT_REPOSITORY)
    private readonly repo: BotChatRepository,
  ) {}

  async createOrAppend(sessionId: string, messages: AppendMessage[]) {
    return this.repo.createOrAppend(sessionId, messages);
  }

  async rateMessage(
    sessionId: string,
    msgIdx: number,
    rating: 0 | 1,
    feedback?: string,
  ) {
    await this.repo.rateMessage(sessionId, msgIdx, rating, feedback);
    return { status: 'ok' as const };
  }

  async findBySession(sessionId: string) {
    return this.repo.findBySession(sessionId);
  }

  async findAll(page = 1, limit = 20, q?: string) {
    const filter: FilterQuery<BotChatSession> = {};
    if (q) (filter as any)['messages.text'] = { $regex: q, $options: 'i' };
    return this.repo.findAll(filter, page, limit);
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
          },
          sessionId: 1,
          updatedAt: 1,
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

    const res = await this.repo.aggregate(pipeline);
    const items = res[0]?.items ?? [];
    const total = res[0]?.meta?.[0]?.total ?? 0;
    return { items, total, page, limit };
  }

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

    const [agg] = await this.repo.aggregate([
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

    const weekly = await this.repo.aggregate([
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

    const topBad = await this.repo.getFrequentBadBotReplies(10);

    return {
      summary: agg ?? { totalRated: 0, thumbsUp: 0, thumbsDown: 0, upRate: 0 },
      weekly: weekly.reverse(),
      topBad,
    };
  }

  async getTopQuestions(limit = 10) {
    return this.repo.getTopQuestions(limit);
  }

  async getFrequentBadBotReplies(limit = 10) {
    return this.repo.getFrequentBadBotReplies(limit);
  }
}

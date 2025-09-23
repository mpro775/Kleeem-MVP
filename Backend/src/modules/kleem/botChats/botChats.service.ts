import { Inject, Injectable } from '@nestjs/common';
import { FilterQuery, PipelineStage } from 'mongoose';

import { QueryBotRatingsDto } from './dto/query-bot-ratings.dto';
import {
  AppendMessage,
  BotChatRepository,
  BotChatSessionLean,
} from './repositories/bot-chats.repository';
import { BotChatSession } from './schemas/botChats.schema';
import { BOT_CHAT_REPOSITORY } from './tokens';

@Injectable()
export class BotChatsService {
  constructor(
    @Inject(BOT_CHAT_REPOSITORY)
    private readonly repo: BotChatRepository,
  ) {}

  async createOrAppend(
    sessionId: string,
    messages: AppendMessage[],
  ): Promise<BotChatSessionLean> {
    return this.repo.createOrAppend(sessionId, messages);
  }

  async rateMessage(
    sessionId: string,
    msgIdx: number,
    rating: 0 | 1,
    feedback?: string,
  ): Promise<{ status: string }> {
    await this.repo.rateMessage(sessionId, msgIdx, rating, feedback);
    return { status: 'ok' as const };
  }

  async findBySession(sessionId: string): Promise<BotChatSessionLean | null> {
    return this.repo.findBySession(sessionId);
  }

  async findAll(
    page = 1,
    limit = 20,
    q?: string,
  ): Promise<{ data: BotChatSessionLean[]; total: number }> {
    const filter: FilterQuery<BotChatSession> = {};
    if (q)
      (filter as Record<string, unknown>)['messages.text'] = {
        $regex: q,
        $options: 'i',
      };
    return this.repo.findAll(filter, page, limit);
  }

  private buildBotRatingsMatch(
    qry: QueryBotRatingsDto,
  ): Record<string, unknown> {
    const { rating, sessionId, from, to } = qry;
    const match: Record<string, unknown> = {
      'messages.role': 'bot',
      'messages.rating': { $ne: null },
    };
    if (rating === '1') match['messages.rating'] = 1;
    if (rating === '0') match['messages.rating'] = 0;
    if (sessionId) match['sessionId'] = sessionId;
    if (from || to) {
      const timestampFilter: Record<string, unknown> = {};
      if (from) timestampFilter.$gte = new Date(from);
      if (to) timestampFilter.$lte = new Date(to);
      match['messages.timestamp'] = timestampFilter;
    }
    return match;
  }

  private buildBotRatingsTextFilter(q?: string): Record<string, unknown>[] {
    return q
      ? [
          { 'messages.text': { $regex: q, $options: 'i' } },
          { 'messages.feedback': { $regex: q, $options: 'i' } },
        ]
      : [];
  }

  async listBotRatings(qry: QueryBotRatingsDto): Promise<{
    items: Array<{
      id: string;
      sessionId: string;
      updatedAt: Date;
      message: string;
      rating: 0 | 1;
      feedback?: string;
      timestamp: Date;
    }>;
    total: number;
    page: number;
    limit: number;
  }> {
    const { page, limit, q } = qry;
    const match = this.buildBotRatingsMatch(qry);
    const textFilter = this.buildBotRatingsTextFilter(q);

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

    const res = (await this.repo.aggregate(pipeline)) as Array<{
      items?: Array<{
        id: string;
        sessionId: string;
        updatedAt: Date;
        message: string;
        rating: 0 | 1;
        feedback?: string;
        timestamp: Date;
      }>;
      meta?: Array<{ total?: number }>;
    }>;
    const items = res[0]?.items ?? [];
    const total = res[0]?.meta?.[0]?.total ?? 0;
    return { items, total, page, limit };
  }

  async botRatingsStats(
    from?: string,
    to?: string,
  ): Promise<{
    summary: {
      totalRated: number;
      thumbsUp: number;
      thumbsDown: number;
      upRate: number;
    };
    weekly: unknown[];
    topBad: Array<{ text: string; count: number; feedbacks: string[] }>;
  }> {
    const match: Record<string, unknown> = {
      'messages.role': 'bot',
      'messages.rating': { $ne: null },
    };
    if (from || to) {
      const timestampFilter: Record<string, unknown> = {};
      if (from) timestampFilter.$gte = new Date(from);
      if (to) timestampFilter.$lte = new Date(to);
      match['messages.timestamp'] = timestampFilter;
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
      summary: (agg ?? {
        totalRated: 0,
        thumbsUp: 0,
        thumbsDown: 0,
        upRate: 0,
      }) as {
        totalRated: number;
        thumbsUp: number;
        thumbsDown: number;
        upRate: number;
      },
      weekly: weekly.reverse(),
      topBad,
    };
  }

  async getTopQuestions(
    limit = 10,
  ): Promise<{ question: string; count: number }[]> {
    return this.repo.getTopQuestions(limit);
  }

  async getFrequentBadBotReplies(
    limit = 10,
  ): Promise<{ text: string; count: number; feedbacks: string[] }[]> {
    return this.repo.getFrequentBadBotReplies(limit);
  }
}

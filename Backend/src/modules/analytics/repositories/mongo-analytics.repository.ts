import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, FilterQuery, RootFilterQuery } from 'mongoose';
import { PipelineStage } from 'mongoose';
import { MS_PER_SECOND } from 'src/common/constants/common';

import {
  Channel,
  ChannelDocument,
  ChannelProvider,
  ChannelStatus,
} from '../../channels/schemas/channel.schema';
import {
  MessageSession,
  MessageSessionDocument,
} from '../../messaging/schemas/message.schema';
import { Order, OrderDocument } from '../../orders/schemas/order.schema';
import {
  Product,
  ProductDocument,
} from '../../products/schemas/product.schema';
import { KeywordCount, ChannelCount, TopProduct } from '../analytics.service';
import { CreateKleemMissingResponseDto } from '../dto/create-kleem-missing-response.dto';
import { CreateMissingResponseDto } from '../dto/create-missing-response.dto';
import {
  KleemMissingResponse,
  KleemMissingResponseDocument,
} from '../schemas/kleem-missing-response.schema';
import {
  MissingResponse,
  MissingResponseDocument,
} from '../schemas/missing-response.schema';

import { AnalyticsRepository, TimelineEntry } from './analytics.repository';

// Local interfaces for response types
interface StatsResult {
  [key: string]: unknown;
}

@Injectable()
export class MongoAnalyticsRepository implements AnalyticsRepository {
  constructor(
    @InjectModel(MessageSession.name)
    private readonly sessionModel: Model<MessageSessionDocument>,
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
    @InjectModel(Order.name) private readonly orderModel: Model<OrderDocument>,
    @InjectModel(MissingResponse.name)
    private readonly missingResponseModel: Model<MissingResponseDocument>,
    @InjectModel(KleemMissingResponse.name)
    private readonly kleemMissingModel: Model<KleemMissingResponseDocument>,
    @InjectModel(Channel.name)
    private readonly channelModel: Model<ChannelDocument>,
  ) {}

  async countSessions(
    merchantId: Types.ObjectId,
    start: Date,
    end: Date,
  ): Promise<number> {
    return this.sessionModel.countDocuments({
      merchantId,
      createdAt: { $gte: start, $lte: end },
    });
  }

  async aggregateTotalMessages(
    merchantId: Types.ObjectId,
    start: Date,
    end: Date,
  ): Promise<number> {
    const agg = await this.sessionModel.aggregate<{ _id: null; total: number }>(
      [
        { $match: { merchantId, createdAt: { $gte: start, $lte: end } } },
        { $project: { count: { $size: '$messages' } } },
        { $group: { _id: null, total: { $sum: '$count' } } },
      ],
    );
    return agg[0]?.total ?? 0;
  }

  async countOrders(
    merchantId: Types.ObjectId,
    start: Date,
    end: Date,
  ): Promise<number> {
    return this.orderModel.countDocuments({
      merchantId,
      createdAt: { $gte: start, $lte: end },
    });
  }

  async aggregateOrdersByStatus(
    merchantId: Types.ObjectId,
    start: Date,
    end: Date,
  ): Promise<Record<string, number>> {
    const rows = await this.orderModel.aggregate<{
      _id: string;
      count: number;
    }>([
      { $match: { merchantId, createdAt: { $gte: start, $lte: end } } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);
    const out: Record<string, number> = {};
    for (const r of rows) out[r._id] = r.count;
    return out;
  }

  async sumNonCanceledSales(
    merchantId: Types.ObjectId,
    start: Date,
    end: Date,
  ): Promise<number> {
    const rows = await this.orderModel.aggregate<{ _id: null; total: number }>([
      {
        $match: {
          merchantId,
          createdAt: { $gte: start, $lte: end },
          status: { $ne: 'canceled' },
        },
      },
      { $group: { _id: null, total: { $sum: '$total' } } },
    ]);
    return rows[0]?.total || 0;
  }

  async topKeywords(
    merchantId: Types.ObjectId,
    start: Date,
    end: Date,
    limit: number,
  ): Promise<KeywordCount[]> {
    return this.sessionModel.aggregate<KeywordCount>([
      { $match: { merchantId, createdAt: { $gte: start, $lte: end } } },
      { $unwind: '$messages' },
      { $unwind: '$messages.keywords' },
      { $group: { _id: '$messages.keywords', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: limit },
      { $project: { keyword: '$_id', count: 1, _id: 0 } },
    ]);
  }

  async topProducts(
    merchantId: Types.ObjectId,
    start: Date,
    end: Date,
    limit: number,
  ): Promise<TopProduct[]> {
    return this.sessionModel
      .aggregate<TopProduct>([
        { $match: { merchantId, createdAt: { $gte: start, $lte: end } } },
        { $unwind: '$messages' },
        { $match: { 'messages.metadata.event': 'product_click' } },
        { $group: { _id: '$messages.metadata.productId', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: limit },
        {
          $lookup: {
            from: 'products',
            let: { pid: '$_id' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $eq: [
                      '$_id',
                      {
                        $cond: [
                          { $ne: [{ $type: '$$pid' }, 'objectId'] },
                          { $toObjectId: '$$pid' },
                          '$$pid',
                        ],
                      },
                    ],
                  },
                },
              },
            ],
            as: 'product',
          },
        },
        { $unwind: '$product' },
        {
          $project: {
            productId: '$_id',
            name: '$product.name',
            count: 1,
            _id: 0,
          },
        },
      ])
      .then((res) => res);
  }

  async getEnabledLogicalChannels(
    merchantId: Types.ObjectId,
  ): Promise<Set<'telegram' | 'whatsapp' | 'webchat'>> {
    const rows = await this.channelModel
      .find({
        merchantId,
        enabled: true,
        deletedAt: null,
        status: { $ne: ChannelStatus.DISCONNECTED },
        provider: {
          $in: [
            ChannelProvider.TELEGRAM,
            ChannelProvider.WHATSAPP_CLOUD,
            ChannelProvider.WHATSAPP_QR,
            ChannelProvider.WEBCHAT,
          ],
        },
      })
      .select(['provider'])
      .lean();

    const set = new Set<'telegram' | 'whatsapp' | 'webchat'>();
    for (const r of rows) {
      if (r.provider === ChannelProvider.TELEGRAM) set.add('telegram');
      else if (r.provider === ChannelProvider.WEBCHAT) set.add('webchat');
      else if (
        r.provider === ChannelProvider.WHATSAPP_CLOUD ||
        r.provider === ChannelProvider.WHATSAPP_QR
      )
        set.add('whatsapp');
    }
    return set;
  }

  async channelsUsage(
    merchantId: Types.ObjectId,
    start: Date,
    end: Date,
  ): Promise<ChannelCount[]> {
    return this.sessionModel.aggregate<ChannelCount>([
      { $match: { merchantId, createdAt: { $gte: start, $lte: end } } },
      { $group: { _id: '$channel', count: { $sum: 1 } } },
      { $project: { channel: '$_id', count: 1, _id: 0 } },
    ]);
  }

  async getCsat(
    merchantId: Types.ObjectId,
    start: Date,
    end: Date,
  ): Promise<number | null> {
    const r: Array<{ csat: number | null }> = await this.sessionModel.aggregate(
      [
        { $match: { merchantId, createdAt: { $gte: start, $lte: end } } },
        { $unwind: '$messages' },
        {
          $match: {
            'messages.role': 'bot',
            'messages.rating': { $in: [0, 1] },
          },
        },
        {
          $group: {
            _id: null,
            up: { $sum: { $cond: [{ $eq: ['$messages.rating', 1] }, 1, 0] } },
            dn: { $sum: { $cond: [{ $eq: ['$messages.rating', 0] }, 1, 0] } },
          },
        },
        {
          $project: {
            _id: 0,
            csat: {
              $cond: [
                { $eq: [{ $add: ['$up', '$dn'] }, 0] },
                null,
                { $divide: ['$up', { $add: ['$up', '$dn'] }] },
              ],
            },
          },
        },
      ],
    );
    const value = r?.[0]?.csat ?? null;
    return typeof value === 'number' || value === null ? value : null;
  }

  async getFirstResponseTimeSec(
    merchantId: Types.ObjectId,
    start: Date,
    end: Date,
  ): Promise<number | null> {
    const r: Array<{ avgSec: number | null }> =
      await this.sessionModel.aggregate([
        { $match: { merchantId, createdAt: { $gte: start, $lte: end } } },
        {
          $project: {
            firstCustomer: {
              $min: {
                $map: {
                  input: {
                    $filter: {
                      input: '$messages',
                      as: 'm',
                      cond: { $eq: ['$$m.role', 'customer'] },
                    },
                  },
                  as: 'm',
                  in: '$$m.timestamp',
                },
              },
            },
            firstBot: {
              $min: {
                $map: {
                  input: {
                    $filter: {
                      input: '$messages',
                      as: 'm',
                      cond: { $eq: ['$$m.role', 'bot'] },
                    },
                  },
                  as: 'm',
                  in: '$$m.timestamp',
                },
              },
            },
          },
        },
        {
          $project: {
            diffSec: {
              $cond: [
                {
                  $and: [
                    '$firstCustomer',
                    '$firstBot',
                    { $gt: ['$firstBot', '$firstCustomer'] },
                  ],
                },
                {
                  $divide: [
                    { $subtract: ['$firstBot', '$firstCustomer'] },
                    MS_PER_SECOND,
                  ],
                },
                null,
              ],
            },
          },
        },
        { $match: { diffSec: { $ne: null } } },
        { $group: { _id: null, avgSec: { $avg: '$diffSec' } } },
        { $project: { _id: 0, avgSec: { $round: ['$avgSec', 1] } } },
      ]);
    const value = r?.[0]?.avgSec ?? null;
    return typeof value === 'number' || value === null ? value : null;
  }

  async countMissingOpen(merchantId: Types.ObjectId): Promise<number> {
    return this.missingResponseModel.countDocuments({
      merchant: merchantId,
      resolved: false,
    });
  }

  async createMissingFromWebhook(
    dto: CreateMissingResponseDto,
  ): Promise<MissingResponseDocument> {
    return this.missingResponseModel.create({
      ...dto,
      merchant: new Types.ObjectId(dto.merchant),
      resolved: dto.resolved ?? false,
    });
  }

  async listMissingResponses(
    filter: RootFilterQuery<MissingResponseDocument>,
    skip: number,
    limit: number,
  ): Promise<{ items: MissingResponseDocument[]; total: number }> {
    const [items, total] = await Promise.all([
      this.missingResponseModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.missingResponseModel.countDocuments(filter),
    ]);
    return { items, total };
  }

  async markMissingResolved(
    id: string,
    userId?: string,
  ): Promise<MissingResponseDocument> {
    const updated = await this.missingResponseModel.findByIdAndUpdate(
      id,
      { resolved: true, resolvedAt: new Date(), resolvedBy: userId ?? null },
      { new: true },
    );
    return updated!;
  }

  async bulkResolveMissing(
    ids: string[],
    userId?: string,
  ): Promise<{ updated: number }> {
    const now = new Date();
    await this.missingResponseModel.updateMany(
      { _id: { $in: ids.map((i) => new Types.ObjectId(i)) } },
      { $set: { resolved: true, resolvedAt: now, resolvedBy: userId ?? null } },
    );
    return { updated: ids.length };
  }

  async statsMissing(merchantId: string, from: Date): Promise<StatsResult[]> {
    const pipeline = [
      {
        $match: {
          merchant: new Types.ObjectId(merchantId),
          createdAt: { $gte: from },
        },
      },
      {
        $group: {
          _id: {
            day: { $dateToString: { date: '$createdAt', format: '%Y-%m-%d' } },
            channel: '$channel',
            resolved: '$resolved',
          },
          count: { $sum: 1 },
        },
      },
      {
        $group: {
          _id: '$_id.day',
          channels: {
            $push: {
              channel: '$_id.channel',
              resolved: '$_id.resolved',
              count: '$count',
            },
          },
          total: { $sum: '$count' },
        },
      },
      { $sort: { _id: 1 } },
    ];
    return this.missingResponseModel.aggregate(pipeline as PipelineStage[]);
  }

  async countPaidOrders(
    merchantId: Types.ObjectId,
    start: Date,
    end: Date,
  ): Promise<number> {
    return this.orderModel.countDocuments({
      merchantId,
      createdAt: { $gte: start, $lte: end },
      status: 'paid',
    });
  }

  async countProducts(merchantId: Types.ObjectId): Promise<number> {
    return this.productModel.countDocuments({ merchantId });
  }

  async messagesTimeline(
    merchantId: Types.ObjectId,
    start: Date,
    end: Date,
    groupBy: 'day' | 'hour',
  ): Promise<TimelineEntry[]> {
    const dateFormat = groupBy === 'hour' ? '%Y-%m-%d %H:00' : '%Y-%m-%d';
    return this.sessionModel.aggregate([
      { $match: { merchantId, createdAt: { $gte: start, $lte: end } } },
      { $unwind: '$messages' },
      {
        $group: {
          _id: {
            $dateToString: { format: dateFormat, date: '$messages.timestamp' },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);
  }

  async getTopKeywords(
    merchantId: Types.ObjectId,
    start: Date,
    end: Date,
    limit: number,
  ): Promise<KeywordCount[]> {
    return this.topKeywords(merchantId, start, end, limit);
  }

  async createKleemFromWebhook(
    dto: CreateKleemMissingResponseDto,
  ): Promise<KleemMissingResponseDocument> {
    dto.question = (dto.question || '').trim();
    if (dto.botReply) dto.botReply = dto.botReply.trim();
    return this.kleemMissingModel.create({
      ...dto,
      resolved: dto.resolved ?? false,
    });
  }

  async listKleemMissing(
    filter: FilterQuery<KleemMissingResponseDocument>,
    skip: number,
    limit: number,
  ): Promise<{ items: KleemMissingResponseDocument[]; total: number }> {
    const [items, total] = await Promise.all([
      this.kleemMissingModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.kleemMissingModel.countDocuments(filter),
    ]);
    return { items, total };
  }

  async updateKleemMissing(
    id: string,
    update: Partial<{
      resolved: boolean;
      manualReply: string;
      category: string;
    }>,
  ): Promise<KleemMissingResponseDocument> {
    const updated = await this.kleemMissingModel
      .findByIdAndUpdate(
        id,
        {
          ...(update.manualReply !== undefined
            ? { manualReply: update.manualReply }
            : {}),
          ...(update.category !== undefined
            ? { category: update.category }
            : {}),
          ...(update.resolved !== undefined
            ? { resolved: update.resolved }
            : {}),
        },
        { new: true },
      )
      .lean();
    return updated!;
  }

  async bulkResolveKleem(ids: string[]): Promise<{ updated: number }> {
    await this.kleemMissingModel.updateMany(
      { _id: { $in: ids } },
      { $set: { resolved: true } },
    );
    return { updated: ids.length };
  }
}

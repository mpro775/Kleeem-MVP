import { Types } from 'mongoose';
import {
  KeywordCount,
  ChannelCount,
  TopProduct,
} from '../../analytics/analytics.service';
import { MissingResponseDocument } from '../schemas/missing-response.schema';
import { KleemMissingResponseDocument } from '../schemas/kleem-missing-response.schema';

export interface AnalyticsRepository {
  // Sessions
  countSessions(
    merchantId: Types.ObjectId,
    start: Date,
    end: Date,
  ): Promise<number>;
  // Messages
  aggregateTotalMessages(
    merchantId: Types.ObjectId,
    start: Date,
    end: Date,
  ): Promise<number>;
  // Orders
  countOrders(
    merchantId: Types.ObjectId,
    start: Date,
    end: Date,
  ): Promise<number>;
  aggregateOrdersByStatus(
    merchantId: Types.ObjectId,
    start: Date,
    end: Date,
  ): Promise<Record<string, number>>;
  sumNonCanceledSales(
    merchantId: Types.ObjectId,
    start: Date,
    end: Date,
  ): Promise<number>;
  // Keywords & Products
  topKeywords(
    merchantId: Types.ObjectId,
    start: Date,
    end: Date,
    limit: number,
  ): Promise<KeywordCount[]>;
  topProducts(
    merchantId: Types.ObjectId,
    start: Date,
    end: Date,
    limit: number,
  ): Promise<TopProduct[]>;
  // Channels
  getEnabledLogicalChannels(
    merchantId: Types.ObjectId,
  ): Promise<Set<'telegram' | 'whatsapp' | 'webchat'>>;
  channelsUsage(
    merchantId: Types.ObjectId,
    start: Date,
    end: Date,
  ): Promise<ChannelCount[]>;
  // CSAT & FRT
  getCsat(
    merchantId: Types.ObjectId,
    start: Date,
    end: Date,
  ): Promise<number | null>;
  getFirstResponseTimeSec(
    merchantId: Types.ObjectId,
    start: Date,
    end: Date,
  ): Promise<number | null>;
  // Missing (classic)
  countMissingOpen(merchantId: Types.ObjectId): Promise<number>;
  createMissingFromWebhook(dto: any): Promise<MissingResponseDocument>;
  listMissingResponses(
    filter: any,
    skip: number,
    limit: number,
  ): Promise<{ items: any[]; total: number }>;
  markMissingResolved(id: string, userId?: string): Promise<any>;
  bulkResolveMissing(
    ids: string[],
    userId?: string,
  ): Promise<{ updated: number }>;
  statsMissing(merchantId: string, from: Date): Promise<any[]>;
  // Store extras
  countPaidOrders(
    merchantId: Types.ObjectId,
    start: Date,
    end: Date,
  ): Promise<number>;
  // Products
  countProducts(merchantId: Types.ObjectId): Promise<number>;
  // Timeline / extra queries
  messagesTimeline(
    merchantId: Types.ObjectId,
    start: Date,
    end: Date,
    groupBy: 'day' | 'hour',
  ): Promise<any[]>;
  getTopKeywords(
    merchantId: Types.ObjectId,
    start: Date,
    end: Date,
    limit: number,
  ): Promise<KeywordCount[]>;
  // Kleem Missing
  createKleemFromWebhook(dto: any): Promise<KleemMissingResponseDocument>;
  listKleemMissing(
    filter: any,
    skip: number,
    limit: number,
  ): Promise<{ items: any[]; total: number }>;
  updateKleemMissing(
    id: string,
    update: Partial<{
      resolved: boolean;
      manualReply: string;
      category: string;
    }>,
  ): Promise<any>;
  bulkResolveKleem(ids: string[]): Promise<{ updated: number }>;
}

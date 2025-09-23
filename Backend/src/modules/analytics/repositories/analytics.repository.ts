import type {
  KeywordCount,
  ChannelCount,
  TopProduct,
} from '../../analytics/analytics.service';
import type { CreateKleemMissingResponseDto } from '../dto/create-kleem-missing-response.dto';
import type { CreateMissingResponseDto } from '../dto/create-missing-response.dto';
import type { KleemMissingResponseDocument } from '../schemas/kleem-missing-response.schema';
import type { MissingResponseDocument } from '../schemas/missing-response.schema';
// Additional imports for proper typing
import type { RootFilterQuery, FilterQuery, Types } from 'mongoose';

// Response types
export interface StatsResult {
  [key: string]: unknown;
}

export interface TimelineEntry {
  _id: string;
  count: number;
}

export interface UpdateKleemMissingDto {
  resolved?: boolean;
  manualReply?: string;
  category?: string;
}

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
  createMissingFromWebhook(
    dto: CreateMissingResponseDto,
  ): Promise<MissingResponseDocument>;
  listMissingResponses(
    filter: RootFilterQuery<MissingResponseDocument>,
    skip: number,
    limit: number,
  ): Promise<{ items: MissingResponseDocument[]; total: number }>;
  markMissingResolved(
    id: string,
    userId?: string,
  ): Promise<MissingResponseDocument>;
  bulkResolveMissing(
    ids: string[],
    userId?: string,
  ): Promise<{ updated: number }>;
  statsMissing(merchantId: string, from: Date): Promise<StatsResult[]>;
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
  ): Promise<TimelineEntry[]>;
  getTopKeywords(
    merchantId: Types.ObjectId,
    start: Date,
    end: Date,
    limit: number,
  ): Promise<KeywordCount[]>;
  // Kleem Missing
  createKleemFromWebhook(
    dto: CreateKleemMissingResponseDto,
  ): Promise<KleemMissingResponseDocument>;
  listKleemMissing(
    filter: FilterQuery<KleemMissingResponseDocument>,
    skip: number,
    limit: number,
  ): Promise<{ items: KleemMissingResponseDocument[]; total: number }>;
  updateKleemMissing(
    id: string,
    update: UpdateKleemMissingDto,
  ): Promise<KleemMissingResponseDocument>;
  bulkResolveKleem(ids: string[]): Promise<{ updated: number }>;
}

import type { ChannelLean } from '../../webhooks/repositories/channel.repository';
import type {
  Channel,
  ChannelProvider,
  ChannelStatus,
} from '../schemas/channel.schema';
import type { ClientSession, HydratedDocument, Types } from 'mongoose';

export interface ListAllAdminParams {
  merchantId?: Types.ObjectId;
  provider?: ChannelProvider;
  status?: ChannelStatus;
  limit: number;
  page: number;
}

export interface StatsAdminResult {
  total: number;
  byProvider: Record<string, number>;
  byStatus: Record<string, number>;
}

export type ChannelSecretsLean = {
  _id: Types.ObjectId;
  merchantId: Types.ObjectId;
  provider: ChannelProvider;
  isDefault: boolean;
  enabled?: boolean;
  deletedAt?: Date | null;
  webhookUrl?: string;

  // أسرار/حقول خاصة بالمزوّد:
  appSecretEnc?: string; // WhatsApp Cloud
  verifyTokenHash?: string; // WhatsApp Cloud (GET verify)
  accessTokenEnc?: string; // WhatsApp Cloud (للإرسال)
  phoneNumberId?: string; // WhatsApp Cloud

  botTokenEnc?: string; // Telegram
  sessionId?: string; // WhatsApp QR
};

export type ChannelsCountByMerchant = {
  total: number;
  enabled: number;
  connected: number;
};

export interface ChannelsRepository {
  // 基本
  create(
    data: Partial<HydratedDocument<Channel>>,
  ): Promise<HydratedDocument<Channel>>;
  findById(
    id: string | Types.ObjectId,
  ): Promise<HydratedDocument<Channel> | null>;
  findLeanById(id: string | Types.ObjectId): Promise<ChannelLean | null>;
  deleteOneById(id: string | Types.ObjectId): Promise<void>;

  findByIdWithSecrets(
    id: string | Types.ObjectId,
  ): Promise<ChannelSecretsLean | null>;
  // قوائم
  listByMerchant(
    merchantId: Types.ObjectId,
    provider?: ChannelProvider,
  ): Promise<ChannelLean[]>; // lean

  // عمليات افتراضي/إعدادات
  unsetDefaults(
    merchantId: Types.ObjectId,
    provider: ChannelProvider,
    exceptId?: Types.ObjectId,
  ): Promise<void>;
  findDefault(
    merchantId: Types.ObjectId,
    provider: ChannelProvider,
  ): Promise<ChannelLean | null>; // lean

  listAllAdmin(
    params: ListAllAdminParams,
  ): Promise<{ items: ChannelLean[]; total: number }>;
  statsAdmin(): Promise<StatsAdminResult>;

  countByMerchant(merchantId: Types.ObjectId): Promise<ChannelsCountByMerchant>;

  // مساعدة
  startSession(): Promise<ClientSession>;
}

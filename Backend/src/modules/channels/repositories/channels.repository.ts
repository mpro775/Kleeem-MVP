import { ClientSession, HydratedDocument, Types } from 'mongoose';
import { Channel, ChannelProvider } from '../schemas/channel.schema';

export interface ChannelsRepository {
  // 基本
  create(
    data: Partial<HydratedDocument<Channel>>,
  ): Promise<HydratedDocument<Channel>>;
  findById(
    id: string | Types.ObjectId,
  ): Promise<HydratedDocument<Channel> | null>;
  findLeanById(id: string | Types.ObjectId): Promise<any | null>;
  deleteOneById(id: string | Types.ObjectId): Promise<void>;

  // قوائم
  listByMerchant(
    merchantId: Types.ObjectId,
    provider?: ChannelProvider,
  ): Promise<any[]>; // lean

  // عمليات افتراضي/إعدادات
  unsetDefaults(
    merchantId: Types.ObjectId,
    provider: ChannelProvider,
    exceptId?: Types.ObjectId,
  ): Promise<void>;
  findDefault(
    merchantId: Types.ObjectId,
    provider: ChannelProvider,
  ): Promise<any | null>; // lean

  // مساعدة
  startSession(): Promise<ClientSession>;
}

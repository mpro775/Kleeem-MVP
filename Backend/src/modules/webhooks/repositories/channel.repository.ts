import { Types } from 'mongoose';
import { ChannelProvider } from '../../channels/schemas/channel.schema';

export type ChannelLean = {
  _id: Types.ObjectId;
  merchantId: Types.ObjectId;
  provider:
    | ChannelProvider
    | 'telegram'
    | 'whatsapp_cloud'
    | 'whatsapp_qr'
    | 'webchat';
  isDefault: boolean;
  deletedAt?: Date | null;
  enabled?: boolean;
  // secrets (optional select)
  botTokenEnc?: string;
  accessTokenEnc?: string;
  phoneNumberId?: string;
  sessionId?: string;
  appSecretEnc?: string;
  verifyTokenHash?: string;
};

export interface ChannelRepository {
  findDefault(
    merchantId: string,
    provider: 'telegram' | 'whatsapp_cloud' | 'whatsapp_qr' | 'webchat',
  ): Promise<ChannelLean | null>;
  findDefaultWithSecrets(
    merchantId: string,
    provider: 'telegram' | 'whatsapp_cloud' | 'whatsapp_qr' | 'webchat',
  ): Promise<ChannelLean | null>;
  findDefaultWaCloudWithVerify(
    merchantId: string,
  ): Promise<Pick<ChannelLean, '_id' | 'verifyTokenHash'> | null>;
  findDefaultWaCloudWithAppSecret(
    merchantId: string,
  ): Promise<Pick<ChannelLean, '_id' | 'appSecretEnc'> | null>;
}

import type { Types } from 'mongoose';

export type SallaIntegrationEntity = {
  _id: Types.ObjectId;
  merchantId: Types.ObjectId | string;
  provider: 'salla';
  accessToken?: string;
  refreshToken?: string;
  tokenType?: string;
  expiresIn?: number;
  expiresAt?: Date;
  lastSync?: Date;
};

export interface SallaIntegrationRepository {
  findByMerchant(
    merchantId: Types.ObjectId | string,
  ): Promise<SallaIntegrationEntity | null>;

  upsert(
    merchantId: Types.ObjectId | string,
    patch: Partial<SallaIntegrationEntity>,
  ): Promise<void>;
}

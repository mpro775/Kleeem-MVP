import type { Types } from 'mongoose';

export type IntegrationEntity = {
  _id: Types.ObjectId;
  merchantId: Types.ObjectId | string;
  provider: 'zid';
  accessToken?: string;
  refreshToken?: string;
  tokenType?: string;
  expiresIn?: number;
  expiresAt?: Date;
  storeId?: string;
  managerToken?: string;
  authorizationToken?: string;
  lastSync?: Date;
};

export interface IntegrationRepository {
  findZidByMerchant(
    merchantId: Types.ObjectId | string,
  ): Promise<IntegrationEntity | null>;

  upsertZid(
    merchantId: Types.ObjectId | string,
    patch: Partial<IntegrationEntity>,
  ): Promise<void>;
}

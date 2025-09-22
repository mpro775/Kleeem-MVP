import type { Types } from 'mongoose';

export interface CatalogRepository {
  findMerchantLean(merchantId: string | Types.ObjectId): Promise<{
    _id: Types.ObjectId;
    productSource?: 'internal' | 'salla' | 'zid';
  } | null>;
}

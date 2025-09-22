import type { Merchant } from '../../merchants/schemas/merchant.schema';
import type { Types } from 'mongoose';

export type MerchantEntity = Merchant & {
  _id: Types.ObjectId;
  publicSlug?: string;
};

export interface StorefrontMerchantRepository {
  findByIdLean(id: string): Promise<MerchantEntity | null>;
}

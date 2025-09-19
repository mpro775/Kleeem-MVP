import { Types } from 'mongoose';
import { Merchant } from '../../merchants/schemas/merchant.schema';

export type MerchantEntity = Merchant & {
  _id: Types.ObjectId;
  publicSlug?: string;
};

export interface StorefrontMerchantRepository {
  findByIdLean(id: string): Promise<MerchantEntity | null>;
}

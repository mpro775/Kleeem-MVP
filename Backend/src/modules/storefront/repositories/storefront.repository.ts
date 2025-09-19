import { Types } from 'mongoose';
import { Storefront } from '../schemas/storefront.schema';

export type StorefrontEntity = Storefront & {
  _id: Types.ObjectId;
  banners?: Array<{ image?: string; [k: string]: any }>;
  brandDark?: string;
  slug?: string;
};

export interface StorefrontRepository {
  create(dto: Partial<Storefront>): Promise<StorefrontEntity>;
  findByIdOrSlugLean(slugOrId: string): Promise<StorefrontEntity | null>;
  findByMerchant(merchantId: string): Promise<StorefrontEntity | null>;
  existsSlug(slug: string, excludeId?: string): Promise<boolean>;
  updateById(
    id: string,
    patch: Partial<Storefront>,
  ): Promise<StorefrontEntity | null>;
  deleteByMerchant(merchantId: string): Promise<void>;
}

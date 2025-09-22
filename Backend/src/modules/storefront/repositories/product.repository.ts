import type { Product } from '../../products/schemas/product.schema';
import type { Types } from 'mongoose';

export type ProductEntity = Product & {
  _id: Types.ObjectId;
  merchantId: Types.ObjectId | string;
  name: string;
  slug?: string;
  price?: number;
  currency?: string;
  images?: string[];
  status?: string;
  isAvailable?: boolean;
  storefrontDomain?: string | null;
  storefrontSlug?: string | null;
  offer?: {
    enabled?: boolean;
    oldPrice?: number;
    newPrice?: number;
    startAt?: Date | string | null;
    endAt?: Date | string | null;
  };
};

export interface StorefrontProductRepository {
  findActiveAvailableByMerchant(merchantId: string): Promise<ProductEntity[]>;
  updateManyByMerchantSet(
    merchantId: string,
    set: Partial<ProductEntity>,
  ): Promise<void>;
  listIdsByMerchant(merchantId: string): Promise<string[]>;
  resaveById(id: string): Promise<void>;
}

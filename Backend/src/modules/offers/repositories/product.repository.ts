import { Types } from 'mongoose';

export type OfferInfo = {
  enabled?: boolean;
  oldPrice?: number;
  newPrice?: number;
  startAt?: string | Date | null;
  endAt?: string | Date | null;
};

export type ProductLean = {
  _id: Types.ObjectId | string;
  merchantId: Types.ObjectId | string;
  name: string;
  slug?: string;
  price?: number;
  currency?: string;
  images?: string[];
  offer?: OfferInfo;
  storefrontDomain?: string;
  storefrontSlug?: string;
  updatedAt?: Date;
};

export interface ProductRepository {
  /**
   * إرجاع المنتجات التي لديها عرض مفعّل (offer.enabled=true) لتاجر معيّن مع ترقيم صفحات.
   */
  findOffersByMerchant(
    merchantId: string,
    opts: { limit: number; offset: number },
  ): Promise<ProductLean[]>;
}

import type { Coupon } from '../schemas/coupon.schema';

export interface CouponsRepository {
  create(data: Partial<Coupon>): Promise<Coupon>;
  findById(id: string): Promise<Coupon | null>;
  findByCode(merchantId: string, code: string): Promise<Coupon | null>;
  findByMerchant(
    merchantId: string,
    options: {
      status?: string;
      limit?: number;
      skip?: number;
    },
  ): Promise<{ coupons: Coupon[]; total: number }>;
  update(id: string, data: Partial<Coupon>): Promise<Coupon | null>;
  delete(id: string): Promise<boolean>;
  incrementUsage(id: string, customerPhone?: string): Promise<Coupon | null>;
}

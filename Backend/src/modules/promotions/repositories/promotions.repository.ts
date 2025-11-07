// src/modules/promotions/repositories/promotions.repository.ts
import { Promotion } from '../schemas/promotion.schema';

export interface PromotionsRepository {
  create(data: Partial<Promotion>): Promise<Promotion>;
  findById(id: string): Promise<Promotion | null>;
  findByMerchant(
    merchantId: string,
    options: {
      status?: string;
      limit?: number;
      skip?: number;
    },
  ): Promise<{ promotions: Promotion[]; total: number }>;
  findActivePromotions(merchantId: string): Promise<Promotion[]>;
  update(id: string, data: Partial<Promotion>): Promise<Promotion | null>;
  delete(id: string): Promise<boolean>;
  incrementUsage(id: string, discountAmount: number): Promise<Promotion | null>;
}


import type { Lead } from '../schemas/lead.schema';
import type { Types } from 'mongoose';

export type LeadEntity = Lead & {
  _id: Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
  phoneNormalized?: string;
  name?: string;
};

export interface LeadRepository {
  // CRUD شائع
  create(data: Partial<LeadEntity>): Promise<LeadEntity>;
  findAllForMerchant(merchantId: string): Promise<LeadEntity[]>;
  paginateByMerchant(
    merchantId: string,
    opts: { page?: number; limit?: number },
  ): Promise<{
    items: LeadEntity[];
    total: number;
    page: number;
    limit: number;
  }>;
  updateOneForMerchant(
    id: string,
    merchantId: string,
    patch: Partial<LeadEntity>,
  ): Promise<LeadEntity | null>;
  softDeleteById(id: string, merchantId: string): Promise<boolean>;

  // دوال خاصة بالخدمة الحالية
  getPhoneBySession(
    merchantId: string,
    sessionId: string,
  ): Promise<string | undefined>;
}

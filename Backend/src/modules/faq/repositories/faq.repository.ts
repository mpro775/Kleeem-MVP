import type { Faq } from '../schemas/faq.schema';
import type { Types } from 'mongoose';

export interface FaqRepository {
  // إنشاء جماعي بحالة pending
  insertManyPending(
    merchantId: string | Types.ObjectId,
    rows: Array<{ question: string; answer: string }>,
  ): Promise<Array<{ _id: Types.ObjectId } & Faq>>;

  // جلب عنصر للتاجر
  findByIdForMerchant(
    id: string | Types.ObjectId,
    merchantId: string | Types.ObjectId,
  ): Promise<(Faq & { _id: Types.ObjectId }) | null>;

  // تحديث حقول محددة
  updateFieldsById(
    id: string | Types.ObjectId,
    set: Partial<Faq>,
  ): Promise<void>;

  // قائمة (lean)
  listByMerchant(
    merchantId: string | Types.ObjectId,
    includeDeleted?: boolean,
  ): Promise<
    Array<
      Pick<Faq, 'question' | 'answer' | 'status' | 'errorMessage'> & {
        _id: Types.ObjectId;
      }
    >
  >;

  // إحصائيات الحالة
  getStatusCounts(merchantId: string | Types.ObjectId): Promise<{
    total: number;
    pending: number;
    completed: number;
    failed: number;
    deleted: number;
  }>;

  // حذف ناعم
  softDeleteById(
    merchantId: string | Types.ObjectId,
    id: string | Types.ObjectId,
  ): Promise<boolean>;

  // حذف صلب عنصر
  hardDeleteById(
    merchantId: string | Types.ObjectId,
    id: string | Types.ObjectId,
  ): Promise<boolean>;

  // حذف صلب/ناعم للكل
  softDeleteAll(merchantId: string | Types.ObjectId): Promise<number>;
  hardDeleteAll(merchantId: string | Types.ObjectId): Promise<number>;
}

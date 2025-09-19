import { Types } from 'mongoose';
import { SourceUrl } from '../schemas/source-url.schema';

export type SourceUrlEntity = SourceUrl & {
  _id: Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
  textExtracted?: string;
  errorMessage?: string;
  status: 'pending' | 'completed' | 'failed';
};

export interface SourceUrlRepository {
  createMany(
    records: Array<{
      merchantId: string;
      url: string;
      status?: SourceUrlEntity['status'];
    }>,
  ): Promise<SourceUrlEntity[]>;

  markCompleted(id: string, textExtracted: string): Promise<void>;
  markFailed(id: string, errorMessage: string): Promise<void>;

  findByMerchant(merchantId: string): Promise<SourceUrlEntity[]>;
  findListByMerchant(
    merchantId: string,
  ): Promise<
    Array<
      Pick<
        SourceUrlEntity,
        '_id' | 'url' | 'status' | 'errorMessage' | 'createdAt'
      >
    >
  >;

  findByIdForMerchant(
    id: string,
    merchantId: string,
  ): Promise<SourceUrlEntity | null>;
  findByUrlForMerchant(
    url: string,
    merchantId: string,
  ): Promise<SourceUrlEntity | null>;

  deleteByIdForMerchant(id: string, merchantId: string): Promise<number>;
  deleteByMerchant(merchantId: string): Promise<number>;

  // اختياري: واجهة للـ paginate للاستخدام المستقبلي
  paginateByMerchant?(
    merchantId: string,
    opts: { page: number; limit: number },
  ): Promise<{
    items: SourceUrlEntity[];
    total: number;
    page: number;
    limit: number;
  }>;
}

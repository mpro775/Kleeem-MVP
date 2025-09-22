import type { Types } from 'mongoose';

export interface MerchantRepository {
  updateProductSourceZid(
    merchantId: Types.ObjectId | string,
    data: {
      storeId: string;
      lastSync?: Date;
    },
  ): Promise<void>;
}

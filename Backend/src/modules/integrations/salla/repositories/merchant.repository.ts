import { Types } from 'mongoose';

export interface SallaMerchantRepository {
  updateProductSourceSalla(
    merchantId: Types.ObjectId | string,
    data?: { lastSync?: Date },
  ): Promise<void>;
}

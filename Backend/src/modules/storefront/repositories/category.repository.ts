import { Types } from 'mongoose';
import { Category } from '../../categories/schemas/category.schema';

export type CategoryEntity = Category & { _id: Types.ObjectId; name?: string };

export interface StorefrontCategoryRepository {
  listByMerchant(merchantId: string): Promise<CategoryEntity[]>;
}

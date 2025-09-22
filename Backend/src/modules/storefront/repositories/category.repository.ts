import type { Category } from '../../categories/schemas/category.schema';
import type { Types } from 'mongoose';

export type CategoryEntity = Category & { _id: Types.ObjectId; name?: string };

export interface StorefrontCategoryRepository {
  listByMerchant(merchantId: string): Promise<CategoryEntity[]>;
}

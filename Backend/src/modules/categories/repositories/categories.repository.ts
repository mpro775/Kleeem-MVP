import { ClientSession, HydratedDocument, Types } from 'mongoose';
import { Category } from '../schemas/category.schema';

export interface CategoriesRepository {
  // CRUD
  createCategory(
    data: Partial<HydratedDocument<Category>>,
  ): Promise<HydratedDocument<Category>>;
  findAllByMerchant(merchantId: Types.ObjectId): Promise<any[]>; // lean
  findByIdForMerchant(
    id: string | Types.ObjectId,
    merchantId: Types.ObjectId,
  ): Promise<HydratedDocument<Category> | null>;
  findLeanByIdForMerchant(
    id: string | Types.ObjectId,
    merchantId: Types.ObjectId,
  ): Promise<any | null>;
  updateCategoryFields(
    id: Types.ObjectId,
    merchantId: Types.ObjectId,
    update: Record<string, any>,
  ): Promise<void>;
  deleteManyByIds(
    merchantId: Types.ObjectId,
    ids: Types.ObjectId[],
  ): Promise<void>;

  // Relations & helpers
  parentExistsForMerchant(
    parentId: Types.ObjectId,
    merchantId: Types.ObjectId,
  ): Promise<boolean>;
  isDescendant(
    targetId: Types.ObjectId,
    ancestorId: Types.ObjectId,
    merchantId: Types.ObjectId,
  ): Promise<boolean>;
  listSiblings(
    merchantId: Types.ObjectId,
    parentId: Types.ObjectId | null,
  ): Promise<Array<any>>; // lean
  updateOrder(
    categoryId: Types.ObjectId,
    order: number,
    session?: ClientSession,
  ): Promise<void>;
  normalizeSiblingsOrders(
    merchantId: Types.ObjectId,
    parentId: Types.ObjectId | null,
    session?: ClientSession,
  ): Promise<void>;

  // Queries
  findManyByIds(
    ids: Types.ObjectId[],
    fields?: Record<string, 1 | 0>,
  ): Promise<any[]>; // lean
  findSubtreeIds(
    merchantId: Types.ObjectId,
    rootId: Types.ObjectId,
  ): Promise<Types.ObjectId[]>;

  // Products
  anyProductsInCategories(
    merchantId: Types.ObjectId,
    categoryIds: Types.ObjectId[],
  ): Promise<boolean>;

  // Sessions
  startSession(): Promise<ClientSession>;
}

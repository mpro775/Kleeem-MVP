import type { PaginationResult } from '../../../common/dto/pagination.dto';
import type { GetProductsDto } from '../dto/get-products.dto';
import type { Product, ProductDocument } from '../schemas/product.schema';
import type { ProductLean } from '../types';
import type { Types, ClientSession } from 'mongoose';

export interface ProductsRepository {
  // basic CRUD (+session اختياري)
  create(
    data: Partial<Product>,
    session?: ClientSession,
  ): Promise<ProductDocument>;
  updateById(
    id: Types.ObjectId,
    set: Partial<Product>,
    session?: ClientSession,
  ): Promise<ProductDocument | null>;
  findById(id: Types.ObjectId): Promise<ProductDocument | null>;
  deleteById(id: Types.ObjectId, session?: ClientSession): Promise<boolean>;

  // counts / listings
  countByMerchant(merchantId: Types.ObjectId): Promise<number>;
  findAllByMerchant(merchantId: Types.ObjectId): Promise<ProductLean[]>;

  // public lookups
  findPublicBySlug(
    storeSlug: string,
    productSlug: string,
  ): Promise<ProductLean | null>;
  // تعتمد merchantId مباشرة
  findPublicBySlugWithMerchant(
    merchantId: Types.ObjectId,
    productSlug: string,
  ): Promise<ProductLean | null>;

  // paginated lists
  list(
    merchantId: Types.ObjectId,
    dto: GetProductsDto,
  ): Promise<PaginationResult<ProductLean>>;
  listPublic(
    storeSlug: string,
    dto: GetProductsDto,
  ): Promise<PaginationResult<ProductLean>>;
  listPublicByMerchant(
    merchantId: Types.ObjectId,
    dto: GetProductsDto,
  ): Promise<PaginationResult<ProductLean>>;

  // search
  searchText(
    merchantId: Types.ObjectId,
    query: string,
    limit?: number,
  ): Promise<ProductLean[]>;
  searchHeuristics(
    merchantId: Types.ObjectId,
    query: string,
    limit?: number,
  ): Promise<ProductLean[]>;

  // external sync (+session اختياري)
  findByExternal(
    merchantId: Types.ObjectId,
    externalId: string,
  ): Promise<ProductDocument | null>;
  upsertExternal(
    merchantId: Types.ObjectId,
    provider: 'zid' | 'salla',
    data: Partial<Product> & { externalId: string },
    session?: ClientSession,
  ): Promise<ProductDocument>;

  // state changes
  setAvailability(
    id: Types.ObjectId,
    isAvailable: boolean,
  ): Promise<ProductLean | null>;
  findByIdsScoped(ids: string[], merchantId: string): Promise<ProductLean[]>;
  removeByExternal(merchantId: string, externalId: string): Promise<void>;
}

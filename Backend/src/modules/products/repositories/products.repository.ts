import { Types, ClientSession } from 'mongoose';
import { Product, ProductDocument } from '../schemas/product.schema';
import { GetProductsDto } from '../dto/get-products.dto';
import { PaginationResult } from '../../../common/dto/pagination.dto';

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
  findAllByMerchant(merchantId: Types.ObjectId): Promise<any[]>;

  // public lookups
  findPublicBySlug(storeSlug: string, productSlug: string): Promise<any | null>;
  // جديدة: تعتمد merchantId مباشرة
  findPublicBySlugWithMerchant(
    productSlug: string,
    merchantId: Types.ObjectId,
  ): Promise<any | null>;

  // paginated lists
  list(
    merchantId: Types.ObjectId,
    dto: GetProductsDto,
  ): Promise<PaginationResult<any>>;
  listPublic(
    storeSlug: string,
    dto: GetProductsDto,
  ): Promise<PaginationResult<any>>;
  // جديدة: تعتمد merchantId مباشرة
  listPublicByMerchant(
    merchantId: Types.ObjectId,
    dto: GetProductsDto,
  ): Promise<PaginationResult<any>>;

  // search
  searchText(
    merchantId: Types.ObjectId,
    query: string,
    limit?: number,
  ): Promise<any[]>;
  searchHeuristics(
    merchantId: Types.ObjectId,
    query: string,
    limit?: number,
  ): Promise<any[]>;

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
  ): Promise<any | null>;
  findByIdsScoped(ids: string[], merchantId: string): Promise<any[]>;
  removeByExternal(merchantId: string, externalId: string): Promise<void>;
}

// src/modules/products/repositories/mongo-products.repository.ts
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Model, Types } from 'mongoose';
import { Injectable } from '@nestjs/common';
import { Product, ProductDocument } from '../schemas/product.schema';
import { GetProductsDto } from '../dto/get-products.dto';
import { PaginationService } from '../../../common/services/pagination.service';
import { PaginationResult } from '../../../common/dto/pagination.dto';

@Injectable()
export class MongoProductsRepository {
  // implements ProductsRepository
  constructor(
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
    private readonly pagination: PaginationService,
  ) {}
  async startSession(): Promise<ClientSession> {
    return this.productModel.db.startSession();
  }

  create(data: Partial<Product>, session?: ClientSession) {
    const doc = new this.productModel(data);
    return doc.save({ session });
  }
  updateById(
    id: Types.ObjectId,
    set: Partial<Product>,
    session?: ClientSession,
  ) {
    return this.productModel.findByIdAndUpdate(
      id,
      { $set: set },
      { new: true, runValidators: true, session },
    );
  }

  findById(id: Types.ObjectId) {
    return this.productModel.findById(id);
  }

  async deleteById(id: Types.ObjectId, session?: ClientSession) {
    const res = await this.productModel.findByIdAndDelete(id, { session });
    return !!res;
  }

  findByExternal(merchantId: Types.ObjectId, externalId: string) {
    return this.productModel.findOne({ merchantId, source: 'api', externalId });
  }

  async upsertExternal(
    merchantId: Types.ObjectId,
    provider: 'zid' | 'salla',
    data: Partial<Product> & { externalId: string },
  ) {
    return this.productModel.findOneAndUpdate(
      { merchantId, source: 'api', externalId: data.externalId },
      { $set: { ...data, platform: provider } },
      {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      },
    );
  }

  countByMerchant(merchantId: Types.ObjectId) {
    return this.productModel.countDocuments({ merchantId });
  }

  findAllByMerchant(merchantId: Types.ObjectId) {
    return this.productModel
      .find({ merchantId })
      .sort({ createdAt: -1 })
      .populate({ path: 'category', select: 'name' })
      .lean();
  }

  async findPublicBySlug(storeSlug: string, productSlug: string) {
    // يفضل وضع استعلام storefront في StorefrontRepository، اختصرنا هنا:
    return this.productModel
      .findOne({ slug: productSlug, status: 'active', isAvailable: true })
      .populate({ path: 'category', select: 'name' })
      .lean();
  }
  async findPublicBySlugWithMerchant(
    merchantId: Types.ObjectId,
    productSlug: string,
  ) {
    return this.productModel
      .findOne({
        merchantId,
        slug: productSlug,
        status: 'active',
        isAvailable: true,
      })
      .populate({ path: 'category', select: 'name' })
      .lean();
  }
  async listPublicByMerchant(
    merchantId: Types.ObjectId,
    dto: GetProductsDto,
  ): Promise<PaginationResult<any>> {
    const filter: any = { merchantId, status: 'active', isAvailable: true };
    if (dto.search) filter.$text = { $search: dto.search };
    if (dto.categoryId) filter.category = new Types.ObjectId(dto.categoryId);
    if (dto.hasOffer) filter['offer.enabled'] = true;

    const sortField = dto.sortBy || 'createdAt';
    const sortOrder = dto.sortOrder === 'asc' ? 1 : -1;

    return this.pagination.paginate(this.productModel as any, dto, filter, {
      sortField,
      sortOrder,
      populate: 'category',
      select: '-__v',
      lean: true,
    });
  }

  async list(
    merchantId: Types.ObjectId,
    dto: GetProductsDto,
  ): Promise<PaginationResult<any>> {
    const filter: any = { merchantId };
    if (dto.search) filter.$text = { $search: dto.search };
    if (dto.categoryId) filter.category = new Types.ObjectId(dto.categoryId);
    if (dto.status) filter.status = dto.status;
    if (dto.source) filter.source = dto.source;
    if (dto.isAvailable !== undefined) filter.isAvailable = dto.isAvailable;
    if (dto.hasOffer) filter['offer.enabled'] = true;

    const sortField = dto.sortBy || 'createdAt';
    const sortOrder = dto.sortOrder === 'asc' ? 1 : -1;

    const res = await this.pagination.paginate(
      this.productModel as any,
      dto,
      filter,
      {
        sortField,
        sortOrder,
        populate: 'category',
        select: '-__v',
        lean: true,
      },
    );
    return res;
  }

  async listPublic(
    storeSlug: string,
    dto: GetProductsDto,
  ): Promise<PaginationResult<any>> {
    // يُفضّل جلب merchantId من StorefrontRepository. اختصارًا:
    const filter: any = { status: 'active', isAvailable: true };
    if (dto.search) filter.$text = { $search: dto.search };
    if (dto.categoryId) filter.category = new Types.ObjectId(dto.categoryId);
    if (dto.hasOffer) filter['offer.enabled'] = true;

    const sortField = dto.sortBy || 'createdAt';
    const sortOrder = dto.sortOrder === 'asc' ? 1 : -1;

    return this.pagination.paginate(this.productModel as any, dto, filter, {
      sortField,
      sortOrder,
      populate: 'category',
      select: '-__v',
      lean: true,
    });
  }

  searchText(merchantId: Types.ObjectId, q: string, limit = 10) {
    return this.productModel
      .find(
        { merchantId, $text: { $search: q }, isAvailable: true },
        { score: { $meta: 'textScore' } },
      )
      .sort({ score: { $meta: 'textScore' } })
      .limit(limit)
      .lean();
  }

  searchHeuristics(merchantId: Types.ObjectId, q: string, limit = 10) {
    const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    return this.productModel
      .find({
        merchantId,
        isAvailable: true,
        $or: [{ name: rx }, { description: rx }, { keywords: { $in: [q] } }],
      })
      .limit(limit)
      .lean();
  }

  setAvailability(id: Types.ObjectId, isAvailable: boolean) {
    return this.productModel
      .findByIdAndUpdate(id, { isAvailable }, { new: true })
      .lean();
  }

  findByIdsScoped(ids: string[], merchantId: string) {
    return this.productModel
      .find({
        _id: { $in: ids.map((i) => new Types.ObjectId(i)) },
        merchantId: new Types.ObjectId(merchantId),
      })
      .lean();
  }

  removeByExternal(merchantId: string, externalId: string) {
    return this.productModel.deleteOne({
      merchantId: new Types.ObjectId(merchantId),
      externalId,
      source: 'api',
    }) as any;
  }
}

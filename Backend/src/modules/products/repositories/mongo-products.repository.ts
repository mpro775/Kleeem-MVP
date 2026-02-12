import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { PaginationService } from '../../../common/services/pagination.service';
import { GetProductsDto, SortOrder } from '../dto/get-products.dto';
import { Currency } from '../enums/product.enums';
import {
  CurrencyPrice,
  createCurrencyPrice,
} from '../schemas/currency-price.schema';
import { Product, ProductDocument } from '../schemas/product.schema';

import type { PaginationResult } from '../../../common/dto/pagination.dto';
import type { ProductLean } from '../types';
import type { ClientSession, FilterQuery } from 'mongoose';

type StringArrayRecord = Record<string, string[]>;

function isObject(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === 'object';
}
function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((x) => typeof x === 'string');
}
function toPlainAttributes(attrs: unknown): StringArrayRecord | undefined {
  // Map<string, string[]> → Record<string, string[]>
  if (attrs instanceof Map) {
    const obj: StringArrayRecord = {};
    for (const [k, v] of attrs.entries()) {
      obj[String(k)] = isStringArray(v) ? v : [];
    }
    return obj;
  }
  // لو جايّة من lean بالفعل كـ Record
  if (isObject(attrs)) {
    const out: StringArrayRecord = {};
    for (const [k, v] of Object.entries(attrs)) {
      out[k] = isStringArray(v) ? v : [];
    }
    return out;
  }
  return undefined;
}
type PaginateModelParam = Parameters<PaginationService['paginate']>[0];

/** يحوّل عنصرًا (Doc أو Lean) إلى ProductLean آمن */
// eslint-disable-next-line complexity
function toProductLean(p: unknown): ProductLean {
  if (!isObject(p)) {
    // نبني أقل شكل ممكن لتفادي any
    return {
      attributes: [],
      prices: new Map<string, CurrencyPrice>(),
      currency: Currency.YER,
    } as ProductLean;
  }

  const attributesRecord = toPlainAttributes(
    (p as { attributes?: unknown }).attributes,
  );
  const attributes: ProductLean['attributes'] = attributesRecord
    ? Object.entries(attributesRecord).map(([keySlug, valueSlugs]) => ({
        keySlug,
        valueSlugs,
      }))
    : undefined;

  const rawPrices = (p as { prices?: unknown }).prices;
  const prices = new Map<string, CurrencyPrice>();
  if (rawPrices instanceof Map) {
    for (const [k, v] of rawPrices.entries()) {
      if (typeof k === 'string') {
        if (typeof v === 'number' && Number.isFinite(v) && v >= 0) {
          prices.set(k, createCurrencyPrice(v));
        } else if (
          isObject(v) &&
          'amount' in v &&
          typeof v.amount === 'number'
        ) {
          prices.set(k, v as unknown as CurrencyPrice);
        }
      }
    }
  } else if (isObject(rawPrices)) {
    for (const [k, v] of Object.entries(rawPrices)) {
      if (typeof v === 'number' && Number.isFinite(v) && v >= 0) {
        prices.set(String(k), createCurrencyPrice(v));
      } else if (isObject(v) && 'amount' in v && typeof v.amount === 'number') {
        prices.set(String(k), v as unknown as CurrencyPrice);
      }
    }
  }

  const currency =
    ((p as { currency?: unknown }).currency as Currency | undefined) ??
    Currency.YER;

  // مرّر باقي الحقول كما هي (lean سيعطيها Plain)،
  // ولو Doc فتبقى خصائص غير مستخدمة؛ أهم شيء attributes صار Record.
  return {
    ...(p as object),
    attributes,
    prices,
    currency,
  } as ProductLean;
}
@Injectable()
export class MongoProductsRepository {
  constructor(
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
    private readonly pagination: PaginationService,
  ) {}

  async startSession(): Promise<ClientSession> {
    return this.productModel.db.startSession();
  }

  create(
    data: Partial<Product>,
    session?: ClientSession,
  ): Promise<ProductDocument> {
    const doc = new this.productModel(data);
    return doc.save({ session: session ?? null });
  }

  updateById(
    id: Types.ObjectId,
    set: Partial<Product>,
    session?: ClientSession,
  ): Promise<ProductDocument | null> {
    return this.productModel
      .findByIdAndUpdate(
        id,
        { $set: set },
        { new: true, runValidators: true, session: session ?? null },
      )
      .exec();
  }

  findById(id: Types.ObjectId): Promise<ProductDocument | null> {
    return this.productModel.findById(id).exec();
  }

  async deleteById(
    id: Types.ObjectId,
    session?: ClientSession,
  ): Promise<boolean> {
    const res = await this.productModel
      .findByIdAndDelete(id, { session: session ?? null })
      .exec();
    return !!res;
  }

  findByExternal(
    merchantId: Types.ObjectId,
    externalId: string,
  ): Promise<ProductDocument | null> {
    return this.productModel
      .findOne({ merchantId, source: 'api', externalId })
      .exec();
  }

  async upsertExternal(
    merchantId: Types.ObjectId,
    provider: 'zid' | 'salla',
    data: Partial<Product> & { externalId: string },
    session?: ClientSession,
  ): Promise<ProductDocument> {
    const doc = await this.productModel
      .findOneAndUpdate(
        { merchantId, source: 'api', externalId: data.externalId },
        { $set: { ...data, platform: provider } },
        {
          new: true,
          upsert: true,
          runValidators: true,
          setDefaultsOnInsert: true,
          session: session ?? null,
        },
      )
      .exec();
    // مع upsert:true الدوكومنت مضمون
    return doc as unknown as ProductDocument;
  }

  countByMerchant(merchantId: Types.ObjectId): Promise<number> {
    return this.productModel.countDocuments({ merchantId }).exec();
  }

  findAllByMerchant(merchantId: Types.ObjectId): Promise<ProductLean[]> {
    return this.productModel
      .find({ merchantId })
      .sort({ createdAt: -1 })
      .populate({ path: 'category', select: 'name' })
      .lean()
      .exec() as unknown as Promise<ProductLean[]>;
  }

  async findPublicBySlug(
    storeSlug: string, // ممرّر للتوافق، الاستعلام الحالي لا يستخدمه
    productSlug: string,
  ): Promise<ProductLean | null> {
    return this.productModel
      .findOne({
        slug: productSlug,
        status: { $in: ['active', 'published'] },
        isAvailable: true,
      })
      .populate({ path: 'category', select: 'name' })
      .lean()
      .exec() as Promise<ProductLean | null>;
  }

  async findPublicBySlugWithMerchant(
    merchantId: Types.ObjectId,
    productSlug: string,
  ): Promise<ProductLean | null> {
    return this.productModel
      .findOne({
        merchantId,
        slug: productSlug,
        status: { $in: ['active', 'published'] },
        isAvailable: true,
      })
      .populate({ path: 'category', select: 'name' })
      .lean()
      .exec() as unknown as Promise<ProductLean | null>;
  }

  // listPublicByMerchant
  async listPublicByMerchant(
    merchantId: Types.ObjectId,
    dto: GetProductsDto,
  ): Promise<PaginationResult<ProductLean>> {
    const filter: FilterQuery<ProductDocument> = {
      merchantId,
      status: { $in: ['active', 'published'] },
      isAvailable: true,
    };
    if (dto.search) filter.$text = { $search: dto.search };
    if (dto.categoryId) filter.category = new Types.ObjectId(dto.categoryId);
    if (dto.hasOffer) filter['offer.enabled'] = true;

    const sortField = dto.sortBy || 'createdAt';
    const sortOrder: 1 | -1 = dto.sortOrder === SortOrder.ASC ? 1 : -1;

    const modelForPaginate = this.productModel as unknown as PaginateModelParam;

    const raw = await this.pagination.paginate(modelForPaginate, dto, filter, {
      sortField,
      sortOrder,
      populate: 'category',
      select: '-__v',
      lean: true,
    });

    // تحويل آمن إلى ProductLean[]
    const items = (raw.items as unknown[]).map(toProductLean);
    return { ...raw, items };
  }

  // list
  async list(
    merchantId: Types.ObjectId,
    dto: GetProductsDto,
  ): Promise<PaginationResult<ProductLean>> {
    const filter: FilterQuery<ProductDocument> = { merchantId };
    if (dto.search) filter.$text = { $search: dto.search };
    if (dto.categoryId) filter.category = new Types.ObjectId(dto.categoryId);
    if (dto.status) filter.status = dto.status;
    if (dto.source) filter.source = dto.source;
    if (dto.isAvailable !== undefined) filter.isAvailable = dto.isAvailable;
    if (dto.hasOffer) filter['offer.enabled'] = true;

    const sortField = dto.sortBy || 'createdAt';
    const sortOrder: 1 | -1 = dto.sortOrder === SortOrder.ASC ? 1 : -1;

    const modelForPaginate = this.productModel as unknown as PaginateModelParam;

    const raw = await this.pagination.paginate(modelForPaginate, dto, filter, {
      sortField,
      sortOrder,
      populate: 'category',
      select: '-__v',
      lean: true,
    });

    const items = (raw.items as unknown[]).map(toProductLean);
    return { ...raw, items };
  }

  // listPublic
  async listPublic(
    storeSlug: string,
    dto: GetProductsDto,
  ): Promise<PaginationResult<ProductLean>> {
    const filter: FilterQuery<ProductDocument> = {
      status: { $in: ['active', 'published'] },
      isAvailable: true,
    };
    if (dto.search) filter.$text = { $search: dto.search };
    if (dto.categoryId) filter.category = new Types.ObjectId(dto.categoryId);
    if (dto.hasOffer) filter['offer.enabled'] = true;

    const sortField = dto.sortBy || 'createdAt';
    const sortOrder: 1 | -1 = dto.sortOrder === SortOrder.ASC ? 1 : -1;

    const modelForPaginate = this.productModel as unknown as PaginateModelParam;

    const raw = await this.pagination.paginate(modelForPaginate, dto, filter, {
      sortField,
      sortOrder,
      populate: 'category',
      select: '-__v',
      lean: true,
    });

    const items = (raw.items as unknown[]).map(toProductLean);
    return { ...raw, items };
  }

  searchText(
    merchantId: Types.ObjectId,
    q: string,
    limit = 10,
  ): Promise<ProductLean[]> {
    return this.productModel
      .find(
        { merchantId, $text: { $search: q }, isAvailable: true },
        { score: { $meta: 'textScore' } },
      )
      .sort({ score: { $meta: 'textScore' } })
      .limit(limit)
      .lean()
      .exec() as unknown as Promise<ProductLean[]>;
  }

  searchHeuristics(
    merchantId: Types.ObjectId,
    q: string,
    limit = 10,
  ): Promise<ProductLean[]> {
    const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    return this.productModel
      .find({
        merchantId,
        isAvailable: true,
        $or: [
          { name: rx },
          { shortDescription: rx },
          { richDescription: rx },
          { keywords: { $in: [q] } },
        ],
      })
      .limit(limit)
      .lean()
      .exec() as unknown as Promise<ProductLean[]>;
  }

  setAvailability(
    id: Types.ObjectId,
    isAvailable: boolean,
  ): Promise<ProductLean | null> {
    return this.productModel
      .findByIdAndUpdate(id, { isAvailable }, { new: true })
      .lean()
      .exec() as unknown as Promise<ProductLean | null>;
  }

  findByIdsScoped(ids: string[], merchantId: string): Promise<ProductLean[]> {
    return this.productModel
      .find({
        _id: { $in: ids.map((i) => new Types.ObjectId(i)) },
        merchantId: new Types.ObjectId(merchantId),
      })
      .lean()
      .exec() as unknown as Promise<ProductLean[]>;
  }

  async removeByExternal(
    merchantId: string,
    externalId: string,
  ): Promise<void> {
    await this.productModel
      .deleteOne({
        merchantId: new Types.ObjectId(merchantId),
        externalId,
        source: 'api',
      })
      .exec();
  }

  async getAllTags(merchantId: Types.ObjectId): Promise<string[]> {
    const result = await this.productModel.aggregate<{ _id: string }>([
      { $match: { merchantId } },
      { $unwind: '$keywords' },
      { $group: { _id: '$keywords' } },
      { $sort: { _id: 1 } },
    ]);

    return result.map((r) => r._id);
  }
}

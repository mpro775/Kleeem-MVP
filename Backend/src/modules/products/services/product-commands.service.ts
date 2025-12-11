// src/modules/products/services/product-commands.service.ts
import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Inject,
  forwardRef,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Types } from 'mongoose';

import { CacheService } from '../../../common/cache/cache.service';
import { OutboxService } from '../../../common/outbox/outbox.service';
import { TranslationService } from '../../../common/services/translation.service';
import { CategoriesService } from '../../categories/categories.service';
import { StorefrontService } from '../../storefront/storefront.service';
import { CreateProductDto, ProductSource } from '../dto/create-product.dto';
import { UpdateProductDto } from '../dto/update-product.dto';
import { Currency } from '../enums/product.enums';

import { ProductIndexService } from './product-index.service';
import { ProductMediaService } from './product-media.service';
import { ProductValidationService } from './product-validation.service';

import type { Storefront } from '../../storefront/schemas/storefront.schema';
import type { ProductsRepository } from '../repositories/products.repository';
import type { Product, ProductDocument } from '../schemas/product.schema';
import type { ClientSession } from 'mongoose';

/* -------------------- ثوابت لتجنّب النصوص السحرية -------------------- */
const SYNC_OK = 'ok' as const;
const SYNC_PENDING = 'pending' as const;

/* -------------------- أنواع/حُرّاس -------------------- */
type MinimalStorefront = { slug?: string | null; domain?: string | null };

function hasStartSession(
  r: ProductsRepository,
): r is ProductsRepository & { startSession: () => Promise<ClientSession> } {
  return typeof (r as { startSession?: unknown }).startSession === 'function';
}

function ensureValidObjectId(id: string, errMsg: string): Types.ObjectId {
  if (!Types.ObjectId.isValid(id)) throw new BadRequestException(errMsg);
  return new Types.ObjectId(id);
}

function toOffer(dto: CreateProductDto['offer']): Product['offer'] | undefined {
  if (!dto) return undefined;
  const offer: Product['offer'] = { enabled: dto.enabled ?? false };
  if (dto.oldPrice !== undefined) offer.oldPrice = dto.oldPrice;
  if (dto.newPrice !== undefined) offer.newPrice = dto.newPrice;
  if (dto.startAt) offer.startAt = new Date(dto.startAt);
  if (dto.endAt) offer.endAt = new Date(dto.endAt);
  return offer;
}

function mapSource(s?: ProductSource): 'manual' | 'api' {
  return s === ProductSource.API ? 'api' : 'manual';
}

type BadgeArray = NonNullable<Product['badges']>;

function normalizeBadge(raw: unknown): BadgeArray[number] | null {
  if (!raw || typeof raw !== 'object') return null;
  const badgeInput = raw as {
    label?: unknown;
    color?: unknown;
    showOnCard?: unknown;
    order?: unknown;
  };

  if (typeof badgeInput.label !== 'string') return null;
  const label = badgeInput.label.trim();
  if (!label) return null;

  const badge: BadgeArray[number] = { label };

  const rawColor = badgeInput.color;
  if (typeof rawColor === 'string' && rawColor.trim()) {
    badge.color = rawColor.trim();
  } else if (rawColor === null) {
    badge.color = null;
  }

  if (typeof badgeInput.showOnCard === 'boolean') {
    badge.showOnCard = badgeInput.showOnCard;
  }

  if (
    typeof badgeInput.order === 'number' &&
    Number.isFinite(badgeInput.order)
  ) {
    badge.order = badgeInput.order;
  }

  return badge;
}

function sanitizeBadges(badges: unknown): BadgeArray {
  if (!Array.isArray(badges)) return [];

  return badges
    .map(normalizeBadge)
    .filter((b): b is BadgeArray[number] => b !== null)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

function oidToString(oid: Types.ObjectId): string {
  // لتجنّب eslint@restrict-template-expressions: لا نمرر ObjectId مباشرة
  return typeof oid.toHexString === 'function'
    ? oid.toHexString()
    : String(oid);
}

/* ===================================================================== */
@Injectable()
export class ProductCommandsService {
  private readonly logger = new Logger(ProductCommandsService.name);

  constructor(
    @Inject('ProductsRepository')
    private readonly repo: ProductsRepository,
    private readonly indexer: ProductIndexService,
    private readonly media: ProductMediaService,
    private readonly cache: CacheService,
    @Inject(forwardRef(() => StorefrontService))
    private readonly storefronts: StorefrontService,
    private readonly categories: CategoriesService,
    private readonly translationService: TranslationService,
    private readonly outbox: OutboxService,
    private readonly config: ConfigService,
    private readonly validation: ProductValidationService,
  ) {}

  /** إنشاء منتج جديد مع outbox + فهرسة + كنس كاش */
  async create(
    dto: CreateProductDto & { merchantId: string },
  ): Promise<ProductDocument> {
    const merchantId = ensureValidObjectId(
      dto.merchantId,
      this.translationService.translate('validation.mongoId'),
    );

    // التحقق من صحة البيانات
    await this.validateCreateDto(dto, merchantId);

    const sf = await this.getStorefrontData(merchantId);
    const data = this.buildProductData(dto, merchantId, sf);

    const created = await this.createProductWithSession(data);
    await this.handlePostCreationTasks(created, sf);

    return created;
  }

  private async validateCreateDto(
    dto: CreateProductDto & { merchantId: string },
    merchantId: Types.ObjectId,
  ): Promise<void> {
    const baseCurrency = dto.currency ?? Currency.YER;

    // التحقق من المتغيرات
    this.validation.validateVariants(
      dto.hasVariants,
      dto.variants,
      baseCurrency,
    );

    // التحقق من الأسعار متعددة العملات (العملة الأساسية مطلوبة)
    this.validation.normalizePrices(dto.prices, baseCurrency);

    // التحقق من SKU uniqueness
    if (dto.hasVariants && dto.variants && dto.variants.length > 0) {
      const skus = dto.variants.map((v) => v.sku);
      await this.validation.validateAllSkus(merchantId.toHexString(), skus);
    }

    // التحقق من المنتجات الرقمية
    this.validation.validateDigitalProduct(dto.productType, dto.digitalAsset);

    // التحقق من النشر المؤجل
    this.validation.validateScheduledPublish(
      dto.status,
      dto.scheduledPublishAt,
    );

    // التحقق من المنتجات الشبيهة
    if (dto.relatedProducts && dto.relatedProducts.length > 0) {
      await this.validation.validateRelatedProducts(
        merchantId.toHexString(),
        dto.relatedProducts,
      );
    }
  }

  private async getStorefrontData(
    merchantId: Types.ObjectId,
  ): Promise<MinimalStorefront | null> {
    return (await this.storefronts.findByMerchant(
      merchantId.toHexString(),
    )) as MinimalStorefront | null;
  }

  private buildProductData(
    dto: CreateProductDto & { merchantId: string },
    merchantId: Types.ObjectId,
    sf: MinimalStorefront | null,
  ): Partial<Product> {
    const baseData = this.buildBaseProductData(dto, merchantId);
    const storefrontData = this.buildStorefrontData(sf);
    const arraysData = this.buildArraysData(dto);

    return {
      ...baseData,
      ...storefrontData,
      ...arraysData,
      syncStatus: dto.source === ProductSource.API ? SYNC_PENDING : SYNC_OK,
    };
  }

  private buildBaseProductData(
    dto: CreateProductDto & { merchantId: string },
    merchantId: Types.ObjectId,
  ): Partial<Product> {
    const baseCurrency = dto.currency ?? Currency.YER;
    const { prices, basePrice } = this.validation.normalizePrices(
      dto.prices,
      baseCurrency,
    );

    const data: Partial<Product> = {
      merchantId,
      sourceUrl: dto.sourceUrl ?? null,
      externalId: dto.externalId ?? null,
      platform: dto.platform ?? '',
      name: dto.name,
      shortDescription: dto.shortDescription ?? '',
      richDescription: dto.richDescription ?? '',
      prices,
      currency: baseCurrency,
      priceDefault: basePrice,
      isAvailable: dto.isAvailable ?? true,
      source: mapSource(dto.source),
      status: dto.status ?? 'published',
    };

    this.applyOptionalFields(dto, data);
    this.applyVariantsData(dto, data);
    this.applyProductTypeData(dto, data);
    this.applyPublishingData(dto, data);
    this.applyRelatedProducts(dto, data);

    return data;
  }

  private applyOptionalFields(
    dto: CreateProductDto & { merchantId: string },
    data: Partial<Product>,
  ): void {
    if (dto.currency) data.currency = dto.currency;
    if (dto.shortDescription !== undefined)
      data.shortDescription = dto.shortDescription ?? '';
    if (dto.richDescription !== undefined)
      data.richDescription = dto.richDescription ?? '';

    const offer = toOffer(dto.offer);
    if (offer) data.offer = offer;
    if (dto.category) data.category = new Types.ObjectId(dto.category);
  }

  private applyVariantsData(
    dto: CreateProductDto & { merchantId: string },
    data: Partial<Product>,
  ): void {
    const baseCurrency = dto.currency ?? Currency.YER;
    if (dto.hasVariants !== undefined) data.hasVariants = dto.hasVariants;
    if (dto.variants) {
      data.variants = dto.variants.map((variant) => {
        const { prices: variantPrices, ...rest } = variant;
        const normalized = this.validation.normalizePrices(
          variantPrices,
          baseCurrency,
        );

        return {
          ...rest,
          prices: normalized.prices,
          priceDefault: normalized.basePrice,
          currency: baseCurrency,
          images: variant.images ?? [],
          isAvailable: variant.isAvailable ?? true,
          barcode: variant.barcode ?? null,
          lowStockThreshold: variant.lowStockThreshold ?? null,
          weight: variant.weight ?? null,
        };
      });
    }
  }

  private applyProductTypeData(
    dto: CreateProductDto & { merchantId: string },
    data: Partial<Product>,
  ): void {
    if (dto.productType) data.productType = dto.productType;
    if (dto.digitalAsset) data.digitalAsset = dto.digitalAsset;
    if (dto.isUnlimitedStock !== undefined)
      data.isUnlimitedStock = dto.isUnlimitedStock;
    // نظام المخزون
    if (dto.stock !== undefined) data.stock = dto.stock;
    if (dto.lowStockThreshold !== undefined)
      data.lowStockThreshold = dto.lowStockThreshold;
  }

  private applyPublishingData(
    dto: CreateProductDto & { merchantId: string },
    data: Partial<Product>,
  ): void {
    if (dto.publishedAt) data.publishedAt = dto.publishedAt;
    if (dto.scheduledPublishAt)
      data.scheduledPublishAt = dto.scheduledPublishAt;
  }

  private applyRelatedProducts(
    dto: CreateProductDto & { merchantId: string },
    data: Partial<Product>,
  ): void {
    if (dto.relatedProducts) {
      data.relatedProducts = dto.relatedProducts.map(
        (id) => new Types.ObjectId(id),
      );
    }
  }

  private buildStorefrontData(sf: MinimalStorefront | null): Partial<Product> {
    const data: Partial<Product> = {};
    if (sf?.slug) data.storefrontSlug = sf.slug;
    if (sf?.domain) data.storefrontDomain = sf.domain;
    return data;
  }

  private buildArraysData(dto: CreateProductDto): Partial<Product> {
    return {
      specsBlock: Array.isArray(dto.specsBlock) ? dto.specsBlock : [],
      keywords: Array.isArray(dto.keywords) ? dto.keywords : [],
      images: Array.isArray(dto.images) ? dto.images : [],
      badges: sanitizeBadges(dto.badges),
    };
  }

  private async createProductWithSession(
    data: Partial<Product>,
  ): Promise<ProductDocument> {
    const session = hasStartSession(this.repo)
      ? await this.repo.startSession()
      : null;

    const createAndEmit = async (): Promise<ProductDocument> => {
      const createdDoc = await (session
        ? this.repo.create(data, session)
        : this.repo.create(data));
      if (!createdDoc.merchantId) {
        throw new BadRequestException(
          'Failed to create product: merchantId is missing',
        );
      }
      const productIdStr = oidToString(createdDoc._id);
      const merchantIdStr = oidToString(createdDoc.merchantId);

      const event = {
        aggregateType: 'product',
        aggregateId: productIdStr,
        eventType: 'product.created',
        exchange: 'products',
        routingKey: 'product.created',
        payload: { productId: productIdStr, merchantId: merchantIdStr },
        dedupeKey: `product.created:${productIdStr}`,
      } as const;

      if (session) {
        await this.outbox.enqueueEvent(event, session);
      } else {
        await this.outbox.enqueueEvent(event);
      }
      return createdDoc;
    };

    let created: ProductDocument | undefined;
    try {
      if (session) {
        await session.withTransaction(async () => {
          created = await createAndEmit();
        });
      } else {
        created = await createAndEmit();
      }
    } finally {
      await session?.endSession();
    }

    if (!created) {
      throw new BadRequestException('Failed to create product');
    }

    return created;
  }

  private async handlePostCreationTasks(
    created: ProductDocument,
    sf: MinimalStorefront | null,
  ): Promise<void> {
    if (!created.merchantId) {
      throw new BadRequestException('Product merchantId is missing');
    }

    const catName =
      created.category &&
      (await this.categories.findOne(
        oidToString(created.category),
        created.merchantId.toHexString(),
      ));

    // فهرسة فورية
    await this.indexer.upsert(
      created,
      sf
        ? {
            ...(sf.slug && { slug: sf.slug }),
            ...(sf.domain && { domain: sf.domain }),
          }
        : undefined,
      catName?.name ?? null,
    );

    // كنس الكاش
    const merchantStr = created.merchantId.toHexString();
    await this.cache.invalidate(`v1:products:list:${merchantStr}:*`);
    await this.cache.invalidate(`v1:products:popular:${merchantStr}:*`);
  }

  /** تحديث منتج + outbox + إعادة فهرسة */
  async update(id: string, dto: UpdateProductDto): Promise<ProductDocument> {
    const _id = ensureValidObjectId(
      id,
      this.translationService.translate('validation.mongoId'),
    );

    const patch = this.buildUpdatePatch(dto);
    const updated = await this.performUpdate(_id, patch);

    await this.handleUpdateEvents(updated);
    await this.handlePostUpdateTasks(updated);

    return updated;
  }

  private buildUpdatePatch(dto: UpdateProductDto): Partial<Product> {
    const patch: Partial<Product> = {};

    this.applyBasicFieldsUpdate(dto, patch);
    this.applyArrayFieldsUpdate(dto, patch);
    this.applyVariantsUpdate(dto, patch);
    this.applyProductTypeUpdate(dto, patch);
    this.applyPublishingUpdate(dto, patch);
    this.applyRelatedProductsUpdate(dto, patch);

    return patch;
  }

  private assignIfDefined<T extends keyof Product>(
    patch: Partial<Product>,
    key: T,
    value: Product[T] | undefined,
  ): void {
    if (value !== undefined) {
      patch[key] = value;
    }
  }

  private applyPriceFieldsUpdate(
    dto: UpdateProductDto,
    patch: Partial<Product>,
    baseCurrency: Currency,
  ): void {
    if (dto.prices !== undefined) {
      const { prices, basePrice } = this.validation.normalizePrices(
        dto.prices,
        baseCurrency,
      );
      patch.prices = prices;
      patch.priceDefault = basePrice;
      patch.currency = baseCurrency;
      return;
    }

    if (dto.currency !== undefined) {
      patch.currency = dto.currency;
    }
  }

  private applyOfferUpdate(
    dto: UpdateProductDto,
    patch: Partial<Product>,
  ): void {
    if (dto.offer === undefined) return;
    const offer = toOffer(dto.offer);
    if (offer) {
      patch.offer = offer;
    }
  }

  private applyCategoryUpdate(
    dto: UpdateProductDto,
    patch: Partial<Product>,
  ): void {
    if (dto.category !== undefined) {
      patch.category = new Types.ObjectId(dto.category);
    }
  }

  private applyBasicFieldsUpdate(
    dto: UpdateProductDto,
    patch: Partial<Product>,
  ): void {
    const baseCurrency = dto.currency ?? Currency.YER;

    this.assignIfDefined(patch, 'name', dto.name);
    if (dto.shortDescription !== undefined) {
      patch.shortDescription = dto.shortDescription ?? '';
    }
    if (dto.richDescription !== undefined) {
      patch.richDescription = dto.richDescription ?? '';
    }

    this.applyPriceFieldsUpdate(dto, patch, baseCurrency);

    this.assignIfDefined(patch, 'isAvailable', dto.isAvailable);
    this.applyOfferUpdate(dto, patch);
    this.applyCategoryUpdate(dto, patch);
  }

  private applyArrayFieldsUpdate(
    dto: UpdateProductDto,
    patch: Partial<Product>,
  ): void {
    this.assignArrayField(patch, 'specsBlock', dto.specsBlock);
    this.assignArrayField(patch, 'keywords', dto.keywords);
    this.assignArrayField(patch, 'images', dto.images);
    if (dto.badges !== undefined) {
      patch.badges = sanitizeBadges(dto.badges);
    }
  }

  private applyVariantsUpdate(
    dto: UpdateProductDto,
    patch: Partial<Product>,
  ): void {
    const baseCurrency = dto.currency ?? Currency.YER;
    if (dto.hasVariants !== undefined) patch.hasVariants = dto.hasVariants;
    if (dto.variants !== undefined) {
      patch.variants = dto.variants.map((variant) => {
        const { prices: variantPrices, ...rest } = variant;
        const normalized = variantPrices
          ? this.validation.normalizePrices(variantPrices, baseCurrency)
          : null;
        const prices =
          normalized?.prices ??
          (variantPrices instanceof Map ? variantPrices : undefined);

        if (!prices) {
          throw new BadRequestException(
            'variant prices are required when updating variants',
          );
        }

        return {
          ...rest,
          prices,
          ...(normalized ? { priceDefault: normalized.basePrice } : {}),
          currency: baseCurrency,
          images: variant.images ?? [],
          isAvailable: variant.isAvailable ?? true,
          barcode: variant.barcode ?? null,
          lowStockThreshold: variant.lowStockThreshold ?? null,
          weight: variant.weight ?? null,
        };
      });
    }
  }

  private applyProductTypeUpdate(
    dto: UpdateProductDto,
    patch: Partial<Product>,
  ): void {
    if (dto.productType !== undefined) patch.productType = dto.productType;
    if (dto.digitalAsset !== undefined) patch.digitalAsset = dto.digitalAsset;
    if (dto.isUnlimitedStock !== undefined)
      patch.isUnlimitedStock = dto.isUnlimitedStock;
    // نظام المخزون
    if (dto.stock !== undefined) patch.stock = dto.stock;
    if (dto.lowStockThreshold !== undefined)
      patch.lowStockThreshold = dto.lowStockThreshold;
  }

  private applyPublishingUpdate(
    dto: UpdateProductDto,
    patch: Partial<Product>,
  ): void {
    if (dto.status !== undefined) patch.status = dto.status;
    if (dto.publishedAt !== undefined) patch.publishedAt = dto.publishedAt;
    if (dto.scheduledPublishAt !== undefined)
      patch.scheduledPublishAt = dto.scheduledPublishAt;
  }

  private applyRelatedProductsUpdate(
    dto: UpdateProductDto,
    patch: Partial<Product>,
  ): void {
    if (dto.relatedProducts !== undefined) {
      patch.relatedProducts = dto.relatedProducts.map(
        (id) => new Types.ObjectId(id),
      );
    }
  }

  private assignArrayField<T extends keyof Product>(
    patch: Partial<Product>,
    field: T,
    value: unknown,
  ): void {
    if (value !== undefined) {
      patch[field] = (Array.isArray(value) ? value : []) as Product[T];
    }
  }

  private async performUpdate(
    _id: Types.ObjectId,
    patch: Partial<Product>,
  ): Promise<ProductDocument> {
    const updated = await this.repo.updateById(_id, patch);
    if (!updated) {
      throw new NotFoundException(
        this.translationService.translateProduct('errors.notFound'),
      );
    }
    return updated;
  }

  private async handleUpdateEvents(updated: ProductDocument): Promise<void> {
    if (!updated.merchantId) {
      throw new BadRequestException('Product merchantId is missing');
    }
    const productIdStr = oidToString(updated._id);
    const merchantIdStr = oidToString(updated.merchantId);

    await this.outbox.enqueueEvent({
      aggregateType: 'product',
      aggregateId: productIdStr,
      eventType: 'product.updated',
      exchange: 'products',
      routingKey: 'product.updated',
      payload: { productId: productIdStr, merchantId: merchantIdStr },
      dedupeKey: `product.updated:${productIdStr}:${updated.updatedAt?.toISOString() ?? ''}`,
    });
  }

  private async handlePostUpdateTasks(updated: ProductDocument): Promise<void> {
    if (!updated.merchantId) {
      throw new BadRequestException('Product merchantId is missing');
    }
    const merchantIdStr = oidToString(updated.merchantId);

    const sf = (await this.storefronts.findByMerchant(
      merchantIdStr,
    )) as Storefront | null;
    const catName =
      updated.category &&
      (await this.categories.findOne(
        oidToString(updated.category),
        merchantIdStr,
      ));

    await this.indexer.upsert(
      updated,
      sf
        ? {
            ...(sf.slug && { slug: sf.slug }),
            ...(sf.domain && { domain: sf.domain }),
          }
        : undefined,
      catName?.name ?? null,
    );
  }

  /** تغيير حالة التوفّر */
  async setAvailability(
    productId: string,
    isAvailable: boolean,
  ): Promise<ReturnType<ProductsRepository['setAvailability']>> {
    const _id = ensureValidObjectId(
      productId,
      this.translationService.translate('validation.mongoId'),
    );
    return this.repo.setAvailability(_id, isAvailable);
  }

  /** حذف منتج + outbox + إزالة من المتجهات + كنس الكاش */
  async remove(id: string): Promise<{ message: string }> {
    const _id = ensureValidObjectId(
      id,
      this.translationService.translate('validation.mongoId'),
    );

    const before = await this.repo.findById(_id);
    if (!before) {
      throw new NotFoundException(
        this.translationService.translateProduct('errors.notFound'),
      );
    }

    if (!before.merchantId) {
      throw new BadRequestException('Product merchantId is missing');
    }

    const session = hasStartSession(this.repo)
      ? await this.repo.startSession()
      : null;

    const productIdStr = oidToString(before._id);
    const merchantIdStr = oidToString(before.merchantId);

    try {
      if (session) {
        await session.withTransaction(async () => {
          const ok = await this.repo.deleteById(_id, session);
          if (!ok) {
            throw new NotFoundException(
              this.translationService.translateProduct('errors.notFound'),
            );
          }
          await this.outbox.enqueueEvent(
            {
              aggregateType: 'product',
              aggregateId: productIdStr,
              eventType: 'product.deleted',
              exchange: 'products',
              routingKey: 'product.deleted',
              payload: { productId: productIdStr, merchantId: merchantIdStr },
              dedupeKey: `product.deleted:${productIdStr}`,
            },
            session,
          );
        });
      } else {
        const ok = await this.repo.deleteById(_id);
        if (!ok) {
          throw new NotFoundException(
            this.translationService.translateProduct('errors.notFound'),
          );
        }
        await this.outbox.enqueueEvent({
          aggregateType: 'product',
          aggregateId: productIdStr,
          eventType: 'product.deleted',
          exchange: 'products',
          routingKey: 'product.deleted',
          payload: { productId: productIdStr, merchantId: merchantIdStr },
          dedupeKey: `product.deleted:${productIdStr}`,
        });
      }
    } finally {
      await session?.endSession();
    }

    // حذف من المتجهات + كنس الكاش
    await this.indexer.removeOne(productIdStr);
    await this.cache.invalidate(`v1:products:list:${merchantIdStr}:*`);
    await this.cache.invalidate(`v1:products:popular:${merchantIdStr}:*`);

    return {
      message: this.translationService.translateProduct('messages.deleted'),
    };
  }

  /** واجهة قديمة */
  async uploadImages(
    productId: string,
    merchantId: string,
    files: Express.Multer.File[],
  ): Promise<{ urls: string[] }> {
    const urls = await this.media.uploadMany(merchantId, productId, files);
    return { urls };
  }

  /** رفع صور مع إرجاع إحصاءات */
  async uploadProductImagesToMinio(
    productId: string,
    merchantId: string,
    files: Express.Multer.File[],
  ): Promise<{
    urls: string[];
    count: number;
    accepted: number;
    remaining: number;
  }> {
    const _id = ensureValidObjectId(
      productId,
      this.translationService.translate('validation.mongoId'),
    );

    const urls = await this.media.uploadMany(
      merchantId,
      _id.toHexString(),
      files,
    );

    const configuredMax = this.config.get<number>('vars.products.maxImages');
    const MAX_IMAGES_DEFAULT = 20;
    const max =
      typeof configuredMax === 'number' ? configuredMax : MAX_IMAGES_DEFAULT;

    return {
      urls,
      count: urls.length,
      accepted: urls.length,
      remaining: Math.max(0, max - urls.length),
    };
  }
}

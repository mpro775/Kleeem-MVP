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

import { ProductIndexService } from './product-index.service';
import { ProductMediaService } from './product-media.service';

import type { Storefront } from '../../storefront/schemas/storefront.schema';
import type { ProductsRepository } from '../repositories/products.repository';
import type { Product, ProductDocument } from '../schemas/product.schema';
import type { ClientSession } from 'mongoose';

/* -------------------- ثوابت لتجنّب النصوص السحرية -------------------- */
const STATUS_ACTIVE = 'active' as const;
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
  return {
    ...dto,
    startAt: dto.startAt ? new Date(dto.startAt) : undefined,
    endAt: dto.endAt ? new Date(dto.endAt) : undefined,
  };
}

function mapSource(s?: ProductSource): 'manual' | 'api' {
  return s === ProductSource.API ? 'api' : 'manual';
}

function stringOrUndefined(v: unknown): string | undefined {
  return typeof v === 'string' && v.trim().length > 0 ? v : undefined;
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
  ) {}

  /** إنشاء منتج جديد مع outbox + فهرسة + كنس كاش */
  async create(
    dto: CreateProductDto & { merchantId: string },
  ): Promise<ProductDocument> {
    const merchantId = ensureValidObjectId(
      dto.merchantId,
      this.translationService.translate('validation.mongoId'),
    );

    const sf = await this.getStorefrontData(merchantId);
    const data = this.buildProductData(dto, merchantId, sf);

    const created = await this.createProductWithSession(data);
    await this.handlePostCreationTasks(created, sf);

    return created;
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
    return {
      merchantId,
      originalUrl: dto.originalUrl ?? null,
      sourceUrl: dto.sourceUrl ?? null,
      externalId: dto.externalId ?? null,
      platform: dto.platform ?? '',
      name: dto.name,
      description: dto.description ?? '',
      price: dto.price ?? 0,
      currency: dto.currency,
      offer: toOffer(dto.offer),
      isAvailable: dto.isAvailable ?? true,
      category: dto.category ? new Types.ObjectId(dto.category) : undefined,
      source: mapSource(dto.source),
      status: STATUS_ACTIVE,
    };
  }

  private buildStorefrontData(sf: MinimalStorefront | null): Partial<Product> {
    return {
      storefrontSlug: stringOrUndefined(sf?.slug ?? undefined),
      storefrontDomain: stringOrUndefined(sf?.domain ?? undefined),
    };
  }

  private buildArraysData(dto: CreateProductDto): Partial<Product> {
    return {
      specsBlock: Array.isArray(dto.specsBlock) ? dto.specsBlock : [],
      keywords: Array.isArray(dto.keywords) ? dto.keywords : [],
      images: Array.isArray(dto.images) ? dto.images : [],
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
        ? { slug: sf.slug ?? undefined, domain: sf.domain ?? undefined }
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
    return {
      name: dto.name,
      description: dto.description,
      price: dto.price,
      currency: dto.currency,
      offer: toOffer(dto.offer),
      isAvailable: dto.isAvailable,
      category: dto.category ? new Types.ObjectId(dto.category) : undefined,
      specsBlock: Array.isArray(dto.specsBlock) ? dto.specsBlock : undefined,
      keywords: Array.isArray(dto.keywords) ? dto.keywords : undefined,
      images: Array.isArray(dto.images) ? dto.images : undefined,
    };
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
        ? { slug: sf.slug ?? undefined, domain: sf.domain ?? undefined }
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

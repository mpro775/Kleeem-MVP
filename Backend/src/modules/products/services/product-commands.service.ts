import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Inject,
  forwardRef,
  Logger,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { ConfigService } from '@nestjs/config';

import { ProductsRepository } from '../repositories/products.repository';
import { ProductIndexService } from './product-index.service';
import { ProductMediaService } from './product-media.service';
import { CacheService } from '../../../common/cache/cache.service';

import { GetProductsDto } from '../dto/get-products.dto';
import { CreateProductDto, ProductSource } from '../dto/create-product.dto';
import { UpdateProductDto } from '../dto/update-product.dto';

import { StorefrontService } from '../../storefront/storefront.service';
import { CategoriesService } from '../../categories/categories.service';
import { ExternalProduct } from '../../integrations/types';
import { Product } from '../schemas/product.schema';
import { TranslationService } from '../../../common/services/translation.service';
import { OutboxService } from '../../../common/outbox/outbox.service';

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

  // إنشاء منتج
  async create(dto: CreateProductDto & { merchantId: string }) {
    const merchantId = new Types.ObjectId(dto.merchantId);
    const sf = await this.storefronts.findByMerchant(merchantId.toString());

    const data: Partial<Product> = {
      merchantId,
      storefrontSlug: sf?.slug,
      storefrontDomain: sf?.domain ?? undefined,
      originalUrl: dto.originalUrl,
      sourceUrl: dto.sourceUrl,
      externalId: dto.externalId,
      platform: dto.platform,
      name: dto.name,
      description: dto.description,
      price: dto.price,
      currency: dto.currency,
      offer: dto.offer
        ? {
            ...dto.offer,
            startAt: dto.offer.startAt
              ? new Date(dto.offer.startAt)
              : undefined,
            endAt: dto.offer.endAt ? new Date(dto.offer.endAt) : undefined,
          }
        : undefined,
      isAvailable: dto.isAvailable,
      category: dto.category ? new Types.ObjectId(dto.category) : undefined,
      specsBlock: dto.specsBlock,
      keywords: dto.keywords,
      images: dto.images,
      source: (dto.source ?? ProductSource.MANUAL) as 'manual' | 'api',
      status: 'active',
      syncStatus: dto.source === ProductSource.API ? 'pending' : 'ok',
    };

    let created!: Product;
    const session = await (this.repo as any).startSession?.();
    await session.withTransaction(async () => {
      created = await this.repo.create(data, session);
      await this.outbox.enqueueEvent(
        {
          aggregateType: 'product',
          aggregateId: created._id.toString(),
          eventType: 'product.created',
          exchange: 'products',
          routingKey: 'product.created',
          payload: {
            productId: created._id.toString(),
            merchantId: created.merchantId.toString(),
          },
          dedupeKey: `product.created:${created._id}`,
        },
        session,
      );
    });
    await session.endSession();

    const catName = created.category
      ? await this.categories.findOne(
          created.category.toString(),
          merchantId.toString(),
        )
      : null;

    // فهرسة فورية كـ fallback
    await this.indexer.upsert(created, sf, catName?.name ?? null);

    // كنس الكاش
    await this.cache.invalidate(`v1:products:list:${dto.merchantId}:*`);
    await this.cache.invalidate(`v1:products:popular:${dto.merchantId}:*`);

    return created;
  }

  async update(id: string, dto: UpdateProductDto) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException(
        this.translationService.translate('validation.mongoId'),
      );
    }
    const _id = new Types.ObjectId(id);

    let updated = await this.repo.updateById(_id, dto as any);
    if (!updated)
      throw new NotFoundException(
        this.translationService.translateProduct('errors.notFound'),
      );

    await this.outbox.enqueueEvent({
      aggregateType: 'product',
      aggregateId: updated._id.toString(),
      eventType: 'product.updated',
      exchange: 'products',
      routingKey: 'product.updated',
      payload: {
        productId: updated._id.toString(),
        merchantId: updated.merchantId.toString(),
      },
      dedupeKey: `product.updated:${updated._id}:${updated.updatedAt?.toISOString()}`,
    });

    const sf = await this.storefronts.findByMerchant(
      updated.merchantId.toString(),
    );
    const catName = updated.category
      ? await this.categories.findOne(
          updated.category.toString(),
          updated.merchantId.toString(),
        )
      : null;

    await this.indexer.upsert(updated, sf, catName?.name ?? null);
    return updated;
  }

  async setAvailability(productId: string, isAvailable: boolean) {
    if (!Types.ObjectId.isValid(productId))
      throw new BadRequestException(
        this.translationService.translate('validation.mongoId'),
      );
    return this.repo.setAvailability(
      new Types.ObjectId(productId),
      isAvailable,
    );
  }

  async remove(id: string) {
    if (!Types.ObjectId.isValid(id))
      throw new BadRequestException(
        this.translationService.translate('validation.mongoId'),
      );
    const _id = new Types.ObjectId(id);

    // احصل على الوثيقة قبل الحذف
    const before = await this.repo.findById(_id);
    if (!before)
      throw new NotFoundException(
        this.translationService.translateProduct('errors.notFound'),
      );

    const session = await (this.repo as any).startSession?.();
    await session.withTransaction(async () => {
      const ok = await this.repo.deleteById(_id, session);
      if (!ok)
        throw new NotFoundException(
          this.translationService.translateProduct('errors.notFound'),
        );

      await this.outbox.enqueueEvent(
        {
          aggregateType: 'product',
          aggregateId: before._id.toString(),
          eventType: 'product.deleted',
          exchange: 'products',
          routingKey: 'product.deleted',
          payload: {
            productId: before._id.toString(),
            merchantId: before.merchantId.toString(),
          },
          dedupeKey: `product.deleted:${before._id}`,
        },
        session,
      );
    });
    await session.endSession();

    // حذف من المتجهات + كنس الكاش
    await this.indexer.removeOne(before._id.toString());
    await this.cache.invalidate(
      `v1:products:list:${before.merchantId.toString()}:*`,
    );
    await this.cache.invalidate(
      `v1:products:popular:${before.merchantId.toString()}:*`,
    );

    return {
      message: this.translationService.translateProduct('messages.deleted'),
    };
  }

  // الواجهة القديمة التي كانت في service الأصلي — تُبقيها هنا (اختياري)
  async uploadImages(
    productId: string,
    merchantId: string,
    files: Express.Multer.File[],
    replace = false,
  ) {
    const urls = await this.media.uploadMany(
      merchantId,
      productId,
      files,
      replace,
    );
    return { urls };
  }

  // الواجهة المفصّلة التي تعتمد عليها الـ Controller عندك
  async uploadProductImagesToMinio(
    productId: string,
    merchantId: string,
    files: Express.Multer.File[],
    options: { replace?: boolean } = {},
  ) {
    const { replace = false } = options;

    if (!Types.ObjectId.isValid(productId)) {
      throw new BadRequestException(
        this.translationService.translate('validation.mongoId'),
      );
    }

    const urls = await this.media.uploadMany(
      merchantId,
      productId,
      files,
      replace,
    );

    const max = this.config.get<number>('vars.products.maxImages')!;

    return {
      urls,
      count: urls.length,
      accepted: urls.length,
      remaining: Math.max(0, max - urls.length),
    };
  }
}

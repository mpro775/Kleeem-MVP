import { Injectable, Inject, forwardRef, Logger } from '@nestjs/common';
import { Types } from 'mongoose';

import { ProductsRepository } from '../repositories/products.repository';
import { ProductIndexService } from './product-index.service';
import { StorefrontService } from '../../storefront/storefront.service';
import { CategoriesService } from '../../categories/categories.service';
import { ExternalProduct } from '../../integrations/types';
import { ProductSource } from '../dto/create-product.dto';
import { Product } from '../schemas/product.schema';

@Injectable()
export class ProductSyncService {
  private readonly logger = new Logger(ProductSyncService.name);

  constructor(
    @Inject('ProductsRepository')
    private readonly repo: ProductsRepository,
    private readonly indexer: ProductIndexService,
    @Inject(forwardRef(() => StorefrontService))
    private readonly storefronts: StorefrontService,
    private readonly categories: CategoriesService,
  ) {}

  async upsertExternalProduct(
    merchantId: string,
    provider: 'zid' | 'salla',
    p: ExternalProduct,
  ): Promise<{ created: boolean; id: string }> {
    const mId = new Types.ObjectId(merchantId);

    const existed = await this.repo.findByExternal(mId, p.externalId);

    const docData: Partial<Product> & { externalId: string } = {
      merchantId: mId,
      source: ProductSource.API,
      externalId: p.externalId,
      platform: provider,

      name: p.title ?? '',
      description: (p.raw as any)?.description ?? '',
      price: typeof p.price === 'number' ? p.price : Number(p.price) || 0,
      isAvailable: (p.stock ?? 0) > 0,
      images: Array.isArray((p.raw as any)?.images)
        ? ((p.raw as any).images as Array<{ url?: string }>[])
            .map((img) => (img as any)?.url)
            .filter((url): url is string => Boolean(url))
            .slice(0, 6)
        : [],

      // mapping للفئة لاحقاً
      category: undefined,

      sourceUrl: (p.raw as any)?.permalink ?? null,
      originalUrl: (p.raw as any)?.permalink ?? null,

      keywords: [],
      status: 'active',
      syncStatus: 'ok',
    };

    const doc = await this.repo.upsertExternal(mId, provider, docData);

    try {
      const sf = await this.storefronts.findByMerchant(
        doc.merchantId.toString(),
      );
      const catName = doc.category
        ? await this.categories.findOne(
            doc.category.toString(),
            doc.merchantId.toString(),
          )
        : null;
      await this.indexer.upsert(doc, sf, catName?.name ?? null);
    } catch (e) {
      this.logger.warn?.('vector upsert (external) failed', e as any);
    }

    return { created: !existed, id: doc._id.toString() };
  }
}

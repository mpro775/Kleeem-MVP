import { Injectable, Logger } from '@nestjs/common';
import { Types } from 'mongoose';

import { CacheService } from '../../../common/cache/cache.service';
import { CategoriesService } from '../../categories/categories.service';
import { StorefrontDocument } from '../../storefront/schemas/storefront.schema';
import { StorefrontService } from '../../storefront/storefront.service';
import { ProductsRepository } from '../repositories/products.repository';
import { ProductIndexService } from '../services/product-index.service';

// src/modules/products/events/product.events.consumer.ts
@Injectable()
export class ProductEventsConsumer {
  private readonly logger = new Logger(ProductEventsConsumer.name);
  constructor(
    private readonly indexer: ProductIndexService,
    private readonly cache: CacheService,
    private readonly productsRepo: ProductsRepository,
    private readonly storefronts: StorefrontService,
    private readonly categories: CategoriesService,
  ) {}

  // استقبل من Rabbit (حسب آلية الاشتراك لديك)
  async onProductCreated(msg: {
    aggregate: { id: string };
    payload: { merchantId: string };
  }): Promise<void> {
    const id = msg.aggregate.id;
    const doc = await this.productsRepo.findById(new Types.ObjectId(id));
    if (!doc) return;

    // اجلب storefront/category ثم upsert (Idempotent)
    const sf = (await this.storefronts.findByMerchant(
      doc.merchantId.toString(),
    )) as StorefrontDocument | null;
    const catName = doc.category
      ? ((
          await this.categories.findOne(
            doc.category.toString(),
            doc.merchantId.toString(),
          )
        )?.name ?? null)
      : null;

    await this.indexer.upsert(doc, sf, catName);
    // نظّف كاش القوائم لهذا التاجر
    await this.cache.invalidate(
      `v1:products:list:${doc.merchantId.toString()}:*`,
    );
    await this.cache.invalidate(
      `v1:products:popular:${doc.merchantId.toString()}:*`,
    );
  }

  async onProductUpdated(msg: {
    aggregate: { id: string };
    payload: { merchantId: string };
  }): Promise<void> {
    await this.onProductCreated(msg); // نفس المسار
  }

  async onProductDeleted(msg: {
    aggregate: { id: string };
    payload: { merchantId: string };
  }): Promise<void> {
    await this.indexer.removeOne(msg.aggregate.id);
    await this.cache.invalidate(`v1:products:list:${msg.payload.merchantId}:*`);
    await this.cache.invalidate(
      `v1:products:popular:${msg.payload.merchantId}:*`,
    );
  }
}

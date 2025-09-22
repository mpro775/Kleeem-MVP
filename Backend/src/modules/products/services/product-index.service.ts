import { Injectable, Logger } from '@nestjs/common';

import { VectorService } from '../../vector/vector.service';
import { toEmbeddable } from '../utils/product.utils';

@Injectable()
export class ProductIndexService {
  private readonly logger = new Logger(ProductIndexService.name);
  private async retry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
    let last: any;
    for (let i = 1; i <= attempts; i++) {
      try {
        return await fn();
      } catch (e) {
        last = e;
        this.logger.warn(
          `vector attempt ${i}/${attempts} failed: ${(e as Error).message}`,
        );
        if (i < attempts) await new Promise((r) => setTimeout(r, 2 ** i * 500));
      }
    }
    throw last;
  }
  constructor(private readonly vector: VectorService) {}

  async upsert(
    productDoc: any,
    storefront?: { slug?: string; domain?: string } | null,
    categoryName?: string | null,
  ) {
    try {
      const ep = toEmbeddable(productDoc, storefront, categoryName ?? null);
      await this.retry(() => this.vector.upsertProducts([ep]));
    } catch (e) {
      this.logger.warn('vector upsert failed (final)', e);
    }
  }

  async removeOne(productId: string) {
    try {
      await this.vector.deleteProductPointsByMongoIds([productId]);
    } catch (e) {
      this.logger.warn('vector delete failed', e);
    }
  }

  /** حذف مجموعة منتجات */
  async removeMany(productIds: string[]) {
    if (!productIds?.length) return;
    try {
      await this.vector.deleteProductPointsByMongoIds(productIds);
    } catch (e) {
      this.logger.warn('vector bulk delete failed', e);
    }
  }
}

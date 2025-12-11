import { Injectable, Logger } from '@nestjs/common';
import { toEmbeddable } from 'src/modules/products/utils/product.utils';
import { VectorService } from 'src/modules/vector/vector.service';

import type { EmbeddableProduct as VectorEmbeddable } from 'src/modules/vector/utils/types';

@Injectable()
export class ProductIndexService {
  private readonly logger = new Logger(ProductIndexService.name);
  private async retry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
    let last: unknown;
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
    productDoc: unknown,
    storefront?: { slug?: string; domain?: string } | null,
    categoryName?: string | null,
  ): Promise<void> {
    try {
      const src = toEmbeddable(productDoc, storefront, categoryName ?? null);
      const { attributes: srcAttributes, ...rest } = src;

      const attributes =
        Array.isArray(srcAttributes) && srcAttributes.length
          ? srcAttributes.reduce<Record<string, unknown>>((acc, attr) => {
              const key =
                attr && typeof attr === 'object' && 'keySlug' in attr
                  ? (attr as { keySlug?: unknown }).keySlug
                  : undefined;
              if (typeof key === 'string' && key) {
                const val =
                  attr && typeof attr === 'object' && 'valueSlugs' in attr
                    ? (attr as { valueSlugs?: unknown[] }).valueSlugs
                    : undefined;
                acc[key] = val ?? attr;
              }
              return acc;
            }, {})
          : undefined;

      const ep: VectorEmbeddable = {
        ...rest,
        ...(attributes ? { attributes } : {}),
        status: typeof src.status === 'string' ? src.status : null,
      };

      await this.retry(() => this.vector.upsertProducts([ep]));
    } catch (e) {
      this.logger.warn('vector upsert failed (final)', e);
    }
  }

  async removeOne(productId: string): Promise<void> {
    try {
      await this.vector.deleteProductPointsByMongoIds([productId]);
    } catch (e) {
      this.logger.warn('vector delete failed', e);
    }
  }

  /** حذف مجموعة منتجات */
  async removeMany(productIds: string[]): Promise<void> {
    if (!productIds?.length) return;
    try {
      await this.vector.deleteProductPointsByMongoIds(productIds);
    } catch (e) {
      this.logger.warn('vector bulk delete failed', e);
    }
  }
}

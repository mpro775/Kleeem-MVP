import { Injectable, Logger } from '@nestjs/common';
import { VectorService } from '../../vector/vector.service';
import { toEmbeddable } from '../utils/product.utils';

@Injectable()
export class ProductIndexService {
  private readonly logger = new Logger(ProductIndexService.name);
  constructor(private readonly vector: VectorService) {}

  async upsert(
    productDoc: any,
    storefront?: { slug?: string; domain?: string } | null,
    categoryName?: string | null,
  ) {
    try {
      const ep = toEmbeddable(productDoc, storefront, categoryName ?? null);
      await this.vector.upsertProducts([ep]);
    } catch (e) {
      this.logger.warn('vector upsert failed', e as any);
    }
  }

  async removeOne(productId: string) {
    try {
      await this.vector.deleteProductPointsByMongoIds([productId]);
    } catch (e) {
      this.logger.warn('vector delete failed', e as any);
    }
  }

  /** حذف مجموعة منتجات */
  async removeMany(productIds: string[]) {
    if (!productIds?.length) return;
    try {
      await this.vector.deleteProductPointsByMongoIds(productIds);
    } catch (e) {
      this.logger.warn('vector bulk delete failed', e as any);
    }
  }
}

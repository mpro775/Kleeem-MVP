import { Injectable, Logger } from '@nestjs/common';

import { CacheService } from '../cache.service';
import { PopularProducts, ProductsList } from '../cache.types';
import { CACHE_TTL_5_MINUTES, CACHE_TTL_10_MINUTES } from '../constant';

import { CacheWarmer } from './cache-warmer.interface';

@Injectable()
export class ProductsWarmer implements CacheWarmer {
  readonly name = 'products';
  private readonly logger = new Logger(ProductsWarmer.name);

  constructor(private readonly cache: CacheService) {}

  async warm(): Promise<void> {
    try {
      const ids = this.getTopMerchantIds(10);
      await Promise.all(
        ids.map(async (merchantId) => {
          await this.cache.getOrSet<ProductsList>(
            CacheService.createKey(
              'v1',
              'products',
              'list',
              merchantId,
              'active',
              20,
              0,
            ),
            CACHE_TTL_5_MINUTES,
            () => this.getActiveProducts(merchantId),
          );

          await this.cache.getOrSet<PopularProducts>(
            CacheService.createKey('v1', 'products', 'popular', merchantId),
            CACHE_TTL_10_MINUTES,
            () => this.getPopularProducts(merchantId),
          );
        }),
      );
      this.logger.debug(`Warmed products for ${ids.length} merchants`);
    } catch (err) {
      this.logger.error('Failed to warm products cache', err as Error);
    }
  }

  private getTopMerchantIds(limit: number): string[] {
    return Array.from(
      { length: Math.min(limit, 5) },
      (_, i) => `merchant_${i + 1}`,
    );
  }

  private getActiveProducts(merchantId: string): Promise<ProductsList> {
    return Promise.resolve({
      items: [],
      meta: { total: 0, hasMore: false },
      merchantId,
      cachedAt: new Date(),
    });
  }

  private getPopularProducts(merchantId: string): Promise<PopularProducts> {
    return Promise.resolve({ items: [], merchantId, cachedAt: new Date() });
  }
}

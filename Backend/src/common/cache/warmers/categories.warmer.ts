import { Injectable, Logger } from '@nestjs/common';

import { CacheService } from '../cache.service';
import { MerchantCategories } from '../cache.types';
import { CACHE_TTL_15_MINUTES } from '../constant';

import { CacheWarmer } from './cache-warmer.interface';

@Injectable()
export class CategoriesWarmer implements CacheWarmer {
  readonly name = 'categories';
  private readonly logger = new Logger(CategoriesWarmer.name);

  constructor(private readonly cache: CacheService) {}

  async warm(): Promise<void> {
    try {
      const ids = this.getTopMerchantIds(15);
      await Promise.all(
        ids.map((merchantId) =>
          this.cache.getOrSet<MerchantCategories>(
            CacheService.createKey('v1', 'categories', 'list', merchantId),
            CACHE_TTL_15_MINUTES,
            () => this.getMerchantCategories(merchantId),
          ),
        ),
      );
      this.logger.debug(`Warmed categories for ${ids.length} merchants`);
    } catch (err) {
      this.logger.error('Failed to warm categories cache', err as Error);
    }
  }

  private getTopMerchantIds(limit: number): string[] {
    return Array.from(
      { length: Math.min(limit, 5) },
      (_, i) => `merchant_${i + 1}`,
    );
  }

  private getMerchantCategories(
    merchantId: string,
  ): Promise<MerchantCategories> {
    return Promise.resolve({
      categories: [],
      merchantId,
      cachedAt: new Date(),
    });
  }
}

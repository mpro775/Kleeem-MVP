import { Injectable, Logger } from '@nestjs/common';

import { CacheService } from '../cache.service';
import { MerchantProfile } from '../cache.types';
import { CACHE_TTL_30_MINUTES } from '../constant';

import { CacheWarmer } from './cache-warmer.interface';

@Injectable()
export class MerchantsWarmer implements CacheWarmer {
  readonly name = 'merchants';
  private readonly logger = new Logger(MerchantsWarmer.name);

  constructor(private readonly cache: CacheService) {}

  async warm(): Promise<void> {
    try {
      const ids = this.getTopMerchantIds(20);
      await Promise.all(
        ids.map((merchantId) =>
          this.cache.getOrSet<MerchantProfile>(
            CacheService.createKey('v1', 'merchant', 'profile', merchantId),
            CACHE_TTL_30_MINUTES,
            () => this.getMerchantProfile(merchantId),
          ),
        ),
      );
      this.logger.debug(`Warmed ${ids.length} merchant profiles`);
    } catch (err) {
      this.logger.error('Failed to warm top merchants cache', err as Error);
    }
  }

  private getTopMerchantIds(limit: number): string[] {
    return Array.from(
      { length: Math.min(limit, 5) },
      (_, i) => `merchant_${i + 1}`,
    );
  }

  private getMerchantProfile(id: string): Promise<MerchantProfile> {
    return Promise.resolve({
      id,
      name: `Merchant ${id}`,
      status: 'active',
      cachedAt: new Date(),
    });
  }
}

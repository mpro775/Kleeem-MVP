import { Injectable, Logger } from '@nestjs/common';

import { CacheService } from '../cache.service';
import { ActivePlans } from '../cache.types';
import { CACHE_TTL_1_HOUR } from '../constant';

import { CacheWarmer } from './cache-warmer.interface';

@Injectable()
export class PlansWarmer implements CacheWarmer {
  readonly name = 'plans';
  private readonly logger = new Logger(PlansWarmer.name);

  constructor(private readonly cache: CacheService) {}

  async warm(): Promise<void> {
    try {
      await this.cache.getOrSet<ActivePlans>(
        CacheService.createKey('v1', 'plans', 'active'),
        CACHE_TTL_1_HOUR,
        () => this.getActivePlans(),
      );
      this.logger.debug('Warmed active plans cache');
    } catch (err) {
      this.logger.error('Failed to warm plans cache', err as Error);
    }
  }

  private getActivePlans(): Promise<ActivePlans> {
    return Promise.resolve({ plans: [], cachedAt: new Date() });
  }
}

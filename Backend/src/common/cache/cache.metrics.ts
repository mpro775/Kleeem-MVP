import { Injectable } from '@nestjs/common';
import { Counter, Histogram, register } from 'prom-client';

import { HISTOGRAM_BUCKETS } from './constant';

/**
 * مقاييس الكاش لـ Prometheus
 */

@Injectable()
export class CacheMetrics {
  private readonly cacheHitCounter: Counter<string>;
  private readonly cacheMissCounter: Counter<string>;
  private readonly cacheSetCounter: Counter<string>;
  private readonly cacheInvalidateCounter: Counter<string>;
  private readonly cacheOperationDuration: Histogram<string>;

  constructor() {
    // عداد cache hits
    this.cacheHitCounter = new Counter({
      name: 'cache_hit_total',
      help: 'Total number of cache hits',
      labelNames: ['cache_level', 'cache_key_prefix'],
      registers: [register],
    });

    // عداد cache misses
    this.cacheMissCounter = new Counter({
      name: 'cache_miss_total',
      help: 'Total number of cache misses',
      labelNames: ['cache_key_prefix'],
      registers: [register],
    });

    // عداد cache sets
    this.cacheSetCounter = new Counter({
      name: 'cache_set_total',
      help: 'Total number of cache sets',
      labelNames: ['cache_key_prefix'],
      registers: [register],
    });

    // عداد cache invalidations
    this.cacheInvalidateCounter = new Counter({
      name: 'cache_invalidate_total',
      help: 'Total number of cache invalidations',
      labelNames: ['pattern'],
      registers: [register],
    });

    // مدة العمليات
    this.cacheOperationDuration = new Histogram({
      name: 'cache_operation_duration_seconds',
      help: 'Duration of cache operations',
      labelNames: ['operation', 'cache_level'],
      buckets: HISTOGRAM_BUCKETS,
      registers: [register],
    });
  }

  /**
   * تسجيل cache hit
   */
  recordHit(cacheLevel: 'l1' | 'l2', keyPrefix: string): void {
    this.cacheHitCounter.inc({
      cache_level: cacheLevel,
      cache_key_prefix: keyPrefix,
    });
  }

  /**
   * تسجيل cache miss
   */
  recordMiss(keyPrefix: string): void {
    this.cacheMissCounter.inc({ cache_key_prefix: keyPrefix });
  }

  /**
   * تسجيل cache set
   */
  recordSet(keyPrefix: string): void {
    this.cacheSetCounter.inc({ cache_key_prefix: keyPrefix });
  }

  /**
   * تسجيل cache invalidation
   */
  recordInvalidation(pattern: string): void {
    this.cacheInvalidateCounter.inc({ pattern });
  }

  /**
   * تسجيل مدة العملية
   */
  recordOperationDuration(
    operation: string,
    cacheLevel: string,
    duration: number,
  ): void {
    this.cacheOperationDuration.observe(
      { operation, cache_level: cacheLevel },
      duration,
    );
  }

  /**
   * إنشاء timer للعملية
   */
  startTimer(operation: string, cacheLevel: string): () => void {
    return this.cacheOperationDuration.startTimer({
      operation,
      cache_level: cacheLevel,
    });
  }

  /**
   * استخراج بادئة المفتاح للمقاييس
   */
  static extractKeyPrefix(key: string): string {
    const parts = key.split(':');
    return parts.length > 2 ? `${parts[0]}:${parts[1]}:${parts[2]}` : key;
  }
}

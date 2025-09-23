// external (alphabetized)
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { Cache } from 'cache-manager';

// internal
import { CacheMetrics } from './cache.metrics';
import {
  CLEANUP_INTERVAL_MS,
  HITRATE_INTERVAL_MS,
  LOCK_TTL_SEC,
  LOCK_BACKOFF_MS,
  SCAN_COUNT,
  PIPELINE_BATCH,
  MS_PER_SECOND,
} from './constant';

// type (separate group)
import type { Gauge } from 'prom-client';

type Entry<T> = { v: T; e: number };

// ioredis subset without `any`
type RedisPipeline = {
  del(key: string): RedisPipeline;
  exec(): Promise<unknown>;
};

type RedisLike = {
  get(key: string): Promise<string | null>;
  // Overloads to match common ioredis SET usages we need
  set(
    key: string,
    value: string,
    mode: 'EX',
    ttl: number,
  ): Promise<'OK' | null>;
  set(
    key: string,
    value: string,
    mode: 'EX',
    ttl: number,
    nx: 'NX',
  ): Promise<'OK' | null>;
  del(key: string | string[]): Promise<number>;
  pipeline(): RedisPipeline;
  scanStream(args: { match?: string; count?: number }): NodeJS.ReadableStream;
  flushdb?(): Promise<'OK'>;
};

function isFunction(value: unknown): value is (...args: unknown[]) => unknown {
  return typeof value === 'function';
}

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object';
}

function isRedisClient(candidate: unknown): candidate is RedisLike {
  if (!isObject(candidate)) return false;
  return (
    isFunction(candidate.get) &&
    isFunction(candidate.set) &&
    isFunction(candidate.del) &&
    isFunction(candidate.pipeline)
  );
}

function pickCandidateFromCacheManager(cacheManager: Cache): unknown {
  // نحاول جمع احتمالات المواقع الشائعة للعميل داخل cacheManager أو store
  const cm = cacheManager as unknown as {
    stores?: unknown[];
    store?: unknown;
    client?: unknown;
  };

  const primary: unknown = Array.isArray(cm?.stores)
    ? cm.stores?.[0]
    : (cm?.store ?? cm);
  if (!primary) return cm;

  // نحاول العثور على client في عدة حقول محتملة
  const p = primary as Record<string, unknown>;
  return (
    p.client ?? (isObject(p.store) ? (p.store.client ?? p.store) : primary)
  );
}

/**
 * خدمة كاش موحدة مع L1 (ذاكرة) + L2 (Redis)
 */
@Injectable()
export class CacheService {
  private readonly l1 = new Map<string, Entry<unknown>>();
  private readonly log = new Logger(CacheService.name);
  private redis: RedisLike | null = null;

  // إحصائيات الكاش
  private stats = {
    l1Hits: 0,
    l2Hits: 0,
    misses: 0,
    sets: 0,
    invalidations: 0,
  };

  // متغيرات لمعدل الإصابة (قصيرة الأجل)
  private hits = 0;
  private misses = 0;

  constructor(
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    private readonly cacheMetrics: CacheMetrics,
    @InjectMetric('cache_hit_rate') private readonly cacheHitRateGauge: Gauge,
  ) {
    // خفض التعقيد: استخراج منطق الحصول على Redis لطريقة منفصلة
    this.redis = this.resolveRedisClient(this.cacheManager);
  }

  private resolveRedisClient(cacheManager: Cache): RedisLike | null {
    try {
      const candidate = pickCandidateFromCacheManager(cacheManager);
      if (isRedisClient(candidate)) {
        return candidate;
      }
      this.log.warn(
        'Could not get Redis client from cache manager; falling back to in-memory + cache-manager only',
      );
      return null;
    } catch (err) {
      this.log.warn(
        `Error while obtaining Redis client from cache manager; Redis disabled for this service: ${(err as Error).message}`,
      );
      return null;
    }
  }

  /**
   * جلب قيمة من الكاش
   */
  async get<T>(key: string): Promise<T | undefined> {
    const timer = this.cacheMetrics.startTimer('get', 'combined');

    try {
      // L1
      const l1Result = this.checkL1Cache<T>(key);
      if (l1Result) return l1Result;

      // L2
      const l2Result = await this.checkL2Cache<T>(key);
      return l2Result;
    } catch (error) {
      this.log.error(
        `Cache get error for key ${key}: ${(error as Error).message}`,
      );
      this.recordMiss(key);
      return undefined;
    } finally {
      timer();
    }
  }

  private checkL1Cache<T>(key: string): T | undefined {
    const now = Date.now();
    const l1Entry = this.l1.get(key);

    if (l1Entry && l1Entry.e > now) {
      this.recordHit('l1', key);
      this.log.debug(`L1 cache hit for key: ${key}`);
      return l1Entry.v as T;
    }

    return undefined;
  }

  private async checkL2Cache<T>(key: string): Promise<T | undefined> {
    if (!this.redis) {
      this.recordMiss(key);
      this.log.debug(`Cache miss (no L2) for key: ${key}`);
      return undefined;
    }

    try {
      const raw = await this.redis.get(key);
      if (!raw) {
        this.recordMiss(key);
        this.log.debug(`Cache miss for key: ${key}`);
        return undefined;
      }

      const parsed = this.parseRedisValue<T>(raw);
      if (!parsed) return undefined;

      const { v, e: exp } = parsed;
      const now = Date.now();

      if (typeof exp === 'number' && exp > now) {
        this.l1.set(key, { v, e: exp });
        this.recordHit('l2', key);
        this.log.debug(`L2 cache hit for key: ${key}`);
        return v;
      }

      // Entry expired
      await this.deleteExpiredEntry(key);
      this.recordMiss(key);
      return undefined;
    } catch (err) {
      this.log.warn(
        `Redis L2 cache error for key ${key}: ${(err as Error).message}`,
      );
      this.recordMiss(key);
      return undefined;
    }
  }

  private parseRedisValue<T>(raw: string): Entry<T> | null {
    try {
      return JSON.parse(raw) as Entry<T>;
    } catch (parseErr) {
      this.log.warn(
        `Corrupted JSON for key parsing, skipping: ${(parseErr as Error).message}`,
      );
      return null;
    }
  }

  private async deleteExpiredEntry(key: string): Promise<void> {
    try {
      await this.redis!.del(key);
    } catch (delErr) {
      this.log.warn(
        `Failed to delete expired key ${key} from Redis: ${(delErr as Error).message}`,
      );
    }
    this.l1.delete(key);
  }

  private recordHit(level: 'l1' | 'l2', key: string): void {
    const keyPrefix = CacheMetrics.extractKeyPrefix(key);

    if (level === 'l1') {
      this.stats.l1Hits++;
    } else {
      this.stats.l2Hits++;
    }

    this.hits++;
    this.cacheMetrics.recordHit(level, keyPrefix);
  }

  private recordMiss(key: string): void {
    const keyPrefix = CacheMetrics.extractKeyPrefix(key);
    this.stats.misses++;
    this.misses++;
    this.cacheMetrics.recordMiss(keyPrefix);
  }

  /**
   * حفظ قيمة في الكاش
   */
  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    const expiry = Date.now() + ttlSeconds * MS_PER_SECOND;
    const entry: Entry<T> = { v: value, e: expiry };

    try {
      // L1
      this.l1.set(key, entry);

      // L2
      if (this.redis) {
        await this.redis.set(key, JSON.stringify(entry), 'EX', ttlSeconds);
      }

      this.stats.sets++;
      this.log.debug(`Cache set for key: ${key}, TTL: ${ttlSeconds}s`);
    } catch (error) {
      this.log.error(
        `Cache set error for key ${key}: ${(error as Error).message}`,
      );
      throw error;
    }
  }

  /**
   * جلب من الكاش أو تنفيذ الدالة وحفظ النتيجة
   */
  async getOrSet<T>(
    key: string,
    ttlSeconds: number,
    fn: () => Promise<T>,
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== undefined) return cached;

    // قفل اختياري عبر Redis
    if (this.redis) {
      const lockKey = `lock:fill:${key}`;
      const got = await this.redis.set(lockKey, '1', 'EX', LOCK_TTL_SEC, 'NX');
      if (got !== 'OK') {
        await new Promise((res) => setTimeout(res, LOCK_BACKOFF_MS));
        const again = await this.get<T>(key);
        if (again !== undefined) return again;
      } else {
        try {
          const value = await fn();
          await this.set(key, value, ttlSeconds);
          return value;
        } finally {
          try {
            await this.redis.del(lockKey);
          } catch (err) {
            this.log.warn(
              `Failed to release lock ${lockKey}: ${(err as Error).message}`,
            );
          }
        }
      }
    }

    // fallback
    try {
      this.log.debug(`Executing function for cache key: ${key}`);
      const value = await fn();
      await this.set(key, value, ttlSeconds);
      return value;
    } catch (error) {
      this.log.error(
        `getOrSet error for key ${key}: ${(error as Error).message}`,
      );
      throw error;
    }
  }

  /**
   * إبطال الكاش بنمط معين
   */
  async invalidate(pattern: string): Promise<void> {
    try {
      this.log.debug(`Invalidating cache pattern: ${pattern}`);

      // L1
      const l1Keys = Array.from(this.l1.keys());
      const matchingL1Keys = l1Keys.filter((k) =>
        this.matchPattern(k, pattern),
      );
      for (const k of matchingL1Keys) this.l1.delete(k);

      // L2
      if (this.redis) {
        const stream = this.redis.scanStream({
          match: pattern,
          count: SCAN_COUNT,
        });
        let pipeline = this.redis.pipeline();
        let batch = 0;
        const execs: Promise<unknown>[] = [];

        await new Promise<void>((resolve, reject) => {
          stream.on('data', (keys: string[]) => {
            if (!Array.isArray(keys) || keys.length === 0) return;
            for (const key of keys) {
              pipeline.del(key);
              batch++;
              if (batch >= PIPELINE_BATCH) {
                execs.push(pipeline.exec());
                pipeline = this.redis!.pipeline();
                batch = 0;
              }
            }
          });
          stream.on('end', async () => {
            if (batch > 0) execs.push(pipeline.exec());
            try {
              await Promise.allSettled(execs);
              resolve();
            } catch (err) {
              reject(err as Error);
            }
          });
          stream.on('error', (err: Error) => reject(err));
        });
      }

      this.stats.invalidations++;
      this.log.debug(
        `Invalidated ${matchingL1Keys.length} L1 keys for pattern: ${pattern}`,
      );
    } catch (error) {
      this.log.error(
        `Cache invalidation error for pattern ${pattern}: ${(error as Error).message}`,
      );
      throw error;
    }
  }

  /**
   * حذف مفتاح محدد
   */
  async delete(key: string): Promise<void> {
    try {
      this.l1.delete(key);
      if (this.redis) {
        await this.redis.del(key);
      }
      this.log.debug(`Deleted cache key: ${key}`);
    } catch (error) {
      this.log.error(
        `Cache delete error for key ${key}: ${(error as Error).message}`,
      );
      throw error;
    }
  }

  /**
   * مسح جميع الكاش
   */
  async clear(): Promise<void> {
    try {
      this.l1.clear();

      if (process.env.NODE_ENV !== 'production' && this.redis?.flushdb) {
        await this.redis.flushdb();
      } else if (this.redis) {
        this.log.warn(
          'Cache clear skipped in production environment - Redis not cleared',
        );
      }

      this.log.warn('Cache cleared (L1 only in production)');
    } catch (error) {
      this.log.error('Cache clear error:', (error as Error).message);
      throw error;
    }
  }

  /**
   * الحصول على إحصائيات الكاش
   */
  getStats(): {
    l1Hits: number;
    l2Hits: number;
    misses: number;
    sets: number;
    invalidations: number;
    l1Size: number;
    hitRate: string;
    totalRequests: number;
  } {
    const total = this.stats.l1Hits + this.stats.l2Hits + this.stats.misses;
    const hitRate =
      total > 0
        ? (((this.stats.l1Hits + this.stats.l2Hits) / total) * 100).toFixed(2)
        : '0.00';

    return {
      ...this.stats,
      l1Size: this.l1.size,
      hitRate: `${hitRate}%`,
      totalRequests: total,
    };
  }

  /**
   * إعادة تعيين الإحصائيات
   */
  resetStats(): void {
    this.stats = {
      l1Hits: 0,
      l2Hits: 0,
      misses: 0,
      sets: 0,
      invalidations: 0,
    };
    // hits/misses قصيرة الأجل تُعاد دورياً في updateHitRate
  }

  /**
   * تنظيف L1 cache من البيانات المنتهية الصلاحية
   */
  private cleanupL1(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.l1.entries()) {
      if (entry.e <= now) {
        this.l1.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.log.debug(`Cleaned ${cleaned} expired entries from L1 cache`);
    }
  }

  /**
   * جدولة تنظيف L1 كل 5 دقائق
   */
  @Interval(CLEANUP_INTERVAL_MS)
  private cleanupL1Tick(): void {
    this.cleanupL1();
  }

  /**
   * هروب الرموز الخاصة في regex
   */
  private escapeRegex(s: string): string {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * مطابقة النمط مع المفتاح
   */
  private matchPattern(key: string, pattern: string): boolean {
    const esc = this.escapeRegex(pattern);
    const rx = esc.replace(/\\\*/g, '.*').replace(/\\\?/g, '.');
    const regex = new RegExp(`^${rx}$`);
    return regex.test(key);
  }

  /**
   * إنشاء مفتاح كاش منظم
   */
  static createKey(prefix: string, ...parts: (string | number)[]): string {
    return [prefix, ...parts.map((p) => String(p))].join(':');
  }

  /**
   * تحديث معدل الإصابة كل دقيقة
   */
  @Interval(HITRATE_INTERVAL_MS)
  updateHitRate(): void {
    const total = this.hits + this.misses || 1;
    this.cacheHitRateGauge.set(
      { cache_type: 'redis' },
      (this.hits / total) * 100,
    );
    this.hits = 0;
    this.misses = 0;
  }
}

import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Injectable, Logger, Inject } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { Cache } from 'cache-manager';
import * as Redis from 'ioredis';
import { Gauge } from 'prom-client';

import { CacheMetrics } from './cache.metrics';

type Entry<T> = { v: T; e: number };

/**
 * خدمة كاش موحدة مع L1 (ذاكرة) + L2 (Redis)
 */
@Injectable()
export class CacheService {
  private readonly l1 = new Map<string, Entry<any>>();
  private readonly log = new Logger(CacheService.name);
  private redis: Redis.Redis | null = null;

  // إحصائيات الكاش
  private stats = {
    l1Hits: 0,
    l2Hits: 0,
    misses: 0,
    sets: 0,
    invalidations: 0,
  };

  // متغيرات لمعدل الإصابة
  private hits = 0;
  private misses = 0;

  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private cacheMetrics: CacheMetrics,
    @InjectMetric('cache_hit_rate')
    private readonly cacheHitRateGauge: Gauge<string>,
  ) {
    // محاولة الحصول على Redis instance من cache manager (طرق متعددة لدعم اختلاف الستور)
    try {
      const redisStore: any = (this.cacheManager as any).stores
        ? (this.cacheManager as any).stores[0]
        : (this.cacheManager as any).store || (this.cacheManager as any);

      const candidate =
        redisStore?.client ||
        redisStore?.store?.client ||
        redisStore?.store ||
        redisStore;

      // تحقق سريع أن candidate يمتلك واجهة Redis الأساسية
      if (candidate && typeof candidate.get === 'function') {
        this.redis = candidate as Redis.Redis;
      } else {
        this.log.warn(
          'Could not get Redis client from cache manager; falling back to cache-manager operations only',
        );
        this.redis = null;
      }
    } catch (err) {
      this.log.warn(
        'Error while obtaining Redis client from cache manager; Redis disabled for this service',
        (err as Error).message,
      );
      this.redis = null;
    }

    // تنظيف L1 cache كل 5 دقائق
    setInterval(() => this.cleanupL1(), 5 * 60 * 1000);
  }

  /**
   * جلب قيمة من الكاش
   */
  async get<T>(key: string): Promise<T | undefined> {
    const timer = this.cacheMetrics.startTimer('get', 'combined');
    const keyPrefix = CacheMetrics.extractKeyPrefix(key);
    const now = Date.now();

    try {
      // البحث في L1 (ذاكرة)
      const l1Entry = this.l1.get(key);
      if (l1Entry && l1Entry.e > now) {
        this.stats.l1Hits++;
        this.hits++;
        this.cacheMetrics.recordHit('l1', keyPrefix);
        this.log.debug(`L1 cache hit for key: ${key}`);
        return l1Entry.v;
      }

      // البحث في L2 (Redis) إذا كان متوفراً
      if (this.redis && typeof this.redis.get === 'function') {
        try {
          const raw = await this.redis.get(key);
          if (!raw) {
            this.stats.misses++;
            this.misses++;
            this.cacheMetrics.recordMiss(keyPrefix);
            this.log.debug(`Cache miss for key: ${key}`);
            return undefined;
          }

          const parsed = JSON.parse(raw);
          const { v, e: exp } = parsed;

          if (exp > now) {
            // إضافة إلى L1 للاستخدام السريع التالي
            this.l1.set(key, { v, e: exp });
            this.stats.l2Hits++;
            this.hits++;
            this.cacheMetrics.recordHit('l2', keyPrefix);
            this.log.debug(`L2 cache hit for key: ${key}`);
            return v as T;
          } else {
            // انتهت صلاحية البيانات
            try {
              await this.redis.del(key);
            } catch (delErr) {
              this.log.warn(
                `Failed to delete expired key ${key} from Redis`,
                delErr as Error,
              );
            }
            this.l1.delete(key);
            this.stats.misses++;
            this.misses++;
            this.cacheMetrics.recordMiss(keyPrefix);
            return undefined;
          }
        } catch (err) {
          this.log.warn(
            `Redis L2 cache error for key ${key}: ${(err as Error).message}`,
          );
          // عند خطأ في Redis نعتبرها miss محمية
          this.stats.misses++;
          this.misses++;
          this.cacheMetrics.recordMiss(keyPrefix);
          return undefined;
        }
      }

      // لا يوجد L2 -> miss
      this.stats.misses++;
      this.misses++;
      this.cacheMetrics.recordMiss(keyPrefix);
      this.log.debug(`Cache miss (no L2) for key: ${key}`);
      return undefined;
    } catch (error) {
      this.log.error(
        `Cache get error for key ${key}: ${(error as Error).message}`,
      );
      this.stats.misses++;
      this.misses++;
      return undefined;
    } finally {
      timer();
    }
  }

  /**
   * حفظ قيمة في الكاش
   */
  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    const expiry = Date.now() + ttlSeconds * 1000;
    const entry = { v: value, e: expiry };

    try {
      // حفظ في L1
      this.l1.set(key, entry);

      // حفظ في L2 (Redis) إذا كان متوفراً
      if (this.redis && typeof this.redis.set === 'function') {
        // في ioredis: set(key, value, 'EX', seconds)
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
    if (cached !== undefined) {
      return cached;
    }

    // lock اختياري باستخدام redis للحماية من thundering herd
    if (this.redis) {
      const lockKey = `lock:fill:${key}`;
      const got = await this.redis.set(lockKey, '1', 'EX', 5, 'NX'); // 5s
      if (got !== 'OK') {
        // منتظر أحد يملأ الكاش
        await new Promise((res) => setTimeout(res, 150)); // backoff صغير
        const again = await this.get<T>(key);
        if (again !== undefined) return again;
        // ما زال فاضي—نحاول مرة واحدة نملأه نحن (لتفادي الجمود)
      } else {
        try {
          const value = await fn();
          await this.set(key, value, ttlSeconds);
          return value;
        } finally {
          await this.redis.del(lockKey);
        }
      }
    }

    // fallback لو ما فيه redis
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

      // إبطال من L1
      const l1Keys = Array.from(this.l1.keys());
      const matchingL1Keys = l1Keys.filter((key) =>
        this.matchPattern(key, pattern),
      );
      matchingL1Keys.forEach((key) => this.l1.delete(key));

      // إبطال من L2 (Redis) إذا كان متوفراً
      if (this.redis && typeof (this.redis as any).scanStream === 'function') {
        const stream = (this.redis as any).scanStream({
          match: pattern,
          count: 500,
        });
        const pipeline = this.redis.pipeline();
        let batch = 0;

        await new Promise<void>((resolve, reject) => {
          stream.on('data', (keys: string[]) => {
            if (!keys?.length) return;
            for (const k of keys) {
              pipeline.del(k);
              batch++;
              if (batch >= 1000) {
                pipeline.exec();
                batch = 0;
              }
            }
          });
          stream.on('end', async () => {
            if (batch > 0) await pipeline.exec();
            resolve();
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

      // حذف من L2 (Redis) إذا كان متوفراً
      if (this.redis && typeof this.redis.del === 'function') {
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

      // مسح L2 (Redis) إذا كان متوفراً - محمي في الإنتاج
      if (process.env.NODE_ENV !== 'production' && this.redis?.flushdb) {
        await this.redis.flushdb();
      } else if (this.redis) {
        // بديل آمن في الإنتاج: امسح namespace فقط إن عندك prefix معروف
        // أو لا تمسح L2 إطلاقاً هنا
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
  getStats() {
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
   * هروب الرموز الخاصة في regex
   */
  private escapeRegex(s: string): string {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * مطابقة النمط مع المفتاح
   */
  private matchPattern(key: string, pattern: string): boolean {
    // حوّل glob إلى regex مع الهروب أولاً
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
  @Interval(60_000)
  updateHitRate() {
    const total = this.hits + this.misses || 1;
    this.cacheHitRateGauge.set(
      { cache_type: 'redis' },
      (this.hits / total) * 100,
    );
    this.hits = this.misses = 0;
  }
}

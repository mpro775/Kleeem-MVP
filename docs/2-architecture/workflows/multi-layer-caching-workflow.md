# ورك فلو الكاش متعدد الطبقات (L1/L2) - نظام كليم الشامل

## نظرة عامة على النظام

نظام كليم يدعم كاش متعدد الطبقات متقدم لتحسين الأداء والموثوقية:

- **L1 Cache**: ذاكرة داخلية سريعة (in-memory Map)
- **L2 Cache**: Redis للتخزين الموزع والمستمر
- **Cache Invalidation**: إبطال ذكي بناءً على الأنماط
- **Cache Warmer**: تسخين الكاش للبيانات الشائعة
- **Metrics & Monitoring**: تتبع الأداء والإحصائيات
- **Locking Mechanism**: منع السباق في الكاش المشترك

## 1. مخطط التدفق العام (Flowchart)

```mermaid
graph TD
    A[طلب بيانات] --> B[فحص L1 Cache<br/>البحث في الذاكرة]
    B --> C{موجود في L1؟}

    C -->|نعم| D[إرجاع من L1<br/>تحديث الإحصائيات]
    C -->|لا| E[فحص L2 Cache<br/>البحث في Redis]

    E --> F{موجود في L2؟}
    F -->|نعم| G[إرجاع من L2<br/>تحديث L1]
    F -->|لا| H[تنفيذ العملية<br/>جلب البيانات]

    H --> I[حفظ في L1 و L2<br/>مع TTL مناسب]
    I --> J[إرجاع النتيجة<br/>تحديث الإحصائيات]

    K[إبطال الكاش] --> L[تحديد النمط<br/>pattern للإبطال]
    L --> M[فحص L1 Cache<br/>حذف المطابقات]
    M --> N[فحص L2 Cache<br/>حذف من Redis]

    O[تسخين الكاش] --> P[تحديد البيانات الشائعة<br/>Popular data identification]
    P --> Q[جلب البيانات<br/>Data preloading]
    Q --> R[حفظ في L1 و L2<br/>مع TTL طويل]

    S[مراقبة الأداء] --> T[قياس معدل الإصابة<br/>Hit rate monitoring]
    T --> U[تحليل الأنماط<br/>Pattern analysis]
    U --> V[تحسين الإعدادات<br/>Configuration optimization]
```

## 2. مخطط التسلسل (Sequence Diagram)

```mermaid
sequenceDiagram
    participant C as Client
    participant CS as Cache Service
    participant L1 as L1 Cache (Memory)
    participant L2 as L2 Cache (Redis)
    participant DB as Database
    participant AN as Analytics

    Note over C,CS: طلب بيانات
    C->>CS: GET /api/data/{id}

    Note over CS,L1: فحص L1 Cache
    CS->>L1: check key in memory
    L1-->>CS: cache miss (expired)

    Note over CS,L2: فحص L2 Cache
    CS->>L2: get key from Redis
    L2-->>CS: data found

    Note over CS,L1: تحديث L1 Cache
    CS->>L1: set key with expiry
    L1-->>CS: confirmation

    Note over AN: تسجيل الإحصائيات
    CS->>AN: record L2 hit
    AN-->>CS: confirmation

    CS-->>C: 200 OK + cached data

    Note over C,CS: طلب آخر
    C->>CS: GET /api/data/{id}

    Note over CS,L1: إصابة L1
    CS->>L1: get key from memory
    L1-->>CS: data found

    Note over AN: تسجيل الإحصائيات
    CS->>AN: record L1 hit
    AN-->>CS: confirmation

    CS-->>C: 200 OK + data
```

## 3. آلة الحالات (State Machine)

```mermaid
stateDiagram-v2
    [*] --> طلب_بيانات: استلام طلب

    طلب_بيانات --> فحص_L1: البحث في الذاكرة
    فحص_L1 --> موجود_في_L1: تم العثور في L1
    فحص_L1 --> غير_موجود_في_L1: غير موجود في L1

    موجود_في_L1 --> إرجاع_من_L1: إرجاع البيانات
    غير_موجود_في_L1 --> فحص_L2: البحث في Redis

    فحص_L2 --> موجود_في_L2: تم العثور في L2
    فحص_L2 --> غير_موجود_في_L2: غير موجود في L2

    موجود_في_L2 --> تحديث_L1: حفظ في L1
    غير_موجود_في_L2 --> تنفيذ_العملية: جلب من المصدر

    تحديث_L1 --> إرجاع_من_L1: إرجاع البيانات
    تنفيذ_العملية --> حفظ_في_الكاش: حفظ L1 + L2
    حفظ_في_الكاش --> إرجاع_من_المصدر: إرجاع البيانات

    إرجاع_من_L1 --> تسجيل_الإحصائيات: L1 hit
    إرجاع_من_المصدر --> تسجيل_الإحصائيات: miss

    تسجيل_الإحصائيات --> إنهاء_الطلب: تم بنجاح

    طلب_إبطال --> تحديد_النمط: pattern specification
    تحديد_النمط --> إبطال_L1: حذف من الذاكرة
    إبطال_L1 --> إبطال_L2: حذف من Redis
    إبطال_L2 --> تأكيد_الإبطال: تم الحذف

    طلب_تسخين --> تحديد_البيانات: data identification
    تحديد_البيانات --> جلب_البيانات: fetch from source
    جلب_البيانات --> حفظ_في_الكاش: pre-cache data
    حفظ_في_الكاش --> تأكيد_التسخين: cache warmed
```

### تعريف الحالات

| الحالة             | الوصف                     | الإجراءات المسموحة    |
| ------------------ | ------------------------- | --------------------- |
| `طلب_بيانات`       | استلام طلب لجلب بيانات    | فحص الكاش             |
| `فحص_L1`           | البحث في L1 Cache         | التحقق من الصلاحية    |
| `موجود_في_L1`      | البيانات موجودة في L1     | إرجاع مباشرة          |
| `غير_موجود_في_L1`  | البيانات غير موجودة في L1 | فحص L2                |
| `فحص_L2`           | البحث في L2 Cache         | التحقق من Redis       |
| `موجود_في_L2`      | البيانات موجودة في L2     | تحديث L1              |
| `غير_موجود_في_L2`  | البيانات غير موجودة في L2 | تنفيذ العملية         |
| `تنفيذ_العملية`    | جلب البيانات من المصدر    | قاعدة البيانات أو API |
| `حفظ_في_الكاش`     | حفظ في L1 و L2            | تحديث كلا المستويين   |
| `إرجاع_من_L1`      | إرجاع البيانات من L1      | تحديث الإحصائيات      |
| `إرجاع_من_المصدر`  | إرجاع البيانات الجديدة    | تحديث الإحصائيات      |
| `تسجيل_الإحصائيات` | تسجيل مقاييس الأداء       | hit/miss tracking     |
| `طلب_إبطال`        | طلب إبطال الكاش           | تحديد النمط           |
| `طلب_تسخين`        | طلب تسخين الكاش           | تحديد البيانات        |

## 4. مخطط سير العمل التجاري (BPMN)

```mermaid
graph TB
    Start([بدء]) --> RequestReceived[استلام الطلب]
    RequestReceived --> L1Check[فحص L1 Cache]

    L1Check --> L1Hit{موجود في L1؟}
    L1Hit -->|نعم| L1Return[إرجاع من L1]
    L1Hit -->|لا| L2Check[فحص L2 Cache]

    L2Check --> L2Hit{موجود في L2؟}
    L2Hit -->|نعم| UpdateL1[تحديث L1]
    L2Hit -->|لا| ExecuteOperation[تنفيذ العملية]

    UpdateL1 --> L1Return
    ExecuteOperation --> SaveToCache[حفظ في الكاش]

    SaveToCache --> ReturnData[إرجاع البيانات]

    L1Return --> LogHit[تسجيل L1 hit]
    ReturnData --> LogMiss[تسجيل miss]

    LogHit --> SuccessEnd([نجاح])
    LogMiss --> SuccessEnd

    subgraph "إبطال الكاش"
        InvalidationRequest[طلب إبطال]
        InvalidationRequest --> DeterminePattern[تحديد النمط]
        DeterminePattern --> InvalidateL1[إبطال L1]
        InvalidateL1 --> InvalidateL2[إبطال L2]
        InvalidateL2 --> InvalidationComplete[اكتمال الإبطال]
    end

    subgraph "تسخين الكاش"
        WarmupRequest[طلب تسخين]
        WarmupRequest --> IdentifyPopularData[تحديد البيانات الشائعة]
        IdentifyPopularData --> FetchData[جلب البيانات]
        FetchData --> PreCacheData[حفظ في الكاش]
        PreCacheData --> WarmupComplete[اكتمال التسخين]
    end

    SuccessEnd --> End([نهاية])
```

## 5. تفاصيل تقنية لكل مرحلة

### 5.1 مرحلة الكاش متعدد الطبقات

#### 5.1.1 هيكل الكاش

```typescript
// L1: ذاكرة داخلية سريعة
private readonly l1 = new Map<string, Entry<unknown>>();

// L2: Redis للتخزين المستمر
private redis: RedisLike | null = null;

// إحصائيات الأداء
private stats = {
  l1Hits: 0,
  l2Hits: 0,
  misses: 0,
  sets: 0,
  invalidations: 0,
};
```

#### 5.1.2 هيكل البيانات المخزنة

```typescript
interface Entry<T> {
  v: T; // القيمة المخزنة
  e: number; // تاريخ الانتهاء (timestamp)
}
```

#### 5.1.3 عملية البحث

```typescript
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
    this.log.error(`Cache get error for key ${key}: ${(error as Error).message}`);
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
    this.log.warn(`Redis L2 cache error for key ${key}: ${(err as Error).message}`);
    this.recordMiss(key);
    return undefined;
  }
}

private parseRedisValue<T>(raw: string): Entry<T> | null {
  try {
    return JSON.parse(raw) as Entry<T>;
  } catch (parseErr) {
    this.log.warn(`Corrupted JSON for key parsing, skipping: ${(parseErr as Error).message}`);
    return null;
  }
}

private async deleteExpiredEntry(key: string): Promise<void> {
  try {
    await this.redis!.del(key);
  } catch (delErr) {
    this.log.warn(`Failed to delete expired key ${key} from Redis: ${(delErr as Error).message}`);
  }
  this.l1.delete(key);
}

### 5.2 مرحلة إبطال الكاش

#### 5.2.1 إبطال بناءً على الأنماط

```typescript
async function invalidate(pattern: string): Promise<void> {
  // 1. إبطال L1
  const l1Keys = Array.from(this.l1.keys());
  const matchingL1Keys = l1Keys.filter((key) =>
    this.matchPattern(key, pattern),
  );
  matchingL1Keys.forEach((key) => this.l1.delete(key));

  // 2. إبطال L2 (Redis)
  if (this.redis) {
    const stream = this.redis.scanStream({
      match: pattern,
      count: SCAN_COUNT,
    });

    let pipeline = this.redis.pipeline();
    let batch = 0;

    stream.on('data', (keys: string[]) => {
      keys.forEach((key) => {
        pipeline.del(key);
        batch++;
        if (batch >= PIPELINE_BATCH) {
          pipeline.exec();
          pipeline = this.redis!.pipeline();
          batch = 0;
        }
      });
    });
  }
}
```

#### 5.2.2 مطابقة الأنماط

```typescript
private matchPattern(key: string, pattern: string): boolean {
  const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regexPattern = escaped.replace(/\\\*/g, '.*').replace(/\\\?/g, '.');
  const regex = new RegExp(`^${regexPattern}$`);
  return regex.test(key);
}
```

### 5.3 مرحلة تسخين الكاش

#### 5.3.1 تحديد البيانات الشائعة

```typescript
async function identifyPopularData(): Promise<string[]> {
  const popularKeys = [];

  // تحليل الاستعلامات الشائعة
  const queryStats = await analytics.getPopularQueries();
  popularKeys.push(...queryStats.map((q) => `query:${q.id}`));

  // تحليل المنتجات الشائعة
  const productStats = await analytics.getPopularProducts();
  popularKeys.push(...productStats.map((p) => `product:${p.id}`));

  // تحليل الفئات الشائعة
  const categoryStats = await analytics.getPopularCategories();
  popularKeys.push(...categoryStats.map((c) => `category:${c.id}`));

  return popularKeys;
}
```

#### 5.3.2 تسخين الكاش

```typescript
// يشغّل كل الـ warmers كل 15 دقيقة
@Cron('*/15 * * * *', { name: 'cache-warmer', timeZone: 'Asia/Riyadh' })
async warmAll(): Promise<void> {
  if (this.isWarming) {
    this.logger.debug('Cache warming already in progress, skipping...');
    return;
  }

  this.isWarming = true;
  const start = Date.now();
  try {
    this.logger.log('Starting cache warming process...');
    await Promise.all(this.warmers.map((w) => w.warm()));
    this.logger.log(`Cache warming completed in ${Date.now() - start}ms`);
  } catch (err) {
    this.logger.error('Cache warming failed', err as Error);
  } finally {
    this.isWarming = false;
  }
}

// مثال على warmer للمنتجات
@Injectable()
export class ProductsWarmer implements CacheWarmer {
  readonly name = 'products';

  async warm(): Promise<void> {
    const ids = this.getTopMerchantIds(10);
    await Promise.all(
      ids.map(async (merchantId) => {
        await this.cache.getOrSet<ProductsList>(
          CacheService.createKey('v1', 'products', 'list', merchantId, 'active', 20, 0),
          CACHE_TTL_5_MINUTES,
          () => this.getActiveProducts(merchantId),
        );
      }),
    );
  }
}
```

### 5.4 مرحلة إدارة الجلسات والقفل

#### 5.4.1 قفل الكاش المشترك

```typescript
async function getOrSet<T>(
  key: string,
  ttlSeconds: number,
  fn: () => Promise<T>,
): Promise<T> {
  // فحص الكاش أولاً
  const cached = await this.get<T>(key);
  if (cached !== undefined) return cached;

  // إنشاء قفل لمنع السباق
  const lockKey = `lock:fill:${key}`;
  const gotLock = await this.redis?.set(lockKey, '1', 'EX', LOCK_TTL_SEC, 'NX');

  if (gotLock !== 'OK') {
    // في انتظار الآخرين
    await new Promise((resolve) => setTimeout(resolve, LOCK_BACKOFF_MS));
    const again = await this.get<T>(key);
    if (again !== undefined) return again;
  }

  try {
    // تنفيذ العملية
    const value = await fn();
    await this.set(key, value, ttlSeconds);
    return value;
  } finally {
    // إزالة القفل
    await this.redis?.del(lockKey);
  }
}
```

#### 5.4.2 تنظيف الجلسات المنتهية

```typescript
@Interval(CLEANUP_INTERVAL_MS)
private cleanupL1Tick(): void {
  this.cleanupL1();
}

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
```

#### 5.4.3 إدارة الكاش عبر API

```typescript
@ApiTags('Cache Management')
@Controller('admin/cache')
@UseGuards(JwtAuthGuard)
@Roles(UserRole.ADMIN)
export class CacheController {
  @Get('stats')
  getStats(): { success: boolean; data: ReturnType<CacheService['getStats']> } {
    return {
      success: true,
      data: this.cacheService.getStats(),
    };
  }

  @Post('stats/reset')
  resetStats(): { success: boolean; message: string } {
    this.cacheService.resetStats();
    return {
      success: true,
      message: 'تم إعادة تعيين إحصائيات الكاش',
    };
  }

  @Delete('clear')
  async clearCache(): Promise<{ success: boolean; message: string }> {
    await this.cacheService.clear();
    return {
      success: true,
      message: 'تم مسح جميع الكاش',
    };
  }

  @Post('warm')
  async warmCache(@Body() body?: { type?: string }): Promise<{ success: boolean; message: string }> {
    await this.cacheWarmerService.manualWarm(body?.type);
    return {
      success: true,
      message: `تم تسخين الكاش${body?.type ? ` للنوع: ${body.type}` : ''}`,
    };
  }
}
```

## 6. معايير الأداء والمراقبة

### 6.1 إحصائيات الأداء

```typescript
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
  const hitRate = total > 0
    ? (((this.stats.l1Hits + this.stats.l2Hits) / total) * 100).toFixed(2)
    : '0.00';

  return {
    ...this.stats,
    l1Size: this.l1.size,
    hitRate: `${hitRate}%`,
    totalRequests: total,
  };
}
```

### 6.2 مراقبة معدل الإصابة

```typescript
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
```

### 6.3 مقاييس Prometheus التفصيلية

```typescript
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
}
```

## 7. مسارات الخطأ والتعامل معها

### 7.1 أخطاء L1 Cache

```javascript
L1_CACHE_OVERFLOW; // تجاوز حجم L1
L1_MEMORY_ERROR; // خطأ في الذاكرة
L1_SERIALIZATION_ERROR; // خطأ في التسلسل
```

### 7.2 أخطاء L2 Cache (Redis)

```javascript
REDIS_CONNECTION_ERROR; // خطأ في الاتصال
REDIS_TIMEOUT_ERROR; // انتهاء المهلة
REDIS_MEMORY_ERROR; // نفدت الذاكرة
REDIS_SERIALIZATION_ERROR; // خطأ في التسلسل
```

### 7.3 أخطاء الإبطال

```javascript
INVALIDATION_PATTERN_ERROR; // نمط إبطال خاطئ
INVALIDATION_TIMEOUT; // انتهاء مهلة الإبطال
PARTIAL_INVALIDATION; // إبطال جزئي فقط
```

## 8. خطة الاختبار والتحقق

### 8.1 اختبارات الوحدة

- اختبار فحص L1 Cache (`cache.service.spec.ts`)
- اختبار فحص L2 Cache مع Redis
- اختبار إبطال الكاش بناءً على الأنماط
- اختبار نظام القفل والسباق
- اختبار تسخين الكاش التلقائي واليدوي

### 8.2 اختبارات التكامل

- اختبار التكامل مع Redis (`cache.service.ts`)
- اختبار التكامل مع NestJS Cache Manager
- اختبار التكامل مع Prometheus (`cache.metrics.ts`)
- اختبار معالجة الأخطاء والـ fallback
- اختبار CacheController API

### 8.3 اختبارات الخدمات

- اختبار MerchantCacheService (`merchant-cache.service.spec.ts`)
- اختبار استخدام الكاش في الخدمات المختلفة
- اختبار cache warmer orchestration
- اختبار ProductsWarmer وغيرها من الـ warmers

### 8.4 اختبارات الأداء

- اختبار أداء L1 vs L2 تحت الحمل
- اختبار أداء الإبطال بالأنماط المعقدة
- اختبار أداء تسخين الكاش التلقائي
- اختبار استهلاك الذاكرة مع نمو L1 cache
- اختبار زمن الاستجابة مع قفل Redis

### 8.5 اختبارات التحميل والضغط

- اختبار الكاش تحت الحمل العالي (1000+ طلب/ثانية)
- اختبار معدل الإصابة تحت الضغط المستمر
- اختبار زمن الاستجابة مع Redis مزدحم
- اختبار استهلاك الشبكة مع نمط الإبطال
- اختبار تسرب الذاكرة في L1 cache

---

_تم إنشاء هذا التوثيق بواسطة نظام كليم لإدارة المتاجر الذكية_

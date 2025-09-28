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
async function get<T>(key: string): Promise<T | undefined> {
  // 1. فحص L1 أولاً (سريع جداً)
  const l1Result = this.checkL1Cache<T>(key);
  if (l1Result) return l1Result;

  // 2. فحص L2 إذا لم يكن موجود في L1
  const l2Result = await this.checkL2Cache<T>(key);
  return l2Result;
}

private checkL1Cache<T>(key: string): T | undefined {
  const now = Date.now();
  const l1Entry = this.l1.get(key);

  if (l1Entry && l1Entry.e > now) {
    this.recordHit('l1', key);
    return l1Entry.v as T;
  }

  return undefined;
}

private async checkL2Cache<T>(key: string): Promise<T | undefined> {
  if (!this.redis) return undefined;

  try {
    const raw = await this.redis.get(key);
    if (!raw) return undefined;

    const parsed = this.parseRedisValue<T>(raw);
    if (!parsed || parsed.e <= Date.now()) {
      await this.deleteExpiredEntry(key);
      return undefined;
    }

    // تحديث L1 من L2
    this.l1.set(key, parsed);
    this.recordHit('l2', key);
    return parsed.v;
  } catch (error) {
    return undefined;
  }
}
```

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
async function warmupCache(popularKeys: string[]): Promise<void> {
  const warmupPromises = popularKeys.map(async (key) => {
    try {
      const data = await fetchDataForKey(key);
      await this.set(key, data, LONG_TTL);
    } catch (error) {
      logger.warn(`Failed to warmup cache for key: ${key}`, error);
    }
  });

  await Promise.allSettled(warmupPromises);
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
  const now = Date.now();
  let cleaned = 0;

  for (const [key, entry] of this.l1.entries()) {
    if (entry.e <= now) {
      this.l1.delete(key);
      cleaned++;
    }
  }

  if (cleaned > 0) {
    logger.debug(`Cleaned ${cleaned} expired entries from L1 cache`);
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
    (this.hits / total) * 100
  );
  this.hits = 0;
  this.misses = 0;
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

- اختبار فحص L1 Cache
- اختبار فحص L2 Cache
- اختبار إبطال الكاش
- اختبار نظام القفل

### 8.2 اختبارات التكامل

- اختبار التكامل مع Redis
- اختبار التكامل مع NestJS Cache Manager
- اختبار التكامل مع Prometheus
- اختبار معالجة الأخطاء

### 8.3 اختبارات الأداء

- اختبار أداء L1 vs L2
- اختبار أداء الإبطال
- اختبار أداء تسخين الكاش
- اختبار استهلاك الذاكرة

### 8.4 اختبارات التحميل

- اختبار الكاش تحت الحمل العالي
- اختبار معدل الإصابة تحت الضغط
- اختبار زمن الاستجابة
- اختبار استهلاك الشبكة

---

_تم إنشاء هذا التوثيق بواسطة نظام كليم لإدارة المتاجر الذكية_

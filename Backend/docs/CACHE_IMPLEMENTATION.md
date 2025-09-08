# نظام الكاش الموحد - L1 (ذاكرة) + L2 (Redis) + Cache Warming

## نظرة عامة

تم تنفيذ نظام كاش متطور يجمع بين مستويين من التخزين المؤقت مع تسخين تلقائي للبيانات الشائعة:

- **L1 Cache**: ذاكرة سريعة داخل التطبيق
- **L2 Cache**: Redis للمشاركة بين الخوادم
- **Cache Warming**: تسخين تلقائي للبيانات المهمة
- **Metrics**: مراقبة شاملة للأداء

---

## 🏗️ البنية المعمارية

### المكونات الأساسية

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Application   │───▶│   CacheService   │───▶│   L1 (Memory)   │
│    Services     │    │                  │    │                 │
└─────────────────┘    │                  │    └─────────────────┘
                       │                  │
                       │                  │    ┌─────────────────┐
                       │                  │───▶│   L2 (Redis)    │
                       │                  │    │                 │
                       └──────────────────┘    └─────────────────┘
                              │
                       ┌──────────────────┐
                       │  Cache Warmer    │
                       │   (Scheduler)    │
                       └──────────────────┘
```

---

## 🚀 الاستخدام الأساسي

### 1. حقن الخدمة

```typescript
import { CacheService } from '../../common/cache/cache.service';

@Injectable()
export class ProductsService {
  constructor(
    private readonly cacheService: CacheService,
    // ... other dependencies
  ) {}
}
```

### 2. استخدام الكاش

#### جلب من الكاش أو تنفيذ الدالة

```typescript
async getProducts(merchantId: string, dto: GetProductsDto) {
  const cacheKey = CacheService.createKey(
    'v1', 'products', 'list', merchantId, dto.status || 'all'
  );

  return this.cacheService.getOrSet(cacheKey, 300, async () => {
    // تنفيذ الاستعلام الفعلي
    return this.executeQuery(merchantId, dto);
  });
}
```

#### حفظ في الكاش

```typescript
await this.cacheService.set('user:123', userData, 3600); // ساعة واحدة
```

#### جلب من الكاش

```typescript
const userData = await this.cacheService.get<User>('user:123');
```

#### إبطال الكاش

```typescript
// إبطال نمط معين
await this.cacheService.invalidate('v1:products:list:*');

// حذف مفتاح محدد
await this.cacheService.delete('user:123');
```

---

## 🔑 إنشاء مفاتيح الكاش

### استخدام CacheService.createKey()

```typescript
// ✅ جيد - منظم وواضح
const key = CacheService.createKey(
  'v1',
  'products',
  'list',
  merchantId,
  status,
);
// النتيجة: "v1:products:list:merchant123:active"

// ✅ جيد - للبيانات المعقدة
const key = CacheService.createKey(
  'v1',
  'products',
  'search',
  merchantId,
  dto.search || 'all',
  dto.sortBy || 'createdAt',
  dto.limit || 20,
  dto.cursor || '0',
);
```

### نصائح لأسماء المفاتيح

- استخدم إصدار (`v1`, `v2`) لسهولة الترحيل
- اجعل المفاتيح هرمية ومنطقية
- استخدم قيم افتراضية للمعاملات الاختيارية

---

## ⏰ أوقات انتهاء الصلاحية (TTL)

### التوصيات

| نوع البيانات     | TTL المقترح           | السبب           |
| ---------------- | --------------------- | --------------- |
| قوائم المنتجات   | 300 ثانية (5 دقائق)   | تتغير بكثرة     |
| بيانات المستخدم  | 1800 ثانية (30 دقيقة) | مستقرة نسبياً   |
| الخطط والأسعار   | 3600 ثانية (ساعة)     | نادراً ما تتغير |
| الإعدادات العامة | 7200 ثانية (ساعتان)   | ثابتة تقريباً   |
| نتائج البحث      | 600 ثانية (10 دقائق)  | متوسطة التغيير  |

### مثال

```typescript
// بيانات سريعة التغيير
await this.cacheService.set(key, data, 300);

// بيانات مستقرة
await this.cacheService.set(key, data, 1800);
```

---

## 🔄 إبطال الكاش

### عند التعديلات

```typescript
async createProduct(dto: CreateProductDto) {
  const product = await this.productModel.create(dto);

  // إبطال الكاش المرتبط
  await this.cacheService.invalidate(`v1:products:list:${dto.merchantId}:*`);
  await this.cacheService.invalidate(`v1:products:popular:${dto.merchantId}:*`);

  return product;
}

async updateProduct(id: string, dto: UpdateProductDto) {
  const product = await this.productModel.findByIdAndUpdate(id, dto);

  // إبطال الكاش
  await this.cacheService.invalidate(`v1:products:list:${product.merchantId}:*`);
  await this.cacheService.delete(`v1:products:detail:${id}`);

  return product;
}
```

### أنماط الإبطال الشائعة

```typescript
// إبطال جميع قوائم المنتجات للتاجر
'v1:products:list:merchant123:*';

// إبطال جميع بيانات المستخدم
'v1:users:*:user456';

// إبطال جميع الإحصائيات
'v1:analytics:*';
```

---

## 🔥 Cache Warming

### التسخين التلقائي

يتم تسخين الكاش تلقائياً كل 15 دقيقة للبيانات التالية:

- أهم 20 تاجر وبياناتهم الأساسية
- المنتجات النشطة للتجار الأكثر نشاطاً
- الفئات الشائعة
- الخطط النشطة

### التسخين اليدوي

```typescript
// تسخين جميع البيانات
await this.cacheWarmerService.manualWarm();

// تسخين نوع محدد
await this.cacheWarmerService.manualWarm('products');
await this.cacheWarmerService.manualWarm('merchants');
```

### إضافة بيانات جديدة للتسخين

```typescript
// في CacheWarmerService
private async warmCustomData(): Promise<void> {
  const cacheKey = CacheService.createKey('v1', 'custom', 'data');

  await this.cacheService.getOrSet(cacheKey, 900, async () => {
    return this.getCustomData();
  });
}
```

---

## 📊 المراقبة والمقاييس

### Prometheus Metrics

المقاييس المتوفرة:

```
# عدد cache hits
cache_hit_total{cache_level="l1|l2", cache_key_prefix="v1:products:list"}

# عدد cache misses
cache_miss_total{cache_key_prefix="v1:products:list"}

# عدد cache sets
cache_set_total{cache_key_prefix="v1:products:list"}

# عدد إبطالات الكاش
cache_invalidate_total{pattern="v1:products:list:*"}

# مدة العمليات
cache_operation_duration_seconds{operation="get", cache_level="l1"}
```

### API للمراقبة

```bash
# إحصائيات الكاش
GET /admin/cache/stats

# فحص صحة الكاش
GET /admin/cache/health

# مسح الكاش
DELETE /admin/cache/clear

# إبطال نمط
DELETE /admin/cache/invalidate/v1:products:*

# تسخين يدوي
POST /admin/cache/warm
```

### مثال على الاستجابة

```json
{
  "success": true,
  "data": {
    "l1Hits": 1250,
    "l2Hits": 890,
    "misses": 340,
    "sets": 445,
    "invalidations": 23,
    "l1Size": 156,
    "hitRate": "86.32%",
    "totalRequests": 2480
  }
}
```

---

## ⚡ تحسين الأداء

### أفضل الممارسات

#### 1. استخدم lean() مع Mongoose

```typescript
// ✅ جيد
const result = await this.productModel.find(filter).lean();

// ❌ تجنب
const result = await this.productModel.find(filter);
```

#### 2. حدد الحقول المطلوبة

```typescript
// ✅ جيد
const result = await this.productModel
  .find(filter)
  .select('name price status')
  .lean();
```

#### 3. استخدم الكاش للقراءات فقط

```typescript
// ✅ جيد - للقوائم والبحث
async getProducts() {
  return this.cacheService.getOrSet(key, ttl, () => this.query());
}

// ❌ تجنب - للعمليات الحساسة
async transferMoney() {
  // لا تستخدم الكاش هنا
}
```

#### 4. إبطال ذكي

```typescript
// ✅ جيد - إبطال محدد
await this.cacheService.invalidate(`v1:products:list:${merchantId}:*`);

// ❌ تجنب - إبطال شامل
await this.cacheService.clear();
```

---

## 🛡️ الأمان والموثوقية

### التعامل مع الأخطاء

```typescript
async getData(key: string) {
  try {
    return await this.cacheService.get(key);
  } catch (error) {
    // لا تكسر التطبيق بسبب خطأ في الكاش
    console.warn('Cache error:', error);
    return this.getFallbackData();
  }
}
```

### تجنب Cache Stampede

```typescript
// ✅ جيد - استخدام getOrSet
return this.cacheService.getOrSet(key, ttl, async () => {
  return this.expensiveQuery();
});

// ❌ تجنب - فحص منفصل
const cached = await this.cacheService.get(key);
if (!cached) {
  const data = await this.expensiveQuery();
  await this.cacheService.set(key, data, ttl);
  return data;
}
```

### حماية البيانات الحساسة

```typescript
// ❌ لا تخزن بيانات حساسة
await this.cacheService.set('user:pass', password, 3600);

// ✅ خزن معرفات أو بيانات عامة فقط
await this.cacheService.set('user:profile', publicProfile, 3600);
```

---

## 🔧 الإعدادات

### متغيرات البيئة

```bash
# Redis connection
REDIS_URL=redis://localhost:6379

# للإنتاج مع TLS
REDIS_URL=rediss://user:pass@host:6380
```

### إعدادات الكاش

```typescript
// في CacheModule
{
  ttl: 300,           // 5 دقائق افتراضي
  max: 1000,          // حد أقصى للعناصر
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3,
}
```

---

## 📈 مراقبة الإنتاج

### تنبيهات مهمة

```yaml
# Hit rate منخفض
- alert: CacheHitRateLow
  expr: cache_hit_total / (cache_hit_total + cache_miss_total) < 0.7
  for: 5m

# عدد كبير من الأخطاء
- alert: CacheErrorsHigh
  expr: increase(cache_errors_total[5m]) > 100

# L1 cache كبير جداً
- alert: L1CacheSizeHigh
  expr: cache_l1_size > 10000
```

### Dashboard مفيد

- Hit/Miss ratio بالوقت
- أكثر المفاتيح استخداماً
- توزيع TTL
- أوقات الاستجابة

---

## 🚀 أمثلة متقدمة

### كاش متعدد المستويات

```typescript
async getProductWithDetails(id: string) {
  // مستوى 1: بيانات أساسية
  const basicKey = CacheService.createKey('v1', 'products', 'basic', id);
  const basic = await this.cacheService.getOrSet(basicKey, 1800, () =>
    this.getBasicProduct(id)
  );

  // مستوى 2: تفاصيل إضافية
  const detailsKey = CacheService.createKey('v1', 'products', 'details', id);
  const details = await this.cacheService.getOrSet(detailsKey, 900, () =>
    this.getProductDetails(id)
  );

  return { ...basic, ...details };
}
```

### كاش مشروط

```typescript
async getProducts(merchantId: string, dto: GetProductsDto) {
  // لا تستخدم الكاش للبحث المعقد
  if (dto.search && dto.search.length < 3) {
    return this.executeQuery(merchantId, dto);
  }

  const cacheKey = CacheService.createKey(
    'v1', 'products', 'list', merchantId, dto.status || 'all'
  );

  return this.cacheService.getOrSet(cacheKey, 300, () =>
    this.executeQuery(merchantId, dto)
  );
}
```

---

## ✅ Checklist للتنفيذ

### ✅ تم التنفيذ

- [x] CacheService مع L1+L2
- [x] Cache Warming تلقائي
- [x] Prometheus Metrics
- [x] Cache Controller للإدارة
- [x] دمج في ProductsService
- [x] إبطال تلقائي عند التعديلات
- [x] وثائق شاملة

### 📋 التوصيات للمستقبل

- [ ] دمج الكاش في باقي الخدمات
- [ ] إضافة cache warming للبيانات المخصصة
- [ ] تحسين خوارزمية إبطال الكاش
- [ ] إضافة compression للبيانات الكبيرة
- [ ] تنفيذ cache partitioning للبيانات الضخمة

---

**النظام جاهز للاستخدام في الإنتاج** ✅

يوفر أداءً عالياً، مراقبة شاملة، وموثوقية ممتازة مع سهولة في الاستخدام والصيانة.

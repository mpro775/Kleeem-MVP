# Indexing Strategy — Kaleem AI

> الهدف: تسريع الاستعلامات الحرجة، خفض تكلفة القراءة/الكتابة، وحماية المنظومة من الـ scans المكلفة، مع خطة تشغيلية واضحة للإنشاء والمراقبة والصيانة.

## 1) النطاق والسياق
- DB الأساسية: **MongoDB** (مع Mongoose).
- الكاش: **Redis** (L2) + ذاكرة محلية (L1).
- البحث الدلالي: **Qdrant** (Vector DB).
- عبء العمل: Multi-tenant (merchantId أساس التقسيم)، قراءات كثيفة لقوائم المنتجات، فلاتر، بحث نصي/دلالي، تحليلات.

## 2) مبادئ التصميم
- **Always-Filter-by-merchantId** مبكّرًا + **compound indexes** تبدأ بـ merchantId.
- **قابلية الفرز**: أضف الحقل المستخدم في sort آخر الـ compound index.
- **Selective fields**: غطِّ مسارات الفلترة/الفرز الأكثر شيوعًا فقط.
- **Write vs Read trade-off**: لا تُكثِر الفهارس على collections ذات كتابة عالية دون حاجة مثبتة.
- **Partial/TTL** حيث يلزم (soft-deleted, ephemeral docs, sessions).

## 3) الفهارس القياسية (MongoDB)
> أمثلة `createIndexes` تعكس أكثر المسارات استخدامًا في Kaleem.

### 3.1 Products
- الاستخدام: listing + filter + sort + text search (fallback).
- الحقول الرئيسية: merchantId, status, isAvailable, category, price, slug, source, createdAt, updatedAt
```js
db.products.createIndexes([
  // استرجاع منتجات تاجر معيّن + الحالة + التوفر + فرز زمني (الفهارس الموجودة فعلياً)
  { key: { merchantId: 1, status: 1, createdAt: -1, _id: -1 }, name: "prod_mrch_status_created" },

  // فهرس للفئات والحالة والتوفر (الموجود فعلياً)
  { key: { merchantId: 1, category: 1, status: 1, isAvailable: 1, createdAt: -1, _id: -1 }, name: "prod_mrch_cat_status" },

  // فهرس للعروض النشطة (الموجود فعلياً)
  { key: { merchantId: 1, "offer.enabled": 1, "offer.startAt": 1, "offer.endAt": 1, createdAt: -1, _id: -1 }, name: "prod_mrch_offer_active" },

  // فهرس للمصدر (الموجود فعلياً)
  { key: { merchantId: 1, source: 1, createdAt: -1, _id: -1 }, name: "prod_mrch_source_created" },

  // فهرس للسعر (للترتيب حسب السعر - الموجود فعلياً)
  { key: { merchantId: 1, price: 1, createdAt: -1, _id: -1 }, name: "prod_mrch_price_created" },

  // فهرس للكلمات المفتاحية (مفيد للبحث المحسن)
  { key: { merchantId: 1, keywords: 1, createdAt: -1, _id: -1 }, name: "prod_mrch_keywords" },

  // فهرس فريد للـ slug داخل التاجر (الموجود فعلياً)
  { key: { merchantId: 1, slug: 1 }, name: "prod_slug_per_merchant", unique: true, sparse: true },

  // فهرس للبحث النصي (الموجود فعلياً)
  { key: { name: "text", description: "text" }, name: "prod_text_search", weights: { name: 5, description: 1 } },

  // فهرس فريد للـ uniqueKey (الموجود فعلياً)
  { key: { uniqueKey: 1 }, name: "prod_unique_key", unique: true, sparse: true },

  // فهرس فريد للـ externalId مع المصدر (للمنتجات من API - الموجود فعلياً)
  { key: { merchantId: 1, source: 1, externalId: 1 }, name: "prod_external_unique", unique: true, partialFilterExpression: { source: "api", externalId: { $type: "string" } } }
]);
```

### 3.2 Categories
- الحقول الرئيسية: merchantId, parent, slug, name, path, depth, order, createdAt
```js
db.categories.createIndexes([
  // فهرس أساسي للـ pagination مع merchantId (الموجود فعلياً)
  { key: { merchantId: 1, parent: 1, order: 1, createdAt: -1, _id: -1 }, name: "cat_mrch_parent_order" },

  // فهرس فريد للـ slug ضمن نفس الـ merchant والـ parent (الموجود فعلياً)
  { key: { merchantId: 1, parent: 1, slug: 1 }, name: "cat_slug_unique", unique: true },

  // فهرس للبحث النصي (الموجود فعلياً)
  { key: { name: "text", description: "text" }, name: "cat_text_search", weights: { name: 5, description: 1 } },

  // فهرس للـ path للبحث الهرمي (الموجود فعلياً)
  { key: { merchantId: 1, path: 1, createdAt: -1, _id: -1 }, name: "cat_path_hierarchy" },

  // فهرس للعمق (الموجود فعلياً)
  { key: { merchantId: 1, depth: 1, order: 1, createdAt: -1, _id: -1 }, name: "cat_depth_order" },

  // فهرس للأجداد (الموجود فعلياً)
  { key: { merchantId: 1, ancestors: 1, createdAt: -1, _id: -1 }, name: "cat_ancestors" }
]);
```

### 3.3 Orders
- الحقول الرئيسية: merchantId, sessionId, customer, status, source, externalId, createdAt
```js
db.orders.createIndexes([
  // فهرس أساسي للـ pagination مع merchantId (الموجود فعلياً)
  { key: { merchantId: 1, status: 1, createdAt: -1, _id: -1 }, name: "ord_mrch_status_created" },

  // فهرس للجلسة (الموجود فعلياً)
  { key: { sessionId: 1, createdAt: -1, _id: -1 }, name: "ord_session_created" },

  // فهرس للعميل (البحث بالهاتف - الموجود فعلياً)
  { key: { "customer.phone": 1, merchantId: 1, createdAt: -1, _id: -1 }, name: "ord_customer_phone", sparse: true },

  // فهرس للمصدر (الموجود فعلياً)
  { key: { merchantId: 1, source: 1, createdAt: -1, _id: -1 }, name: "ord_mrch_source_created" },

  // فهرس فريد للـ externalId مع merchantId (الموجود فعلياً)
  { key: { merchantId: 1, externalId: 1 }, name: "ord_external_unique", unique: true, sparse: true }
]);
```

### 3.4 Leads
- الحقول الرئيسية: merchantId, sessionId, phoneNormalized, source, createdAt
```js
db.leads.createIndexes([
  // فهرس للـ phoneNormalized مع merchantId (الموجود فعلياً)
  { key: { merchantId: 1, phoneNormalized: 1 }, name: "lead_phone_normalized" },

  // فهرس للجلسة (الموجود فعلياً)
  { key: { merchantId: 1, sessionId: 1 }, name: "lead_session" }
]);
```

### 3.5 Analytics Events
- الحقول الرئيسية: merchantId, type, channel, createdAt
```js
db.analytics_events.createIndexes([
  // فهرس أساسي مع merchantId والوقت (الموجود فعلياً)
  { key: { merchantId: 1, createdAt: -1 }, name: "ae_mrch_created" }
]);
```

### 3.6 Webhooks
- الحقول الرئيسية: eventType, payload, receivedAt
```js
// لا توجد فهارس مخصصة في schema الحالي - يمكن إضافة حسب الحاجة
```

### 3.7 Incoming Events
- الحقول الرئيسية: merchantId, channel, platformMessageId, sessionId
```js
db.incoming_events.createIndexes([
  // فهرس فريد للـ platformMessageId (الموجود فعلياً)
  { key: { merchantId: 1, channel: 1, platformMessageId: 1 }, name: "inc_event_unique", unique: true }
]);
```

### 3.8 Outbox Events
- الحقول الرئيسية: aggregateType, aggregateId, eventType, status, nextAttemptAt, createdAt
```js
db.outbox_events.createIndexes([
  // فهرس للاسترجاع: pending حسب أقدمية/استحقاق التنفيذ (الموجود فعلياً)
  { key: { status: 1, nextAttemptAt: 1 }, name: "outbox_pending_next" },

  // فهرس للفرز بالزمن (الموجود فعلياً)
  { key: { createdAt: 1 }, name: "outbox_created" },

  // فهرس للتعافي من التعليق publishing (الموجود فعلياً)
  { key: { status: 1, lockedAt: 1 }, name: "outbox_locked" },

  // فهرس فريد للـ dedupeKey (الموجود فعلياً)
  { key: { dedupeKey: 1 }, name: "outbox_dedupe", unique: true, sparse: true },

  // TTL لتنظيف الأحداث المنشورة القديمة (الموجود فعلياً)
  { key: { publishedAt: 1 }, name: "outbox_ttl", expireAfterSeconds: 7 * 24 * 60 * 60 }
]);
```


## 4) فهارس Qdrant (Vector)
- **Collections**: `products`, `offers`, `faqs`, `documents`, `web_knowledge`, `bot_faqs`
- **Payload indexes**: لتسريع الفلاتر قبل الـ vector search.
- مثال على collection المنتجات:
```json
{
  "name": "products",
  "vectors": {
    "size": 768,
    "distance": "Cosine"
  },
  "optimizers_config": {
    "memmap_threshold": 200000
  },
  "on_disk_payload": true
}
```
- Payload schema المستخدمة:
```json
{
  "merchantId": "string",
  "productId": "string",
  "categoryId": "string",
  "status": "active|inactive|out_of_stock",
  "isAvailable": true,
  "price": 199.0,
  "source": "manual|api"
}
```
- عند الاستعلام: استخدم **filter by merchantId + status + isAvailable + categoryId** قبل `topK`.

## 5) مفاتيح Redis (L2)
- نمط ثابت: `v1:{entity}:{scope}:{key}` مثال:
  - `v1:products:list:${merchantId}:${dtoKey}` → JSON (النمط المستخدم فعلياً)
  - `v1:products:popular:${merchantId}:*` → JSON
  - `v1:categories:list:${merchantId}` → JSON
- TTL: قوائم 5–15 دقيقة، العناصر المفردة 1–5 دقيقة، analytics قصيرة (30–120 ثانية).
- **Cache-busting**: عند تعديل/إنشاء/حذف منتج → احذف مفاتيح `products:list` + `products:popular` المتعلقة بالتاجر.
- **Cache Warming**: يتم تفعيل الكاش تلقائياً عبر `CacheWarmerOrchestrator`.

## 6) سياسة بناء/تعديل الفهارس (Runbook)
1. **تحليل الاستعلامات**: استخدم MongoDB profiler + Grafana/Loki لاستخراج `COLLSCAN` و `% ixscan` الأقل.
2. **اقتراحات**: صِف كل فهرس (الهدف + الاستعلامات المتأثرة + كلفة الكتابة).
3. **إنشاء تدريجي**: `db.collection.createIndex(..., { background: true })`.
4. **تحقق**: قِسّ latency/throughput قبل/بعد (p95/p99).
5. **تنظيف**: احذف الفهارس غير المستخدمة (`usage stats`) كل ربع سنة.
6. **حد أقصى** لحجم الفهارس نسبةً لحجم البيانات (Budget).

## 7) معايير القبول (Acceptance)
- p95 لـ /products?filters… < **120ms** عند warm cache، < **300ms** عند cold.
- لا توجد `COLLSCAN` على المسارات الحرجة.
- زيادات الكتابة لا تتعدّى +20% على collections عالية الكتابة.
- نجاح Cache Hit L2 ≥ **70%** لقوائم المنتجات الشائعة.
- بحث Qdrant مع فلترة payload ≤ **150ms** لـ topK=10.

## 8) أمثلة اختبار/مراقبة
- Playwright API assertions تقيس زمن الاستجابة قبل/بعد.
- Prometheus: `mongodb_op_latency_ms_bucket`, `cache_hits_total`, `cache_misses_total`, `qdrant_search_duration_ms`.
- لوحات Grafana: Latency by endpoint, Rate/Errors, Cache hit ratio.

## 9) الفهارس المقترحة للإضافة
بناءً على التحليل، إليك الفهارس المقترحة لتحسين الأداء:

### 9.1 Products - فهارس إضافية مقترحة
```js
// فهرس مركب للبحث المتقدم (الحالة + التوفر + السعر + التقييم)
db.products.createIndexes([
  { key: { merchantId: 1, status: 1, isAvailable: 1, price: 1, createdAt: -1, _id: -1 }, name: "prod_mrch_status_price" }
]);

// فهرس للعلامة التجارية (إذا تم إضافة حقل brand)
db.products.createIndexes([
  { key: { merchantId: 1, brand: 1, createdAt: -1, _id: -1 }, name: "prod_mrch_brand" }
]);
```

### 9.2 Orders - فهارس إضافية مقترحة
```js
// فهرس للعميل بالاسم (إذا تم إضافة حقل name)
db.orders.createIndexes([
  { key: { "customer.name": 1, merchantId: 1, createdAt: -1, _id: -1 }, name: "ord_customer_name", sparse: true }
]);

// فهرس للمبلغ الإجمالي (إذا تم إضافة حقل total)
db.orders.createIndexes([
  { key: { merchantId: 1, total: 1, createdAt: -1, _id: -1 }, name: "ord_mrch_total" }
]);
```

### 9.3 Categories - فهارس إضافية مقترحة
```js
// فهرس للبحث بالاسم (text search محسن)
db.categories.createIndexes([
  { key: { name: "text", description: "text" }, name: "cat_text_search", weights: { name: 5, description: 1 } }
]);
```

### 9.4 Analytics - فهارس إضافية مقترحة
```js
// فهرس للنوع والقناة (للتحليلات المحسنة)
db.analytics_events.createIndexes([
  { key: { merchantId: 1, type: 1, channel: 1, createdAt: -1 }, name: "ae_mrch_type_channel" }
]);
```

## 10) المِلَفات المرجعية
- ملف `INDEXING_MIGRATIONS.md` لتوثيق كل فهرس جديد (التاريخ/السبب/النتيجة).
- لقطات قبل/بعد من Grafana للحجة التجارية.


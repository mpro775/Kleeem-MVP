# دليل الاختبار اليدوي — المنتجات والفئات (Products & Categories)

> يغطي عمليات **المنتجات** و **الفئات** من `products.controller.ts` و `categories.controller.ts` مع التركيز على **التكاملات** (ProductIndexService، Catalog sync، Salla/Zid) و **الفيكتور** (Pinecone embeddings، البحث الدلالي).  
> **المتطلبات:** JWT تاجر صالح، و merchantId في التوكن يطابق التاجر المستهدف.

---

## 1) نطاق الدليل

| البند | الوصف |
|--------|--------|
| **النطاق** | مسارات `/products/*` و `/categories/*` — عمليات CRUD، البحث، المخزون، CSV، الفئات الشجرية |
| **التكاملات** | ProductIndexService → Vector (Pinecone)، Catalog sync (Salla/Zid)، Product-Category، Outbox |
| **الفيكتور** | فهرسة المنتجات عند إنشاء/تحديث/حذف، البحث الدلالي (semantic search)، querySimilarProducts |
| **غير مشمول** | عمليات الكتالوج التفصيلية (sync status)، واجهة المتجر العامة |
| **المراجع** | `products.controller.ts`, `categories.controller.ts`, `product-index.service.ts`, `vector.service.ts` |

---

## 2) البيئة والحسابات

| البند | القيمة (مثال) |
|--------|---------------|
| **البيئة** | Staging / UAT |
| **Base URL API** | `https://<your-api>/api` أو `http://localhost:3000/api` |
| **حساب تاجر** | JWT مع merchantId صالح |
| **معرّف تاجر للاختبار** | `merchantId` من user.merchantId بعد تسجيل الدخول |
| **Vector / Pinecone** | مُكوّن ومُتاح في البيئة (للتحقق من الفهرسة والبحث الدلالي) |

---

## 3) قائمة العمليات (Process List)

### من products.controller

1. **إنشاء منتج** — POST /products.
2. **قائمة المنتجات** — GET /products (مع pagination).
3. **البحث النصي** — GET /products/search?q=... (MongoDB text search).
4. **تحديث منتج** — PATCH /products/:id.
5. **حذف منتج** — DELETE /products/:id.
6. **رفع صور المنتج** — POST /products/:id/images.
7. **إعداد المنتجات** — POST /products/setup-products.
8. **المخزون** — GET/PATCH /products/:id/inventory، /products/:id/stock.
9. **الأسعار** — PATCH /products/:id/prices، /products/bulk-prices.
10. **استيراد/تصدير CSV** — POST /products/csv/import، GET /products/csv/export.
11. **تحديث المنتجات الشبيهة** — PATCH /products/:id/related-products.
12. **تحديث العلامات** — PATCH /products/:id/tags.

### من categories.controller

13. **إنشاء فئة** — POST /categories.
14. **قائمة الفئات** — GET /categories?merchantId=... (flat أو tree).
15. **عرض فئة** — GET /categories/:id.
16. **Breadcrumbs** — GET /categories/:id/breadcrumbs.
17. **Subtree** — GET /categories/:id/subtree.
18. **نقل فئة** — PATCH /categories/:id/move.
19. **حذف فئة** — DELETE /categories/:id (مع cascade).
20. **رفع صورة الفئة** — POST /categories/:id/image.
21. **تحديث فئة** — PATCH /categories/:id.

### من vector.controller (البحث الدلالي)

22. **البحث الدلالي للمنتجات** — POST /vector/products أو GET /vector/products/semantic-search?text=...&merchantId=...&topK=5.
23. **البحث الموحد** — POST /vector/unified-search.

### التكاملات

24. **مزامنة الكتالوج** — POST /catalog/:merchantId/sync (يستدعي المنتجات من Salla/Zid ويُفهرسها).
25. **استيراد منتج خارجي** — عبر ProductsService.upsertExternalProduct (Salla/Zid).

---

## 4) حالات الاختبار حسب العملية

---

### العملية 1: إنشاء منتج (POST /products)

**الـ API:** `POST /products`  
**Body:** CreateProductDto — name، description، merchantId (من JWT)، category، prices، status، إلخ.

#### السيناريو السعيد

| المعرّف | PRD-CRE-001 |
|----------|-------------|
| **العنوان** | إنشاء منتج بفئة وأسعار صحيحة |
| **الخطوات** | POST /products بـ `{ name, description, category, prices, status: "published" }` |
| **النتيجة المتوقعة** | 201، المنتج مُنشأ، Outbox event، **فهرسة Vector** (ProductIndexService.upsert) |
| **الأولوية** | حرج |

| المعرّف | PRD-CRE-002 |
|----------|-------------|
| **العنوان** | إنشاء منتج مع فئة — categoryName يظهر في embedding |
| **الخطوات** | إنشاء منتج مع categoryId صالح |
| **النتيجة المتوقعة** | categoryName يُضمَّن في embedding المنتج (للتحقق من querySimilarProducts) |
| **الأولوية** | عالي |

#### سيناريوهات فشل

| المعرّف | العنوان | الخطوات | النتيجة المتوقعة | الأولوية |
|----------|---------|---------|-------------------|----------|
| PRD-CRE-003 | فئة غير موجودة | category: ObjectId غير صالح | 400 أو 404 |
| PRD-CRE-004 | أسعار غير صحيحة | prices فارغ أو غير صالح | 400 |
| PRD-CRE-005 | عدم إرسال توكن | 401 |
| PRD-CRE-006 | merchantId غير صالح | Forbidden |

---

### العملية 2: تحديث منتج (PATCH /products/:id)

**الـ API:** `PATCH /products/:id`  
**Body:** UpdateProductDto.

#### السيناريو السعيد

| المعرّف | PRD-UPD-001 |
|----------|-------------|
| **العنوان** | تحديث اسم/وصف/فئة |
| **الخطوات** | PATCH /products/:id بـ `{ name, description, category }` |
| **النتيجة المتوقعة** | 200، المنتج محدّث، **إعادة فهرسة Vector** (handlePostUpdateTasks → indexer.upsert) |
| **الأولوية** | حرج |

| المعرّف | PRD-UPD-002 |
|----------|-------------|
| **العنوان** | تغيير فئة المنتج — embedding يُحدَّث |
| **الخطوات** | PATCH category إلى فئة أخرى |
| **النتيجة المتوقعة** | categoryName الجديد يُضمَّن في embedding بعد إعادة الفهرسة |
| **الأولوية** | عالي |

#### سيناريوهات فشل

| المعرّف | العنوان | الخطوات | النتيجة المتوقعة | الأولوية |
|----------|---------|---------|-------------------|----------|
| PRD-UPD-003 | منتج غير موجود | PATCH /products/:id غير صالح | 404 |
| PRD-UPD-004 | تاجر آخر | PATCH منتج لتاجر مختلف | 403 |

---

### العملية 3: حذف منتج (DELETE /products/:id)

**الـ API:** `DELETE /products/:id`

#### السيناريو السعيد

| المعرّف | PRD-DEL-001 |
|----------|-------------|
| **العنوان** | حذف منتج |
| **الخطوات** | DELETE /products/:id |
| **النتيجة المتوقعة** | 200، المنتج محذوف، **إزالة من Vector** (indexer.removeOne → deleteProductPointsByMongoIds) |
| **الأولوية** | حرج |

#### سيناريوهات فشل

| المعرّف | العنوان | الخطوات | النتيجة المتوقعة | الأولوية |
|----------|---------|---------|-------------------|----------|
| PRD-DEL-002 | منتج غير موجود | 404 |
| PRD-DEL-003 | تاجر آخر | 403 |

---

### العملية 4: البحث النصي (GET /products/search)

**الـ API:** `GET /products/search?q=...`  
**ملاحظة:** يستخدم MongoDB text search (searchHeuristics + searchText)، **لا يستخدم Vector**.

#### السيناريو السعيد

| المعرّف | PRD-SRCH-001 |
|----------|--------------|
| **العنوان** | بحث نصي يعيد نتائج |
| **الخطوات** | GET /products/search?q=كلمة |
| **النتيجة المتوقعة** | 200، قائمة منتجات مطابقة للنص |
| **الأولوية** | عالي |

---

### العملية 5: البحث الدلالي (Vector)

**الـ API:**  
- `POST /vector/products` — Body: `{ text, merchantId, topK }`  
- `GET /vector/products/semantic-search?text=...&merchantId=...&topK=5`

**ملاحظة:** يستخدم Pinecone (querySimilarProducts) — يعتمد على embeddings المنتجات.

#### السيناريو السعيد

| المعرّف | VEC-SRCH-001 |
|----------|---------------|
| **العنوان** | بحث دلالي يعيد منتجات مشابهة |
| **الخطوات** | POST /vector/products بـ `{ text: "هاتف ذكي رخيص", merchantId, topK: 5 }` |
| **النتيجة المتوقعة** | 200، `{ success, data: { recommendations, count, query } }` — منتجات ذات صلة دلالية |
| **الأولوية** | حرج |

| المعرّف | VEC-SRCH-002 |
|----------|---------------|
| **العنوان** | topK ضمن النطاق 1–10 |
| **الخطوات** | GET ?text=...&merchantId=...&topK=5 |
| **النتيجة المتوقعة** | 200 |
| **الأولوية** | عالي |

#### سيناريوهات فشل

| المعرّف | العنوان | الخطوات | النتيجة المتوقعة | الأولوية |
|----------|---------|---------|-------------------|----------|
| VEC-SRCH-003 | text أو merchantId ناقص | 400 (missingParams) |
| VEC-SRCH-004 | topK خارج النطاق | topK=0 أو topK=11 | 400 (invalidTopK) |
| VEC-SRCH-005 | Pinecone غير متاح | 400 (searchFailed) |

---

### العملية 6: إنشاء فئة (POST /categories)

**الـ API:** `POST /categories`  
**Body:** CreateCategoryDto — name، merchantId، parent (اختياري)، description، image، keywords، slug، order.

#### السيناريو السعيد

| المعرّف | CAT-CRE-001 |
|----------|-------------|
| **العنوان** | إنشاء فئة جذر |
| **الخطوات** | POST /categories بـ `{ name, merchantId }` |
| **النتيجة المتوقعة** | 201، الفئة مُنشأة |
| **الأولوية** | حرج |

| المعرّف | CAT-CRE-002 |
|----------|-------------|
| **العنوان** | إنشاء فئة فرعية |
| **الخطوات** | POST بـ `{ name, merchantId, parent: parentCategoryId }` |
| **النتيجة المتوقعة** | 201، الفئة الفرعية مُنشأة |
| **الأولوية** | عالي |

#### سيناريوهات فشل

| المعرّف | العنوان | الخطوات | النتيجة المتوقعة | الأولوية |
|----------|---------|---------|-------------------|----------|
| CAT-CRE-003 | parent غير موجود | 400/404 |
| CAT-CRE-004 | merchantId ناقص | 400 |
| CAT-CRE-005 | عدم إرسال توكن | 401 |

---

### العملية 7: قائمة الفئات (GET /categories)

**الـ API:** `GET /categories?merchantId=...&tree=true|false`

#### السيناريو السعيد

| المعرّف | CAT-LIST-001 |
|----------|--------------|
| **العنوان** | قائمة flat |
| **الخطوات** | GET ?merchantId=... (بدون tree) |
| **النتيجة المتوقعة** | 200، مصفوفة فئات مسطحة |
| **الأولوية** | عالي |

| المعرّف | CAT-LIST-002 |
|----------|--------------|
| **العنوان** | قائمة شجرية |
| **الخطوات** | GET ?merchantId=...&tree=true |
| **النتيجة المتوقعة** | 200، فئات مع children متداخلة |
| **الأولوية** | عالي |

#### سيناريوهات فشل

| المعرّف | العنوان | الخطوات | النتيجة المتوقعة | الأولوية |
|----------|---------|---------|-------------------|----------|
| CAT-LIST-003 | merchantId ناقص | 400 (MISSING_MERCHANT_ID) |

---

### العملية 8: حذف فئة (DELETE /categories/:id)

**الـ API:** `DELETE /categories/:id?merchantId=...`  
**ملاحظة:** يدعم cascade — حذف الفئة الفرعية أو إعادة تعيين المنتجات حسب التصميم.

#### السيناريو السعيد

| المعرّف | CAT-DEL-001 |
|----------|-------------|
| **العنوان** | حذف فئة بدون منتجات |
| **الخطوات** | DELETE /categories/:id |
| **النتيجة المتوقعة** | 200 |
| **الأولوية** | عالي |

| المعرّف | CAT-DEL-002 |
|----------|-------------|
| **العنوان** | حذف فئة لها منتجات (cascade) |
| **الخطوات** | DELETE فئة تحتوي منتجات |
| **النتيجة المتوقعة** | حسب التصميم — إما حذف مع cascade أو رفض |
| **الأولوية** | عالي |

---

### العملية 9: نقل فئة (PATCH /categories/:id/move)

**الـ API:** `PATCH /categories/:id/move`  
**Body:** MoveCategoryDto — parent، order.

#### السيناريو السعيد

| المعرّف | CAT-MOV-001 |
|----------|-------------|
| **العنوان** | نقل فئة إلى parent جديد |
| **الخطوات** | PATCH /categories/:id/move بـ `{ parent, order }` |
| **النتيجة المتوقعة** | 200، الفئة مُنقولة |
| **الأولوية** | عالي |

---

## 5) التكاملات (Integrations)

### 5.1 ProductIndexService → Vector (Pinecone)

| المعرّف | INT-VEC-001 |
|----------|-------------|
| **العنوان** | إنشاء منتج يُفعّل فهرسة Vector |
| **الخطوات** | إنشاء منتج جديد، التحقق من logs أو استدعاء semantic search |
| **التحقق** | ProductIndexService.upsert يُستدعى → vector.upsertProducts → Pinecone |
| **الأولوية** | حرج |

| المعرّف | INT-VEC-002 |
|----------|-------------|
| **العنوان** | تحديث منتج يُفعّل إعادة الفهرسة |
| **الخطوات** | PATCH منتج (اسم، وصف، فئة) |
| **التحقق** | handlePostUpdateTasks → indexer.upsert |
| **الأولوية** | حرج |

| المعرّف | INT-VEC-003 |
|----------|-------------|
| **العنوان** | حذف منتج يُزيل من Vector |
| **الخطوات** | DELETE منتج |
| **التحقق** | indexer.removeOne → vector.deleteProductPointsByMongoIds |
| **الأولوية** | حرج |

| المعرّف | INT-VEC-004 |
|----------|-------------|
| **العنوان** | فشل Vector لا يمنع إنشاء/تحديث المنتج |
| **الخطوات** | محاكاة فشل Pinecone (انقطاع شبكة، مفتاح خاطئ) |
| **التحقق** | ProductIndexService يلتقط الخطأ، يسجّل warn، المنتج يُنشأ/يُحدَّث في MongoDB |
| **الأولوية** | عالي |

| المعرّف | INT-VEC-005 |
|----------|-------------|
| **العنوان** | إعادة المحاولة (retry) عند فشل Vector |
| **الخطوات** | فشل مؤقت لـ upsertProducts |
| **التحقق** | ProductIndexService.retry — 3 محاولات مع تأخير تصاعدي |
| **الأولوية** | متوسط |

### 5.2 Product-Category Integration

| المعرّف | INT-CAT-001 |
|----------|-------------|
| **العنوان** | categoryName يُضمَّن في embedding المنتج |
| **الخطوات** | إنشاء منتج مع categoryId، جلب category.name، تمريره إلى toEmbeddable |
| **التحقق** | في handlePostCreationTasks: categories.findOne → catName?.name → indexer.upsert(..., catName?.name) |
| **الأولوية** | عالي |

| المعرّف | INT-CAT-002 |
|----------|-------------|
| **العنوان** | تغيير فئة المنتج يُحدّث embedding |
| **الخطوات** | PATCH منتج بـ category جديد |
| **التحقق** | handlePostUpdateTasks يجلب categoryName الجديد ويُمرّره إلى indexer.upsert |
| **الأولوية** | عالي |

| المعرّف | INT-CAT-003 |
|----------|-------------|
| **العنوان** | تحديث اسم الفئة — المنتجات لا تُعاد فهرستها تلقائياً |
| **الخطوات** | PATCH /categories/:id بتغيير name |
| **التحقق** | المنتجات التي تشير لهذه الفئة تحتفظ بـ categoryName القديم في Vector حتى تُحدَّث يدوياً |
| **الأولوية** | متوسط (سلوك متوقع — إعادة فهرسة عند تحديث المنتج) |

### 5.3 Catalog Sync (Salla / Zid)

| المعرّف | INT-SYNC-001 |
|----------|--------------|
| **العنوان** | مزامنة الكتالوج تُنشئ/تُحدّث منتجات وتُفهرسها |
| **الخطوات** | POST /catalog/:merchantId/sync (مع تكامل Salla/Zid مُفعّل) |
| **التحقق** | ProductSyncService.upsertExternalProduct → repo.upsertExternal + indexer.upsert |
| **الأولوية** | عالي |

| المعرّف | INT-SYNC-002 |
|----------|-------------|
| **العنوان** | منتج مستورد من Salla/Zid يُفهرس مع categoryName |
| **الخطوات** | مزامنة منتج له فئة في المصدر الخارجي |
| **التحقق** | upsertAndIndex يجلب category من categories.findOne ويُمرّر catName?.name |
| **الأولوية** | عالي |

### 5.4 Outbox / Events

| المعرّف | INT-OUT-001 |
|----------|-------------|
| **العنوان** | إنشاء منتج يُرسل event إلى Outbox |
| **الخطوات** | POST /products |
| **التحقق** | product.created يُسجّل في Outbox |
| **الأولوية** | متوسط |

| المعرّف | INT-OUT-002 |
|----------|-------------|
| **العنوان** | Consumer يعيد الفهرسة عند استلام product.updated |
| **الخطوات** | تحديث منتج عبر API أو عبر حدث |
| **التحقق** | product.events.consumer يستقبل product.updated ويستدعي indexer.upsert |
| **الأولوية** | عالي |

---

## 6) الفيكتور (Vector) — ملخص سلوك

| الحدث | السلوك |
|-------|--------|
| **إنشاء منتج** | handlePostCreationTasks → indexer.upsert(product, storefront, categoryName) → vector.upsertProducts |
| **تحديث منتج** | handlePostUpdateTasks → indexer.upsert(product, storefront, categoryName) → vector.upsertProducts |
| **حذف منتج** | indexer.removeOne(productId) → vector.deleteProductPointsByMongoIds |
| **مزامنة خارجية** | upsertAndIndex → indexer.upsert (مع categoryName من categories.findOne) |
| **Event consumer** | product.created/updated → indexer.upsert؛ product.deleted → indexer.removeOne |
| **فشل Vector** | ProductIndexService يسجّل warn، لا يرمي — المنتج يُحفظ في MongoDB |
| **Retry** | 3 محاولات مع تأخير 2^i * 500 ms |

---

## 7) قائمة التحقق النهائية

### المنتجات

- [ ] PRD-CRE-001، PRD-CRE-002
- [ ] PRD-UPD-001، PRD-UPD-002
- [ ] PRD-DEL-001
- [ ] PRD-SRCH-001
- [ ] VEC-SRCH-001، VEC-SRCH-002
- [ ] INT-VEC-001 إلى INT-VEC-005
- [ ] INT-CAT-001، INT-CAT-002
- [ ] INT-SYNC-001، INT-SYNC-002 (إن وُجد تكامل)
- [ ] INT-OUT-001، INT-OUT-002

### الفئات

- [ ] CAT-CRE-001، CAT-CRE-002
- [ ] CAT-LIST-001، CAT-LIST-002
- [ ] CAT-DEL-001، CAT-DEL-002
- [ ] CAT-MOV-001

### حدود وحالات فشل

- [ ] PRD-CRE-003 إلى PRD-CRE-006
- [ ] PRD-UPD-003، PRD-UPD-004
- [ ] PRD-DEL-002، PRD-DEL-003
- [ ] VEC-SRCH-003 إلى VEC-SRCH-005
- [ ] CAT-CRE-003 إلى CAT-CRE-005
- [ ] CAT-LIST-003

---

## 8) المراجع التقنية

| الملف | الوصف |
|-------|--------|
| `products.controller.ts` | واجهات المنتجات |
| `product-commands.service.ts` | إنشاء، تحديث، حذف — handlePostCreationTasks، handlePostUpdateTasks |
| `product-index.service.ts` | تكامل Vector — upsert، removeOne، retry |
| `product-sync.service.ts` | استيراد من Salla/Zid — upsertAndIndex |
| `product.events.consumer.ts` | معالجة أحداث Outbox — indexer.upsert/removeOne |
| `categories.controller.ts` | واجهات الفئات |
| `categories.service.ts` | findAllFlat، findAllTree، move، remove |
| `vector.service.ts` | upsertProducts، deleteProductPointsByMongoIds، querySimilarProducts |
| `vector.controller.ts` | semanticSearchProductsByQuery، unified-search |

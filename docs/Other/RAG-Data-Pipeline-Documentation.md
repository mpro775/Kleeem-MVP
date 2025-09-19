# وثيقة خطوط بيانات الذكاء/RAG - منصة Kaleem

## 📋 نظرة عامة

هذه الوثيقة تصف نظام RAG (Retrieval-Augmented Generation) في منصة Kaleem، والذي يتضمن مصادر المعرفة، استراتيجيات التجزئة، توليد الـ Embeddings، حدود الحجم، التحديثات، وإستراتيجية إعادة الفهرسة.

---

## 🎯 مصادر المعرفة (Knowledge Sources)

### 1. مصادر المعرفة الرئيسية

#### أ) الأسئلة الشائعة (FAQs)

- **المصدر**: قاعدة بيانات MongoDB - `bot_faqs` collection
- **النوع**: أسئلة وأجوبة منظمة
- **اللغة**: العربية (افتراضي) مع دعم متعدد اللغات
- **المعرفات**:
  - `faqId`: معرف السؤال في MongoDB
  - `question`: نص السؤال
  - `answer`: نص الإجابة
  - `tags`: تصنيفات السؤال
  - `locale`: اللغة (ar, en, etc.)

#### ب) الوثائق المرفوعة (Documents)

- **المصدر**: ملفات مرفوعة عبر واجهة المستخدم
- **الأنواع المدعومة**:
  - PDF (`application/pdf`)
  - Word Documents (`.docx`)
  - Excel Files (`.xlsx`, `.xls`)
- **التخزين**: MinIO S3-compatible storage
- **المعرفات**:
  - `documentId`: معرف الوثيقة
  - `merchantId`: معرف التاجر
  - `text`: النص المستخرج
  - `chunkIndex`: فهرس القطعة
  - `totalChunks`: إجمالي القطع

#### ج) المعرفة من الويب (Web Knowledge)

- **المصدر**: روابط URL مرفوعة من قبل التاجر
- **الاستخراج**: Playwright + FastAPI Extractor Service
- **المعرفات**:
  - `url`: الرابط الأصلي
  - `text`: النص المستخرج
  - `type`: نوع المصدر (url)
  - `source`: مصدر المعرفة (web)

#### د) المنتجات (Products)

- **المصدر**: منتجات التاجر من منصات التجارة الإلكترونية
- **التكامل**: Salla, Zid, Shopify
- **المعرفات**:
  - `mongoId`: معرف المنتج في MongoDB
  - `name`: اسم المنتج
  - `description`: وصف المنتج
  - `price`: السعر
  - `categoryName`: اسم الفئة
  - `images`: صور المنتج

---

## 🔧 استراتيجيات التجزئة (Chunking Strategies)

### 1. تجزئة الوثائق (Document Chunking)

```typescript
// حجم القطعة القصوى للوثائق
const maxChunkSize = 500; // حرف

// استراتيجية التجزئة
const chunks = text.match(new RegExp(`.{1,${maxChunkSize}}`, "gs")) ?? [];
```

**المعايير**:

- **حجم القطعة**: 500 حرف كحد أقصى
- **الحد الأدنى**: 30 حرف (تجاهل القطع الصغيرة)
- **التداخل**: لا يوجد تداخل بين القطع
- **الحد الأقصى للنص في Payload**: 2000 حرف

### 2. تجزئة المعرفة من الويب (Web Knowledge Chunking)

```typescript
// تجزئة النص المستخرج من الويب
const chunks = (text.match(/.{1,1000}/gs) ?? []).map((s) => s.trim());
```

**المعايير**:

- **حجم القطعة**: 1000 حرف
- **الحد الأدنى**: 30 حرف
- **فلترة المحتوى**: يجب أن يحتوي على 3 أحرف عربية على الأقل
- **التحقق من الفائدة**: `isUsefulChunk()` function

### 3. تجزئة المنتجات (Product Chunking)

```typescript
// تجزئة معلومات المنتج
const vectorText = {
  name: product.name,
  description: product.description,
  categoryName: product.categoryName,
  specsBlock: product.specsBlock,
  keywords: product.keywords,
  // ... المزيد من الحقول
};
```

**المعايير**:

- **نص واحد متكامل**: لا يتم تجزئة المنتجات
- **جميع المعلومات**: يتم تضمين جميع حقول المنتج في نص واحد

---

## 🧠 توليد الـ Embeddings

### 1. خدمة الـ Embeddings

**التقنية**: FastAPI + Sentence Transformers
**النموذج**: `paraphrase-multilingual-MiniLM-L12-v2`
**البعد**: 384 بعد (dimension)

```python
# embedding-service/main.py
model_name = "paraphrase-multilingual-MiniLM-L12-v2"
model = SentenceTransformer(model_name)

@app.post("/embed")
def embed(req: EmbeddingRequest):
    embeddings = model.encode(req.texts, show_progress_bar=False).tolist()
    return EmbeddingResponse(embeddings=embeddings)
```

### 2. معالجة النصوص للـ Embeddings

```typescript
// تحويل البيانات إلى نص قابل للـ embedding
private toStringList(val: any, seen: WeakSet<any> = new WeakSet(), depth = 0): string[] {
  const MAX_DEPTH = 4;

  // معالجة الأنواع المختلفة من البيانات
  if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') {
    return [String(val)];
  }

  // معالجة المصفوفات والكائنات
  // ... منطق التحويل
}
```

---

## 📊 حدود الحجم (Size Limits)

### 1. حدود الملفات

| نوع الملف | الحد الأقصى | ملاحظات              |
| --------- | ----------- | -------------------- |
| PDF       | 10MB        | معالجة عبر pdf-parse |
| Word      | 10MB        | معالجة عبر mammoth   |
| Excel     | 10MB        | معالجة عبر xlsx      |
| الصور     | 5MB         | معالجة عبر sharp     |

### 2. حدود النصوص

| النوع  | الحد الأقصى   | الحد الأدنى |
| ------ | ------------- | ----------- |
| وثائق  | 500 حرف/قطعة  | 30 حرف      |
| ويب    | 1000 حرف/قطعة | 30 حرف      |
| FAQ    | لا يوجد حد    | 10 حرف      |
| منتجات | لا يوجد حد    | 5 حرف       |

### 3. حدود قاعدة البيانات

| المكون           | الحد الأقصى    | ملاحظات              |
| ---------------- | -------------- | -------------------- |
| Qdrant Vector    | 1000 نقطة/دفعة | معالجة مجمعة         |
| MongoDB Document | 16MB           | حد MongoDB الافتراضي |
| Redis Cache      | 512MB          | حد Redis الافتراضي   |
| MinIO Object     | 5GB            | حد MinIO الافتراضي   |

---

## 🔄 التحديثات وإعادة الفهرسة

### 1. استراتيجية التحديث

#### أ) التحديث الفوري (Real-time Updates)

```typescript
// تحديث FAQ فوري
async create(dto: CreateBotFaqDto) {
  const doc = await this.botFaqModel.create(dto);

  // توليد embedding فوري
  const embedding = await this.vectorService.embed(text);
  await this.vectorService.upsertBotFaqs([{
    id: this.pointId(doc.id.toString()),
    vector: embedding,
    payload: { /* ... */ }
  }]);

  // تحديث الحالة
  doc.vectorStatus = 'ok';
  await doc.save();
}
```

#### ب) التحديث المجمع (Batch Updates)

```typescript
// معالجة مجمعة للوثائق
@Process('process')
async process(job: Job<DocumentJobData>) {
  // معالجة الملف
  const chunks = await this.processDocument(doc);

  // إرسال مجمع إلى Qdrant
  const batchSize = 2;
  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize);
    await this.qdrant.upsert(this.documentCollection, {
      wait: true,
      points: batch
    });
  }
}
```

### 2. إستراتيجية إعادة الفهرسة

#### أ) إعادة الفهرسة التلقائية

- **المنتجات**: عند تحديث المنتج في منصة التجارة
- **الوثائق**: عند رفع ملف جديد
- **الويب**: عند إضافة رابط جديد

#### ب) إعادة الفهرسة المجدولة

```typescript
// مهمة مجدولة لإعادة فهرسة البيانات القديمة
@Cron('0 2 * * *') // كل يوم في الساعة 2 صباحاً
async reindexOldData() {
  // إعادة فهرسة البيانات الأقدم من 30 يوم
  const oldData = await this.getOldData();
  await this.reindexData(oldData);
}
```

#### ج) إعادة الفهرسة اليدوية

- **واجهة الإدارة**: إمكانية إعادة فهرسة البيانات يدوياً
- **API**: endpoints لإعادة فهرسة مجموعات محددة
- **المراقبة**: تتبع حالة إعادة الفهرسة

---

## 🔍 البحث الدلالي (Semantic Search)

### 1. البحث الموحد (Unified Search)

```typescript
async unifiedSemanticSearch(text: string, merchantId: string, topK = 5) {
  const vector = await this.embed(text);
  const searchTargets = [
    { name: 'faqs', type: 'faq' },
    { name: 'documents', type: 'document' },
    { name: 'web_knowledge', type: 'web' }
  ];

  // البحث في جميع المصادر
  const allResults = await Promise.all(
    searchTargets.map(async (target) => {
      const results = await this.qdrant.search(target.name, {
        vector,
        limit: topK * 2,
        with_payload: true,
        filter: {
          must: [{ key: 'merchantId', match: { value: merchantId } }]
        }
      });
      return results.map(item => ({
        type: target.type,
        score: item.score,
        data: item.payload,
        id: item.id
      }));
    })
  );

  // إعادة ترتيب النتائج باستخدام Gemini
  const rerankedResults = await geminiRerankTopN({
    query: text,
    candidates: allResults.flat(),
    topN: topK
  });

  return rerankedResults;
}
```

### 2. إعادة ترتيب النتائج (Reranking)

**التقنية**: Google Gemini Reranking
**الهدف**: تحسين دقة النتائج المرجعة
**المدخلات**: النتائج الأولية من Qdrant
**المخرجات**: النتائج المرتبة حسب الصلة

---

## 📈 المراقبة والأداء

### 1. مقاييس الأداء

| المقياس         | الهدف   | التحذير |
| --------------- | ------- | ------- |
| وقت الاستجابة   | < 200ms | > 500ms |
| دقة البحث       | > 85%   | < 70%   |
| معدل النجاح     | > 99%   | < 95%   |
| استخدام الذاكرة | < 80%   | > 90%   |

### 2. مراقبة النظام

```typescript
// مراقبة حالة الـ embeddings
async checkEmbeddingHealth() {
  const metrics = {
    totalVectors: await this.qdrant.getCollectionInfo(),
    failedEmbeddings: await this.getFailedEmbeddings(),
    processingQueue: await this.getQueueStatus(),
    lastUpdate: await this.getLastUpdateTime()
  };

  return metrics;
}
```

### 3. التنبيهات

- **فشل الـ Embeddings**: تنبيه فوري عند فشل توليد الـ embeddings
- **انخفاض الأداء**: تنبيه عند تجاوز حدود الأداء
- **مشاكل التخزين**: تنبيه عند امتلاء التخزين
- **أخطاء المعالجة**: تنبيه عند فشل معالجة الملفات

---

## 🛠️ الصيانة والتحسين

### 1. تنظيف البيانات

```typescript
// حذف البيانات القديمة
async cleanupOldData() {
  // حذف الـ vectors القديمة
  await this.qdrant.delete('old_vectors', {
    filter: {
      must: [{
        key: 'createdAt',
        range: { lt: Date.now() - 90 * 24 * 60 * 60 * 1000 } // 90 يوم
      }]
    }
  });

  // حذف الملفات المؤقتة
  await this.cleanupTempFiles();
}
```

### 2. تحسين الأداء

- **ضغط البيانات**: ضغط النصوص الطويلة
- **التخزين المؤقت**: تخزين الـ embeddings المستخدمة بكثرة
- **المعالجة المتوازية**: معالجة متعددة للملفات الكبيرة
- **تحسين الاستعلامات**: تحسين استعلامات Qdrant

### 3. النسخ الاحتياطي

- **Qdrant**: نسخ احتياطية يومية للـ vectors
- **MongoDB**: نسخ احتياطية أسبوعية للبيانات
- **MinIO**: نسخ احتياطية للملفات المرفوعة
- **Redis**: نسخ احتياطية للإعدادات المؤقتة

---

## 📋 خطة التطوير المستقبلية

### 1. تحسينات قصيرة المدى (3 أشهر)

- [ ] دعم المزيد من أنواع الملفات (PPT, TXT, HTML)
- [ ] تحسين خوارزمية التجزئة
- [ ] إضافة دعم للصور والنصوص المستخرجة منها
- [ ] تحسين واجهة مراقبة النظام

### 2. تحسينات متوسطة المدى (6 أشهر)

- [ ] دعم البحث متعدد اللغات
- [ ] إضافة تصنيف تلقائي للمحتوى
- [ ] تحسين خوارزمية إعادة الترتيب
- [ ] إضافة تحليلات متقدمة للاستخدام

### 3. تحسينات طويلة المدى (12 شهر)

- [ ] دعم البحث الصوتي
- [ ] إضافة ذكاء اصطناعي لتحسين الاستعلامات
- [ ] دعم البحث في الفيديو
- [ ] تطوير نظام توصيات ذكي

---

## 🔗 المراجع والروابط

- [Qdrant Documentation](https://qdrant.tech/documentation/)
- [Sentence Transformers](https://www.sbert.net/)
- [MongoDB Vector Search](https://www.mongodb.com/products/platform/atlas-vector-search)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [NestJS Documentation](https://nestjs.com/)

---

_آخر تحديث: ديسمبر 2024_
_الإصدار: 1.0.0_

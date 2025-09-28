# ورك فلو تقييم الرسائل والانتقال إلى المتجهات - نظام كليم الشامل

## نظرة عامة على النظام

نظام كليم يدعم تقييماً شاملاً لرسائل البوت مع انتقال ذكي للمتجهات لتحسين الاستجابات:

- **تقييم الرسائل**: نظام تصنيف الردود (جيد/سيء) مع تعليقات
- **تحسين الذكاء الاصطناعي**: إنشاء تعليمات من الردود السيئة
- **الانتقال للمتجهات**: فهرسة الردود الجيدة في Qdrant
- **التعلم المستمر**: تحسين البوت بناءً على التغذية الراجعة
- **البحث المتجهي**: استرجاع الردود المشابهة من المعرفة

## 1. مخطط التدفق العام (Flowchart)

```mermaid
graph TD
    A[تلقي رد البوت] --> B[عرض الرد للمستخدم<br/>مع خيارات التقييم]
    B --> C[انتظار تقييم المستخدم<br/>thumbs up/down + تعليق]

    C --> D{نوع التقييم}
    D -->|إيجابي 👍| E[حفظ التقييم الإيجابي<br/>زيادة درجة الثقة]
    D -->|سلبي 👎| F[حفظ التقييم السلبي<br/>طلب تعليق إضافي]

    F --> G[تحليل الرد السلبي<br/>استخراج المشكلة]
    G --> H[إنشاء تعليمات جديدة<br/>باستخدام Gemini AI]

    H --> I[حفظ التعليمات<br/>في قاعدة البيانات]
    I --> J[تحديث prompt البوت<br/>إضافة التعليمات الجديدة]

    E --> K[فحص الجودة العالية<br/>score > threshold]
    K --> L{جودة عالية؟}
    L -->|نعم| M[إضافة للمعرفة المتجهية<br/>فهرسة في Qdrant]
    L -->|لا| N[تجاهل الرد<br/>لا يضاف للمعرفة]

    M --> O[تحديث قاعدة المعرفة<br/>متاحة للبحث المستقبلي]

    P[البحث الجديد] --> Q[استلام الاستعلام<br/>من المستخدم]
    Q --> R[تحويل لمتجه<br/>تضمين الاستعلام]
    R --> S[البحث في Qdrant<br/>مقارنة المتجهات]

    S --> T[تصفية النتائج<br/>حسب درجة التشابه]
    T --> U[ترتيب النتائج<br/>حسب الصلة والتقييم]
    U --> V[إرجاع النتائج<br/>مع المصادر والثقة]

    W[التعلم المستمر] --> X[مراقبة الأداء<br/>معدل التقييمات الإيجابية]
    X --> Y[تحسين الخوارزمية<br/>ضبط المعلمات]
    Y --> Z[تحديث النموذج<br/>تحسين الاستجابات]
```

## 2. مخطط التسلسل (Sequence Diagram)

```mermaid
sequenceDiagram
    participant C as Customer
    participant W as Website/Widget
    participant B as Bot Service
    participant DB as Database
    participant AI as Gemini AI
    participant VS as Vector Service
    participant AN as Analytics
    participant INS as Instructions Service

    Note over C,W: تلقي رد البوت
    W->>C: عرض رد البوت
    C->>W: تقييم الرد (👍/👎 + تعليق)

    Note over W,B: حفظ التقييم
    W->>B: POST /rate-message
    B->>DB: حفظ التقييم في الرسالة

    alt تقييم سلبي
        Note over B,AI: إنشاء تعليمات من الرد السلبي
        B->>AI: طلب إنشاء تعليمات من الرد السلبي
        AI-->>B: تعليمات جديدة

        Note over B,INS: حفظ التعليمات
        B->>INS: حفظ التعليمات في قاعدة البيانات
        INS->>DB: إدراج التعليمات الجديدة

        Note over B: تحديث prompt البوت
        B->>B: إضافة التعليمات للـ system prompt
    else تقييم إيجابي عالي الجودة
        Note over B,VS: إضافة للمعرفة المتجهية
        B->>VS: فهرسة الرد في Qdrant
        VS-->>B: تأكيد الفهرسة
        DB-->>B: تحديث حالة الرسالة
    end

    Note over AN: تسجيل المقاييس
    B->>AN: تسجيل التقييم والتحسين
    AN-->>B: تأكيد التسجيل

    Note over C,W: بحث جديد
    C->>W: إرسال استعلام جديد
    W->>B: طلب البحث
    B->>VS: بحث متجهي في Qdrant
    VS-->>B: نتائج البحث المرتبة

    Note over B: معالجة النتائج
    B->>B: دمج مع الردود الجديدة
    B->>W: إرجاع النتائج المحسنة
    W-->>C: عرض النتائج للمستخدم
```

## 3. آلة الحالات (State Machine)

```mermaid
stateDiagram-v2
    [*] --> عرض_الرد: البوت يرد على المستخدم

    عرض_الرد --> انتظار_التقييم: عرض خيارات التقييم
    انتظار_التقييم --> تقييم_المستخدم: المستخدم يقيم

    تقييم_المستخدم --> حفظ_التقييم: حفظ التقييم في قاعدة البيانات
    حفظ_التقييم --> فحص_نوع_التقييم: إيجابي أم سلبي

    فحص_نوع_التقييم --> تقييم_إيجابي: 👍
    فحص_نوع_التقييم --> تقييم_سلبي: 👎

    تقييم_إيجابي --> فحص_الجودة: درجة عالية؟
    فحص_الجودة --> جودة_عالية: score > threshold
    فحص_الجودة --> جودة_عادية: score عادي

    جودة_عالية --> إضافة_للمعرفة: فهرسة في Qdrant
    إضافة_للمعرفة --> معرفة_مفهرسة: جاهز للبحث

    جودة_عادية --> تجاهل_الرد: لا يضاف للمعرفة

    تقييم_سلبي --> تحليل_المشكلة: استخراج سبب السلبية
    تحليل_المشكلة --> إنشاء_تعليمات: باستخدام Gemini AI
    إنشاء_تعليمات --> حفظ_التعليمات: في قاعدة البيانات
    حفظ_التعليمات --> تحديث_البرومبت: إضافة التعليمات

    تحديث_البرومبت --> تحسين_البوت: البوت محدث

    معرفة_مفهرسة --> البحث_الجديد: طلب بحث
    تحسين_البوت --> البحث_الجديد
    تجاهل_الرد --> البحث_الجديد

    البحث_الجديد --> تحويل_لمتجه: تضمين الاستعلام
    تحويل_لمتجه --> بحث_متجهي: في Qdrant
    بحث_متجهي --> تصفية_النتائج: حسب الصلة
    تصفية_النتائج --> ترتيب_النتائج: حسب الدرجة
    ترتيب_النتائج --> إرجاع_النتائج: للمستخدم

    إرجاع_النتائج --> تسجيل_التحليلات: مراقبة الأداء
    تسجيل_التحليلات --> استمرار_العمل: النظام يعمل

    خطأ_التقييم --> إعادة_المحاولة: محاولة أخرى
    إعادة_المحاولة --> حفظ_التقييم
```

### تعريف الحالات

| الحالة            | الوصف                           | الإجراءات المسموحة |
| ----------------- | ------------------------------- | ------------------ |
| `عرض_الرد`        | عرض رد البوت للمستخدم           | عرض خيارات التقييم |
| `انتظار_التقييم`  | انتظار تقييم المستخدم           | عرض خيارات 👍/👎   |
| `تقييم_المستخدم`  | المستخدم يقيم الرد              | حفظ التقييم        |
| `حفظ_التقييم`     | حفظ التقييم في قاعدة البيانات   | تحديث سجل الرسالة  |
| `فحص_نوع_التقييم` | تحديد نوع التقييم               | تصنيف التقييم      |
| `تقييم_إيجابي`    | تقييم إيجابي من المستخدم        | فحص الجودة         |
| `تقييم_سلبي`      | تقييم سلبي من المستخدم          | تحليل المشكلة      |
| `فحص_الجودة`      | فحص درجة جودة الرد              | تقييم الصلة        |
| `جودة_عالية`      | الرد عالي الجودة                | إضافة للمعرفة      |
| `جودة_عادية`      | الرد عادي الجودة                | تجاهل الرد         |
| `تحليل_المشكلة`   | تحليل سبب التقييم السلبي        | استخراج المشكلة    |
| `إنشاء_تعليمات`   | إنشاء تعليمات جديدة             | استدعاء Gemini AI  |
| `حفظ_التعليمات`   | حفظ التعليمات في قاعدة البيانات | إدراج التعليمات    |
| `تحديث_البرومبت`  | تحديث prompt البوت              | إضافة التعليمات    |
| `إضافة_للمعرفة`   | إضافة الرد للمعرفة المتجهية     | فهرسة في Qdrant    |
| `معرفة_مفهرسة`    | المعرفة جاهزة للبحث             | جميع عمليات البحث  |
| `تحسين_البوت`     | البوت محدث بالتعليمات الجديدة   | تحسين الاستجابات   |
| `البحث_الجديد`    | طلب بحث جديد                    | تنفيذ الاستعلام    |
| `تحويل_لمتجه`     | تحويل الاستعلام لمتجه           | تضمين النص         |
| `بحث_متجهي`       | البحث في Qdrant                 | استرجاع النتائج    |
| `تصفية_النتائج`   | ترتيب وتصفية النتائج            | تحسين العرض        |
| `ترتيب_النتائج`   | ترتيب حسب الصلة والتقييم        | إعداد النتائج      |
| `إرجاع_النتائج`   | إرجاع النتائج للمستخدم          | عرض المحتوى        |
| `تسجيل_التحليلات` | تسجيل المقاييس والإحصائيات      | مراقبة الأداء      |

## 4. مخطط سير العمل التجاري (BPMN)

```mermaid
graph TB
    Start([بدء]) --> BotResponse[رد البوت]
    BotResponse --> UserEvaluation[تقييم المستخدم]

    UserEvaluation --> EvaluationType{نوع التقييم}
    EvaluationType -->|إيجابي| QualityCheck[فحص الجودة]
    EvaluationType -->|سلبي| ProblemAnalysis[تحليل المشكلة]

    QualityCheck --> HighQuality{جودة عالية؟}
    HighQuality -->|نعم| AddToKnowledge[إضافة للمعرفة]
    HighQuality -->|لا| IgnoreResponse[تجاهل الرد]

    ProblemAnalysis --> GenerateInstructions[إنشاء تعليمات]
    GenerateInstructions --> SaveInstructions[حفظ التعليمات]
    SaveInstructions --> UpdatePrompt[تحديث البرومبت]

    AddToKnowledge --> VectorIndexing[فهرسة المتجهات]
    VectorIndexing --> KnowledgeIndexed[معرفة مفهرسة]

    IgnoreResponse --> BotImproved[البوت محدث]
    UpdatePrompt --> BotImproved
    KnowledgeIndexed --> BotImproved

    BotImproved --> NewSearch[بحث جديد]
    NewSearch --> QueryEmbedding[تحويل الاستعلام]
    QueryEmbedding --> VectorSearch[البحث المتجهي]
    VectorSearch --> FilterResults[تصفية النتائج]
    FilterResults --> SortResults[ترتيب النتائج]
    SortResults --> ReturnResults[إرجاع النتائج]

    ReturnResults --> LogAnalytics[تسجيل التحليلات]
    LogAnalytics --> ContinueOperation[استمرار العمل]

    subgraph "التعلم المستمر"
        MonitorPerformance[مراقبة الأداء] --> AnalyzeMetrics[تحليل المقاييس]
        AnalyzeMetrics --> OptimizeAlgorithm[تحسين الخوارزمية]
        OptimizeAlgorithm --> UpdateModel[تحديث النموذج]
    end
```

## 5. تفاصيل تقنية لكل مرحلة

### 5.1 مرحلة تقييم الرسائل

#### 5.1.1 نظام التقييم

**Endpoint**: `POST /rate-message/{sessionId}/{msgIdx}`

**البيانات المطلوبة**:

```typescript
interface RateMessageDto {
  rating: 0 | 1; // 0 = سلبي، 1 = إيجابي
  feedback?: string; // تعليق إضافي (اختياري)
}
```

**عملية المعالجة**:

```typescript
async function rateMessage(
  sessionId: string,
  msgIdx: number,
  rating: 0 | 1,
  feedback?: string,
) {
  // 1. العثور على الرسالة
  const message = await messagesRepo.findBySessionAndIndex(sessionId, msgIdx);

  // 2. حفظ التقييم
  message.rating = rating;
  message.feedback = feedback;
  await message.save();

  // 3. إذا كان التقييم سلبياً
  if (rating === 0) {
    // إنشاء تعليمات من الرد السلبي
    const instruction = await geminiService.generateInstructionFromBadReply(
      message.text,
    );

    // حفظ التعليمات
    await instructionsService.create({
      merchantId: message.merchantId,
      instruction,
      relatedReplies: [message.text],
      type: 'auto',
    });
  }

  // 4. إذا كان التقييم إيجابياً وعالي الجودة
  if (rating === 1 && isHighQuality(message)) {
    // إضافة للمعرفة المتجهية
    await vectorService.upsertKnowledge([
      {
        id: generateId(),
        vector: await embedText(message.text),
        payload: {
          text: message.text,
          type: 'bot_response',
          rating: 1,
          merchantId: message.merchantId,
        },
      },
    ]);
  }

  return { status: 'ok' };
}
```

#### 5.1.2 تحليل جودة الرد

```typescript
function isHighQuality(message: Message): boolean {
  // معايير الجودة العالية
  const criteria = [
    message.text.length > 50, // طول مناسب
    !message.text.includes('لا أفهم'), // عدم الالتباس
    !message.text.includes('عذراً'), // عدم الاعتذار
    message.text.includes('يمكنني') || // تقديم المساعدة
      message.text.includes('سأساعدك') ||
      message.text.includes('الإجابة'),
  ];

  return criteria.filter(Boolean).length >= 2; // معيارين على الأقل
}
```

### 5.2 مرحلة إنشاء التعليمات

#### 5.2.1 إنشاء تعليمات من الردود السلبية

**استدعاء Gemini AI**:

```typescript
async function generateInstructionFromBadReply(
  badReply: string,
): Promise<string> {
  const prompt = `
    الرد التالي تم تقييمه سلبيًا من قبل التاجر: "${badReply}".
    صِغ توجيهًا مختصرًا جدًا (سطر واحد فقط، 15 كلمة أو أقل، لا تشرح السبب)
    لمنع مساعد الذكاء الاصطناعي من تكرار هذا الخطأ.
  `;

  const result = await model.generateContent(prompt);
  return result.response.text().trim();
}
```

**أمثلة للتعليمات المُنشأة**:

- "لا تقدم معلومات خاطئة عن الأسعار"
- "تأكد من فهم السؤال قبل الإجابة"
- "لا تفترض المعلومات، اطلب التوضيح"
- "ركز على حل مشكلة العميل"

#### 5.2.2 حفظ التعليمات في قاعدة البيانات

```typescript
const instruction = await instructionsService.create({
  merchantId,
  instruction: generatedInstruction,
  relatedReplies: [badReply],
  type: 'auto',
  active: true,
});
```

### 5.3 مرحلة فهرسة المتجهات

#### 5.3.1 إضافة الردود الجيدة للمعرفة

```typescript
async function addHighQualityResponseToKnowledge(message: Message) {
  const embedding = await embeddingService.embedText(message.text);

  await vectorService.upsertKnowledge([
    {
      id: generateId(),
      vector: embedding,
      payload: {
        text: message.text,
        type: 'bot_response',
        rating: 1,
        merchantId: message.merchantId,
        sessionId: message.sessionId,
        timestamp: message.timestamp,
      },
    },
  ]);
}
```

#### 5.3.2 تحديث prompt البوت

```typescript
async function updateBotPrompt(merchantId: string) {
  const instructions =
    await instructionsService.getActiveInstructions(merchantId);

  const systemPrompt = `
    أنت مساعد ذكي لمتجر إلكتروني.
    ${instructions.map((i) => i.instruction).join('\n')}

    قواعد عامة:
    - كن مهذباً ومساعداً
    - قدم معلومات دقيقة
    - لا تفترض معلومات غير مؤكدة
  `;

  // تحديث prompt في n8n workflow
  await updateN8nPrompt(merchantId, systemPrompt);
}
```

### 5.4 مرحلة البحث المتجهي

#### 5.4.1 تحويل الاستعلام لمتجه

```typescript
async function searchSimilarResponses(query: string, merchantId: string) {
  // 1. تحويل الاستعلام لمتجه
  const queryEmbedding = await embeddingService.embedText(query);

  // 2. البحث في Qdrant
  const results = await vectorService.search({
    collection: 'knowledge',
    vector: queryEmbedding,
    filter: { merchantId },
    limit: 5,
    score_threshold: 0.7,
  });

  // 3. تصفية وترتيب النتائج
  return results
    .filter((result) => result.score > 0.8)
    .sort((a, b) => b.score - a.score)
    .map((result) => ({
      text: result.payload.text,
      similarity: result.score,
      source: 'vector_knowledge',
    }));
}
```

#### 5.4.2 دمج مع البحث النصي

```typescript
async function hybridSearch(query: string, merchantId: string) {
  // 1. البحث النصي في MongoDB
  const textResults = await searchTextInDatabase(query, merchantId);

  // 2. البحث المتجهي في Qdrant
  const vectorResults = await searchSimilarResponses(query, merchantId);

  // 3. دمج النتائج
  const combinedResults = [
    ...textResults.map((r) => ({ ...r, source: 'text_search' })),
    ...vectorResults.map((r) => ({ ...r, source: 'vector_search' })),
  ];

  // 4. ترتيب حسب الصلة
  return combinedResults
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 5);
}
```

## 6. معايير الأمان والحماية

### 6.1 التحقق من الصلاحية

```typescript
// التحقق من صلاحية المستخدم للتقييم
const message = await messagesRepo.findBySessionAndIndex(sessionId, msgIdx);
const user = await getCurrentUser();

if (message.sessionId !== user.sessionId) {
  throw new ForbiddenException('Cannot rate this message');
}
```

### 6.2 Rate Limiting

- **تقييم الرسائل**: 10 تقييمات/دقيقة لكل مستخدم
- **إنشاء التعليمات**: 5 تعليمات/دقيقة لكل تاجر
- **البحث المتجهي**: 100 طلب/دقيقة لكل تاجر

### 6.3 منع الإساءة

```typescript
// فحص التعليقات المسيئة
function isAbusiveFeedback(feedback: string): boolean {
  const abusivePatterns = ['كلمة مسيئة', 'سب', 'شتم'];
  return abusivePatterns.some((pattern) =>
    feedback.toLowerCase().includes(pattern),
  );
}
```

## 7. مسارات الخطأ والتعامل معها

### 7.1 أخطاء التقييم

```javascript
INVALID_RATING; // قيمة تقييم غير صحيحة
MESSAGE_NOT_FOUND; // الرسالة غير موجودة
UNAUTHORIZED_ACCESS; // غير مخول للتقييم
SESSION_EXPIRED; // انتهت صلاحية الجلسة
```

### 7.2 أخطاء إنشاء التعليمات

```javascript
AI_GENERATION_FAILED; // فشل في إنشاء التعليمات
INSTRUCTION_TOO_LONG; // التعليمات طويلة جداً
INVALID_INSTRUCTION; // التعليمات غير صحيحة
```

### 7.3 أخطاء الفهرسة

```javascript
VECTOR_INDEX_FAILED; // فشل في فهرسة Qdrant
EMBEDDING_FAILED; // فشل في توليد التضمينات
DUPLICATE_CONTENT; // محتوى مكرر موجود مسبقاً
```

## 8. خطة الاختبار والتحقق

### 8.1 اختبارات الوحدة

- اختبار نظام التقييم (إيجابي/سلبي)
- اختبار إنشاء التعليمات من الردود السلبية
- اختبار فهرسة الردود الجيدة
- اختبار البحث المتجهي

### 8.2 اختبارات التكامل

- اختبار التكامل مع Gemini AI
- اختبار التكامل مع Qdrant
- اختبار تحديث prompt البوت
- اختبار معالجة الأخطاء

### 8.3 اختبارات الأداء

- اختبار البحث في قواعد بيانات كبيرة
- اختبار توليد التضمينات بالجملة
- اختبار فهرسة كميات كبيرة من المحتوى
- اختبار استهلاك الذاكرة والمعالج

---

_تم إنشاء هذا التوثيق بواسطة نظام كليم لإدارة المتاجر الذكية_

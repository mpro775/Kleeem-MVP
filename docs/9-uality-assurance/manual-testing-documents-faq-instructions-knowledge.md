# دليل الاختبار اليدوي — المستندات، الأسئلة الشائعة، التوجيهات، المعرفة

> يغطي أربعة أقسام أساسية ومترابطة: **Documents** (مستندات)، **FAQ** (أسئلة شائعة)، **Instructions** (توجيهات)، **Knowledge** (معرفة من روابط).  
> **التركيز:** التكاملات والتداخل — Vector/Pinecone، Bull، Outbox، Notifications، Gemini، PromptBuilder.  
> **ملاحظة:** كل من Documents و FAQ و Knowledge يُفهرس في Vector؛ Instructions تُدمج في البرومبت فقط (بدون Vector).

---

## 1) نطاق الدليل

| البند | الوصف |
|--------|--------|
| **Documents** | رفع PDF/DOCX/XLSX → S3 → Bull Queue → DocumentProcessor → استخراج نص → chunk → Vector (documents) |
| **FAQ** | إضافة سؤال/جواب → معالجة خلفية → Vector (faqs) |
| **Instructions** | توجيهات نصية للتاجر — تُدمج في البرومبت (بدون Vector)؛ تُنشأ من ردود سلبية عبر Gemini |
| **Knowledge** | إضافة روابط → Playwright استخراج → chunk → Vector (web_knowledge) |
| **التداخل** | Messages (ردود سيئة) → Instructions؛ Instructions → PromptBuilder؛ FAQ + Documents + Web → unifiedSemanticSearch |
| **المراجع** | `documents.service.ts`, `document.processor.ts`, `faq.service.ts`, `instructions.controller.ts`, `knowledge.service.ts`, `prompt-builder.service.ts`, `vector.service.ts` |

---

## 2) البيئة والحسابات

| البند | القيمة (مثال) |
|--------|---------------|
| **البيئة** | Staging / UAT |
| **Base URL API** | `https://<your-api>/api` |
| **حساب تاجر** | JWT مع merchantId صالح |
| **S3/MinIO** | S3_BUCKET_NAME أو MINIO_BUCKET |
| **Bull/Redis** | documents-processing-queue |
| **Pinecone** | مُكوّن للفهرسة والبحث الموحد |
| **Playwright** | مُكوّن لـ Knowledge (استخراج من روابط) |

---

## 3) مخطط التكامل والتداخل

```
                    ┌─────────────────┐
                    │    Messages     │
                    │ (ردود سيئة)    │
                    └────────┬────────┘
                             │ getFrequentBadBotReplies
                             ▼
┌──────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Gemini     │◄───│  Instructions   │───►│ PromptBuilder   │
│ (تعليمات)   │    │  (توجيهات)     │    │ (برومبت البوت)  │
└──────────────┘    └─────────────────┘    └─────────────────┘
       ▲                      │
       │                      │ getActiveInstructions
       │ generateAndSave...   │
       └──────────────────────┘

┌──────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Documents   │───►│  DocumentProc   │───►│ VectorService   │
│ (رفع ملفات) │    │ (Bull + chunk)  │    │ upsertDocChunks │
└──────────────┘    └─────────────────┘    └────────┬────────┘
                                                    │
┌──────────────┐    ┌─────────────────┐             │
│    FAQ       │───►│ processFaqs...  │───► upsertFaqs
│ (س/ج)       │    │ (خلفية)         │             │
└──────────────┘    └─────────────────┘             │
                                                    ▼
┌──────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Knowledge   │───►│ processUrls...   │───►│ upsertWebKnowl   │
│ (روابط)     │    │ (Playwright)     │    │ unifiedSearch    │
└──────────────┘    └─────────────────┘    └─────────────────┘
```

---

## 4) قائمة العمليات (Process List)

### Documents

1. **رفع مستند** — POST merchants/:merchantId/documents (multipart، PDF/DOCX/XLSX، حد 10MB).
2. **قائمة المستندات** — GET merchants/:merchantId/documents.
3. **تنزيل مستند** — GET merchants/:merchantId/documents/:docId (إعادة توجيه 302).
4. **حذف مستند** — DELETE merchants/:merchantId/documents/:docId.

### FAQ

5. **إضافة أسئلة شائعة** — POST merchants/:merchantId/faqs (مصفوفة question/answer).
6. **قائمة FAQ** — GET merchants/:merchantId/faqs (مع includeDeleted).
7. **حالة الفهرسة** — GET merchants/:merchantId/faqs/status.
8. **تحديث FAQ** — PATCH merchants/:merchantId/faqs/:faqId.
9. **حذف FAQ** — DELETE merchants/:merchantId/faqs/:faqId (soft/hard).
10. **حذف الكل** — DELETE merchants/:merchantId/faqs?all=true&hard=.

### Instructions

11. **إنشاء توجيه** — POST /instructions.
12. **قائمة التوجيهات** — GET /instructions (مع فلترة).
13. **تحديث توجيه** — PATCH /instructions/:id.
14. **حذف توجيه** — DELETE /instructions/:id.
15. **تفعيل/إلغاء تفعيل** — PATCH /instructions/:id/activate، /instructions/:id/deactivate.
16. **التوجيهات النشطة (للبوت)** — GET /instructions/active.
17. **اقتراح توجيهات** — GET /instructions/suggestions (من ردود سلبية).
18. **توليد تلقائي** — POST /instructions/auto/generate (حفظ من badReplies).

### Knowledge

19. **إضافة روابط** — POST merchants/:merchantId/knowledge/urls.
20. **حالة الروابط** — GET merchants/:merchantId/knowledge/urls/status.
21. **قائمة الروابط** — GET merchants/:merchantId/knowledge/urls.
22. **حذف رابط** — DELETE merchants/:merchantId/knowledge/urls/:id أو ?url= أو ?all=true.

### البحث الموحد (Vector)

23. **البحث الدلالي الموحد** — POST /vector/unified-search (FAQ + Documents + Web).

---

## 5) حالات الاختبار حسب القسم

---

## 5.1 Documents

### العملية: رفع مستند (POST)

**الـ API:** `POST merchants/:merchantId/documents` — multipart، حد 10MB.  
**أنواع مدعومة:** PDF، DOC، DOCX، JPG، PNG.

#### السيناريو السعيد

| المعرّف | DOC-UP-001 |
|----------|------------|
| **العنوان** | رفع PDF بنجاح |
| **الخطوات** | POST ملف PDF صالح |
| **النتيجة المتوقعة** | 201، `{ success, data: { _id, filename, status: "pending", ... } }` |
| **التكامل** | S3 PutObject، Mongo create، Bull queue.add('process', { docId, merchantId }) |
| **الأولوية** | حرج |

| المعرّف | DOC-UP-002 |
|----------|------------|
| **العنوان** | معالجة الخلفية — DocumentProcessor |
| **الخطوات** | انتظار معالجة Bull (أو فحص status في Mongo) |
| **التكامل** | DocumentProcessor: downloadFromS3 → extractText → chunk (500 حرف) → embedText → upsertDocumentChunks |
| **التحقق** | status ينتقل من pending → processing → completed |
| **الأولوية** | حرج |

| المعرّف | DOC-UP-003 |
|----------|------------|
| **العنوان** | أنواع ملفات مدعومة |
| **الخطوات** | رفع DOCX، XLSX |
| **النتيجة المتوقعة** | mammoth (Word)، ExcelJS (XLSX) — استخراج نص |
| **الأولوية** | عالي |

#### سيناريوهات فشل

| المعرّف | العنوان | الخطوات | النتيجة المتوقعة |
|----------|---------|---------|-------------------|
| DOC-UP-F01 | ملف أكبر من 10MB | 400 |
| DOC-UP-F02 | نوع غير مدعوم (مثلاً .xls) | 400 أو فشل Processor |
| DOC-UP-F03 | S3 غير مُكوّن | 500 |
| DOC-UP-F04 | Bull غير مُتاح | فشل queue.add |

---

### التكامل: DocumentProcessor → Vector

| المعرّف | DOC-VEC-001 |
|----------|-------------|
| **العنوان** | chunks تُفهرس في Pinecone Documents |
| **التحقق** | VectorService.upsertDocumentChunks → Collections.Documents |
| **الأولوية** | حرج |

| المعرّف | DOC-VEC-002 |
|----------|-------------|
| **العنوان** | payload يحتوي merchantId، documentId، text، chunkIndex |
| **التحقق** | بنية ChunkPayload |
| **الأولوية** | عالي |

| المعرّف | DOC-VEC-003 |
|----------|-------------|
| **العنوان** | فشل embedding يوقف المعالجة |
| **التحقق** | status → failed، errorMessage مُسجّل |
| **الأولوية** | عالي |

---

## 5.2 FAQ

### العملية: إضافة أسئلة شائعة (POST)

**الـ API:** `POST merchants/:merchantId/faqs`  
**Body:** `[{ question, answer }, ...]`

#### السيناريو السعيد

| المعرّف | FAQ-UP-001 |
|----------|------------|
| **العنوان** | إضافة مجموعة FAQs |
| **الخطوات** | POST بـ `[{ question: "كيف أتابع طلبي؟", answer: "..." }]` |
| **النتيجة المتوقعة** | 201، `{ success, queued, message, ids }` |
| **التكامل** | insertManyPending → processFaqsInBackground (fire-and-forget) |
| **الأولوية** | حرج |

| المعرّف | FAQ-UP-002 |
|----------|------------|
| **العنوان** | معالجة خلفية — فهرسة Vector |
| **التحقق** | upsertFaqEmbedding: embedText(question+\n+answer) → upsertFaqs |
| **التحقق** | status → completed، Outbox (knowledge.index، faq.completed) |
| **الأولوية** | حرج |

| المعرّف | FAQ-UP-003 |
|----------|------------|
| **العنوان** | إشعار للمستخدم |
| **التحقق** | Notifications.notifyUser (faq.queued، embeddings.completed/failed) |
| **الأولوية** | متوسط |

#### سيناريوهات فشل

| المعرّف | العنوان | الخطوات | النتيجة المتوقعة |
|----------|---------|---------|-------------------|
| FAQ-UP-F01 | مصفوفة فارغة | 400 (No FAQs provided) |
| FAQ-UP-F02 | فشل embedding | status=failed، Outbox faq.failed |

---

### العملية: تحديث وحذف FAQ

| المعرّف | FAQ-UPD-001 |
|----------|-------------|
| **العنوان** | تحديث FAQ يُعيد الفهرسة |
| **الخطوات** | PATCH بـ question/answer جديد |
| **التحقق** | upsertFaqEmbedding → status completed، Outbox faq.updated |
| **الأولوية** | حرج |

| المعرّف | FAQ-DEL-001 |
|----------|-------------|
| **العنوان** | hard delete يُزيل من Vector |
| **الخطوات** | DELETE ?hard=true |
| **التحقق** | vectorService.deleteFaqPointByFaqId قبل hardDeleteById |
| **الأولوية** | حرج |

| المعرّف | FAQ-DEL-002 |
|----------|-------------|
| **العنوان** | deleteAll hard — حذف كل متجهات FAQ للتاجر |
| **التحقق** | deleteFaqsByFilter({ merchantId, source: manual }) |
| **الأولوية** | عالي |

---

## 5.3 Instructions

### العملية: إنشاء وجلب توجيهات

**الـ API:** `POST /instructions`، `GET /instructions`، `GET /instructions/active`  
**ملاحظة:** Instructions **لا تُفهرس في Vector** — تُدمج في البرومبت كنص.

#### السيناريو السعيد

| المعرّف | INS-CRE-001 |
|----------|-------------|
| **العنوان** | إنشاء توجيه يدوي |
| **الخطوات** | POST بـ `{ instruction: "عند سؤال العميل عن الخصم، اعرض SUMMER25" }` |
| **النتيجة المتوقعة** | 201، Instruction مُنشأة |
| **الأولوية** | حرج |

| المعرّف | INS-ACT-001 |
|----------|-------------|
| **العنوان** | التوجيهات النشطة تُدمج في البرومبت |
| **التحقق** | PromptBuilder.compileTemplate → getActiveInstructions → penaltyLines في البرومبت |
| **الأولوية** | حرج |

| المعرّف | INS-SUG-001 |
|----------|-------------|
| **العنوان** | اقتراح توجيهات من ردود سلبية |
| **الخطوات** | GET /instructions/suggestions?limit=10 |
| **التكامل** | MessageService.getFrequentBadBotReplies + GeminiService.generateInstructionFromBadReply |
| **النتيجة المتوقعة** | 200، `{ items: [{ badReply, count, instruction }] }` |
| **الأولوية** | عالي |

| المعرّف | INS-GEN-001 |
|----------|-------------|
| **العنوان** | توليد وحفظ توجيهات من ردود سلبية |
| **الخطوات** | POST /instructions/auto/generate بـ `{ badReplies: ["..."] }` |
| **التكامل** | GeminiService.generateAndSaveInstructionFromBadReply → InstructionsService.create |
| **النتيجة المتوقعة** | 200، `{ results: [{ badReply, instruction }] }` |
| **الأولوية** | حرج |

---

### التداخل: Messages ↔ Instructions

| المعرّف | INS-MSG-001 |
|----------|-------------|
| **العنوان** | MessageService.rateMessage(rating=0) → Gemini → Instruction |
| **التحقق** | عند تقييم رسالة سلبياً، generateAndSaveInstructionFromBadReply يُستدعى |
| **الأولوية** | عالي |

| المعرّف | INS-MSG-002 |
|----------|-------------|
| **العنوان** | Instructions لا تستخدم Vector |
| **التحقق** | تُخزَّن في Mongo، تُقرأ كنص في البرومبت فقط |
| **الأولوية** | عالي |

---

## 5.4 Knowledge

### العملية: إضافة روابط معرفية

**الـ API:** `POST merchants/:merchantId/knowledge/urls`  
**Body:** `{ urls: string[] }`

#### السيناريو السعيد

| المعرّف | KNL-UP-001 |
|----------|------------|
| **العنوان** | إضافة روابط |
| **الخطوات** | POST بـ `{ urls: ["https://example.com/page"] }` |
| **النتيجة المتوقعة** | 201، `{ success, count, message }` |
| **التكامل** | createMany (pending) → processUrlsInBackground |
| **الأولوية** | حرج |

| المعرّف | KNL-UP-002 |
|----------|------------|
| **العنوان** | استخراج النص عبر Playwright |
| **التحقق** | chromium.launch → page.goto → body.innerText |
| **الأولوية** | حرج |

| المعرّف | KNL-UP-003 |
|----------|------------|
| **العنوان** | chunk + embed + upsertWebKnowledge |
| **التحقق** | splitIntoChunks(1000)، isUsefulChunk (3+ عربي)، embedText، upsertWebKnowledge |
| **التحقق** | Pinecone Collections.Web، payload: merchantId، url، text، type، source |
| **الأولوية** | حرج |

#### سيناريوهات فشل

| المعرّف | العنوان | الخطوات | النتيجة المتوقعة |
|----------|---------|---------|-------------------|
| KNL-UP-F01 | مصفوفة فارغة | { success: false, count: 0 } |
| KNL-UP-F02 | رابط غير قابل للوصول | status=failed، errorMessage |
| KNL-UP-F03 | Playwright غير مُتاح | فشل استخراج |

---

### العملية: حذف روابط

| المعرّف | KNL-DEL-001 |
|----------|-------------|
| **العنوان** | حذف رابط يُزيل متجهاته |
| **التحقق** | deleteVectorsByUrl → deleteWebKnowledgeByFilter |
| **الأولوية** | حرج |

| المعرّف | KNL-DEL-002 |
|----------|-------------|
| **العنوان** | deleteAll — حذف كل متجهات Web للتاجر |
| **التحقق** | deleteWebKnowledgeByFilter(merchantId, source: web) |
| **الأولوية** | عالي |

---

## 5.5 البحث الموحد (unifiedSemanticSearch)

**الـ API:** `POST /vector/unified-search` (يتطلب ServiceToken أو حسب التصميم)  
**Body:** `{ merchantId, query, topK? }`

#### السيناريو السعيد

| المعرّف | UNI-SRCH-001 |
|----------|--------------|
| **العنوان** | بحث موحد في FAQ + Documents + Web |
| **الخطوات** | POST unified-search |
| **التكامل** | VectorService.unifiedSemanticSearch — استعلام متوازي لـ FAQs، Documents، Web |
| **التكامل** | Gemini rerank (geminiRerankTopN) للنتائج |
| **النتيجة المتوقعة** | SearchResult[] مع type (faq | document | web) |
| **الأولوية** | حرج |

| المعرّف | UNI-SRCH-002 |
|----------|--------------|
| **العنوان** | Instructions غير مشمولة |
| **التحقق** | unifiedSearch يبحث فقط في Vector (FAQ، Documents، Web) — Instructions خارج النطاق |
| **الأولوية** | عالي |

---

## 6) التكاملات — ملخص

| التكامل | Documents | FAQ | Instructions | Knowledge |
|---------|-----------|-----|---------------|-----------|
| **Vector/Pinecone** | upsertDocumentChunks (documents) | upsertFaqs (faqs) | ❌ لا يُفهرس | upsertWebKnowledge (web_knowledge) |
| **Outbox** | ❌ | knowledge.index (faq.completed/failed/updated) | ❌ | knowledge.index (url.started/completed/failed) |
| **Notifications** | ❌ | faq.queued، embeddings.* | ❌ | knowledge.urls.queued، embeddings.* |
| **Bull Queue** | documents-processing-queue | ❌ | ❌ | ❌ |
| **Playwright** | ❌ | ❌ | ❌ | ✓ استخراج نص |
| **Gemini** | ❌ | ❌ | ✓ generateInstruction، generateAndSave | ✓ rerank (في unifiedSearch) |
| **PromptBuilder** | ❌ | ❌ | ✓ getActiveInstructions | ❌ |
| **MessageService** | ❌ | ❌ | ✓ getFrequentBadBotReplies | ❌ |

---

## 7) التداخل بين الأقسام

| التداخل | الوصف | الاختبار |
|---------|--------|----------|
| **Messages → Instructions** | ردود سلبية (rating=0) تُنشئ تعليمات عبر Gemini | INS-MSG-001 |
| **Instructions → PromptBuilder** | getActiveInstructions تُدمج في البرومبت | INS-ACT-001 |
| **FAQ + Documents + Web → unifiedSearch** | بحث دلالي موحد مع rerank | UNI-SRCH-001 |
| **GeminiService ↔ Instructions** | generateAndSaveInstructionFromBadReply ينشئ Instruction | INS-GEN-001، INS-MSG-001 |

---

## 8) قائمة التحقق النهائية

### Documents

- [ ] DOC-UP-001، DOC-UP-002، DOC-UP-003
- [ ] DOC-VEC-001، DOC-VEC-002، DOC-VEC-003
- [ ] DOC-UP-F01 إلى DOC-UP-F04

### FAQ

- [ ] FAQ-UP-001، FAQ-UP-002، FAQ-UP-003
- [ ] FAQ-UPD-001، FAQ-DEL-001، FAQ-DEL-002
- [ ] FAQ-UP-F01، FAQ-UP-F02

### Instructions

- [ ] INS-CRE-001، INS-ACT-001
- [ ] INS-SUG-001، INS-GEN-001
- [ ] INS-MSG-001، INS-MSG-002

### Knowledge

- [ ] KNL-UP-001، KNL-UP-002، KNL-UP-003
- [ ] KNL-DEL-001، KNL-DEL-002
- [ ] KNL-UP-F01 إلى KNL-UP-F03

### البحث الموحد

- [ ] UNI-SRCH-001، UNI-SRCH-002

---

## 9) المراجع التقنية

| الملف | الوصف |
|-------|--------|
| `documents.service.ts` | رفع S3، Bull queue، list، download، delete |
| `document.processor.ts` | Bull processor، استخراج نص، chunk، embed، upsertDocumentChunks |
| `faq.service.ts` | createMany، processFaqsInBackground، upsertFaqEmbedding، Outbox، Notifications |
| `instructions.controller.ts` | create، suggest، generate (من badReplies) |
| `instructions.service.ts` | getActiveInstructions (لـ PromptBuilder) |
| `knowledge.service.ts` | addUrls، Playwright، processSingleUrl، upsertWebKnowledge |
| `prompt-builder.service.ts` | compileTemplate، getActiveInstructions، penaltyLines |
| `gemini.service.ts` | generateInstructionFromBadReply، generateAndSaveInstructionFromBadReply |
| `vector.service.ts` | embedText، upsertDocumentChunks، upsertFaqs، upsertWebKnowledge، unifiedSemanticSearch |

# دليل الاختبار اليدوي — كليم (Kleem Bot)

> يغطي وحدة **Kleem** بالكامل: الدردشة، البرومبتات، الأسئلة الشائعة، المحادثات، الإعدادات، الـ Webhooks، والساندبوكس.  
> **التركيز:** التكاملات — N8n، Vector/RAG، Intent، CTA، EventEmitter، WebSocket.  
> **ملاحظة:** معظم عمليات الأدمن تتطلب JWT + دور ADMIN.

---

## 1) نطاق الدليل

| البند | الوصف |
|--------|--------|
| **Chat** | إرسال رسائل، تقييم الردود، استرجاع المحادثة (Public) |
| **Webhooks** | conversation، bot-reply (للاستخدام من N8n أو أنظمة خارجية) |
| **Bot Prompts** | CRUD، تفعيل، أرشفة، البرومبت النشط (ADMIN) |
| **Prompt Sandbox** | اختبار البرومبت مع المعرفة والنيّة (ADMIN) |
| **Bot FAQ** | CRUD، استيراد، إعادة فهرسة، بحث دلالي عام (ADMIN + Public) |
| **Bot Chats** | حفظ رسائل، تقييم، قائمة، إحصائيات (ADMIN) |
| **Settings** | إعدادات تشغيل البوت (ADMIN) |
| **التكامل** | N8n (نموذج الذكاء الاصطناعي)، Vector (RAG من FAQ)، IntentService، CtaService، EventEmitter، KleemGateway (WebSocket) |
| **المراجع** | `kleem-chat.controller.ts`, `kleem-chat.service.ts`, `botPrompt.controller.ts`, `botFaq.controller.ts`, `botChats.controller.ts`, `settings.controller.ts`, `kleem-webhook.controller.ts`, `prompt-sandbox.controller.ts` |

---

## 2) البيئة والحسابات

| البند | القيمة (مثال) |
|--------|---------------|
| **البيئة** | Staging / UAT |
| **Base URL API** | `https://<your-api>/api` أو `http://localhost:3000/api` |
| **حساب أدمن** | JWT + role: ADMIN (لـ admin/kleem/*) |
| **الدردشة والـ Webhooks** | Public — لا يتطلب مصادقة |
| **بحث FAQ العام** | Public — Throttle 30 طلب/دقيقة |
| **WebSocket** | `/api/kaleem/ws` — يتطلب JWT (اختياري للاتصال) |
| **N8n** | متغير البيئة N8N_BASE_URL — للـ Sandbox والدردشة |

---

## 3) مخطط التكامل

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  KleemChat      │     │  N8n Webhook    │     │  VectorService  │
│  handleUserMsg  │────►│  (رد AI)        │     │  searchBotFaqs  │
│                 │     │                 │     │  (RAG)           │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                        │                        │
         │                        │                        │
         ▼                        ▼                        ▼
┌─────────────────────────────────────────────────────────────────┐
│                    BotChatsService                              │
│  createOrAppend، findBySession، rateMessage، getTopQuestions    │
└─────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  BotPromptService│     │  SettingsService │     │  IntentService  │
│  getActiveSystem │     │  get، update     │     │  highIntent     │
│  Prompt          │     │  (متغيّرات)     │     │  CtaService     │
└─────────────────┘     └─────────────────┘     └─────────────────┘

┌─────────────────┐     ┌─────────────────┐
│  EventEmitter   │     │  KleemGateway    │
│  kleem.typing   │────►│  WebSocket      │
│  kleem.bot_reply│     │  /api/kaleem/ws │
└─────────────────┘     └─────────────────┘
```

---

## 4) قائمة العمليات (Process List)

### الدردشة (Chat) — Public

1. **إرسال رسالة** — POST `/kleem/chat/:sessionId/message`
2. **تقييم رسالة** — POST `/kleem/chat/:sessionId/rate`
3. **استرجاع المحادثة** — GET `/kleem/chat/:sessionId`

### Webhooks — Public

4. **إضافة رسائل لمحادثة** — POST `/webhooks/kleem/conversation/:sessionId`
5. **إضافة رد البوت** — POST `/webhooks/kleem/bot-reply/:sessionId`

### Bot Prompts — ADMIN

6. **إنشاء برومبت** — POST `/admin/kleem/bot-prompts`
7. **Ping** — GET `/admin/kleem/bot-prompts/ping` (Public)
8. **قائمة البرومبتات** — GET `/admin/kleem/bot-prompts`
9. **تفاصيل برومبت** — GET `/admin/kleem/bot-prompts/:id`
10. **تحديث برومبت** — PATCH `/admin/kleem/bot-prompts/:id`
11. **تفعيل/تعطيل برومبت** — POST `/admin/kleem/bot-prompts/:id/active`
12. **أرشفة برومبت** — POST `/admin/kleem/bot-prompts/:id/archive`
13. **حذف برومبت** — DELETE `/admin/kleem/bot-prompts/:id`
14. **البرومبت النشط للنظام** — GET `/admin/kleem/bot-prompts/system/active`
15. **محتوى البرومبت النشط** — GET `/admin/kleem/bot-prompts/system/active/content`

### Prompt Sandbox — ADMIN

16. **اختبار البرومبت** — POST `/admin/kleem/prompts/sandbox`

### Bot FAQ — ADMIN

17. **إنشاء سؤال شائع** — POST `/admin/kleem/bot-faqs`
18. **قائمة الأسئلة** — GET `/admin/kleem/bot-faqs`
19. **تحديث سؤال** — PATCH `/admin/kleem/bot-faqs/:id`
20. **حذف سؤال** — DELETE `/admin/kleem/bot-faqs/:id`
21. **استيراد دفعة** — POST `/admin/kleem/bot-faqs/import`
22. **استيراد من ملف** — POST `/admin/kleem/bot-faqs/import/file`
23. **إعادة فهرسة** — POST `/admin/kleem/bot-faqs/reindex`

### Bot FAQ — Public

24. **بحث دلالي** — GET `/kleem/faq/semantic-search?q=&topK=`

### Bot Chats — ADMIN

25. **حفظ رسائل** — POST `/admin/kleem/bot-chats/:sessionId`
26. **تقييم رسالة** — PATCH `/admin/kleem/bot-chats/:sessionId/rate/:msgIdx`
27. **محادثة محددة** — GET `/admin/kleem/bot-chats/:sessionId`
28. **قائمة المحادثات** — GET `/admin/kleem/bot-chats`
29. **أكثر الأسئلة شيوعاً** — GET `/admin/kleem/bot-chats/stats/top-questions/list`
30. **ردود سيئة متكررة** — GET `/admin/kleem/bot-chats/stats/bad-bot-replies/list`

### Bot Chats — Ratings (ADMIN)

31. **قائمة التقييمات** — GET `/admin/kleem/bot-chats/ratings`
32. **إحصائيات التقييمات** — GET `/admin/kleem/bot-chats/ratings/stats`

### Settings — ADMIN

33. **استرجاع الإعدادات** — GET `/admin/kleem/settings/chat`
34. **تحديث الإعدادات** — PUT `/admin/kleem/settings/chat`

---

## 5) حالات الاختبار حسب القسم

---

## 5.1 الدردشة (Chat)

### العملية: إرسال رسالة (POST /kleem/chat/:sessionId/message)

**Body:** `{ text: string (مطلوب), metadata?: object }`

| المعرّف | KLEEM-CHAT-001 |
|----------|----------------|
| **العنوان** | إرسال رسالة إلى البوت |
| **الخطوات** | POST بـ `{ text: "مرحباً، أريد الاستفسار عن الخدمات" }` |
| **النتيجة المتوقعة** | 200، `{ status: "queued" }` — الرسالة تُحفظ، يُطلق typing، يُستدعى N8n، يُضاف رد البوت |
| **الأولوية** | حرج |

| المعرّف | KLEEM-CHAT-002 |
|----------|----------------|
| **العنوان** | نص ناقص |
| **الخطوات** | POST بـ `{ text: "" }` أو بدون text |
| **النتيجة المتوقعة** | 400 | عالي |

---

### العملية: تقييم رسالة (POST /kleem/chat/:sessionId/rate)

**Body:** `{ msgIdx: number (0-based), rating: 0 | 1, feedback?: string }`

| المعرّف | KLEEM-RATE-001 |
|----------|----------------|
| **العنوان** | تقييم إيجابي |
| **الخطوات** | POST بـ `{ msgIdx: 2, rating: 1 }` |
| **النتيجة المتوقعة** | 200، `{ status: "ok" }` |
| **الأولوية** | حرج |

| المعرّف | KLEEM-RATE-002 |
|----------|----------------|
| **العنوان** | تقييم سلبي مع تعليق |
| **الخطوات** | POST بـ `{ msgIdx: 1, rating: 0, feedback: "الرد لم يكن مفيداً" }` |
| **النتيجة المتوقعة** | 200 |
| **الأولوية** | عالي |

| المعرّف | KLEEM-RATE-003 |
|----------|----------------|
| **العنوان** | msgIdx خارج النطاق |
| **الخطوات** | POST بـ msgIdx أكبر من عدد الرسائل |
| **النتيجة المتوقعة** | 404 |
| **الأولوية** | متوسط |

---

### العملية: استرجاع المحادثة (GET /kleem/chat/:sessionId)

| المعرّف | KLEEM-GET-001 |
|----------|---------------|
| **العنوان** | جلسة موجودة |
| **الخطوات** | GET بعد إرسال رسائل |
| **النتيجة المتوقعة** | 200، `BotChatSessionLean` مع messages |
| **الأولوية** | حرج |

| المعرّف | KLEEM-GET-002 |
|----------|---------------|
| **العنوان** | جلسة غير موجودة |
| **الخطوات** | GET بمعرف جلسة جديدة |
| **النتيجة المتوقعة** | 200، null |
| **الأولوية** | متوسط |

---

## 5.2 Webhooks

### العملية: إضافة رسائل (POST /webhooks/kleem/conversation/:sessionId)

**Body:** `{ messages: [{ role: "user"|"bot"|"agent", text: string, metadata?: object }] }`

| المعرّف | KLEEM-WH-001 |
|----------|--------------|
| **العنوان** | إضافة رسائل لمحادثة |
| **الخطوات** | POST بـ `{ messages: [{ role: "user", text: "مرحباً" }, { role: "bot", text: "أهلاً" }] }` |
| **النتيجة المتوقعة** | 201، محادثة محدثة |
| **الأولوية** | عالي |

---

### العملية: رد البوت (POST /webhooks/kleem/bot-reply/:sessionId)

**Body:** `{ text: string (مطلوب), metadata?: object }`

| المعرّف | KLEEM-WH-002 |
|----------|--------------|
| **العنوان** | إضافة رد البوت |
| **الخطوات** | POST بـ `{ text: "هذا رد البوت" }` |
| **النتيجة المتوقعة** | 201، `{ sessionId, msgIdx }` — يُطلق bot_reply و admin_new_message |
| **الأولوية** | عالي |

| المعرّف | KLEEM-WH-003 |
|----------|--------------|
| **العنوان** | text ناقص |
| **الخطوات** | POST بدون text أو text فارغ |
| **النتيجة المتوقعة** | 400 "sessionId and text are required" |
| **الأولوية** | عالي |

---

## 5.3 Bot Prompts

**المصادقة:** JWT + ADMIN.

### إنشاء برومبت (POST /admin/kleem/bot-prompts)

**Body:** `CreateBotPromptDto` — type (system|user)، content (10-10000 حرف)، name؟، tags؟، active؟.

| المعرّف | KLEEM-PR-001 |
|----------|--------------|
| **العنوان** | إنشاء برومبت نظامي |
| **الخطوات** | POST بـ `{ type: "system", content: "أنت مساعد ذكي...", active: false }` |
| **النتيجة المتوقعة** | 201، برومبت مُنشأ |
| **الأولوية** | حرج |

| المعرّف | KLEEM-PR-002 |
|----------|--------------|
| **العنوان** | content قصير جداً |
| **الخطوات** | POST بـ content أقل من 10 أحرف |
| **النتيجة المتوقعة** | 400 |
| **الأولوية** | عالي |

---

### قائمة البرومبتات (GET /admin/kleem/bot-prompts)

**Query:** `type?` (system|user)، `includeArchived?` (true|false)

| المعرّف | KLEEM-PR-003 |
|----------|--------------|
| **العنوان** | قائمة بدون فلاتر |
| **الخطوات** | GET |
| **النتيجة المتوقعة** | 200، مصفوفة برومبتات |
| **الأولوية** | حرج |

| المعرّف | KLEEM-PR-004 |
|----------|--------------|
| **العنوان** | تصفية بنوع |
| **الخطوات** | GET ?type=system |
| **النتيجة المتوقعة** | 200، برومبتات نظامية فقط |
| **الأولوية** | عالي |

---

### تفعيل برومبت (POST /admin/kleem/bot-prompts/:id/active)

**Body:** `{ active: boolean }`

| المعرّف | KLEEM-PR-005 |
|----------|--------------|
| **العنوان** | تفعيل برومبت |
| **الخطوات** | POST بـ `{ active: true }` |
| **النتيجة المتوقعة** | 200 — يصبح البرومبت النشط الوحيد |
| **الأولوية** | حرج |

---

### أرشفة وحذف

| المعرّف | KLEEM-PR-006 |
|----------|--------------|
| **العنوان** | أرشفة برومبت |
| **الخطوات** | POST /admin/kleem/bot-prompts/:id/archive |
| **النتيجة المتوقعة** | 200 |
| **الأولوية** | عالي |

| المعرّف | KLEEM-PR-007 |
|----------|--------------|
| **العنوان** | حذف برومبت |
| **الخطوات** | DELETE /admin/kleem/bot-prompts/:id |
| **النتيجة المتوقعة** | 204 |
| **الأولوية** | عالي |

---

### البرومبت النشط

| المعرّف | KLEEM-PR-008 |
|----------|--------------|
| **العنوان** | محتوى البرومبت النشط |
| **الخطوات** | GET /admin/kleem/bot-prompts/system/active/content |
| **النتيجة المتوقعة** | 200، `{ content: string }` |
| **الأولوية** | حرج |

---

## 5.4 Prompt Sandbox

**المصادقة:** JWT + ADMIN.  
**Body:** `SandboxDto` — text (مطلوب)، attachKnowledge؟ (افتراضي true)، topK؟ (1-20)، dryRun؟ (افتراضي false).

| المعرّف | KLEEM-SB-001 |
|----------|--------------|
| **العنوان** | اختبار كامل مع N8n |
| **الخطوات** | POST بـ `{ text: "كيف أبدأ؟" }` |
| **النتيجة المتوقعة** | 201، `{ systemPrompt, knowledge, highIntent, ctaAllowed, result: { raw, final, latencyMs } }` |
| **الأولوية** | حرج |

| المعرّف | KLEEM-SB-002 |
|----------|--------------|
| **العنوان** | dryRun — بدون استدعاء N8n |
| **الخطوات** | POST بـ `{ text: "مرحباً", dryRun: true }` |
| **النتيجة المتوقعة** | 201، بدون result — systemPrompt، knowledge، highIntent، ctaAllowed فقط |
| **الأولوية** | عالي |

| المعرّف | KLEEM-SB-003 |
|----------|--------------|
| **العنوان** | topK مخصص |
| **الخطوات** | POST بـ `{ text: "سؤال", topK: 10 }` |
| **النتيجة المتوقعة** | 201، knowledge حتى 10 عناصر |
| **الأولوية** | متوسط |

| المعرّف | KLEEM-SB-004 |
|----------|--------------|
| **العنوان** | text ناقص |
| **الخطوات** | POST بـ `{ text: "" }` |
| **النتيجة المتوقعة** | 400 "text is required" |
| **الأولوية** | عالي |

---

## 5.5 Bot FAQ — لوحة الأدمن

### إنشاء وتحديث وحذف

| المعرّف | KLEEM-FAQ-001 |
|----------|---------------|
| **العنوان** | إنشاء سؤال شائع |
| **الخطوات** | POST بـ `{ question: "كيف أغير كلمة المرور؟", answer: "من الإعدادات..." }` |
| **النتيجة المتوقعة** | 201 |
| **الأولوية** | حرج |

| المعرّف | KLEEM-FAQ-002 |
|----------|--------------|
| **العنوان** | استيراد دفعة |
| **الخطوات** | POST /import بـ `{ items: [{ question, answer }, ...] }` (حتى 500) |
| **النتيجة المتوقعة** | 201، مصفوفة FAQs |
| **الأولوية** | عالي |

| المعرّف | KLEEM-FAQ-003 |
|----------|--------------|
| **العنوان** | استيراد من ملف JSON |
| **الخطوات** | POST /import/file مع multipart file |
| **النتيجة المتوقعة** | 201 |
| **الأولوية** | متوسط |

| المعرّف | KLEEM-FAQ-004 |
|----------|--------------|
| **العنوان** | إعادة فهرسة |
| **الخطوات** | POST /reindex |
| **النتيجة المتوقعة** | 200، `{ count }` — يُحدث Vector embeddings |
| **الأولوية** | حرج |

---

## 5.6 Bot FAQ — البحث العام (Public)

**Query:** `q` (مطلوب)، `topK?` (افتراضي 5، أقصى 20). **Throttle:** 30 طلب/دقيقة.

| المعرّف | KLEEM-FAQ-005 |
|----------|---------------|
| **العنوان** | بحث دلالي |
| **الخطوات** | GET /kleem/faq/semantic-search?q=كيفية إعادة تعيين كلمة المرور |
| **النتيجة المتوقعة** | 200، `[{ question, answer, score }, ...]` |
| **الأولوية** | حرج |

| المعرّف | KLEEM-FAQ-006 |
|----------|---------------|
| **العنوان** | q فارغ |
| **الخطوات** | GET ?q= أو بدون q |
| **النتيجة المتوقعة** | 200، [] |
| **الأولوية** | متوسط |

| المعرّف | KLEEM-FAQ-007 |
|----------|---------------|
| **العنوان** | تجاوز Throttle |
| **الخطوات** | أكثر من 30 طلب في دقيقة |
| **النتيجة المتوقعة** | 429 |
| **الأولوية** | متوسط |

---

## 5.7 Bot Chats — لوحة الأدمن

### حفظ وتقييم ومحادثات

| المعرّف | KLEEM-BC-001 |
|----------|--------------|
| **العنوان** | حفظ رسائل |
| **الخطوات** | POST /admin/kleem/bot-chats/:sessionId بـ `{ messages: [{ role: "user", text: "مرحباً" }] }` |
| **النتيجة المتوقعة** | 201 |
| **الأولوية** | عالي |

| المعرّف | KLEEM-BC-002 |
|----------|--------------|
| **العنوان** | قائمة المحادثات مع بحث |
| **الخطوات** | GET ?page=1&limit=20&q=مرحباً |
| **النتيجة المتوقعة** | 200، `{ data, total }` |
| **الأولوية** | عالي |

| المعرّف | KLEEM-BC-003 |
|----------|--------------|
| **العنوان** | أكثر الأسئلة شيوعاً |
| **الخطوات** | GET /stats/top-questions/list?limit=10 |
| **النتيجة المتوقعة** | 200، `[{ question, count }, ...]` |
| **الأولوية** | متوسط |

| المعرّف | KLEEM-BC-004 |
|----------|--------------|
| **العنوان** | ردود سيئة متكررة |
| **الخطوات** | GET /stats/bad-bot-replies/list |
| **النتيجة المتوقعة** | 200، `[{ text, count, feedbacks }, ...]` |
| **الأولوية** | متوسط |

---

### التقييمات (Ratings)

**Query:** `rating?` (0|1)، `q?`، `sessionId?`، `from?`، `to?`، `page`، `limit`.

| المعرّف | KLEEM-RT-001 |
|----------|--------------|
| **العنوان** | قائمة التقييمات |
| **الخطوات** | GET /admin/kleem/bot-chats/ratings |
| **النتيجة المتوقعة** | 200، `{ items, total, page, limit }` |
| **الأولوية** | عالي |

| المعرّف | KLEEM-RT-002 |
|----------|--------------|
| **العنوان** | إحصائيات التقييمات |
| **الخطوات** | GET /admin/kleem/bot-chats/ratings/stats?from=&to= |
| **النتيجة المتوقعة** | 200، `{ summary: { totalRated, thumbsUp, thumbsDown, upRate }, weekly, topBad }` |
| **الأولوية** | عالي |

---

## 5.8 Settings

| المعرّف | KLEEM-SET-001 |
|----------|---------------|
| **العنوان** | استرجاع الإعدادات |
| **الخطوات** | GET /admin/kleem/settings/chat |
| **النتيجة المتوقعة** | 200، `BotRuntimeSettings` (launchDate، applyUrl، integrationsNow، إلخ) |
| **الأولوية** | حرج |

| المعرّف | KLEEM-SET-002 |
|----------|---------------|
| **العنوان** | تحديث الإعدادات |
| **الخطوات** | PUT بـ `{ applyUrl: "https://...", launchDate: "2025-01-01", ... }` |
| **النتيجة المتوقعة** | 200، إعدادات محدثة |
| **الأولوية** | حرج |

---

## 5.9 تكاملات (Integrations)

| المعرّف | INT-KLEEM-001 |
|----------|---------------|
| **العنوان** | RAG من FAQ عند إرسال رسالة |
| **المتطلبات** | FAQs مُفهرسة، VectorService |
| **الخطوات** | إرسال رسالة تحتوي كلمات مشابهة لسؤال في FAQ |
| **النتيجة المتوقعة** | الرد يحتوي معلومات من FAQ (إن وُجدت في الـ system prompt) |
| **الأولوية** | حرج |

| المعرّف | INT-KLEEM-002 |
|----------|---------------|
| **العنوان** | N8n يُرجع رد البوت |
| **المتطلبات** | N8n يعمل، vars.chat.n8nEndpoint صحيح |
| **الخطوات** | إرسال رسالة |
| **النتيجة المتوقعة** | رد من البوت يُحفظ ويُبث عبر WebSocket |
| **الأولوية** | حرج |

| المعرّف | INT-KLEEM-003 |
|----------|---------------|
| **العنوان** | EventEmitter — typing و bot_reply |
| **المتطلبات** | KleemGateway متصل |
| **الخطوات** | إرسال رسالة، مراقبة أحداث kleem.typing و kleem.bot_reply |
| **النتيجة المتوقعة** | أحداث تُبث للعميل عبر WebSocket |
| **الأولوية** | عالي |

| المعرّف | INT-KLEEM-004 |
|----------|---------------|
| **العنوان** | CTA و PII في Sandbox |
| **المتطلبات** | Settings تحتوي piiKeywords، highIntentKeywords |
| **الخطوات** | Sandbox مع نص يحتوي كلمة PII أو نية عالية |
| **النتيجة المتوقعة** | postProcess يضيف/يزيل روابط CTA، رسالة خصوصية عند PII |
| **الأولوية** | متوسط |

---

## 6) قائمة تحقق نهائية (Checklist)

### الدردشة والـ Webhooks
- [ ] KLEEM-CHAT-001، KLEEM-RATE-001، KLEEM-GET-001
- [ ] KLEEM-WH-001، KLEEM-WH-002، KLEEM-WH-003

### Bot Prompts
- [ ] KLEEM-PR-001 إلى KLEEM-PR-008: إنشاء، قائمة، تفعيل، أرشفة، حذف، البرومبت النشط

### Prompt Sandbox
- [ ] KLEEM-SB-001، KLEEM-SB-002، KLEEM-SB-004

### Bot FAQ
- [ ] KLEEM-FAQ-001 إلى KLEEM-FAQ-007: CRUD، استيراد، reindex، بحث دلالي، Throttle

### Bot Chats والتقييمات
- [ ] KLEEM-BC-001 إلى KLEEM-BC-004، KLEEM-RT-001، KLEEM-RT-002

### Settings
- [ ] KLEEM-SET-001، KLEEM-SET-002

### التكاملات
- [ ] INT-KLEEM-001 إلى INT-KLEEM-004: RAG، N8n، EventEmitter، CTA/PII

---

## 7) مراجع تقنية

| الملف | الوصف |
|-------|-------|
| `kleem/chat/kleem-chat.controller.ts` | إرسال رسالة، تقييم، استرجاع محادثة |
| `kleem/chat/kleem-chat.service.ts` | handleUserMessage، buildSystemPrompt، N8n، Vector، typing |
| `kleem/webhook/kleem-webhook.controller.ts` | conversation، bot-reply |
| `kleem/botPrompt/botPrompt.controller.ts` | CRUD، active، archive، system/active |
| `kleem/botPrompt/prompt-sandbox.controller.ts` | sandbox — N8n، Vector، Intent، CTA |
| `kleem/botFaq/botFaq.controller.ts` | CRUD، import، reindex |
| `kleem/botFaq/botFaq.service.ts` | semanticSearch (Vector) |
| `kleem/botChats/botChats.controller.ts` | saveMessage، rateMessage، list، topQuestions، badReplies |
| `kleem/botChats/botChats.admin.controller.ts` | ratings، stats |
| `kleem/settings/settings.controller.ts` | get، update |
| `kleem/ws/kleem.gateway.ts` | WebSocket، kleem.typing، kleem.bot_reply |

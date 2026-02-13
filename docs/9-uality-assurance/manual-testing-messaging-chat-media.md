# دليل الاختبار اليدوي — الرسائل، الدردشة، الوسائط (Messaging, Chat, Media)

> يغطي ثلاثة أقسام أساسية: **Messaging** (جلسات المحادثات والرسائل)، **Chat** (ودجة الدردشة والويب سوكيت)، **Media** (الوسائط واستخراج النص).  
> **التركيز:** التكاملات — ChatGateway، Gemini، Deepgram، Tesseract، S3/MinIO، Webhooks.  
> **المتطلبات:** JWT تاجر صالح للعمليات المحمية؛ بعض المسارات عامة (Public).

---

## 1) نطاق الدليل

| البند | الوصف |
|--------|--------|
| **Messaging** | `/messages/*`، `/chat-links/*` — جلسات، رسائل، handover، تقييم، تعليمات |
| **Chat** | `/public/chat-widget/*`، `/merchants/:merchantId/widget-settings` — إعدادات الودجة، جلسات، WebSocket |
| **Media** | `/media/*` — رفع، استخراج نص (صوت→نص، صورة→OCR، مستند→نص) |
| **التكاملات** | ChatGateway (بث رسائل)، Gemini (تعليمات من ردود سيئة)، Deepgram (تحويل صوت)، Tesseract (OCR)، S3/MinIO (تخزين)، Webhooks (رفع وسائط محادثات) |
| **غير مشمول** | Webhooks تفصيلياً (دليل منفصل)، Kleem Bot |
| **المراجع** | `message.controller.ts`, `chat-widget.service.ts`, `public-chat-widget.controller.ts`, `chat.gateway.ts`, `media.service.ts`, `chat-media.service.ts` |

---

## 2) البيئة والحسابات

| البند | القيمة (مثال) |
|--------|---------------|
| **البيئة** | Staging / UAT |
| **Base URL API** | `https://<your-api>/api` أو `http://localhost:3000/api` |
| **WebSocket** | `wss://<your-api>/api/chat` (path: /api/chat) |
| **حساب تاجر** | JWT مع merchantId صالح |
| **Deepgram** | DEEPGRAM_API_KEY (لتحويل الصوت) |
| **S3/MinIO** | S3_BUCKET_NAME، ASSETS_CDN_BASE_URL أو MINIO_PUBLIC_URL |
| **CHAT_EMBED_BASE_URL** | لرابط embed في chat-links |
| **Redis** | لـ Socket.io adapter (بث متعدد الخوادم) |

---

## 3) قائمة العمليات (Process List)

### Messaging (messages)

1. **إنشاء/إلحاق رسائل** — POST /messages (عام).
2. **Handover** — PATCH /messages/session/:sessionId/handover.
3. **جلب محادثة عامة** — GET /messages/public/:widgetSlug/webchat/:sessionId (عام).
4. **جلب محادثة حسب session** — GET /messages/session/:sessionId.
5. **جلب جلسة حسب id** — GET /messages/:id (عام).
6. **تحديث جلسة** — PATCH /messages/:id.
7. **حذف جلسة** — DELETE /messages/:id.
8. **قائمة الجلسات** — GET /messages (مع فلترة).
9. **تقييم رسالة** — PATCH /messages/session/:sessionId/messages/:messageId/rate.
10. **إنشاء تعليمات من ردود سيئة** — POST /messages/generate-instructions-from-bad-replies.
11. **جلب تعليمات البوت** — GET /messages/bad-bot-instructions.
12. **جلب تقييمات الجلسة** — GET /messages/:sessionId/ratings.

### Chat Links

13. **إنشاء رابط دردشة** — POST /chat-links/:merchantId.

### Chat Widget

14. **إعدادات الودجة (تاجر)** — GET/PUT /merchants/:merchantId/widget-settings.
15. **إعدادات التضمين** — GET/PUT /merchants/:merchantId/widget-settings/embed-settings.
16. **رابط المشاركة** — GET /merchants/:merchantId/widget-settings/share-url.
17. **إنشاء slug** — POST /merchants/:merchantId/widget-settings/slug.
18. **إعدادات ودجة عامة** — GET /public/chat-widget/:widgetSlug (عام).
19. **حالة الودجة** — GET /public/chat-widget/:widgetSlug/status (عام).
20. **إنشاء جلسة عامة** — POST /public/chat-widget/:widgetSlug/session (عام).

### Media

21. **رفع وسائط (استخراج نص)** — POST /media/upload (يتطلب fileUrl في body).
22. **تحميل ملف** — GET /media/file/:id.

### WebSocket (ChatGateway)

23. **اتصال** — مصادقة JWT (auth.token، query.token، أو Authorization).
24. **join/leave** — غرف (sessionId، merchantId، rooms).
25. **typing** — إشارة الكتابة.
26. **message** — بث رسائل للجلسة (من MessageService → sendMessageToSession).

---

## 4) حالات الاختبار حسب القسم

---

## 4.1 Messaging

### العملية: إنشاء/إلحاق رسائل (POST /messages)

**الـ API:** `POST /messages` — **عام (Public).**  
**Body:** CreateMessageDto — merchantId، sessionId، channel (whatsapp | telegram | webchat)، messages[].

#### السيناريو السعيد

| المعرّف | MSG-CRE-001 |
|----------|-------------|
| **العنوان** | إنشاء جلسة جديدة مع رسائل |
| **الخطوات** | POST بـ `{ merchantId, sessionId, channel: "webchat", messages: [{ role: "customer", text: "مرحبا" }] }` |
| **النتيجة المتوقعة** | 201، MessageSessionEntity مع الرسائل |
| **التكامل** | MessageService.createOrAppend → ChatGateway.sendMessageToSession (بث للويب سوكيت) |
| **الأولوية** | حرج |

| المعرّف | MSG-CRE-002 |
|----------|-------------|
| **العنوان** | إلحاق رسائل لجلسة موجودة |
| **الخطوات** | POST نفس merchantId+sessionId+channel مع messages جديدة |
| **النتيجة المتوقعة** | 201، الرسائل مُلحقة، آخر رسالة تُبث عبر ChatGateway |
| **الأولوية** | حرج |

#### سيناريوهات فشل

| المعرّف | العنوان | الخطوات | النتيجة المتوقعة |
|----------|---------|---------|-------------------|
| MSG-CRE-F01 | merchantId أو sessionId ناقص | 400 |
| MSG-CRE-F02 | channel غير صالح | 400 |
| MSG-CRE-F03 | messages فارغة أو role غير صالح | 400 |

---

### العملية: Handover (PATCH /messages/session/:sessionId/handover)

**الـ API:** `PATCH /messages/session/:sessionId/handover` — **يتطلب JWT.**  
**Body:** `{ handoverToAgent: boolean }`.

#### السيناريو السعيد

| المعرّف | MSG-HO-001 |
|----------|------------|
| **العنوان** | تسليم المحادثة للوكيل |
| **الخطوات** | PATCH بـ `{ handoverToAgent: true }` |
| **النتيجة المتوقعة** | 200، `{ success: true }` |
| **الأولوية** | عالي |

| المعرّف | MSG-HO-002 |
|----------|------------|
| **العنوان** | استعادة المحادثة للبوت |
| **الخطوات** | PATCH بـ `{ handoverToAgent: false }` |
| **النتيجة المتوقعة** | 200 |
| **الأولوية** | عالي |

#### سيناريوهات فشل

| المعرّف | العنوان | الخطوات | النتيجة المتوقعة |
|----------|---------|---------|-------------------|
| MSG-HO-F01 | جلسة غير موجودة | 404 |
| MSG-HO-F02 | merchantId غير مطابق | 403/404 |
| MSG-HO-F03 | عدم إرسال توكن | 401 |

---

### العملية: تقييم رسالة (PATCH rate)

**الـ API:** `PATCH /messages/session/:sessionId/messages/:messageId/rate` — **يتطلب JWT.**  
**Body:** RateMessageDto — rating (0 | 1)، feedback (اختياري).

#### السيناريو السعيد

| المعرّف | MSG-RATE-001 |
|----------|--------------|
| **العنوان** | تقييم إيجابي |
| **الخطوات** | PATCH بـ `{ rating: 1 }` |
| **النتيجة المتوقعة** | 200، `{ status: "ok" }` |
| **الأولوية** | عالي |

| المعرّف | MSG-RATE-002 |
|----------|--------------|
| **العنوان** | تقييم سلبي — إنشاء تعليمات |
| **الخطوات** | PATCH بـ `{ rating: 0, feedback: "..." }` |
| **التكامل** | rating=0 → GeminiService.generateAndSaveInstructionFromBadReply |
| **النتيجة المتوقعة** | 200 |
| **الأولوية** | حرج |

#### سيناريوهات فشل

| المعرّف | العنوان | الخطوات | النتيجة المتوقعة |
|----------|---------|---------|-------------------|
| MSG-RATE-F01 | rating غير 0 أو 1 | 400 |
| MSG-RATE-F02 | رسالة غير موجودة | 400 |
| MSG-RATE-F03 | عدم إرسال توكن | 401 |

---

### العملية: تعليمات من ردود سيئة

**الـ API:**  
- `POST /messages/generate-instructions-from-bad-replies` — Body: `{ badReplies: string[], merchantId? }`  
- `GET /messages/bad-bot-instructions?limit=&merchantId=`

#### السيناريو السعيد

| المعرّف | MSG-INST-001 |
|----------|--------------|
| **العنوان** | إنشاء تعليمات من رد سيء |
| **الخطوات** | POST بـ `{ badReplies: ["عذراً لم أفهم"] }` |
| **التكامل** | GeminiService.generateAndSaveInstructionFromBadReply |
| **النتيجة المتوقعة** | 201، `[{ badReply, instruction }]` |
| **الأولوية** | عالي |

| المعرّف | MSG-INST-002 |
|----------|--------------|
| **العنوان** | جلب تعليمات البوت |
| **الخطوات** | GET /messages/bad-bot-instructions?limit=10 |
| **التكامل** | MessageService.getFrequentBadBotReplies + GeminiService.generateInstructionFromBadReply |
| **النتيجة المتوقعة** | 200، `{ instructions: string[] }` |
| **الأولوية** | متوسط |

---

### العملية: Chat Links (POST /chat-links/:merchantId)

**الـ API:** `POST /chat-links/:merchantId` — **بدون حماية افتراضية.**

#### السيناريو السعيد

| المعرّف | MSG-LINK-001 |
|----------|--------------|
| **العنوان** | إنشاء رابط دردشة |
| **الخطوات** | POST /chat-links/:merchantId |
| **النتيجة المتوقعة** | 200، `{ sessionId, url }` — url = CHAT_EMBED_BASE_URL/embed?merchantId=...&sessionId=... |
| **التكامل** | MessageService.createOrAppend (جلسة فارغة webchat) |
| **الأولوية** | عالي |

---

## 4.2 Chat

### العملية: إعدادات الودجة (GET/PUT widget-settings)

**الـ API:**  
- `GET /merchants/:merchantId/widget-settings` — عام  
- `PUT /merchants/:merchantId/widget-settings` — عام  

#### السيناريو السعيد

| المعرّف | CHAT-SET-001 |
|----------|--------------|
| **العنوان** | جلب إعدادات الودجة |
| **الخطوات** | GET /merchants/:merchantId/widget-settings |
| **النتيجة المتوقعة** | 200، ChatWidgetSettings (أو إنشاء افتراضي) |
| **الأولوية** | حرج |

| المعرّف | CHAT-SET-002 |
|----------|--------------|
| **العنوان** | تحديث إعدادات الودجة |
| **الخطوات** | PUT بـ UpdateWidgetSettingsDto |
| **النتيجة المتوقعة** | 200، إعدادات محدّثة |
| **الأولوية** | حرج |

---

### العملية: إعدادات عامة (public/chat-widget)

**الـ API:**  
- `GET /public/chat-widget/:widgetSlug` — عام  
- `GET /public/chat-widget/:widgetSlug/status` — عام  
- `POST /public/chat-widget/:widgetSlug/session` — عام  

#### السيناريو السعيد

| المعرّف | CHAT-PUB-001 |
|----------|--------------|
| **العنوان** | جلب إعدادات الودجة العامة |
| **الخطوات** | GET /public/chat-widget/:widgetSlug |
| **النتيجة المتوقعة** | 200، theme، botName، welcomeMessage، handoffEnabled، إلخ |
| **التكامل** | ChatWidgetService.getSettingsBySlugOrPublicSlug، getMerchantPublicSlug |
| **الأولوية** | حرج |

| المعرّف | CHAT-PUB-002 |
|----------|--------------|
| **العنوان** | slug غير موجود |
| **الخطوات** | GET /public/chat-widget/slug-invalid |
| **النتيجة المتوقعة** | 404 (WIDGET_NOT_FOUND) |
| **الأولوية** | عالي |

| المعرّف | CHAT-PUB-003 |
|----------|--------------|
| **العنوان** | إنشاء جلسة عامة |
| **الخطوات** | POST /public/chat-widget/:widgetSlug/session بـ `{ visitorId? }` |
| **النتيجة المتوقعة** | 201، `{ success, sessionId, widgetSlug, visitorId, status, welcomeMessage, ... }` |
| **الأولوية** | عالي |

---

### العملية: إعدادات التضمين والـ Embed

**الـ API:**  
- `GET /merchants/:merchantId/widget-settings/embed-settings`  
- `PUT /merchants/:merchantId/widget-settings/embed-settings`  
- `GET /merchants/:merchantId/widget-settings/share-url`  
- `POST /merchants/:merchantId/widget-settings/slug`  

#### السيناريو السعيد

| المعرّف | CHAT-EMB-001 |
|----------|--------------|
| **العنوان** | جلب إعدادات التضمين |
| **الخطوات** | GET embed-settings |
| **النتيجة المتوقعة** | 200، embedMode، shareUrl، colors (headerBgColor، brandColor) |
| **التكامل** | useStorefrontBrand → getStorefrontBrand للألوان |
| **الأولوية** | عالي |

| المعرّف | CHAT-EMB-002 |
|----------|--------------|
| **العنوان** | توليد slug فريد |
| **الخطوات** | POST slug |
| **النتيجة المتوقعة** | 201، slug فريد |
| **التكامل** | من botName أو "bot" + uuid إن تكرر |
| **الأولوية** | عالي |

---

### العملية: WebSocket (ChatGateway)

**المسار:** `/api/chat` — Socket.io.

#### السيناريو السعيد

| المعرّف | CHAT-WS-001 |
|----------|-------------|
| **العنوان** | اتصال WebSocket بمصادقة JWT |
| **الخطوات** | اتصال مع token في auth.token أو query.token أو Authorization |
| **النتيجة المتوقعة** | اتصال ناجح، join تلقائي لـ sessionId و merchantId من query |
| **الأولوية** | حرج |

| المعرّف | CHAT-WS-002 |
|----------|-------------|
| **العنوان** | join غرفة |
| **الخطوات** | emit 'join' بـ `{ sessionId, merchantId?, rooms? }` |
| **النتيجة المتوقعة** | `{ ok: true }` |
| **الأولوية** | عالي |

| المعرّف | CHAT-WS-003 |
|----------|-------------|
| **العنوان** | typing |
| **الخطوات** | emit 'typing' بـ `{ sessionId, role? }` |
| **النتيجة المتوقعة** | بث typing لكل clients في sessionId |
| **الأولوية** | متوسط |

| المعرّف | CHAT-WS-004 |
|----------|-------------|
| **العنوان** | استقبال message |
| **الخطوات** | MessageService.createOrAppend يبث آخر رسالة |
| **التكامل** | ChatGateway.sendMessageToSession → emit 'message' لـ sessionId، 'admin_new_message' لـ admin، 'message' لـ merchant:${merchantId} |
| **النتيجة المتوقعة** | استقبال event 'message' |
| **الأولوية** | حرج |

#### سيناريوهات فشل

| المعرّف | العنوان | الخطوات | النتيجة المتوقعة |
|----------|---------|---------|-------------------|
| CHAT-WS-F01 | اتصال بدون توكن | Unauthorized، disconnect |
| CHAT-WS-F02 | توكن منتهي أو غير صالح | Unauthorized |
| CHAT-WS-F03 | JTI في blacklist | Unauthorized |
| CHAT-WS-F04 | تجاوز حد الرسائل (rate limit) | rate_limit_exceeded، احتمال disconnect |

---

## 4.3 Media

### العملية: استخراج نص من وسائط (POST /media/upload)

**الـ API:** `POST /media/upload` — **يتطلب JWT.**  
**Body:** MediaHandlerDto — type (voice | audio | photo | image | pdf | document)، fileUrl، sessionId، channel، mimeType.

**ملاحظة:** MediaService.handleMedia يعمل على fileUrl (تحميل من رابط) — الصوت، الصور، المستندات.

#### السيناريو السعيد

| المعرّف | MED-UP-001 |
|----------|------------|
| **العنوان** | تحويل صوت إلى نص |
| **الخطوات** | POST بـ `{ type: "voice", fileUrl: "https://..." }` |
| **التكامل** | MediaService.transcribeAudio → Deepgram API (api.deepgram.com/v1/listen) |
| **النتيجة المتوقعة** | 201، `{ text: "نص المستخرج", meta }` |
| **الأولوية** | حرج |

| المعرّف | MED-UP-002 |
|----------|------------|
| **العنوان** | استخراج نص من صورة (OCR) |
| **الخطوات** | POST بـ `{ type: "image", fileUrl: "https://..." }` |
| **التكامل** | MediaService.ocrImage → Tesseract.recognize (ara+eng) |
| **النتيجة المتوقعة** | 201، `{ text: "نص الصورة: ..." }` أو `[لم يتم استخراج نص من الصورة]` |
| **الأولوية** | حرج |

| المعرّف | MED-UP-003 |
|----------|------------|
| **العنوان** | استخراج نص من PDF |
| **الخطوات** | POST بـ `{ type: "pdf", fileUrl: "https://...", mimeType: "application/pdf" }` |
| **التكامل** | pdf-parse |
| **النتيجة المتوقعة** | 201، `{ text }` |
| **الأولوية** | عالي |

| المعرّف | MED-UP-004 |
|----------|------------|
| **العنوان** | استخراج نص من Word/Excel |
| **الخطوات** | POST بـ type: "document"، mimeType يشير لـ docx أو xlsx |
| **التكامل** | mammoth (Word)، xlsx (Excel) |
| **النتيجة المتوقعة** | 201، `{ text }` |
| **الأولوية** | عالي |

#### سيناريوهات فشل

| المعرّف | العنوان | الخطوات | النتيجة المتوقعة |
|----------|---------|---------|-------------------|
| MED-UP-F01 | Deepgram API غير مُكوّن | 500 (API key not configured) |
| MED-UP-F02 | fileUrl غير قابل للتحميل | خطأ من axios |
| MED-UP-F03 | نوع غير مدعوم | نص: [لا يمكن قراءة الملف] |
| MED-UP-F04 | عدم إرسال توكن | 401 |

---

### التكامل: ChatMediaService (رفع إلى S3/MinIO)

**لا يُستدعى مباشرة من Media Controller** — يُستخدم من Webhooks عند استلام وسائط من WhatsApp/Telegram.

| المعرّف | MED-S3-001 |
|----------|------------|
| **العنوان** | رفع وسائط محادثة إلى S3 |
| **التحقق** | WebhooksService → ChatMediaService.uploadChatMedia(merchantId, filePath, originalName, mimeType) |
| **النتيجة** | storageKey، url (CDN) أو presignedUrl |
| **التكامل** | S3/MinIO، ASSETS_CDN_BASE_URL أو getSignedUrl |
| **الأولوية** | عالي |

| المعرّف | MED-S3-002 |
|----------|------------|
| **العنوان** | مسار التخزين |
| **التحقق** | `chat-media/${merchantId}/${timestamp}-${safeName}` |
| **الأولوية** | متوسط |

---

## 5) التكاملات — ملخص

| التكامل | الموقع | الوظيفة |
|---------|--------|---------|
| **ChatGateway** | MessageService.createOrAppend | بث آخر رسالة للويب سوكيت (sessionId، admin، merchant) |
| **GeminiService** | MessageService.rateMessage (rating=0)، generate-instructions | إنشاء تعليمات من ردود سيئة |
| **Deepgram** | MediaService.transcribeAudio | تحويل صوت → نص |
| **Tesseract** | MediaService.ocrImage | OCR صور (ara+eng) |
| **pdf-parse, mammoth, xlsx** | MediaService.extractTextFromDocument | استخراج نص من PDF/Word/Excel |
| **ChatMediaService (S3)** | WebhooksService | رفع وسائط محادثات من WhatsApp/Telegram |
| **ChatWidgetService** | Storefront (useStorefrontBrand) | ألوان الودجة من الستورفرونت |
| **Redis** | ChatGateway | Socket.io adapter لبث متعدد الخوادم |

---

## 6) قائمة التحقق النهائية

### Messaging

- [ ] MSG-CRE-001، MSG-CRE-002
- [ ] MSG-HO-001، MSG-HO-002
- [ ] MSG-RATE-001، MSG-RATE-002
- [ ] MSG-INST-001، MSG-INST-002
- [ ] MSG-LINK-001
- [ ] MSG-CRE-F01 إلى MSG-CRE-F03
- [ ] MSG-HO-F01 إلى MSG-HO-F03
- [ ] MSG-RATE-F01 إلى MSG-RATE-F03

### Chat

- [ ] CHAT-SET-001، CHAT-SET-002
- [ ] CHAT-PUB-001، CHAT-PUB-002، CHAT-PUB-003
- [ ] CHAT-EMB-001، CHAT-EMB-002
- [ ] CHAT-WS-001 إلى CHAT-WS-004
- [ ] CHAT-WS-F01 إلى CHAT-WS-F04

### Media

- [ ] MED-UP-001 إلى MED-UP-004
- [ ] MED-S3-001، MED-S3-002
- [ ] MED-UP-F01 إلى MED-UP-F04

---

## 7) المراجع التقنية

| الملف | الوصف |
|-------|--------|
| `message.controller.ts` | واجهات الرسائل والجلسات |
| `message.service.ts` | createOrAppend، ChatGateway، rateMessage، GeminiService |
| `chat-links.controller.ts` | إنشاء رابط embed |
| `chat-widget.service.ts` | إعدادات الودجة، slug، embed، Storefront |
| `public-chat-widget.controller.ts` | إعدادات عامة، جلسات عامة |
| `chat-widget.controller.ts` | إعدادات التاجر، embed، share-url، slug |
| `chat.gateway.ts` | WebSocket، join/leave، typing، sendMessageToSession |
| `media.service.ts` | handleMedia، Deepgram، Tesseract، pdf/mammoth/xlsx |
| `chat-media.service.ts` | uploadChatMedia → S3/MinIO |
| `webhooks.service.ts` | ChatMediaService (رفع)، MessageService (حفظ) |

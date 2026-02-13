# دليل الاختبار اليدوي — القنوات (Channels)

> يغطي عمليات **القنوات** من `channels.controller.ts` مع التركيز على **التكاملات** — كل قناة هي تكامل مع مزود خارجي: WhatsApp Cloud (Meta)، WhatsApp QR (Evolution API)، Telegram، Webchat.  
> **المتطلبات:** JWT تاجر صالح، و merchantId في التوكن يطابق التاجر المستهدف.

---

## 1) نطاق الدليل

| البند | الوصف |
|--------|--------|
| **النطاق** | مسارات `/merchants/:merchantId/channels` و `/channels/*` — إنشاء، ربط، إرسال، حالة، حذف |
| **التكاملات** | WhatsApp Cloud (Meta Graph API)، WhatsApp QR (Evolution API)، Telegram Bot API، Webchat (ChatGateway) |
| **الربط** | connect → webhook URL أو QR code حسب المزود؛ disconnect → فصل عن المزود |
| **الإرسال** | ChannelsDispatcherService → webchat/telegram/whatsapp حسب القناة الافتراضية |
| **غير مشمول** | عمليات الأدمن (admin/channels) — دليل منفصل |
| **المراجع** | `channels.controller.ts`, `channels.service.ts`, `channels-dispatcher.service.ts`, adapters, `webhooks.controller.ts` |

---

## 2) البيئة والحسابات

| البند | القيمة (مثال) |
|--------|---------------|
| **البيئة** | Staging / UAT |
| **Base URL API** | `https://<your-api>/api` أو `http://localhost:3000/api` |
| **حساب تاجر** | JWT مع merchantId صالح |
| **معرّف تاجر للاختبار** | `merchantId` من user.merchantId |
| **Evolution API** | مُكوّن ومُتاح (لـ WhatsApp QR) — EVOLUTION_API_URL، EVOLUTION_API_KEY |
| **Meta / Facebook** | حساب مطوّر، WABA، Access Token (لـ WhatsApp Cloud) |
| **Telegram** | Bot Token من @BotFather |
| **PUBLIC_WEBHOOK_BASE** | عنوان أساسي لـ webhooks (مطلوب لـ connect) |

---

## 3) قائمة العمليات (Process List)

### من channels.controller

1. **إنشاء قناة** — POST merchants/:merchantId/channels.
2. **قائمة القنوات** — GET merchants/:merchantId/channels (مع تصفية provider).
3. **جلب قناة** — GET channels/:id.
4. **تحديث قناة** — PATCH channels/:id.
5. **ربط القناة** — POST channels/:id/actions/connect (يعيد QR أو webhookUrl حسب المزود).
6. **تجديد الصلاحيات** — POST channels/:id/actions/refresh.
7. **تعيين كافتراضية** — POST channels/:id/actions/set-default.
8. **حذف/فصل قناة** — DELETE channels/:id (mode: disable | disconnect | wipe).
9. **حالة القناة** — GET channels/:id/status.
10. **إرسال رسالة اختبارية** — POST channels/:id/send.

### التكاملات (كل مزود)

11. **WhatsApp Cloud** — connect بـ accessToken + phoneNumberId → webhookUrl.
12. **WhatsApp QR** — connect → Evolution API (startSession، setWebhook) → QR code.
13. **Telegram** — connect بـ botToken → setWebhook → webhookUrl.
14. **Webchat** — connect → تفعيل فوري (mode: none).
15. **ChannelsDispatcherService** — إرسال رسائل عبر القناة الافتراضية (webchat/telegram/whatsapp).

---

## 4) حالات الاختبار حسب العملية

---

### العملية 1: إنشاء قناة (POST merchants/:merchantId/channels)

**الـ API:** `POST merchants/:merchantId/channels`  
**Body:** CreateChannelDto — provider (whatsapp | telegram | webchat)، accountLabel، isDefault.

#### السيناريو السعيد

| المعرّف | CH-CRE-001 |
|----------|------------|
| **العنوان** | إنشاء قناة Webchat |
| **الخطوات** | POST بـ `{ provider: "webchat", accountLabel: "شات الموقع" }` |
| **النتيجة المتوقعة** | 201، قناة مُنشأة، status: disconnected |
| **الأولوية** | حرج |

| المعرّف | CH-CRE-002 |
|----------|------------|
| **العنوان** | إنشاء قناة WhatsApp QR |
| **الخطوات** | POST بـ `{ provider: "whatsapp_qr" }` |
| **النتيجة المتوقعة** | 201، قناة مُنشأة |
| **الأولوية** | حرج |

| المعرّف | CH-CRE-003 |
|----------|------------|
| **العنوان** | إنشاء قناة Telegram |
| **الخطوات** | POST بـ `{ provider: "telegram" }` |
| **النتيجة المتوقعة** | 201، قناة مُنشأة |
| **الأولوية** | حرج |

| المعرّف | CH-CRE-004 |
|----------|------------|
| **العنوان** | إنشاء قناة WhatsApp Cloud |
| **الخطوات** | POST بـ `{ provider: "whatsapp_cloud" }` |
| **النتيجة المتوقعة** | 201، قناة مُنشأة |
| **الأولوية** | حرج |

| المعرّف | CH-CRE-005 |
|----------|------------|
| **العنوان** | إنشاء قناة افتراضية — إلغاء افتراضية السابقة |
| **الخطوات** | POST بـ `{ provider: "webchat", isDefault: true }` مع وجود قناة webchat افتراضية |
| **النتيجة المتوقعة** | 201، القناة الجديدة isDefault: true، السابقة isDefault: false |
| **الأولوية** | عالي |

#### سيناريوهات فشل

| المعرّف | العنوان | الخطوات | النتيجة المتوقعة | الأولوية |
|----------|---------|---------|-------------------|----------|
| CH-CRE-006 | merchantId غير صالح | POST بـ merchantId غير ObjectId | 400 (INVALID_MERCHANT_ID) |
| CH-CRE-007 | provider غير مدعوم | provider: "sms" | 400 |
| CH-CRE-008 | عدم إرسال توكن | 401 |
| CH-CRE-009 | تاجر آخر | merchantId لا يطابق JWT | 403 |

---

### العملية 2: ربط القناة (POST channels/:id/actions/connect)

**الـ API:** `POST channels/:id/actions/connect`  
**Body:** ConnectActionDto — حسب المزود: botToken (Telegram)، accessToken + phoneNumberId (WhatsApp Cloud)، أو فارغ (WhatsApp QR، Webchat).

#### السيناريو السعيد — Webchat

| المعرّف | CH-CONN-WC-001 |
|----------|----------------|
| **العنوان** | ربط Webchat — تفعيل فوري |
| **الخطوات** | POST connect على قناة webchat (بدون body أو enable: true) |
| **النتيجة المتوقعة** | 200، `{ action: "none" }` أو mode: "none"، status: connected |
| **الأولوية** | حرج |

#### السيناريو السعيد — WhatsApp QR

| المعرّف | CH-CONN-WAQR-001 |
|----------|------------------|
| **العنوان** | ربط WhatsApp QR — Evolution API |
| **الخطوات** | POST connect على قناة whatsapp_qr (بدون body) |
| **النتيجة المتوقعة** | 200، `{ mode: "qr", qr: "data:image/...", webhookUrl }`، status: pending |
| **التكامل** | EvolutionService.startSession، deleteInstance، setWebhook |
| **الأولوية** | حرج |

| المعرّف | CH-CONN-WAQR-002 |
|----------|------------------|
| **العنوان** | Webhook URL صحيح للـ Evolution |
| **الخطوات** | التحقق من webhookUrl المُعاد |
| **التحقق** | `{PUBLIC_WEBHOOK_BASE}/webhooks/whatsapp_qr/{channelId}` |
| **الأولوية** | عالي |

| المعرّف | CH-CONN-WAQR-003 |
|----------|------------------|
| **العنوان** | مسح جلسة قديمة قبل إنشاء جديدة |
| **الخطوات** | connect على قناة لها sessionId سابق |
| **التحقق** | EvolutionService.deleteInstance يُستدعى قبل startSession |
| **الأولوية** | عالي |

#### السيناريو السعيد — Telegram

| المعرّف | CH-CONN-TG-001 |
|----------|----------------|
| **العنوان** | ربط Telegram بـ botToken |
| **الخطوات** | POST connect بـ `{ botToken: "123456:ABC..." }` |
| **النتيجة المتوقعة** | 200، `{ mode: "webhook", webhookUrl }`، status: connected |
| **التكامل** | Telegram API setWebhook |
| **الأولوية** | حرج |

| المعرّف | CH-CONN-TG-002 |
|----------|----------------|
| **العنوان** | Webhook URL صحيح للتليجرام |
| **التحقق** | `{PUBLIC_WEBHOOK_BASE}/webhooks/telegram/{channelId}` |
| **الأولوية** | عالي |

#### السيناريو السعيد — WhatsApp Cloud

| المعرّف | CH-CONN-WACL-001 |
|----------|------------------|
| **العنوان** | ربط WhatsApp Cloud |
| **الخطوات** | POST connect بـ `{ accessToken, phoneNumberId, wabaId?, appSecret?, verifyToken? }` |
| **النتيجة المتوقعة** | 200، `{ mode: "webhook", webhookUrl }`، status: connected |
| **التكامل** | تخزين accessTokenEnc، phoneNumberId، webhookUrl |
| **الأولوية** | حرج |

| المعرّف | CH-CONN-WACL-002 |
|----------|------------------|
| **العنوان** | Webhook URL صحيح لـ Meta |
| **التحقق** | `{PUBLIC_WEBHOOK_BASE}/webhooks/whatsapp_cloud/{channelId}` |
| **الأولوية** | عالي |

#### سيناريوهات فشل

| المعرّف | العنوان | الخطوات | النتيجة المتوقعة | الأولوية |
|----------|---------|---------|-------------------|----------|
| CH-CONN-F01 | Telegram بدون botToken | connect قناة telegram بدون botToken وبدون token مخزّن | 400 (botToken required) |
| CH-CONN-F02 | WhatsApp Cloud بدون accessToken أو phoneNumberId | connect بدونها | 400 |
| CH-CONN-F03 | Evolution API غير متاح | connect whatsapp_qr مع Evolution معطّل | 500 أو خطأ من Evolution |
| CH-CONN-F04 | قناة غير موجودة | 404 |
| CH-CONN-F05 | channelId غير صالح | 400 (INVALID_CHANNEL_ID) |

---

### العملية 3: حالة القناة (GET channels/:id/status)

**الـ API:** `GET channels/:id/status`

#### السيناريو السعيد

| المعرّف | CH-STAT-001 |
|----------|-------------|
| **العنوان** | حالة قناة Webchat |
| **النتيجة المتوقعة** | 200، `{ status, details: { widgetSettings } }` |
| **الأولوية** | عالي |

| المعرّف | CH-STAT-002 |
|----------|-------------|
| **العنوان** | حالة قناة WhatsApp QR — من Evolution |
| **الخطوات** | GET status على قناة whatsapp_qr متصلة |
| **التحقق** | WhatsAppQrAdapter.getStatus → EvolutionService.getStatus → mapEvoStatus |
| **النتيجة المتوقعة** | 200، status: connected | pending | disconnected، details من Evolution |
| **الأولوية** | عالي |

| المعرّف | CH-STAT-003 |
|----------|-------------|
| **العنوان** | تحديث status محلي عند تغيّر Evolution |
| **الخطوات** | getStatus عندما Evolution يُرجع connected بينما القناة pending |
| **التحقق** | القناة تُحدَّث إلى connected، qr يُمسح |
| **الأولوية** | عالي |

---

### العملية 4: إرسال رسالة (POST channels/:id/send)

**الـ API:** `POST channels/:id/send`  
**Body:** SendMessageDto — to (رقم/chat_id/sessionId)، text.

#### السيناريو السعيد

| المعرّف | CH-SEND-001 |
|----------|-------------|
| **العنوان** | إرسال عبر Telegram |
| **الخطوات** | POST send على قناة telegram متصلة بـ `{ to: "chat_id", text: "مرحبا" }` |
| **التكامل** | TelegramAdapter.sendMessage → api.telegram.org/bot{token}/sendMessage |
| **النتيجة المتوقعة** | 200، `{ ok: true }` |
| **الأولوية** | حرج |

| المعرّف | CH-SEND-002 |
|----------|-------------|
| **العنوان** | إرسال عبر WhatsApp QR |
| **الخطوات** | POST send على قناة whatsapp_qr متصلة |
| **التكامل** | WhatsAppQrAdapter.sendMessage → EvolutionService.sendMessage |
| **النتيجة المتوقعة** | 200 |
| **الأولوية** | حرج |

| المعرّف | CH-SEND-003 |
|----------|-------------|
| **العنوان** | إرسال عبر Webchat |
| **الخطوات** | POST send على قناة webchat (to = sessionId) |
| **التكامل** | WebchatAdapter.sendMessage — "handled by WS gateway" (قد لا يُنفّذ من controller مباشرة) |
| **الأولوية** | متوسط |

#### سيناريوهات فشل

| المعرّف | العنوان | الخطوات | النتيجة المتوقعة | الأولوية |
|----------|---------|---------|-------------------|----------|
| CH-SEND-F01 | قناة غير متصلة | send على قناة disconnected | 400 أو خطأ من Adapter |
| CH-SEND-F02 | WhatsApp QR بدون sessionId | 400 (WhatsApp QR not configured) |
| CH-SEND-F03 | Telegram بدون botToken | 400 (Telegram not configured) |

---

### العملية 5: حذف/فصل قناة (DELETE channels/:id)

**الـ API:** `DELETE channels/:id?mode=disable|disconnect|wipe`  
**Default:** disconnect.

#### السيناريو السعيد

| المعرّف | CH-REM-001 |
|----------|------------|
| **العنوان** | disconnect — فصل بدون مسح بيانات |
| **الخطوات** | DELETE ?mode=disconnect |
| **النتيجة المتوقعة** | 200، `{ ok: true }`، status: disconnected |
| **الأولوية** | حرج |

| المعرّف | CH-REM-002 |
|----------|------------|
| **العنوان** | wipe — حذف كامل + مسح الأسرار |
| **الخطوات** | DELETE ?mode=wipe |
| **النتيجة المتوقعة** | 200، `{ deleted: true }`، القناة محذوفة من DB |
| **الأولوية** | عالي |

| المعرّف | CH-REM-003 |
|----------|------------|
| **العنوان** | WhatsApp QR disconnect — حذف instance من Evolution |
| **الخطوات** | DELETE قناة whatsapp_qr |
| **التكامل** | WhatsAppQrAdapter.disconnect → EvolutionService.deleteInstance |
| **النتيجة المتوقعة** | 200 |
| **الأولوية** | حرج |

| المعرّف | CH-REM-004 |
|----------|------------|
| **العنوان** | Telegram disconnect — deleteWebhook |
| **الخطوات** | DELETE قناة telegram |
| **التكامل** | TelegramAdapter.disconnect → api.telegram.org/deleteWebhook |
| **النتيجة المتوقعة** | 200 |
| **الأولوية** | حرج |

| المعرّف | CH-REM-005 |
|----------|------------|
| **العنوان** | wipe يمسح الأسرار (accessTokenEnc، botTokenEnc، إلخ) |
| **التحقق** | mode=wipe على قناة telegram/wa_cloud — الأسرار undefined |
| **الأولوية** | عالي |

---

### العملية 6: تعيين كافتراضية (POST channels/:id/actions/set-default)

**الـ API:** `POST channels/:id/actions/set-default`

#### السيناريو السعيد

| المعرّف | CH-DEF-001 |
|----------|------------|
| **العنوان** | تعيين قناة كافتراضية |
| **الخطوات** | POST set-default على قناة متصلة |
| **النتيجة المتوقعة** | 200، القناة isDefault: true، القناة السابقة isDefault: false |
| **الأولوية** | عالي |

| المعرّف | CH-DEF-002 |
|----------|------------|
| **العنوان** | فريد لكل (merchantId، provider) |
| **التحقق** | Index: { merchantId, provider, isDefault: true } unique |
| **الأولوية** | عالي |

---

## 5) التكاملات (Integrations) — تفصيل

### 5.1 WhatsApp Cloud (Meta Graph API)

| المعرّف | INT-WACL-001 |
|----------|--------------|
| **العنوان** | connect يخزّن accessToken مشفّراً |
| **التحقق** | encryptSecret في WhatsAppCloudAdapter.connect |
| **الأولوية** | حرج |

| المعرّف | INT-WACL-002 |
|----------|--------------|
| **العنوان** | webhookUrl يُبنى من PUBLIC_WEBHOOK_BASE |
| **التحقق** | `{base}/webhooks/whatsapp_cloud/{channelId}` |
| **الأولوية** | عالي |

| المعرّف | INT-WACL-003 |
|----------|--------------|
| **العنوان** | WhatsappCloudService.sendText — Graph API |
| **التحقق** | POST `graph.facebook.com/v19.0/{phoneNumberId}/messages` |
| **الأولوية** | عالي |

| المعرّف | INT-WACL-004 |
|----------|--------------|
| **العنوان** | detectTransport — api أو qr حسب توفر Cloud |
| **التحقق** | ChannelsDispatcherService.send(whatsapp) → waCloud.detectTransport |
| **الأولوية** | عالي |

### 5.2 WhatsApp QR (Evolution API)

| المعرّف | INT-WAQR-001 |
|----------|--------------|
| **العنوان** | startSession — إنشاء instance وجلب QR |
| **التحقق** | EvolutionService.startSession(instanceName, token) |
| **الأولوية** | حرج |

| المعرّف | INT-WAQR-002 |
|----------|--------------|
| **العنوان** | setWebhook — MESSAGES_UPSERT |
| **التحقق** | evo.setWebhook(instanceName, webhookUrl, ['MESSAGES_UPSERT'], ...) |
| **الأولوية** | حرج |

| المعرّف | INT-WAQR-003 |
|----------|--------------|
| **العنوان** | deleteInstance عند disconnect |
| **التحقق** | evo.deleteInstance(sessionId) |
| **الأولوية** | حرج |

| المعرّف | INT-WAQR-004 |
|----------|--------------|
| **العنوان** | mapEvoStatus — pending | connected | disconnected |
| **التحقق** | evo-status.util.mapEvoStatus |
| **الأولوية** | عالي |

| المعرّف | INT-WAQR-005 |
|----------|--------------|
| **العنوان** | Fallback: Cloud فشل → QR |
| **التحقق** | ChannelsDispatcherService.send(whatsapp) — try Cloud، catch → Evolution QR |
| **الأولوية** | عالي |

### 5.3 Telegram

| المعرّف | INT-TG-001 |
|----------|------------|
| **العنوان** | setWebhook مع secret_token |
| **التحقق** | api.telegram.org/bot{token}/setWebhook?url=...&secret_token=TELEGRAM_WEBHOOK_SECRET |
| **الأولوية** | حرج |

| المعرّف | INT-TG-002 |
|----------|------------|
| **العنوان** | deleteWebhook عند disconnect |
| **التحقق** | api.telegram.org/bot{token}/deleteWebhook |
| **الأولوية** | حرج |

| المعرّف | INT-TG-003 |
|----------|------------|
| **العنوان** | botToken يُخزّن مشفّراً |
| **التحقق** | encryptSecret في TelegramAdapter.connect |
| **الأولوية** | حرج |

### 5.4 Webchat

| المعرّف | INT-WC-001 |
|----------|------------|
| **العنوان** | connect — تفعيل فوري بدون أسرار |
| **التحقق** | WebchatAdapter.connect → status: connected، mode: none |
| **الأولوية** | حرج |

| المعرّف | INT-WC-002 |
|----------|------------|
| **العنوان** | ChannelsDispatcherService — ChatGateway |
| **التحقق** | channel=webchat → chatGateway.sendMessageToSession(sessionId, { text }) |
| **الأولوية** | عالي |

### 5.5 Webhooks (استقبال الرسائل)

| المعرّف | INT-WH-001 |
|----------|------------|
| **العنوان** | Webhook WhatsApp Cloud → webhooks.controller |
| **التحقق** | POST /webhooks/whatsapp_cloud/:merchantId — تحقق توقيع، معالجة، رد |
| **الأولوية** | عالي |

| المعرّف | INT-WH-002 |
|----------|------------|
| **العنوان** | Webhook Telegram → webhooks.controller |
| **التحقق** | POST /webhooks/telegram/:channelId |
| **الأولوية** | عالي |

| المعرّف | INT-WH-003 |
|----------|------------|
| **العنوان** | Webhook WhatsApp QR → webhooks.controller |
| **التحقق** | POST /webhooks/whatsapp_qr/:channelId — MESSAGES_UPSERT |
| **الأولوية** | عالي |

### 5.6 تكاملات أخرى

| المعرّف | INT-OTH-001 |
|----------|-------------|
| **العنوان** | Merchant Checklist — عد القنوات |
| **التحقق** | merchant-checklist.service — tgCh، waQrCh، waApiCh، webCh |
| **الأولوية** | متوسط |

| المعرّف | INT-OTH-002 |
|----------|-------------|
| **العنوان** | Admin Reports — countByMerchant |
| **التحقق** | admin-reports.service — channelsTotal، enabled، connected |
| **الأولوية** | متوسط |

| المعرّف | INT-OTH-003 |
|----------|-------------|
| **العنوان** | SlugResolver — webchat default |
| **التحقق** | slug-resolver.service — findDefault webchat للتاجر |
| **الأولوية** | متوسط |

---

## 6) قائمة التحقق النهائية

### العمليات الأساسية

- [ ] CH-CRE-001 إلى CH-CRE-005
- [ ] CH-CONN-WC-001، CH-CONN-WAQR-001، CH-CONN-TG-001، CH-CONN-WACL-001
- [ ] CH-STAT-001، CH-STAT-002
- [ ] CH-SEND-001، CH-SEND-002
- [ ] CH-REM-001 إلى CH-REM-005
- [ ] CH-DEF-001

### التكاملات

- [ ] INT-WACL-001 إلى INT-WACL-004
- [ ] INT-WAQR-001 إلى INT-WAQR-005
- [ ] INT-TG-001 إلى INT-TG-003
- [ ] INT-WC-001، INT-WC-002
- [ ] INT-WH-001 إلى INT-WH-003
- [ ] INT-OTH-001 إلى INT-OTH-003

### سيناريوهات فشل

- [ ] CH-CRE-006 إلى CH-CRE-009
- [ ] CH-CONN-F01 إلى CH-CONN-F05
- [ ] CH-SEND-F01 إلى CH-SEND-F03

---

## 7) المراجع التقنية

| الملف | الوصف |
|-------|--------|
| `channels.controller.ts` | واجهات القنوات |
| `channels.service.ts` | pickAdapter، create، connect، disconnect، send، status |
| `channels-dispatcher.service.ts` | إرسال عبر webchat/telegram/whatsapp |
| `adapters/whatsapp-cloud.adapter.ts` | تكامل Meta Graph API |
| `adapters/whatsapp-qr.adapter.ts` | تكامل Evolution API |
| `adapters/telegram.adapter.ts` | تكامل Telegram Bot API |
| `adapters/webchat.adapter.ts` | تفعيل محلي |
| `whatsapp-cloud.service.ts` | sendText، detectTransport |
| `evolution.service.ts` | startSession، deleteInstance، setWebhook، sendMessage، getStatus |
| `webhooks.controller.ts` | استقبال رسائل من المزودين |

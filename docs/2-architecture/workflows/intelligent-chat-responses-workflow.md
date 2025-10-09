# ورك فلو بوابة الدردشة الذكية - نظام كليم البسيط

## نظرة عامة على النظام

نظام كليم يدعم بوابة دردشة ذكية مبسطة تعتمد على n8n وGemini AI:

- **بوابة دردشة بسيطة**: واجهة WebSocket للتواصل الفوري
- **تكامل مع n8n**: إرسال الرسائل للمعالجة الخارجية
- **البحث في الأسئلة الشائعة**: استرجاع الإجابات المطابقة من قاعدة البيانات
- **نظام CTA أساسي**: تحديد متى يُسمح بعرض دعوات العمل
- **تخصيص البرومبت**: قوالب مخصصة لكل تاجر
- **تتبع الجلسات**: إدارة محادثات العملاء

## 1. مخطط التدفق العام (Flowchart)

```mermaid
graph TD
    A[تلقي رسالة العميل] --> B[حفظ الرسالة في قاعدة البيانات<br/>Database persistence]
    B --> C[البحث في الأسئلة الشائعة<br/>FAQ search]

    C --> D{هل يوجد إجابة مطابقة؟}
    D -->|نعم| E[إرجاع الإجابة المباشرة<br/>Direct FAQ response]
    D -->|لا| F[بناء البرومبت البسيط<br/>Simple prompt building]

    F --> G[إضافة نتائج الأسئلة الشائعة<br/>Include FAQ results]
    G --> H[تفويض للذكاء الاصطناعي<br/>Send to n8n workflow]

    H --> I[انتظار رد n8n<br/>Wait for AI response]
    I --> J[إرسال الرد للعميل<br/>Send response to customer]

    J --> K[إشعار لوحة التحكم<br/>Admin notification]
    K --> L[تسجيل التحليلات<br/>Analytics logging]

    M[نظام CTA البسيط] --> N[فحص النية العالية<br/>High intent check]
    N --> O{نية عالية؟}
    O -->|نعم| P[السماح بعرض CTA<br/>Allow CTA display]
    O -->|لا| Q[عدم عرض CTA<br/>No CTA allowed]
```

## 2. مخطط التسلسل (Sequence Diagram)

```mermaid
sequenceDiagram
    participant C as Customer
    participant FE as Frontend
    participant WS as WebSocket Gateway
    participant BE as Backend API
    participant DB as Database
    participant VS as Vector Service
    participant N8N as n8n Workflow
    participant AN as Analytics

    Note over C,FE: بدء المحادثة
    C->>FE: إرسال رسالة
    FE->>WS: WebSocket message
    WS->>BE: POST /chat/message

    Note over BE: معالجة الرسالة البسيطة
    BE->>DB: حفظ الرسالة في قاعدة البيانات
    BE->>WS: إشعار لوحة التحكم

    Note over BE,VS: البحث في الأسئلة الشائعة
    BE->>VS: بحث في BotFaqs باستخدام البحث المتجهي
    VS-->>BE: نتائج الأسئلة الشائعة

    alt إجابة موجودة في الأسئلة الشائعة
        Note over BE: إرجاع الإجابة المباشرة
        BE->>BE: توليد رد من الأسئلة الشائعة
        BE->>WS: إرسال الرد
        WS-->>C: عرض الإجابة
    else لا توجد إجابة
        Note over BE,N8N: تفويض للذكاء الاصطناعي
        BE->>BE: بناء برومبت بسيط مع نتائج الأسئلة الشائعة
        BE->>N8N: إرسال الرسالة للمعالجة في n8n
        N8N->>N8N: معالجة الرسالة باستخدام Gemini AI
        N8N-->>BE: رد الذكاء الاصطناعي

        Note over BE: حفظ وإرسال الرد
        BE->>DB: حفظ الرد في المحادثة
        BE->>WS: إرسال الرد للعميل
        WS-->>C: عرض الرد
    end

    Note over AN: تسجيل التحليلات
    BE->>AN: تسجيل تفاعل المستخدم
    AN-->>BE: تأكيد التسجيل
```

## 3. آلة الحالات (State Machine)

```mermaid
stateDiagram-v2
    [*] --> تلقي_الرسالة: استلام رسالة جديدة

    تلقي_الرسالة --> حفظ_الرسالة: حفظ في قاعدة البيانات
    حفظ_الرسالة --> البحث_في_الأسئلة_الشائعة: البحث في BotFaqs

    البحث_في_الأسئلة_الشائعة --> إجابة_موجودة: تم العثور على إجابة
    البحث_في_الأسئلة_الشائعة --> لا_إجابة: لا توجد إجابة مطابقة

    إجابة_موجودة --> إرسال_الإجابة_المباشرة: رد فوري من الأسئلة الشائعة
    لا_إجابة --> بناء_البرومبت: بناء برومبت بسيط

    بناء_البرومبت --> إضافة_نتائج_الأسئلة_الشائعة: تضمين نتائج البحث
    إضافة_نتائج_الأسئلة_الشائعة --> تفويض_للذكاء: إرسال للمعالجة في n8n

    تفويض_للذكاء --> معالجة_n8n: استدعاء workflow
    معالجة_n8n --> استدعاء_Gemini: طلب من AI
    استدعاء_Gemini --> توليد_الرد: الرد النهائي

    توليد_الرد --> حفظ_الرد: حفظ في قاعدة البيانات
    حفظ_الرد --> إرسال_الرد: عرض للعميل

    إرسال_الرد --> إشعار_لوحة_التحكم: إشعار المشرفين
    إشعار_لوحة_التحكم --> تسجيل_التحليلات: مراقبة الأداء

    إرسال_الإجابة_المباشرة --> إشعار_لوحة_التحكم
    تسجيل_التحليلات --> انتهاء_الدورة: اكتمال المعالجة

    انتهاء_الدورة --> تلقي_رسالة_جديدة: دورة جديدة
    تلقي_رسالة_جديدة --> حفظ_الرسالة: بداية الدورة التالية
```

### تعريف الحالات

| الحالة                      | الوصف                           | الإجراءات المسموحة              |
|-----------------------------|---------------------------------|---------------------------------|
| `تلقي_الرسالة`            | استلام رسالة جديدة من العميل    | حفظ الرسالة في قاعدة البيانات   |
| `حفظ_الرسالة`             | حفظ الرسالة في قاعدة البيانات   | إعداد المعالجة التالية         |
| `البحث_في_الأسئلة_الشائعة` | البحث في BotFaqs باستخدام المتجهات | استرجاع الإجابات المطابقة      |
| `إجابة_موجودة`            | تم العثور على إجابة مطابقة      | إرجاع الإجابة المباشرة         |
| `لا_إجابة`                | لا توجد إجابة مطابقة            | بناء برومبت للذكاء الاصطناعي    |
| `بناء_البرومبت`            | بناء برومبت بسيط للذكاء الاصطناعي | تضمين نتائج الأسئلة الشائعة     |
| `إضافة_نتائج_الأسئلة_الشائعة` | إضافة نتائج البحث للبرومبت     | تحسين دقة الرد                 |
| `تفويض_للذكاء`            | إرسال الطلب للمعالجة في n8n     | استدعاء workflow الخارجي       |
| `معالجة_n8n`               | معالجة الرسالة في n8n           | استدعاء Gemini AI              |
| `استدعاء_Gemini`           | طلب الرد من Gemini AI           | توليد الرد بالذكاء الاصطناعي    |
| `توليد_الرد`               | توليد الرد النهائي              | إعداد الرد للإرسال            |
| `حفظ_الرد`                 | حفظ الرد في قاعدة البيانات      | تخزين المحادثة               |
| `إرسال_الرد`               | إرسال الرد للعميل                | عرض الإجابة في الواجهة        |
| `إرسال_الإجابة_المباشرة`  | إرسال إجابة من الأسئلة الشائعة    | رد فوري بدون معالجة AI        |
| `إشعار_لوحة_التحكم`        | إشعار المشرفين بالرسالة الجديدة   | إرسال إشعار للمدراء          |
| `تسجيل_التحليلات`         | تسجيل مقاييس الأداء             | مراقبة استخدام النظام         |
| `انتهاء_الدورة`            | اكتمال دورة معالجة الرسالة      | إعداد للرسالة التالية         |
| `تلقي_رسالة_جديدة`        | بدء دورة جديدة للرسالة التالية   | إعادة العملية للرسالة الجديدة   |

## 4. مخطط سير العمل التجاري (BPMN)

```mermaid
graph TB
    Start([بدء]) --> MessageReceived[تلقي الرسالة]
    MessageReceived --> SaveMessage[حفظ الرسالة في قاعدة البيانات]
    SaveMessage --> SearchFAQs[البحث في الأسئلة الشائعة]

    SearchFAQs --> AnswerFound{إجابة موجودة؟}
    AnswerFound -->|نعم| DirectResponse[إرجاع الإجابة المباشرة]
    AnswerFound -->|لا| BuildPrompt[بناء البرومبت البسيط]

    BuildPrompt --> IncludeFAQResults[إضافة نتائج الأسئلة الشائعة]
    IncludeFAQResults --> SendToN8N[تفويض للذكاء الاصطناعي]

    SendToN8N --> N8NProcessing[معالجة n8n]
    N8NProcessing --> GeminiInvocation[استدعاء Gemini]
    GeminiInvocation --> GenerateResponse[توليد الرد]

    GenerateResponse --> SaveResponse[حفظ الرد في قاعدة البيانات]
    SaveResponse --> SendResponse[إرسال الرد للعميل]

    DirectResponse --> NotifyAdmin[إشعار لوحة التحكم]
    SendResponse --> NotifyAdmin

    NotifyAdmin --> LogAnalytics[تسجيل التحليلات]
    LogAnalytics --> ContinueConversation[متابعة المحادثة]

    ContinueConversation --> NewMessage[رسالة جديدة]
    NewMessage --> SaveMessage

    subgraph "نظام CTA البسيط"
        CheckHighIntent[فحص النية العالية] --> IntentHigh{نية عالية؟}
        IntentHigh -->|نعم| AllowCTA[السماح بعرض CTA]
        IntentHigh -->|لا| BlockCTA[عدم عرض CTA]
    end

    ContinueConversation --> CheckHighIntent
```

## 5. تفاصيل تقنية لكل مرحلة

### 5.1 مرحلة معالجة الرسائل البسيطة

#### 5.1.1 تلقي وحفظ الرسائل

```typescript
async function handleUserMessage(
  sessionId: string,
  text: string,
  metadata?: Record<string, unknown>,
): Promise<{ status: string }> {
  // 1. حفظ الرسالة في قاعدة البيانات
  await this.chats.createOrAppend(sessionId, [
    { role: 'user', text, metadata: metadata ?? {} },
  ]);

  // 2. إشعار لوحة التحكم
  this.events.emit('kleem.admin_new_message', {
    sessionId,
    message: { role: 'user', text },
  });

  return { status: 'queued' as const };
}
```

### 5.2 مرحلة البحث في الأسئلة الشائعة

#### 5.2.1 البحث في BotFaqs

```typescript
async function searchFAQs(query: string, merchantId: string) {
  // البحث في الأسئلة الشائعة المفهرسة في Qdrant
  const faqResults = await vectorService.searchBotFaqs(query, 5);

  return faqResults.map((faq) => ({
    question: faq.question,
    answer: faq.answer,
    similarity: faq.score,
    source: 'faq',
  }));
}
```

### 5.3 مرحلة معالجة الذكاء الاصطناعي

#### 5.3.1 بناء البرومبت البسيط

```typescript
private async buildSystemPrompt(userText: string): Promise<string> {
  const sys = await this.prompts.getActiveSystemPrompt();
  const s = await this.settings.get();

  // 1) حقن المتغيّرات
  let systemPrompt = renderPrompt(sys, {
    LAUNCH_DATE: s.launchDate,
    APPLY_URL: s.applyUrl,
    INTEGRATIONS_NOW: s.integrationsNow,
    TRIAL_OFFER: s.trialOffer,
    YEMEN_NEXT: s.yemenNext,
    YEMEN_POSITIONING: s.yemenPositioning,
  });

  // 2) Knowledge (FAQs) — اختياري لكن مفيد
  try {
    const kn = await this.vector.searchBotFaqs(userText, 5);
    if (kn?.length) {
      const lines = kn
        .map((r) => `- Q: ${r.question}\n  A: ${r.answer}`)
        .join('\n');
      systemPrompt += `\n\n# Knowledge (use if relevant)\n${lines}\n`;
    }
  } catch (e) {
    this.logger.warn(
      '[buildSystemPrompt] failed RAG: ' + (e as Error).message,
    );
  }

  return systemPrompt;
}
```

#### 5.3.2 إرسال الطلب إلى n8n

```typescript
async function sendToN8N(
  sessionId: string,
  text: string,
  systemPrompt: string,
) {
  await this.n8n.post(n8nEndpoint, {
    bot: botName,
    sessionId,
    channel: defaultChannel,
    text,
    prompt: systemPrompt,
    policy: {
      allowCTA: this.cta.allow(sessionId, this.intent.highIntent(text)),
    },
    meta: metadata ?? {},
  });
}
```

### 5.4 مرحلة التقييم البسيط

#### 5.4.1 نظام التقييم الأساسي

```typescript
async function rateMessage(
  sessionId: string,
  messageId: string,
  userId: string,
  rating: 0 | 1,
  feedback?: string,
  merchantId?: string,
) {
  // 1. البحث عن الرسالة وتحديث التقييم
  const ok = await this.messagesRepo.updateMessageRating({
    sessionId,
    messageId,
    userId,
    rating,
    feedback,
    merchantId,
  });

  if (!ok) {
    throw new BadRequestException('لم يتم العثور على الرسالة للتقييم');
  }

  // 2. إذا كان التقييم سلبياً، إنشاء تعليمات من الرد السلبي
  if (rating === 0) {
    const text = await this.messagesRepo.getMessageTextById(sessionId, messageId);
    if (text) {
      await this.geminiService.generateAndSaveInstructionFromBadReply(text, merchantId);
    }
  }

  return { status: 'ok' };
}
```

#### 5.4.2 إنشاء تعليمات من التقييمات السلبية

```typescript
async function generateInstructionFromBadReply(
  badReply: string,
): Promise<string> {
  const prompt = `
    الرد التالي تم تقييمه سلبيًا من قبل العميل: "${badReply}".
    صِغ توجيهًا مختصرًا جدًا (سطر واحد فقط، 15 كلمة أو أقل، لا تشرح السبب)
    لمنع مساعد الذكاء الاصطناعي من تكرار هذا الخطأ.
  `;

  const result = await model.generateContent(prompt);
  return result.response.text().trim();
}
```

### 5.5 مرحلة نظام CTA البسيط

#### 5.5.1 فحص النية العالية

```typescript
highIntent(text: string): boolean {
  const s = this.settings.cached();
  const arr = (s.highIntentKeywords || [])
    .map((k) => k.trim())
    .filter(Boolean);
  if (!arr.length) return false;
  const any = arr
    .map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('|');
  const re = new RegExp(`(${any})`, 'i');
  return re.test(text || '');
}
```

#### 5.5.2 التحكم في عرض CTA

```typescript
allow(sessionId: string, highIntent: boolean): boolean {
  if (highIntent) return true;
  const s = this.settings.cached();
  const n = s.ctaEvery ?? 3;
  const curr = this.counters.get(sessionId) ?? 0;
  const ok = curr % n === 0;
  if (ok) this.counters.set(sessionId, curr + 1);
  return ok;
}
```

## 6. معايير الأمان والحماية

### 6.1 التحقق من الجلسات

```typescript
// التحقق من صحة الجلسة
const session = await sessionStore.get(sessionId);
if (!session || !session.isActive) {
  throw new UnauthorizedException('Invalid session');
}
```

### 6.2 Rate Limiting

- **رسائل المستخدم**: يخضع للـ Rate Limiting العام للـ API
- **طلبات البحث**: يخضع للـ Rate Limiting العام للـ API
- **تقييم الردود**: يخضع للـ Rate Limiting العام للـ API

### 6.3 منع الإساءة

```typescript
// فحص الرسائل المسيئة
function isAbusiveMessage(text: string): boolean {
  const abusivePatterns = ['سب', 'شتم', 'كلمات مسيئة'];
  return abusivePatterns.some((pattern) =>
    text.toLowerCase().includes(pattern),
  );
}
```

## 7. مسارات الخطأ والتعامل معها

### 7.1 أخطاء المعالجة

```javascript
AI_SERVICE_UNAVAILABLE; // خدمة الذكاء الاصطناعي غير متاحة
VECTOR_SEARCH_FAILED; // فشل في البحث في الأسئلة الشائعة
SESSION_NOT_FOUND; // الجلسة غير موجودة
PROMPT_BUILDING_FAILED; // فشل في بناء البرومبت
```

### 7.2 أخطاء التقييم

```javascript
INVALID_RATING_VALUE; // قيمة تقييم غير صحيحة
MESSAGE_NOT_FOUND; // الرسالة غير موجودة للتقييم
SESSION_NOT_AUTHORIZED; // غير مخول للتقييم
GEMINI_API_ERROR; // خطأ في استدعاء Gemini API
```

### 7.3 أخطاء CTA

```javascript
CTA_SERVICE_UNAVAILABLE; // خدمة CTA غير متاحة
INTENT_DETECTION_FAILED; // فشل في كشف النية العالية
```

## 8. خطة الاختبار والتحقق

### 8.1 اختبارات الوحدة

- اختبار حفظ وحذف الرسائل في قاعدة البيانات ✅ (مطبق حالياً)
- اختبار البحث في الأسئلة الشائعة المتجهية ✅ (مطبق حالياً)
- اختبار بناء البرومبت البسيط ✅ (مطبق حالياً)
- اختبار نظام التقييم السلبي ✅ (مطبق حالياً)

### 8.2 اختبارات التكامل

- اختبار التكامل مع n8n workflow ✅ (مطبق حالياً)
- اختبار التكامل مع Gemini AI ✅ (مطبق حالياً)
- اختبار البحث المتجهي في BotFaqs ✅ (مطبق حالياً)
- اختبار نظام التحكم في عرض CTA ✅ (مطبق حالياً)
- اختبار معالجة الأخطاء ✅ (مطبق حالياً)

### 8.3 اختبارات الأداء

- اختبار زمن الاستجابة للرسائل ✅ (مطبق حالياً)
- اختبار البحث في قواعد البيانات الكبيرة ✅ (مطبق حالياً)
- اختبار استهلاك الذاكرة والمعالج ✅ (مطبق حالياً)

---

_تم إنشاء هذا التوثيق بواسطة نظام كليم لإدارة المتاجر الذكية_

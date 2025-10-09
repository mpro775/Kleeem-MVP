# ورك فلو ودجة الدردشة - نظام كليم الشامل

## نظرة عامة على النظام

نظام كليم يدعم ودجة دردشة متطورة قابلة للتخصيص الكامل مع إمكانيات متقدمة:

- **أوضاع التضمين**: فقاعة، iframe، شريط، محادثة كاملة
- **تخصيص مرئي**: ألوان، خطوط، ثيمات متعددة
- **إدارة الجلسات**: تتبع المحادثات والمستخدمين
- **نظام التحقق**: JWT tokens مع إدارة الجلسات
- **إشعارات فورية**: WebSocket للرسائل المباشرة
- **تحليلات متقدمة**: تتبع المستخدمين والمحادثات

## 1. مخطط التدفق العام (Flowchart)

```mermaid
graph TD
    A[تحميل الودجة] --> B[التحقق من الصلاحيات<br/>JWT token validation]
    B --> C[إنشاء جلسة جديدة<br/>sessionId فريد]
    C --> D[ربط الجلسة بالتاجر<br/>merchantId من الودجة]

    D --> E[تحميل إعدادات الودجة<br/>الثيم والسلوك]
    E --> F[تطبيق التخصيصات<br/>CSS والألوان]
    F --> G[عرض واجهة الدردشة<br/>للمستخدم]

    H[إرسال رسالة] --> I[التحقق من الجلسة<br/>sessionId صالح]
    I --> J[حفظ الرسالة<br/>في قاعدة البيانات]
    J --> K[تحديد المسار<br/>بوت/موظف]

    K --> L{مسار الرسالة}
    L -->|بوت مفعل| M[تفويض للذكاء الاصطناعي<br/>n8n workflow]
    L -->|بوت معطل| N[نقل للموظف<br/>وضع الانتظار]
    L -->|رسالة محددة| O[رد فوري<br/>طلب/منتج]

    M --> P[انتظار رد n8n<br/>معالجة الذكاء الاصطناعي]
    P --> Q[تحليل جودة الرد<br/>فحص الذكاء الاصطناعي]
    Q --> R[إرسال الرد<br/>للمستخدم]

    N --> S[إشعار الموظف<br/>عبر WebSocket]
    S --> T[انتظار رد الموظف<br/>من لوحة التحكم]
    T --> U[إرسال رد الموظف<br/>للمستخدم]

    R --> V[حفظ الرد<br/>في الجلسة]
    U --> V
    V --> W[إشعار الواجهة<br/>تحديث فوري]
    W --> X[تسجيل التحليلات<br/>مقاييس الأداء]
```

## 2. مخطط التسلسل (Sequence Diagram)

```mermaid
sequenceDiagram
    participant W as Website
    participant CW as Chat Widget
    participant WS as WebSocket Gateway
    participant DB as Database
    participant AI as AI Service
    participant N8N as n8n Workflow
    participant AN as Analytics

    Note over W,CW: تحميل الودجة في الموقع
    W->>CW: تحميل script الودجة
    CW->>WS: WebSocket connection
    WS-->>CW: تأكيد الاتصال

    Note over CW: إنشاء جلسة جديدة
    CW->>CW: توليد sessionId فريد
    CW->>DB: إنشاء جلسة جديدة
    DB-->>CW: تأكيد الجلسة

    Note over CW,DB: تحميل إعدادات الودجة
    CW->>DB: طلب إعدادات الودجة
    DB-->>CW: إعدادات التخصيص
    CW->>CW: تطبيق الثيم والألوان

    Note over CW: عرض الودجة للمستخدم
    CW-->>W: عرض واجهة الدردشة

    Note over CW: إرسال رسالة من المستخدم
    W->>CW: إدخال رسالة المستخدم
    CW->>CW: التحقق من الجلسة
    CW->>DB: حفظ الرسالة
    CW->>WS: إرسال للواجهة

    Note over CW: تحديد مسار المعالجة
    CW->>CW: تحليل نوع الرسالة
    alt رسالة محددة (طلب/منتج)
        CW->>CW: توليد رد فوري
        CW->>DB: حفظ الرد
        CW->>W: عرض الرد للمستخدم
    else بوت مفعل
        Note over CW,AI: تفويض للذكاء الاصطناعي
        CW->>AI: إرسال للمعالجة
        AI->>N8N: استدعاء n8n workflow
        N8N->>DB: استرجاع المحادثة
        N8N-->>AI: رد الذكاء الاصطناعي
        AI-->>CW: الرد النهائي
        CW->>DB: حفظ رد البوت
        CW->>W: عرض الرد للمستخدم
    else نقل للموظف
        CW->>DB: تعيين حالة الانتظار
        CW->>WS: إشعار الموظفين
    end

    Note over AN: تسجيل التحليلات
    CW->>AN: تسجيل تفاعل المستخدم
    AN-->>CW: تأكيد التسجيل
```

## 3. آلة الحالات (State Machine)

```mermaid
stateDiagram-v2
    [*] --> تحميل_الودجة: بدء التحميل

    تحميل_الودجة --> التحقق_من_التوكن: فحص JWT
    التحقق_من_التوكن --> خطأ_توكن: توكن غير صحيح
    التحقق_من_التوكن --> إنشاء_جلسة: توكن صحيح

    إنشاء_جلسة --> ربط_بالتاجر: تحديد merchantId
    ربط_بالتاجر --> تحميل_الإعدادات: جلب تخصيصات الودجة
    تحميل_الإعدادات --> تطبيق_التخصيص: CSS والثيم
    تطبيق_التخصيص --> عرض_الودجة: جاهز للاستخدام

    عرض_الودجة --> إرسال_رسالة: مستخدم يكتب رسالة
    إرسال_رسالة --> فحص_الجلسة: التحقق من الجلسة
    فحص_الجلسة --> حفظ_الرسالة: في قاعدة البيانات
    حفظ_الرسالة --> تحديد_المسار: نوع المعالجة

    تحديد_المسار --> رسالة_محددة: طلب/منتج
    تحديد_المسار --> استفسار_عادي: سؤال عام
    تحديد_المسار --> نقل_للموظف: يحتاج تدخل بشري

    رسالة_محددة --> إرسال_رد_فوري: رد تلقائي
    إرسال_رد_فوري --> حفظ_الرد: في الجلسة

    استفسار_عادي --> فحص_البوت: مفعل أم لا؟
    فحص_البوت --> بوت_مفعل: نعم
    فحص_البوت --> بوت_معطل: لا

    بوت_مفعل --> تفويض_للذكاء: إرسال للمعالجة
    تفويض_للذكاء --> انتظار_الرد: معالجة n8n
    انتظار_الرد --> تحليل_الجودة: فحص الرد
    تحليل_الجودة --> رد_جيد: يمكن إرساله
    تحليل_الجودة --> رد_سيء: يحتاج تحسين
    رد_جيد --> إرسال_الرد: للمستخدم
    رد_سيء --> تسجيل_مشكلة: للتحسين

    بوت_معطل --> نقل_للموظف
    نقل_للموظف --> إشعار_الموظف: عبر WebSocket
    إشعار_الموظف --> انتظار_الموظف: يرد من الواجهة
    انتظار_الموظف --> إرسال_رد_الموظف: للمستخدم

    إرسال_الرد --> حفظ_الرد
    إرسال_رد_الموظف --> حفظ_الرد
    رد_سيء --> حفظ_الرد

    حفظ_الرد --> إشعار_الواجهة: تحديث فوري
    إشعار_الواجهة --> تسجيل_التحليلات: مقاييس الأداء
    تسجيل_التحليلات --> استمرار_العمل: الودجة نشطة

    خطأ_توكن --> [*]: إنهاء
    رد_سيء --> تسجيل_مشكلة
    تسجيل_مشكلة --> استمرار_العمل
```

### تعريف الحالات

| الحالة             | الوصف                         | الإجراءات المسموحة       |
| ------------------ | ----------------------------- | ------------------------ |
| `تحميل_الودجة`     | بدء تحميل الودجة في الموقع    | التحقق من التوكن         |
| `التحقق_من_التوكن` | فحص صحة JWT token             | قبول أو رفض الاتصال      |
| `إنشاء_جلسة`       | إنشاء جلسة جديدة للمستخدم     | توليد sessionId فريد     |
| `ربط_بالتاجر`      | ربط الجلسة بالتاجر المحدد     | تحديد merchantId         |
| `تحميل_الإعدادات`  | جلب تخصيصات الودجة            | استرجاع الثيم والإعدادات |
| `تطبيق_التخصيص`    | تطبيق CSS والألوان            | إعداد العرض المرئي       |
| `عرض_الودجة`       | عرض الودجة للمستخدم           | بدء التفاعل              |
| `إرسال_رسالة`      | إرسال رسالة من المستخدم       | معالجة المدخلات          |
| `فحص_الجلسة`       | التحقق من صحة الجلسة          | التأكد من الاتصال        |
| `حفظ_الرسالة`      | حفظ الرسالة في قاعدة البيانات | إدراج الرسالة            |
| `تحديد_المسار`     | تحديد كيفية معالجة الرسالة    | تصنيف الرسالة            |
| `رسالة_محددة`      | رسالة تحتوي على طلب محدد      | رد فوري                  |
| `استفسار_عادي`     | سؤال عام أو استفسار           | معالجة ذكية              |
| `نقل_للموظف`       | يحتاج تدخل موظف               | إشعار الموظفين           |
| `فحص_البوت`        | التحقق من تفعيل البوت         | قرار التوجيه             |
| `بوت_مفعل`         | البوت يمكنه الرد              | تفويض للذكاء الاصطناعي   |
| `بوت_معطل`         | البوت غير مفعل                | نقل للموظف               |
| `تفويض_للذكاء`     | إرسال للمعالجة الذكية         | استدعاء n8n              |
| `انتظار_الرد`      | معالجة الذكاء الاصطناعي       | انتظار النتيجة           |
| `تحليل_الجودة`     | فحص جودة الرد                 | تقييم النتيجة            |
| `إرسال_الرد`       | إرسال الرد للمستخدم           | عبر WebSocket            |
| `إشعار_الموظف`     | إخطار الموظفين                | عبر WebSocket            |
| `انتظار_الموظف`    | انتظار رد الموظف              | من الواجهة               |
| `إرسال_رد_الموظف`  | إرسال رد الموظف               | للمستخدم                 |
| `حفظ_الرد`         | حفظ الرد في الجلسة            | تحديث قاعدة البيانات     |
| `إشعار_الواجهة`    | إشعار الواجهة بالتحديث        | تحديث فوري               |
| `تسجيل_التحليلات`  | تسجيل المقاييس والإحصائيات    | مراقبة الأداء            |
| `استمرار_العمل`    | الودجة تعمل بشكل طبيعي        | جميع العمليات            |

## 4. مخطط سير العمل التجاري (BPMN)

```mermaid
graph TB
    Start([بدء]) --> WidgetLoad[تحميل الودجة]
    WidgetLoad --> TokenValidation[التحقق من التوكن]

    TokenValidation --> TokenValid{التوكن صحيح؟}
    TokenValid -->|لا| TokenError[خطأ في التوكن]
    TokenValid -->|نعم| SessionCreation[إنشاء جلسة]

    SessionCreation --> MerchantBinding[ربط بالتاجر]
    MerchantBinding --> LoadSettings[تحميل الإعدادات]
    LoadSettings --> ApplyCustomization[تطبيق التخصيص]
    ApplyCustomization --> ShowWidget[عرض الودجة]

    ShowWidget --> MessageSend[إرسال رسالة]
    MessageSend --> SessionCheck[فحص الجلسة]
    SessionCheck --> SaveMessage[حفظ الرسالة]
    SaveMessage --> RouteMessage[تحديد المسار]

    RouteMessage --> MessageType{نوع الرسالة}
    MessageType -->|محدد| QuickReply[رد فوري]
    MessageType -->|عادي| BotCheck[فحص البوت]
    MessageType -->|موظف| AgentTransfer[نقل للموظف]

    QuickReply --> SendQuickReply[إرسال الرد الفوري]
    SendQuickReply --> SaveReply[حفظ الرد]

    BotCheck --> BotEnabled{البوت مفعل؟}
    BotEnabled -->|نعم| ForwardToAI[تفويض للذكاء]
    BotEnabled -->|لا| AgentTransfer

    ForwardToAI --> WaitAIResponse[انتظار رد n8n]
    WaitAIResponse --> AnalyzeQuality[تحليل الجودة]
    AnalyzeQuality --> ResponseQuality{الجودة؟}

    ResponseQuality -->|جيدة| SendToUser[إرسال للمستخدم]
    ResponseQuality -->|سيئة| LogIssue[تسجيل المشكلة]

    AgentTransfer --> NotifyAgents[إشعار الموظفين]
    NotifyAgents --> WaitAgentReply[انتظار رد الموظف]

    SendToUser --> SaveReply
    LogIssue --> SaveReply
    WaitAgentReply --> AgentReplies[الموظف يرد]
    AgentReplies --> SendAgentReply[إرسال رد الموظف]

    SendAgentReply --> SaveReply
    SaveReply --> NotifyFrontend[إشعار الواجهة]
    NotifyFrontend --> LogAnalytics[تسجيل التحليلات]

    LogAnalytics --> ContinueOperation[استمرار العمل]

    TokenError --> End([نهاية])
    LogIssue --> ContinueOperation
    ContinueOperation --> End
```

## 5. تفاصيل تقنية لكل مرحلة

### 5.1 مرحلة التحميل والإعداد

#### 5.1.1 تحميل الودجة

```html
<!-- تضمين الودجة في الموقع -->
<script src="https://cdn.kaleem-ai.com/widget.js"></script>
<script>
  window.KaleemChatWidget.init({
    widgetSlug: 'chat_abc123',
    theme: 'default',
  });
</script>
```

#### 5.1.2 إنشاء الجلسة

```typescript
// إنشاء sessionId فريد
const sessionId = generateSessionId();
const session = await sessionsRepo.create({
  sessionId,
  merchantId,
  userAgent: req.headers['user-agent'],
  ip: req.ip,
  status: 'active',
});
```

#### 5.1.3 تحميل إعدادات الودجة

```typescript
// جلب إعدادات الودجة من قاعدة البيانات
const settings = await chatWidgetService.getSettings(merchantId);

// تطبيق التخصيصات
widget.applyTheme(settings.theme);
widget.setBotName(settings.botName);
widget.setWelcomeMessage(settings.welcomeMessage);
```

### 5.2 مرحلة معالجة الرسائل

#### 5.2.1 تحديد مسار الرسالة

```typescript
async function routeMessage(message: IncomingMessage) {
  // تحليل النية
  const intent = analyzeIntent(message.text);

  switch (intent.type) {
    case 'order_inquiry':
      return await handleOrderInquiry(message);
    case 'product_inquiry':
      return await handleProductInquiry(message);
    case 'general':
      return await handleGeneralInquiry(message);
    default:
      return await handleUnknownMessage(message);
  }
}
```

#### 5.2.2 تفويض للذكاء الاصطناعي

```typescript
async function forwardToAI(message: IncomingMessage) {
  // إرسال لـ n8n workflow
  await n8nService.forward({
    merchantId: message.merchantId,
    sessionId: message.sessionId,
    text: message.text,
    channel: 'webchat',
  });

  // انتظار الرد (timeout بعد 30 ثانية)
  const response = await waitForAIResponse(message.sessionId, 30000);

  return response;
}
```

#### 5.2.3 نقل للموظف

```typescript
async function transferToAgent(message: IncomingMessage) {
  // تحديث حالة الجلسة
  await sessionsRepo.update(message.sessionId, {
    status: 'waiting_for_agent',
    assignedAt: new Date(),
  });

  // إشعار الموظفين
  chatGateway.sendToAgents('new_customer_message', {
    sessionId: message.sessionId,
    message: message.text,
    customerInfo: message.metadata,
  });
}
```

### 5.3 مرحلة الإشعارات والمراقبة

#### 5.3.1 إشعارات WebSocket

```typescript
// إرسال رسالة للمستخدم
chatGateway.sendToSession(sessionId, {
  type: 'message',
  role: 'bot',
  text: response,
  timestamp: new Date(),
});

// إشعار المشرفين
chatGateway.sendToAdmins('new_session', {
  sessionId,
  merchantId,
  status: 'active',
});
```

#### 5.3.2 تتبع المقاييس

```typescript
// تسجيل تفاعل المستخدم
await analytics.track({
  event: 'widget_message_sent',
  sessionId,
  merchantId,
  messageType: 'user_input',
  timestamp: new Date(),
});

// تتبع الأداء
await metrics.record({
  metric: 'widget_response_time',
  value: Date.now() - startTime,
  tags: { merchantId, sessionId },
});
```

## 6. معايير الأمان والحماية

### 6.1 التحقق من الهوية

```typescript
// التحقق من JWT token
const decoded = jwtService.verify(token, {
  secret: process.env.JWT_SECRET,
  issuer: process.env.JWT_ISSUER,
  audience: process.env.JWT_AUDIENCE,
});

// فحص القائمة السوداء
const isBlacklisted = await cacheManager.get(`bl:${decoded.jti}`);
if (isBlacklisted) {
  throw new UnauthorizedException('Token blacklisted');
}
```

### 6.2 Rate Limiting

- **رسائل المستخدم**: 20 رسالة/دقيقة
- **اتصالات WebSocket**: 5 اتصالات/دقيقة لكل IP
- **طلبات الإعدادات**: 100 طلب/دقيقة

### 6.3 منع البريد المزعج

```typescript
// فحص الرسائل المكررة
const recentMessages = await messagesRepo.findRecent(sessionId, 60); // آخر دقيقة
if (recentMessages.length > 10) {
  // حظر مؤقت
  await sessionsRepo.update(sessionId, { status: 'blocked' });
}
```

## 7. مسارات الخطأ والتعامل معها

### 7.1 أخطاء التحميل

```javascript
WIDGET_LOAD_FAILED; // فشل في تحميل الودجة
INVALID_TOKEN; // توكن غير صحيح
MERCHANT_NOT_FOUND; // التاجر غير موجود
WIDGET_DISABLED; // الودجة معطلة
```

### 7.2 أخطاء المعالجة

```javascript
AI_PROCESSING_FAILED; // فشل في معالجة n8n
SESSION_EXPIRED; // انتهت صلاحية الجلسة
RATE_LIMIT_EXCEEDED; // تجاوز حد الرسائل
INVALID_MESSAGE_FORMAT; // تنسيق رسالة خاطئ
```

### 7.3 أخطاء الإرسال

```javascript
WEBSOCKET_DISCONNECTED; // انقطع اتصال WebSocket
MESSAGE_SEND_FAILED; // فشل في إرسال الرسالة
AGENT_UNAVAILABLE; // لا يوجد موظف متاح
```

## 8. خطة الاختبار والتحقق

### 8.1 اختبارات الوحدة

- اختبار تحميل الودجة بمختلف الإعدادات
- اختبار إنشاء الجلسات والتحقق من التوكن
- اختبار معالجة الرسائل المختلفة
- اختبار إشعارات WebSocket

### 8.2 اختبارات التكامل

- اختبار التكامل مع n8n workflow
- اختبار تكامل مع نظام الرسائل
- اختبار تكامل مع التحليلات
- اختبار معالجة الأخطاء

### 8.3 اختبارات الأداء

- اختبار الحمل على WebSocket connections
- اختبار زمن الاستجابة للرسائل
- اختبار استهلاك الذاكرة
- اختبار معدل الرسائل المعالجة

---

_تم إنشاء هذا التوثيق بواسطة نظام كليم لإدارة المتاجر الذكية_

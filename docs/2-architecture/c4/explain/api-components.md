# C4 المستوى 3 — مكونات API
*آخر تحديث: 2025-09-27 19:00*

> **مخطط مكونات C4** — يعرض وحدات NestJS والحراس وقطاعات الاهتمام المشتركة التي تؤثر على الصحة والأمان والأداء. هذا هو أعمق مستوى في نموذج C4 الذي يركز على التفاصيل الداخلية للنظام.

---

## 🎯 الغرض والنطاق

**الغرض الرئيسي:** كشف وحدات API وقطاعات الاهتمام المشتركة (cross-cutting concerns) التي تؤثر على:
- ✅ **الصحة** — منع الأخطاء وضمان الاتساق
- 🔒 **الأمان** — حماية البيانات والوصول
- ⚡ **الأداء** — تحسين السرعة والكفاءة
- 📊 **المراقبة** — تتبع السلوك والمشاكل

**النطاق:** يركز هذا المخطط على **العمارة الداخلية** لخادم API وكيفية تفاعل المكونات مع بعضها البعض. يجيب على:
- ما هي الوحدات الرئيسية في النظام؟
- كيف تتفاعل مع بعضها البعض؟
- ما هي آليات الحماية والمراقبة؟

**الجمهور المستهدف:**
- 👨‍💻 **مهندسو الخلفية** — فهم البنية الداخلية ونقاط التكامل
- 🔒 **مهندسو الأمان** — مراجعة آليات الحماية والمصادقة
- 📊 **مهندسو DevOps** — مراقبة الأداء والأخطاء
- 🔍 **المراجعون** — تقييم جودة الكود والعمارة

---

## 🏗️ بنية المخطط

### ملف المصدر
- **الموقع:** [`kaleem-api-components.mmd`](./kaleem-api-components.mmd)
- **التنسيق:** مخطط Mermaid (TD - من أعلى لأسفل)
- **التوليد:** يتم تصييره تلقائياً عبر CI/CD

### التنظيم البصري

يتم تنظيم المخطط في مجموعات منطقية:

1. **🔒 API Core & Security** — الحراس والخدمات الأساسية
2. **🏢 Business Modules** — وحدات الأعمال الرئيسية
3. **💾 Data & Storage** — قواعد البيانات والتخزين
4. **🌐 External Systems** — الأنظمة الخارجية
5. **🔄 Request Processing Pipeline** — مسار معالجة الطلبات

---

## 🔒 API Core & Security

### 🛡️ Guards & Validation
**آليات الحماية والتحقق من الطلبات:**

| الحارس | الغرض | الأهمية |
|---------|--------|---------|
| **JWT Auth Guard** | التحقق من صحة رموز الوصول | 🔴 حرجة |
| **Throttler Guard** | تحديد المعدل لكل مستأجر | 🟡 متوسطة |
| **Roles Guard** | التحقق من الصلاحيات (RBAC) | 🟡 متوسطة |
| **Idempotency Guard** | منع التكرار في العمليات الحساسة | 🟡 متوسطة |
| **Service Token Guard** | مصادقة الخدمات الداخلية | 🔵 منخفضة |
| **Webhook Signature Guard** | التحقق من تواقيع الـ Webhooks | 🔴 حرجة |

### ⚡ Interceptors & Middleware
**معالجات الطلبات والاستجابات:**

| المعترض | الوظيفة | التأثير |
|----------|---------|---------|
| **HTTP Metrics Interceptor** | تتبع المقاييس والأداء | 📊 مراقبة |
| **Performance Tracking** | مراقبة زمن الاستجابة | ⚡ أداء |
| **Error Logging Interceptor** | تسجيل الأخطاء والاستثناءات | 🔍 تصحيح |
| **Validation Pipe** | التحقق من صحة البيانات (DTO) | ✅ صحة |

### 🔧 Core Services
**الخدمات الأساسية المشتركة:**

- **Configuration Service** — إدارة متغيرات البيئة والإعدادات
- **Cache Service** — إدارة التخزين المؤقت (L1 + L2)
- **Metrics Service** — تكامل مع Prometheus
- **Event Emitter** — نشر الأحداث في النطاق

---

## 🏢 Business Modules

### 👤 Identity & Access
**إدارة الهوية والوصول:**

- **Authentication Module** — نظام JWT، OAuth، إدارة الجلسات
- **Users Module** — إدارة المستخدمين والملفات الشخصية
- **Merchants Module** — إدارة متعددة المستأجرين

### 🛒 E-commerce Core
**نواة التجارة الإلكترونية:**

- **Products Module** — كتالوج المنتجات، المخزون، البحث الدلالي
- **Categories Module** — تنظيم المنتجات في شجرة فئات
- **Orders Module** — دورة حياة الطلبات ومعالجة المدفوعات
- **Offers Module** — العروض الترويجية والخصومات
- **Plans Module** — إدارة الاشتراكات والخطط

### 💬 Communication
**الاتصال والتواصل:**

- **Channels Module** — تكامل متعدد المنصات (Telegram، WhatsApp، إلخ)
- **Messaging Module** — معالجة الرسائل والمحادثات
- **Chat Module** — المحادثات في الوقت الفعلي
- **Notifications Module** — الإشعارات والبريد الإلكتروني

### 🤖 AI & Intelligence
**الذكاء الاصطناعي والتعلم الآلي:**

- **AI Module** — تكامل مع نماذج اللغة (LLM)
- **Vector Module** — البحث الدلالي والمتجهات
- **Knowledge Module** — قاعدة المعرفة والأسئلة الشائعة
- **Instructions Module** — سلوك وتعليمات البوت

### 🔗 Integrations
**التكاملات الخارجية:**

- **Integrations Module** — مزامنة مع منصات التجارة الإلكترونية
- **Webhooks Module** — معالجة الأحداث الخارجية
- **n8n Workflow Module** — أتمتة العمليات التجارية

### 📄 Content Management
**إدارة المحتوى:**

- **Documents Module** — معالجة الملفات والمستندات
- **Media Module** — إدارة الصور والفيديوهات
- **FAQ Module** — إدارة الأسئلة الشائعة

### 📊 Analytics & Reporting
**التحليلات والتقارير:**

- **Analytics Module** — ذكاء الأعمال والتحليلات
- **Leads Module** — اكتساب العملاء المحتملين
- **Usage Module** — تحليل استخدام المنصة

---

## 💾 Data & Storage

| قاعدة البيانات | الغرض | الأهمية |
|----------------|--------|---------|
| **MongoDB** | المخزن الرئيسي للمستندات | 🔴 حرجة |
| **Redis** | التخزين المؤقت والجلسات | 🟡 متوسطة |
| **Qdrant** | البحث الدلالي والمتجهات | 🟡 متوسطة |
| **MinIO** | تخزين الملفات والوسائط | 🔵 منخفضة |

---

## 🌐 External Systems

### 🤖 AI Services
- **Google Gemini API** — نموذج اللغة الأساسي
- **OpenAI API** — نماذج بديلة للذكاء الاصطناعي

### 📱 Communication Platforms
- **Telegram Bot API** — منصة المراسلة
- **WhatsApp Cloud API** — رسائل الأعمال
- **Instagram API** — التجارة الاجتماعية
- **Facebook Messenger** — الرسائل المباشرة

### 🛒 E-commerce Platforms
- **Salla API** — منصة التجارة السعودية
- **Zid API** — منصة الشرق الأوسط
- **Shopify API** — منصة التجارة العالمية
- **WooCommerce API** — متاجر ووردبريس

---

## 🔄 Request Processing Pipeline

### مسار معالجة الطلبات (من اليسار إلى اليمين):

```
Client → HTTP Request → JWT Auth Guard → Throttler Guard → Roles Guard
    ↓
Idempotency Guard → HTTP Metrics → Error Logging → Validation Pipe → Business Modules
```

### آلية عمل كل خطوة:

1. **JWT Auth Guard** — يتحقق من صحة رمز الوصول
2. **Throttler Guard** — يحدد المعدل حسب المستأجر
3. **Roles Guard** — يتحقق من الصلاحيات (RBAC)
4. **Idempotency Guard** — يمنع التكرار في العمليات الحساسة
5. **HTTP Metrics Interceptor** — يسجل المقاييس
6. **Error Logging Interceptor** — يسجل الأخطاء
7. **Validation Pipe** — يتحقق من صحة البيانات

---

## 📊 مصفوفة التبعيات

### Business Modules → Data Storage

| الوحدة | MongoDB | Redis | Qdrant | MinIO |
|---------|---------|-------|--------|-------|
| **Auth** | ❌ | ✅ (جلسات) | ❌ | ❌ |
| **Merchants** | ✅ | ❌ | ❌ | ❌ |
| **Products** | ✅ | ❌ | ✅ | ✅ |
| **Orders** | ✅ | ❌ | ❌ | ❌ |
| **Chat** | ✅ | ✅ (Sockets) | ❌ | ❌ |
| **Vector** | ❌ | ❌ | ✅ | ❌ |
| **Analytics** | ✅ | ❌ | ❌ | ❌ |

### External Integrations

| الوحدة | n8n | Gemini | Webhook Guard |
|---------|-----|--------|---------------|
| **Webhooks** | ❌ | ❌ | ✅ |
| **Integrations** | ❌ | ❌ | ❌ |
| **AI** | ❌ | ✅ | ❌ |
| **n8n Workflow** | ✅ | ❌ | ❌ |

---

## 🔍 المسارات الساخنة (Hot Paths)

### مسار البحث عن المنتجات:
```
User Query → Products Module → Vector Search (Qdrant)
    ↓
Cache Check (Redis) → Product Catalog (MongoDB)
    ↓
Image/Media Retrieval (MinIO) → Response
```

### مسار إنشاء الطلب:
```
Order Request → Orders Module → Idempotency Check
    ↓
Payment Processing → Outbox Event → Background Worker
    ↓
Order Confirmation → Notification → User
```

### مسار معالجة Webhook:
```
External Webhook → Webhook Signature Guard → Rate Limiting
    ↓
Validation → Processing → Queue (Redis) → Worker
    ↓
Response → Channel Confirmation
```

---

## 🛡️ Security Considerations

### Authentication & Authorization
- **JWT Strategy** — رموز قصيرة الأمد + Refresh tokens
- **Redis Blacklist** — إبطال الرموز المسروقة
- **RBAC** — صلاحيات مبنية على الأدوار
- **Service Tokens** — مصادقة الخدمات الداخلية

### Data Protection
- **Webhook Signature Verification** — منع الهجمات
- **Input Validation** — منع الحقن والثغرات
- **Rate Limiting** — حماية من الهجمات الموزعة
- **Encryption at Rest** — تشفير البيانات الحساسة

---

## ⚡ Performance Optimizations

### Caching Strategy
- **L1 Cache** — ذاكرة العملية المحلية
- **L2 Cache** — Redis للتخزين الموزع
- **Cache Warming** — تحديث تلقائي للمفاتيح الساخنة
- **TTL Policies** — إدارة دورة حياة البيانات

### Database Optimizations
- **Indexing Strategy** — فهارس مركبة للاستعلامات الشائعة
- **Read Replicas** — توزيع القراءة للأداء
- **Connection Pooling** — إدارة الاتصالات بكفاءة

---

## 🔧 Technical Implementation Details

### NestJS Architecture Patterns
- **Modules** — تنظيم منطقي للوحدات
- **Providers** — حقن التبعيات
- **Controllers** — معالجة الطلبات HTTP
- **Services** — منطق الأعمال
- **Repositories** — طبقة الوصول للبيانات
- **DTOs** — نقل البيانات المؤكد

### Cross-Cutting Concerns
- **Exception Handling** — معالجة الأخطاء الموحدة
- **Logging** — تتبع منظم للعمليات
- **Metrics** — جمع البيانات للمراقبة
- **Tracing** — تتبع المعاملات الموزعة

---

## 🚀 Operational Monitoring

### Key Metrics to Monitor
- **Request Latency** — زمن استجابة الطلبات
- **Error Rates** — معدل الأخطاء حسب النوع
- **Cache Hit Ratio** — كفاءة التخزين المؤقت
- **Database Performance** — أداء قواعد البيانات
- **Queue Length** — طول قوائم الانتظار

### Alerting Rules
- **High Error Rate** (>5%) — مشاكل في الخدمة
- **Slow Response Time** (>2s) — مشاكل في الأداء
- **Cache Miss Rate** (>60%) — مشاكل في التخزين المؤقت
- **Queue Backlog** (>100) — مشاكل في المعالجة

---

## 🔗 Related Documentation

### Predecessors
- **[Container Diagram](./container.md)** — حاويات النظام وعلى علاقاتها
- **[Context Diagram](./context.md)** — سياق النظام والتبعيات الخارجية

### Successors
- **[Deployment Diagram](./deployment.md)** — طبولوجيا البنية التحتية
- **[Tech Stack Rationale](../4-Tech%20Stack%20Rationale/tech-stack-rationale.md)** — تبرير اختيار التقنيات

### External References
- **[NestJS Documentation](https://docs.nestjs.com/)** — دليل إطار العمل
- **[Mermaid Documentation](https://mermaid.js.org/)** — مرجع صيغة المخطط
- **[Security Best Practices](https://owasp.org/www-project-top-ten/)** — ممارسات الأمان

---

## 📝 Maintenance & Updates

### Update Triggers
- إضافة وحدة جديدة أو تغيير في البنية
- تحديث آليات الحماية أو المراقبة
- تغييرات في التكاملات الخارجية
- تحسينات في الأداء أو الأمان

### Review Cycle
- **أسبوعي:** فحص الدقة التقنية
- **شهري:** مراجعة الأمان والحماية
- **ربع سنوي:** تقييم الأداء والتوسع
- **سنوي:** مراجعة العمارة الكاملة

### Version History
- **v1.0 (2025-09-27):** مخطط مكونات C4 محترف مع تفاصيل شاملة
- **v0.1 (2025-09-27):** هيكل أساسي للوحدات والحراس

---

> **الخطوات التالية:** بعد فهم مكونات API، انتقل إلى **[Deployment Diagram](./deployment.md)** لتخطيط البنية التحتية، أو **[Tech Stack Rationale](../4-Tech%20Stack%20Rationale/tech-stack-rationale.md)** لتبرير اختيار التقنيات.

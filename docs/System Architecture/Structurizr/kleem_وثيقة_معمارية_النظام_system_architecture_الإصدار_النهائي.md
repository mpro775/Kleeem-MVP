# Kleem — وثيقة معمارية النظام (System Architecture Document)

**الإصدار:** 1.0  
**التاريخ:** 15 أغسطس 2025  
**المالك:** فريق Kleem (المنتج والهندسة والجودة)

---

## 1) خلاصة التنفيذ (Executive Summary)
منصة **Kleem** تعتمد معمارية معيارية (Modular/Micro-lean) تُقسِّم المسؤوليات: واجهات أمامية (لوحات + ودجت + متجر مصغّر)، طبقة API (NestJS)، طبقة سير العمل الذكي (n8n)، وخدمات مساعدة (Embeddings/Extractor)، مع تخزين مُركّب (MongoDB + Redis + Qdrant + MinIO) ورسائل (RabbitMQ). الهدف: **Omnichannel** موحّد، **Intent‑first** قبل استدعاء الأدوات، و"**الحقيقة قبل التوليد**" عند إجابة أسئلة المنتجات.

---

## 2) مكوّنات C4 وتقسيم ملفات DSL
تمَّ فصل الـ C4 DSL إلى ملفات صغيرة قابلة للصيانة:
- **00‑settings.dsl**: إعدادات عامة (المعرّفات/الخصائص).
- **01‑context‑people.dsl**: الأشخاص والأنظمة الخارجية (Context L1).
- **02‑kaleem‑containers.dsl**: حاويات Kleem (Containers L2).
- **03‑api‑components.dsl**: مكوّنات باك‑إند API (Components L3).
- **04‑n8n‑components.dsl**: مكوّنات/عُقَد n8n (Components L3).
- **10‑relations.dsl**: العلاقات بين العناصر.
- **20‑views.dsl**: تعاريف الـ Views (Context/Containers/Components).
- **30‑styles.dsl**: النمط اللوني والأشكال.
- **40‑deployment.dsl**: نموذج النشر (docker‑compose) + View مخصص.
- **workspace.dsl**: الملف الجامع الذي **!include** كل ما سبق.

> يُنصح بفتح الحزمة عبر Structurizr Lite، إذ أنَّ الـ Views مُعرّفة ومرتّبة مسبقًا.

---

## 3) C4 — المستوى 1: السياق (System Context)
**أشخاص:** التاجر/مدير المتجر، المشغّل (الدعم)، العميل النهائي، والأدمن العام للمنصة.  
**أنظمة خارجية:** قنوات (WhatsApp Business, Telegram, WebChat على موقع التاجر)، متاجر (Salla/Zid/Shopify)، مزوّد LLM، وبوابة دفع (لاحقًا).  
الهدف في هذا المستوى: إظهار Kleem كنظام مركزي يتلقى رسائل القنوات، يرد بذكاء، ويتكامل مع كتالوجات/سياسات المتجر.  

---

## 4) C4 — المستوى 2: الحاويات (Containers)
**واجهات أمامية**  
- **Platform Admin Portal (React/MUI)**: إشراف، إعدادات عامة، مراقبة.  
- **Merchant Portal (React/MUI)**: صندوق وارد موحّد، تدريب المعرفة، إعداد النبرة، التقارير، تكاملات.  
- **Web Chat Widget (JS)**: واجهة محادثة قابلة للتضمين في مواقع خارجية.  
- **Micro Storefront (React/Next.js)**: متجر مصغّر (كتالوج/تفاصيل/بحث/فلترة أساسية) + زر "الدردشة للشراء".

**الخلفيات والبنية**  
- **Backend API (NestJS)**: مصادقة/RBAC، القنوات، المحادثات، المنتجات، المعرفة، المتجر المصغّر، التقارير.  
- **Workers (NestJS)**: مهام خلفية/مستهلكو AMQP.  
- **n8n (Orchestrator)**: مسارات الذكاء/الأدوات/الجودة/التحليلات.  
- **Embedding Service (FastAPI)**: توليد Embeddings.  
- **Extractor (FastAPI/Playwright)**: سحب نص/تهيئة وفهرسة المستندات والروابط.  
- **Datastores**: MongoDB (المعاملات/البيانات)، Redis (كاش/جلسات)، Qdrant (المتجهات)، MinIO (ملفات)، RabbitMQ (رسائل).

---

## 5) C4 — المستوى 3: مكوّنات الـ API و n8n
**داخل Backend API** (نماذج مُعرّفة في 03‑api‑components.dsl):  
- **Controllers**: Webhooks القنوات، محادثات، تدريب/تقييم، معرفة، منتجات، متجر مصغّر، تكاملات، إدارة.  
- **Services**: Conversation/Knowledge/Products/Storefront/Integrations…، مع **PolicyEngine** و**QualityGate** و**IdempotencyStore**.  
- **Repositories**: Conversation/Message/Merchant/Product/Knowledge…

**n8n Orchestrator** (04‑n8n‑components.dsl):  
- **AI Agent (Main)**، **Classifier/Router** (فهم النيّة)، أدوات: **searchProducts**/**searchKnowledge**، **Reply Builder**، **Quality Gate**، **Analytics Hook**.  
> في الـ workflow، **استخدام أداة المنتجات إلزامي** قبل أي رد مرتبط بالكتالوج، وتُسجَّل الأسئلة غير المجابة كحالات **missing_response** للتحسين. 

---

## 6) العلاقات (Relations) — نظرة تشغيلية
- الواجهات الأمامية ← **API** (REST/WS).  
- **API** ↔ **n8n** (REST) لاستدعاء وكيل الذكاء/الأدوات.  
- **Extractor** ينشر مهام فهرسة عبر **RabbitMQ**؛ **Workers** تدفع المتجهات إلى **Qdrant**؛ التخزين الوصفي في **MongoDB**؛ كاش في **Redis**؛ ملفات في **MinIO**.  
- تكامل القنوات (WhatsApp/Telegram/WebChat) عبر Webhooks/REST.  
- تكامل المتاجر (Salla/Zid/Shopify) لسحب كتالوج/حالة الطلب على الأقل.  
- إرسال تحليلات عبر Webhook مركزي. 

---

## 7) نموذج البيانات (ERD/Logical)
> تخزين أساسي في **MongoDB**؛ المتجهات في **Qdrant**؛ الملفات في **MinIO**. أدناه أهم الكيانات وعلاقاتها المنطقية:

- **Merchant** ←(1..N)→ **Product**، **Category**، **Storefront**، **KnowledgeDoc**، **Conversation**، **OrderIntent**.  
- **Conversation** ←(1..N)→ **Message** (رسالة تحتوي قناة/نوع/مرفقات/تقييم).  
- **Customer** ↔ **Conversation** (1..N)، ومع **OrderIntent** (0..N).  
- **KnowledgeDoc** يحتوي مقالات/مقاطع؛ **VectorIndex** (Qdrant) يخزّن (text, embedding, metadata: merchantId, docId, sectionId).  
- **Storefront**: إعدادات الثيم (شعار/ألوان/بانرات)، صفحات قائمة/تفاصيل **Product**، زر Chat‑to‑Buy يمُرّر **productId** للمحادثة.  
- **Unanswered** (قائمة الأسئلة غير المجابة) مع حقول (question, sessionId, aiAnalysis, resolved). تُملأ من **Analytics Hook**. 

> في n8n، **نافذة الذاكرة** للمحادثة محددة بـ **آخر 10 تبادلات** (MongoDB Chat Memory). 

---

## 8) تدفّقات تشغيلية (Runtime Flows)
### 8.1 استعلام منتج Intent‑first
1) يستقبل الـ API رسالة من القناة/الودجت → يرسل إلى n8n.  
2) **Classifier/Router** يحدّد النيّة: إن كانت **Product**, يستدعي **searchProducts**.  
3) تُبنى الإجابة من نتائج الأداة (اسم/سعر/رابط/بدائل أو لا توفّر + اقتراح).  
4) **Quality Gate** يفحص الرد، وإن كان غامضًا يُسجَّل **missing_response** للتحسين. 

### 8.2 سؤال سياسات/معرفة
1) نيّة **Knowledge** → استدعاء **searchKnowledge**، دمج النتائج، والرد بمختصر مع رابط المصدر. 

### 8.3 Chat‑to‑Buy من المتجر المصغّر
1) المتسوق يفتح **Storefront** → صفحة منتج.  
2) ينقر "الدردشة للشراء" → يُفتح الودجت/القناة مع تمرير **productId**.  
3) الرد يُظهِر المنتج/البدائل ويُسجّل **Order Intent** مع العميل.  

### 8.4 تتبّع الأسئلة غير المجابة/الجودة
- بعد **Quality Gate**، إذا وُجد تحليل سلبي **aiAnalysis** يُرسل إلى **Analytics Hook** → تُضاف إلى **Unanswered** في الـ API للمراجعة/التدريب. 

### 8.5 وسائط ذكية (ASR/OCR/Docs)
- الصوت → **ASR** إلى نص داخل المسار.  
- الصور → **OCR** للنصوص.  
- ملفات Word/Excel/PDF → **Extractor** ثم فهرسة في Qdrant. (مدعوم في SRS/المعمارية). 

---

## 9) طبقة النشر (Deployment)
**40‑deployment.dsl** يعرّف بيئة **docker‑compose**:
- حاويات: **api, workers, n8n, mongodb, redis, qdrant, embed, extractor, minio, rabbit** مع منافذ موضوعة في الخصائص.  
- شبكة **backnet** كجسر اتصال.  
- View خاص بالتوزيع: *"Kleem — Deployment (docker‑compose)"*.

> يُطابق ما ورد في وثيقة المعمارية حول مراقبة/سجلات/تتبّع وتخطيط التوسّع إلى K8s لاحقًا. 

---

## 10) الحماية والأمان (Security Architecture)
- **Auth/RBAC** على الـ API (أدوار: مالك/مشغّل/قارئ).  
- **HTTPS** بين المكوّنات الخارجية، توقيع Webhooks.  
- **قفل قنوات الإدخال** (Allow‑list) وRate‑Limiting، وجدران حماية للتطبيق.  
- **تشفير** البيانات الساكنة (S3‑at‑rest في MinIO/Qdrant snapshots/أسرار) مع إدارة مفاتيح.  
- **التدقيق والمراقبة**: سجلات موحّدة، مؤشرات، تنبيهات، واختبارات أمن دورية. 

---

## 11) الرصد والجاهزية (Observability & SRE)
- **Prometheus/Grafana** لمؤشرات الأداء.  
- **ELK** للسجلات و**Jaeger** للتتبّع الموزّع.  
- **RTO ≤ 4h, RPO ≤ 1h** وخطة نسخ احتياطي مجدولة (يومي/أسبوعي/شهري). 

---

## 12) اختيارات التقنية (Technology Choices) — لماذا؟
- **NestJS**: وحدات/حقن تبعية/Interceptors وحوكمة واضحة + TypeScript → سرعة تطوير وقابلية صيانة.   
- **MongoDB**: مرونة نماذج المحادثات/الرسائل مع فهارس زمنية ومتعددة المفاتيح.  
- **Redis**: جلسات/معدلات/كاش سريع لنتائج متكررة.  
- **Qdrant**: فهرس متجهات قوي، فلاتر، أداء جيد للبحث الدلالي.  
- **RabbitMQ**: عزل الأحمال/الوظائف غير المتزامنة، وقابلية إعادة المحاولة.  
- **MinIO**: تخزين كائنات متوافق S3 محليًا.  
- **n8n**: سرعة تركيب المسارات الذكية والتجارب مع مزوّد LLM، مع بوابة **Quality Gate** وتحليلات.   
- **React/MUI + Next**: سرعة بناء اللوحات والمتجر المصغّر والأداء الجيد على الحواف.

**Trade‑offs مختصرة**:  
- Mongo يسهّل التطوير لكنه يتطلّب تصميم فهارس دقيق للأحجام الكبيرة؛ Qdrant يُضيف بُعدًا عملياتيًا (Snapshots/Replicas).  
- n8n يسرّع الابتكار لكنه يحتاج **حواجز جودة** صارمة قبل الإرسال (مضافة فعليًا). 

---

## 13) السعة والتوسّع (Capacity & Scaling)
- أهداف أداء: UI ≤ 2ث، AI ≤ 5ث، 10k رسالة/دقيقة، ≥1000 مستخدم متزامن.  
- توسيع أفقي للحاويات الثقيلة (API/Workers/n8n/Embed/Extractor) مع فصل قواعد البيانات وتفعيل القراءة/النسخ.  
- كاش إستراتيجي (Redis) لطلبات متكررة + Idempotency على نقاط حرجة. 

---

## 14) إرشادات تشغيل Structurizr
1) ضع كل ملفات الـ DSL في مجلد واحد (كما هو الآن).  
2) شغّل **Structurizr Lite** (حاوية) واربط المجلد عبر Volume.  
3) افتح *workspace.dsl* وشاهد Views: Context/Containers/API Components/n8n Components/Deployment.  
> مثال docker compose لخدمة Structurizr Lite موجود ضمن نقاشات المشروع ويمكن استخدامه كما هو مع مسار `./docs/structurizr`.  

---

## 15) ملحق — توافق SRS/BRD/Workflow
- **Intent‑first + Tool‑gating** للمنتجات موثّقة ومعمول بها في الـ workflow.   
- **نافذة ذاكرة 10** للمحادثة عبر MongoDB Memory.   
- **Analytics Hook** لتجميع **missing_response** والتحسين المستمر.   
- الأهداف غير الوظيفية وأدوات المراقبة متسقة مع الوثيقة المعمارية. 

---

**خلاصة**  
التقسيم الحالي (C4 + Deployment + Workflow) يقدّم خريطة طريق تنفيذية واضحة، مع فصل مسؤوليات مُحكم، وأتمتة ذكاء قابلة للضبط، وتوافق وثائقي (Vision/BRD/SRS). أي تغيير جوهري في القنوات أو المتاجر أو الأداء يجب أن ينعكس في ملفات DSL (Views/Relations) وفي نُسخ الـ SRS. 


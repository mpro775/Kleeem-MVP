# C4 المستوى 4 — مخطط النشر
*آخر تحديث: 2025-09-27 19:15*

> **مخطط نشر C4** — يعرض طبولوجيا النشر والبيئات والحدود الأمنية للنظام. هذا هو أعلى مستوى في نموذج C4 الذي يركز على البنية التحتية والعمليات.

---

## 🎯 الغرض والنطاق

**الغرض الرئيسي:** توضيح كيفية توزيع الخدمات على البيئات المختلفة (التطوير، الاختبار، الإنتاج) مع تحديد الحدود الأمنية والشبكية.

**النطاق:** يركز هذا المخطط على **طبولوجيا النشر** وتدفق البيانات بين البيئات. يجيب على:
- كيف تُنشر الخدمات في كل بيئة؟
- ما هي الحدود الأمنية والشبكية؟
- كيف يتم تدفق البيانات والمراقبة؟

**الجمهور المستهدف:**
- 🛠️ **مهندسو DevOps/SRE** — تخطيط النشر والتوسع والمراقبة
- 🔒 **مهندسو الأمان** — تقييم الحدود الأمنية والوصول
- 👨‍💼 **الإدارة التقنية** — فهم البنية التحتية والتكاليف
- 📊 **المراجعون** — تقييم الامتثال والحماية

---

## 🏗️ بنية المخطط

### ملف المصدر
- **الموقع:** [`kaleem-deployment.mmd`](./kaleem-deployment.mmd)
- **التنسيق:** مخطط Mermaid (TD - من أعلى لأسفل)
- **التوليد:** يتم تصييره تلقائياً عبر CI/CD

### التنظيم البصري

يتم تنظيم المخطط في طبقات منطقية:

1. **🏭 Production Environment** — البيئة الإنتاجية كاملة
2. **🧪 Staging Environment** — بيئة الاختبار قبل الإنتاج
3. **💻 Development Environment** — بيئة التطوير المحلي
4. **🌐 External Systems** — الأنظمة الخارجية
5. **🏗️ Infrastructure** — البنية التحتية الأساسية

---

## 🏭 بيئة الإنتاج (Production)

### 🌐 طبقة DMZ / Edge
**محيط الشبكة للتعامل مع حركة المرور الخارجية:**

| المكون | الغرض | التقنية | الأمان |
|---------|--------|---------|--------|
| **Nginx Load Balancer** | توزيع الحمل وإنهاء TLS | Nginx | SSL/TLS، WAF |
| **Nginx Reverse Proxy** | توجيه الطلبات | Nginx | Request Routing |
| **WhatsApp Evolution API** | بوابة WhatsApp محلية | Node.js | API Gateway |

### ⚙️ خدمات التطبيق الأساسي
**منطق العمل والخدمات الرئيسية:**

#### 🖥️ خدمات الواجهة الأمامية
- **Merchant Dashboard** — لوحة تحكم التاجر (React/Vite)
- **Webchat Widget** — واجهة الدردشة المدمجة

#### 🔧 خدمات الخلفية
- **API Server** — خادم API الرئيسي (NestJS)
- **Background Workers** — العاملين في الخلفية للمهام غير المتزامنة
- **n8n Workflow Engine** — محرك أتمتة العمليات التجارية
- **Embedding Service** — خدمة التضمين (Python/FastAPI)
- **Extractor Service** — خدمة استخراج المستندات (Python)

### 💾 طبقة الثبات البياني
**قواعد البيانات والتخزين:**

| قاعدة البيانات | الغرض | التكرار | الأداء |
|----------------|--------|---------|--------|
| **MongoDB Cluster** | المخزن الرئيسي | Replica Set (3 عقد) | عالي |
| **Redis Cluster** | التخزين المؤقت والجلسات | Cluster Mode (6 عقد) | فائق |
| **Qdrant Cluster** | البحث الدلالي | Sharded (3 عقد) | عالي |
| **MinIO Cluster** | التخزين الموضعي | Distributed (4 عقد) | عالي |
| **RabbitMQ Cluster** | وسيط الرسائل | High Availability | عالي |

### 📊 مجموعة المراقبة والتتبع
**أدوات المراقبة وتتبع الأداء:**

#### 📈 جمع المقاييس
- **Prometheus Server** — جمع المقاييس (Retention: 15 يوم)
- **Alertmanager** — إدارة التنبيهات وتوجيهها

#### 📊 التصور والتنبيه
- **Grafana** — لوحات المراقبة والتنبيه

#### 📝 خط أنابيب السجلات
- **Loki** — تجميع السجلات المركزي
- **Promtail** — شحن السجلات من الحاويات

#### 🔍 التتبع الموزع
- **Tempo** — تخزين آثار التتبع
- **OpenTelemetry Collector** — جمع آثار التتبع

#### 🖥️ مراقبة النظام
- **cAdvisor** — مقاييس الحاويات
- **Node Exporter** — مقاييس النظام
- **Redis Exporter** — مقاييس Redis
- **MongoDB Exporter** — مقاييس MongoDB

#### 🚨 تتبع الأخطاء
- **Glitchtip** — مراقبة الأخطاء وAPM
- **Postgres** — قاعدة بيانات Glitchtip

---

## 🧪 بيئة الاختبار (Staging)

### 🔧 خدمات الاختبار
- **Staging API** — خادم API للاختبار (Port: 3001)
- **Staging Workers** — عمال الخلفية للاختبار
- **Staging n8n** — محرك سير العمل للاختبار (Port: 5679)

### 💾 بيانات الاختبار
- **قواعد بيانات مشتركة** — MongoDB، Redis، Qdrant مع مجموعات معزولة

---

## 💻 بيئة التطوير (Development)

### 🔧 خدمات التطوير
- **Dev API** — خادم API محلي (Port: 3000، Hot Reload)
- **Dev n8n** — محرك سير العمل محلي (Port: 5678، Debug Mode)

### 🛠️ أدوات التطوير
- **mongo-express** — واجهة إدارة قاعدة البيانات (Port: 8081)
- **redis-commander** — واجهة إدارة التخزين المؤقت (Port: 8082)

---

## 🌐 الأنظمة الخارجية

### 🤖 خدمات الذكاء الاصطناعي
- **Google Gemini API** — نماذج اللغة والتضمين
- **OpenAI API** — نماذج GPT البديلة

### 📱 منصات التواصل
- **Telegram Bot API** — منصة المراسلة
- **WhatsApp Cloud API** — رسائل الأعمال
- **Instagram API** — التجارة الاجتماعية
- **Facebook Messenger** — الرسائل المباشرة

### 🛒 منصات التجارة الإلكترونية
- **Salla API** — منصة التجارة السعودية
- **Zid API** — منصة الشرق الأوسط
- **Shopify API** — منصة التجارة العالمية
- **WooCommerce API** — متاجر ووردبريس

---

## 🏗️ البنية التحتية والشبكة

### 🔒 الأمان والوصول
- **Firewall / WAF** — حماية من DDoS وتحديد المعدل
- **VPN Gateway** — الوصول الآمن وقوائم IP المسموحة
- **Secrets Manager** — إدارة الأسرار ومتغيرات البيئة

### ⚖️ موازنة الحمل
- **Global Load Balancer** — توجيه جغرافي وتكامل CDN

---

## 🔄 تدفق البيانات والعمليات

### مسار حركة المرور في الإنتاج:
```
External Users → Load Balancer → Reverse Proxy → API Server
    ↓
Background Workers ← RabbitMQ ← Job Queue ← API Server
    ↓
MongoDB / Redis / Qdrant / MinIO ← Data Operations
    ↓
Prometheus / Loki / Tempo ← Observability Data
```

### مسار المراقبة:
```
All Services → Metrics → Prometheus → Grafana
    ↓
Logs → Promtail → Loki → Grafana
    ↓
Traces → OTel Collector → Tempo → Grafana
```

### حدود الأمان:
```
Internet → Firewall → Load Balancer → Core Services
    ↓
VPN Gateway ← Secure Access ← Development Environment
    ↓
Secrets Manager → Environment Variables → All Services
```

---

## 📊 مصفوفة التوسع والأداء

| المكون | نمط التوسع | الأداء المستهدف | حدود الموارد |
|---------|-------------|------------------|---------------|
| **API Server** | أفقي (Load Balancer) | <100ms P95 | CPU: 2-4 cores |
| **Background Workers** | أفقي (Queue-based) | <1s processing | CPU: 1-2 cores |
| **MongoDB** | قراءة replicas | <50ms queries | RAM: 8-16GB |
| **Redis** | Cluster mode | <1ms operations | RAM: 4-8GB |
| **Qdrant** | Sharding | <200ms search | RAM: 8-16GB |
| **MinIO** | Distributed | <500ms upload | Storage: 1-10TB |

---

## 🚀 استراتيجية النشر والإصدار

### نموذج النشر
- **Blue-Green Deployment** — للإصدارات الكبيرة
- **Rolling Updates** — للتحديثات التدريجية
- **Canary Releases** — لاختبار الميزات الجديدة

### إدارة الإصدارات
- **Semantic Versioning** — نظام ترقيم الإصدارات
- **Image Tagging** — ربط الإصدارات بالصور
- **Rollback Strategy** — العودة للإصدار السابق

### هجرة قواعد البيانات
- **Forward-only Migrations** — عدم وجود تراجع
- **Backfill Strategy** — ملء البيانات التاريخية
- **Backup Testing** — اختبار النسخ الاحتياطي

---

## 🔒 الحدود الأمنية

### طبقات الحماية
1. **Internet → Firewall** — حماية من الهجمات الخارجية
2. **DMZ → Core Services** — عزل منطقة الشبكة المعزولة
3. **Core → Data Layer** — مبدأ الأقل صلاحية
4. **Application → External APIs** — تشفير الاتصالات

### سياسات الوصول
- **Network Segmentation** — تقسيم الشبكة
- **Service Accounts** — حسابات خدمة محدودة
- **API Rate Limiting** — تحديد المعدل حسب المستأجر
- **Audit Logging** — تسجيل جميع العمليات الحساسة

---

## 📊 الاعتبارات التشغيلية

### مراقبة الأداء
- **SLO Targets** — أهداف مستوى الخدمة
- **Error Budgets** — ميزانية الأخطاء المسموحة
- **Capacity Planning** — تخطيط السعة المستقبلية

### إدارة التكاليف
- **Resource Optimization** — تحسين استخدام الموارد
- **Auto-scaling** — التوسع التلقائي
- **Reserved Instances** — حجز الموارد مسبقاً

### النسخ الاحتياطي والاسترداد
- **Backup Strategy** — استراتيجية النسخ الاحتياطي
- **RTO/RPO** — أهداف وقت الاسترداد/الهدف المحدد
- **Disaster Recovery** — خطط الاسترداد من الكوارث

---

## 🔧 التطوير والاختبار

### بيئة التطوير المحلي
- **Docker Compose** — تشغيل كامل للتطوير
- **Hot Reload** — إعادة تحميل تلقائي
- **Debug Configuration** — إعدادات محسنة للتصحيح

### اختبار التكامل
- **Environment Parity** — تطابق البيئات
- **Data Seeding** — بيانات اختبار واقعية
- **Service Mocking** — محاكاة الخدمات الخارجية

### اختبار الأداء
- **Load Testing** — اختبار تحت الحمل
- **Stress Testing** — اختبار تحت الضغط
- **Chaos Engineering** — اختبار التحمل

---

## 🔗 Related Documentation

### Predecessors
- **[API Components](./api-components.md)** — مكونات API الداخلية
- **[Container Diagram](./container.md)** — حاويات النظام وعلى علاقاتها
- **[Tech Stack Rationale](../4-Tech%20Stack%20Rationale/tech-stack-rationale.md)** — تبرير اختيار التقنيات

### Successors
- **[Runbooks](../../../2-%D9%88%D8%AB%D8%A7%D8%A6%D9%82%20%D8%A7%D9%84%D8%AA%D8%B4%D8%BA%D9%8A%D9%84%20%28Ops%20&%20DevOps%29/)** — إجراءات التشغيل

### External References
- **[Kubernetes Documentation](https://kubernetes.io/)** — تنسيق الحاويات
- **[Docker Documentation](https://docs.docker.com/)** — الحاويات
- **[Nginx Documentation](https://nginx.org/)** — خادم الويب
- **[Prometheus Documentation](https://prometheus.io/)** — المراقبة

---

## 📝 Maintenance & Updates

### Update Triggers
- إضافة خدمة جديدة أو تغيير في البنية
- تحديث متطلبات الأداء أو الأمان
- تغييرات في البنية التحتية
- تحسينات في المراقبة أو المرونة

### Review Cycle
- **أسبوعي:** فحص الدقة التشغيلية
- **شهري:** مراجعة الأداء والتكاليف
- **ربع سنوي:** تقييم الأمان والحماية
- **سنوي:** مراجعة العمارة والتحديث

### Version History
- **v1.0 (2025-09-27):** مخطط نشر C4 محترف مع تفاصيل شاملة
- **v0.1 (2025-09-27):** هيكل أساسي للبيئات والخدمات

---

> **الخطوات التالية:** بعد فهم طبولوجيا النشر، انتقل إلى **[Runbooks](../../../2-%D9%88%D8%AB%D8%A7%D8%A6%D9%82%20%D8%A7%D9%84%D8%AA%D8%B4%D8%BA%D9%8A%D9%84%20%28Ops%20&%20DevOps%29/)** للإجراءات التشغيلية، أو **[Tech Stack Rationale](../4-Tech%20Stack%20Rationale/tech-stack-rationale.md)** لتبرير اختيار التقنيات.

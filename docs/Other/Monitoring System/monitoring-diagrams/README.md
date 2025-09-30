# مخططات نظام المراقبة والمراقبة - منصة Kaleem

## 📋 نظرة عامة

هذا المجلد يحتوي على مخططات توضيحية شاملة لنظام المراقبة والمراقبة في منصة Kaleem.

---

## 📊 قائمة المخططات (مُحدثة)

### 1. مخطط تدفق البيانات

**الملف**: `01-data-flow-diagram.md`
**الوصف**: يوضح كيفية تدفق البيانات من المصادر إلى المراقبة والتنبيهات
**المكونات**:
- ✅ مصادر البيانات (Application, Databases, Queues, System)
- ✅ جمع البيانات (Promtail, Exporters, OpenTelemetry)
- ✅ تخزين البيانات (Loki, Prometheus, Tempo)
- ✅ المراقبة والتنبيهات (Grafana, AlertManager, Telegram)

### 2. مخطط SLOs وحدود التنبيه

**الملف**: `02-slo-alerts-diagram.md`
**الوصف**: يوضح أهداف مستوى الخدمة (SLOs) وقواعد التنبيه الفعلية
**المكونات**:
- ✅ SLOs الفعلية (Response Time, Availability, Error Rate, Throughput, Cache Hit Rate)
- ✅ مقاييس المراقبة الفعلية
- ✅ 15+ قاعدة تنبيه مُطبقة
- ✅ تنبيهات Telegram مُفعلة

### 3. مخطط لوحات Grafana

**الملف**: `03-grafana-dashboards-diagram.md`
**الوصف**: يوضح لوحات Grafana الفعلية والمخططة
**المكونات**:
- ✅ مصادر البيانات (Prometheus, Loki, Tempo)
- ✅ لوحات فعلية (API Health, Business KPIs)
- ✅ لوحات مخططة (System Overview, RAG & AI, Database, Security)
- ✅ المستخدمون (DevOps, Backend Developer, Product Manager, Security Team)

### 4. مخطط دورة حياة التنبيه

**الملف**: `04-alert-lifecycle-diagram.md`
**الوصف**: يوضح دورة حياة التنبيه من الاكتشاف إلى الحل
**المراحل**:
- ✅ اكتشاف المشكلة (Prometheus)
- ✅ معالجة التنبيه (AlertManager)
- ✅ إرسال التنبيه (Telegram)
- ✅ حل المشكلة (DevOps)

### 5. مخطط معمارية المقاييس

**الملف**: `05-metrics-architecture-diagram.md`
**الوصف**: يوضح معمارية جمع وتخزين وعرض المقاييس
**المكونات**:
- ✅ مصادر المقاييس (Application, Databases, Queues, System)
- ✅ جمع المقاييس (Exporters, Prometheus)
- ✅ تخزين المقاييس (Prometheus مع retention 15 days)
- ✅ عرض المقاييس (Grafana مع dashboards)

### 6. مخطط معمارية السجلات

**الملف**: `06-logging-architecture-diagram.md`
**الوصف**: يوضح معمارية جمع وتخزين وعرض السجلات
**المكونات**:
- ✅ مصادر السجلات (Application, Databases, System, Services)
- ✅ جمع السجلات (Promtail, Docker logs)
- ✅ معالجة السجلات (Parsing, Filtering, Enrichment)
- ✅ تخزين السجلات (Loki مع retention 7 days)
- ✅ عرض السجلات (Grafana مع LogQL queries)

---

## 🎯 كيفية استخدام المخططات

### للمطورين (Developers)

- فهم كيفية عمل نظام المراقبة
- معرفة المقاييس والسجلات المتاحة
- فهم كيفية استكشاف الأخطاء

### لفرق العمليات (Operations Teams)

- فهم معمارية المراقبة
- معرفة كيفية إعداد التنبيهات
- فهم كيفية صيانة النظام

### لفرق الأمان (Security Teams)

- فهم مقاييس الأمان
- معرفة كيفية مراقبة الأمان
- فهم كيفية استكشاف التهديدات

---

## 🎯 اللوحات المُطبقة فعلياً

### لوحات Grafana المُطبقة
- ✅ **API Health Dashboard** (`api-health.json`) - مراقبة أداء API
- ✅ **Business KPIs Dashboard** (`business-kpis.json`) - مؤشرات الأعمال

### اللوحات المخططة
- 🔄 **System Overview Dashboard** - نظرة عامة على النظام
- 🔄 **RAG & AI Dashboard** - مراقبة الذكاء الاصطناعي
- 🔄 **Database Dashboard** - مراقبة قواعد البيانات
- 🔄 **Security Dashboard** - مراقبة الأمان

## 🔧 الأدوات المستخدمة

### إنشاء المخططات
- **Mermaid**: لإنشاء المخططات التفاعلية
- **Markdown**: لتنسيق الوثائق
- **PromQL**: لاستعلامات المقاييس
- **LogQL**: لاستعلامات السجلات

### عرض المخططات
- **GitHub**: لعرض المخططات في GitHub
- **VS Code**: مع إضافة Mermaid
- **Grafana**: لعرض البيانات الحية
- **Docker Compose**: لتشغيل النظام محلياً

---

## 📚 المراجع

- [Mermaid Documentation](https://mermaid-js.github.io/mermaid/)
- [Prometheus Querying](https://prometheus.io/docs/prometheus/latest/querying/)
- [LogQL Documentation](https://grafana.com/docs/loki/latest/logql/)
- [Grafana Dashboards](https://grafana.com/docs/grafana/latest/dashboards/)

---

## 🔄 التحديثات

| التاريخ    | الإصدار | التغييرات                              |
| ---------- | ------- | ----------------------------------- |
| 2024-12-19 | 1.0.0   | إصدار أولي مع جميع المخططات         |
| 2024-12-20 | 1.1.0   | تحديث بمعلومات فعلية مُطبقة          |
| 2024-12-20 | 1.1.1   | إضافة تفاصيل اللوحات والمقاييس     |

### التحديثات الأخيرة
- ✅ **تحديث SLOs**: من قيم عامة إلى قيم فعلية مُطبقة
- ✅ **تحديث اللوحات**: إضافة لوحات فعلية مُطبقة
- ✅ **تحديث المقاييس**: إضافة مقاييس فعلية من Prometheus
- ✅ **تحديث الروابط**: إضافة روابط فعلية للخدمات

---

_آخر تحديث: ديسمبر 2024_
_الإصدار: 1.0.0_

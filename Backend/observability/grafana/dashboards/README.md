# Grafana Dashboards

هذا المجلد يحتوي على لوحات تحكم Grafana جاهزة للاستيراد في صيغة JSON.

## اللوحات المتاحة

### 1. API Health Dashboard (`api-health.json`)

لوحة شاملة لمراقبة صحة وأداء API مع المقاييس التالية:

#### المقاييس الأساسية:

- **Request Rate (RPS)**: معدل الطلبات بالثانية حسب المسار والطريقة
- **Error Rate (5xx %)**: نسبة أخطاء الخادم
- **Latency p95 (s)**: زمن الاستجابة المئوي 95 حسب المسار
- **DB Query p95 (s)**: زمن استجابة قاعدة البيانات حسب العملية والمجموعة
- **Cache Hit Rate (%)**: معدل إصابة التخزين المؤقت
- **WS Active Connections**: عدد اتصالات WebSocket النشطة

#### الميزات:

- تحديث تلقائي كل 10 ثوانٍ
- عرض زمني تفاعلي
- وحدات قياس مناسبة
- ألوان واضحة للتنبيهات

### 2. Business KPIs Dashboard (`business-kpis.json`)

لوحة لمراقبة مؤشرات الأعمال الرئيسية:

#### المقاييس التجارية:

- **Merchants Created**: معدل إنشاء التجار
- **n8n Workflows Created**: معدل إنشاء سير العمل
- **Products Created**: معدل إنشاء المنتجات
- **Products Updated**: معدل تحديث المنتجات
- **Products Deleted**: معدل حذف المنتجات
- **Active Merchants**: عدد التجار النشطين

#### الميزات:

- عرض إحصائيات فورية
- مخططات زمنية للتتبع
- حدود تنبيه ملونة
- تحديث كل 30 ثانية

## كيفية الاستيراد

### عبر واجهة Grafana:

1. **افتح Grafana**: `https://grafana.kaleem-ai.com/`
2. **اذهب إلى Dashboards** → **+ New** → **Import**
3. **انسخ محتوى الملف** JSON المطلوب
4. **الصق في حقل Upload JSON**
5. **اضغط Import**

### عبر API:

```bash
# استيراد لوحة API Health
curl -X POST -H "Content-Type: application/json" \
  -d @observability/grafana/dashboards/api-health.json \
  http://grafana.kaleem-ai.com/api/dashboards/db

# استيراد لوحة Business KPIs
curl -X POST -H "Content-Type: application/json" \
  -d @observability/grafana/dashboards/business-kpis.json \
  http://grafana.kaleem-ai.com/api/dashboards/db
```

## التخصيص

### تعديل المقاييس:

يمكنك تعديل queries Prometheus في كل panel حسب احتياجاتك:

```json
{
  "targets": [
    {
      "expr": "YOUR_CUSTOM_PROMETHEUS_QUERY",
      "legendFormat": "Custom Legend"
    }
  ]
}
```

### إضافة Panels جديدة:

```json
{
  "type": "timeseries",
  "title": "New Metric",
  "gridPos": {
    "x": 0,
    "y": 20,
    "w": 12,
    "h": 8
  },
  "targets": [
    {
      "expr": "your_metric_name",
      "legendFormat": "Legend"
    }
  ]
}
```

## متطلبات Prometheus

تتطلب هذه اللوحات المقاييس التالية من Prometheus:

### مقاييس API:

- `http_requests_total`
- `http_request_duration_seconds_bucket`
- `database_query_duration_seconds_bucket`
- `cache_hit_rate`
- `websocket_active_connections`

### مقاييس الأعمال:

- `merchant_created_total`
- `n8n_workflow_created_total`
- `product_created_total`
- `product_updated_total`
- `product_deleted_total`

## الصيانة

### تحديث اللوحات:

1. عدل ملف JSON المطلوب
2. اختبر التعديل محلياً
3. أعد استيراد اللوحة في Grafana
4. احفظ النسخة المحدثة في المرجع

### إضافة لوحات جديدة:

1. أنشئ ملف JSON جديد
2. اتبع نفس الهيكل
3. أضف الملف إلى هذا المجلد
4. حدث هذا الملف README

## الدعم

- **التوثيق**: [Grafana Documentation](https://grafana.com/docs/)
- **Prometheus**: [Query Language](https://prometheus.io/docs/prometheus/latest/querying/basics/)
- **المجتمع**: [Grafana Community](https://community.grafana.com/)

# Runbooks — دليل التشغيل

هذا المجلد يحتوي على runbooks (دليل التشغيل) للأخطاء والمشاكل الشائعة في نظام Kaleem AI.

## الهيكل

```
docs/runbooks/
├── README.md                    # هذا الملف
├── high-latency.md             # مشاكل زمن الاستجابة العالي
├── api-high-error-rate.md      # مشاكل معدل الأخطاء العالي
└── [runbooks إضافية مستقبلاً]
```

## كيفية استخدام Runbooks

### عند تلقي تنبيه من AlertManager:

1. **افتح التنبيه** في AlertManager أو Slack
2. **انقر على runbook_url** في annotations
3. **اتبع الخطوات** في الترتيب المحدد
4. **سجل الإجراءات** والوقت المستغرق
5. **أعد التنبيه** بعد الحل

### خطوات التشخيص العامة:

#### 1. الأعراض

- وصف المشكلة والتأثير المتوقع

#### 2. التشخيص السريع

- فحص السجلات والمقاييس الأساسية
- تحديد نطاق المشكلة (مسار واحد/عدة مسارات/نظام كامل)

#### 3. خطوات الحل

- حلول فورية لإيقاف التدهور
- حلول دائمة لمنع التكرار

#### 4. ما بعد الحادثة

- تحليل السبب الجذري (RCA)
- تحسين التنبيهات والمراقبة
- تحديث الـ runbooks

## التنبيهات والـ Runbooks المرتبطة

| التنبيه             | Runbook                                          | الأولوية |
| ------------------- | ------------------------------------------------ | -------- |
| `HighLatency`       | [high-latency.md](high-latency.md)               | عالية    |
| `VeryHighLatency`   | [high-latency.md](high-latency.md)               | حرجة     |
| `APIHighErrorRate`  | [api-high-error-rate.md](api-high-error-rate.md) | عالية    |
| `HighErrorRate`     | [api-high-error-rate.md](api-high-error-rate.md) | عالية    |
| `CriticalErrorRate` | [api-high-error-rate.md](api-high-error-rate.md) | حرجة     |

## أدوات التشخيص

### مراقبة ولوحات التحكم:

- **Grafana**: `https://grafana.kaleem-ai.com/`
- **Loki**: `https://loki.kaleem-ai.com/`
- **Tempo**: `https://tempo.kaleem-ai.com/`
- **AlertManager**: `https://alertmanager.kaleem-ai.com/`

### قواعد البيانات:

- **MongoDB Atlas**: `https://cloud.mongodb.com/`
- **Redis**: `redis-cli` أو Redis Insight

### السجلات والتتبع:

```bash
# فحص السجلات في Loki
{job="kaleem-api"} | json | status_code >= 500

# فحص traces في Tempo
# استخدم Jaeger UI أو Tempo UI
```

## إرشادات الإبلاغ

### عند حل مشكلة:

1. سجل الوقت المستغرق لكل خطوة
2. حدد السبب الجذري
3. اقترح تحسينات للـ runbook
4. أبلغ الفريق بالحل

### تحديث الـ Runbooks:

- أضف الدروس المستفادة
- حدث الخطوات إذا تغيرت
- أضف أدوات تشخيص جديدة
- راجع الروابط والمراجع

## الاتصال

- **Slack**: `#alerts` للتنبيهات العاجلة
- **Slack**: `#runbooks` لمناقشة التحسينات
- **Docs**: `https://kb.kaleem-ai.com/runbooks/`

## المساهمة

لإضافة runbook جديد:

1. أنشئ ملف `.md` جديد
2. اتبع الهيكل الموحد
3. أضف التنبيه المرتبط في هذا الملف
4. اختبر الروابط في التنبيهات

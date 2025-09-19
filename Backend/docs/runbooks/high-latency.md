# Runbook — HighLatency (p95 > threshold)

## الأعراض

- Grafana Panel: API p95 latency مرتفع لمسارات محددة.
- زيادة في استهلاك الموارد (CPU/Memory) للخدمة.
- طوابير متراكمة في RabbitMQ.

## التشخيص السريع

### 1. فحص لوحة التحكم في Grafana

```
API Health Dashboard → API Latency by Route
```

- حدد المسار الأكثر تأثراً
- راقب الاتجاه على مدار الساعة الماضية

### 2. فحص معدل الأخطاء

```
Error Rate by Route Panel
```

- تحقق من وجود ارتباط بين الـ latency والأخطاء
- ابحث عن مسارات مع 4xx/5xx مرتفع

### 3. فحص Traces (Tempo)

```
Traces Dashboard → اختر المسار المتأثر
```

- ابحث عن الـ span الأطول
- تحقق من DB queries والاستدعاءات الخارجية
- راقب الوقت المستغرق في كل طبقة

### 4. فحص قاعدة البيانات

```
Database Metrics Dashboard → Query Duration
```

- راقب `database_query_duration_seconds` p95
- ابحث عن استعلامات بطيئة أو غير مفهرسة

## خطوات الحل

### إذا كان السبب قاعدة البيانات:

1. **تحليل الاستعلامات البطيئة:**

   ```javascript
   // في MongoDB shell
   db.currentOp({ secs_running: { $gt: 30 } });
   ```

2. **إضافة فهارس مناسبة:**

   ```javascript
   db.collection.createIndex({ field1: 1, field2: 1 });
   ```

3. **تحسين الاستعلامات:**
   - استخدم `lean()` للوثائق البسيطة
   - تجنب `populate()` للاستعلامات الكبيرة
   - استخدم pagination للنتائج الكبيرة

### إذا كان السبب ضغط الطلبات:

1. **تفعيل التخزين المؤقت:**

   ```typescript
   // إضافة cache للاستعلامات الشائعة
   @UseInterceptors(CacheInterceptor)
   @CacheTTL(300) // 5 minutes
   ```

2. **مراجعة Autoscaling:**
   - زيادة عدد النسخ (replicas)
   - ضبط resource limits في Kubernetes

### إذا كان السبب استدعاءات خارجية:

1. **عزل الاستدعاءات:**

   ```typescript
   // نقل الاستدعاءات إلى queue
   await this.queue.add('external-api-call', data);
   return { status: 'accepted', message: 'Processing...' };
   ```

2. **إضافة timeout و retry:**
   ```typescript
   const result = await this.httpService.get(url, {
     timeout: 5000,
     retryDelay: 1000,
     retryCount: 3,
   });
   ```

## ما بعد الحادثة

### 1. إضافة اختبارات الأداء:

```typescript
describe('Performance Tests', () => {
  it('should respond within 200ms for cached data', async () => {
    // Test implementation
  });
});
```

### 2. مراجعة SLO وتحديث العتبات:

```yaml
# في alerts
- alert: APIHighLatency
  expr: histogram_quantile(0.95, rate(http_request_duration_seconds[5m])) > 0.5
```

### 3. توثيق السبب الجذري:

- إنشاء تقرير RCA (Root Cause Analysis)
- تحديث هذا الـ runbook بالدروس المستفادة
- إضافة تنبيهات وقائية

## المراجع

- [Grafana Dashboard](https://grafana.kaleem-ai.com/d/api-health)
- [Tempo Traces](https://tempo.kaleem-ai.com/)
- [MongoDB Atlas](https://cloud.mongodb.com/)

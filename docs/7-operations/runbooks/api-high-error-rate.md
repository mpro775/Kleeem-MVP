# Runbook — APIHighErrorRate (5xx > 1%)

## الأعراض

- ارتفاع مفاجئ في 5xx عبر عدة مسارات أو مسار واحد
- زيادة في معدل الأخطاء في Grafana panels
- تأثر تجربة المستخدم النهائية
- إشعارات من AlertManager

## التشخيص السريع

### 1. تحديد المسارات المتأثرة

```
Grafana → Error Rate by Route Dashboard
```

- رتب المسارات حسب معدل الأخطاء التنازلي
- حدد أعلى 5 مسارات متأثرة
- راقب التوزيع الزمني للأخطاء

### 2. فحص السجلات (Logs)

```
Loki Query:
{job="kaleem-api"} | json | status_code >= 500 | route="<affected_route>"
```

- ابحث عن أنماط شائعة في رسائل الخطأ
- تحقق من timestamps للارتباط مع النشر
- راقب تكرار نفس نوع الخطأ

### 3. فحص Traces للفشل

```
Tempo Dashboard → Filter by route and error status
```

- حدد الـ span الذي يفشل
- تحقق من DB connections والاستعلامات
- راقب استدعاءات الخدمات الخارجية

### 4. مراجعة النشر والتغييرات

```
Git History & Deployment Logs
```

- تحقق من آخر نشر وتغييرات الكود
- راجع تغييرات البيئة (environment variables)
- تحقق من تغييرات في التبعيات (dependencies)

## خطوات الحل

### إذا كانت أخطاء 500 من التطبيق:

1. **تحليل رسائل الخطأ:**

   ```typescript
   // في ErrorHandler
   catch (error) {
     this.logger.error('Application Error', {
       error: error.message,
       stack: error.stack,
       route: request.route?.path,
       userId: request.user?.id
     });
   }
   ```

2. **تحسين معالجة الأخطاء:**

   ```typescript
   @Catch()
   export class GlobalExceptionFilter implements ExceptionFilter {
     catch(exception: unknown, host: ArgumentsHost) {
       // تحسين logging و error responses
     }
   }
   ```

3. **Rollback إذا لزم الأمر:**
   ```bash
   kubectl rollout undo deployment/kaleem-api
   ```

### إذا كان السبب قاعدة البيانات أو Redis:

1. **فحص حالة الخدمات:**

   ```bash
   # MongoDB
   mongosh --eval "db.serverStatus().connections"

   # Redis
   redis-cli ping
   ```

2. **إعادة تشغيل الخدمات المتأثرة:**

   ```bash
   kubectl delete pod <pod-name>  # لإعادة التشغيل
   ```

3. **تعديل الموارد مؤقتاً:**
   ```yaml
   resources:
     requests:
       memory: '1Gi'
       cpu: '500m'
     limits:
       memory: '2Gi'
       cpu: '1000m'
   ```

### إذا كانت الطوابير متراكمة (RabbitMQ):

1. **فحص حالة الطوابير:**

   ```bash
   rabbitmqctl list_queues name messages
   ```

2. **توسيع المستهلكين:**

   ```typescript
   // في Worker configuration
   consumerOptions: {
     prefetchCount: 50; // زيادة من القيمة الافتراضية
   }
   ```

3. **إضافة مستهلكين إضافيين:**
   ```bash
   kubectl scale deployment worker-deployment --replicas=5
   ```

## ما بعد الحادثة

### 1. إضافة تنبيهات تخصصية:

```yaml
# في alerts
- alert: SpecificRouteHighErrorRate
  expr: rate(http_requests_total{route="/api/products"}[5m]) > 0.1
  labels:
    severity: critical
```

### 2. تحسين مراقبة المسار المتأثر:

```typescript
// إضافة metrics خاصة بالمسار
this.metrics.incError(route, error.type);
```

### 3. إنشاء تقرير RCA:

```markdown
# Root Cause Analysis - API High Error Rate

## Timeline

- Detection: 2025-01-13 14:30 UTC
- Resolution: 2025-01-13 15:15 UTC

## Root Cause

[وصف السبب الجذري]

## Impact

[تأثير على المستخدمين والأعمال]

## Resolution

[خطوات الحل المطبقة]

## Prevention

[إجراءات وقائية للمستقبل]
```

### 4. تحديث Runbook:

- إضافة الدروس المستفادة
- تحسين خطوات التشخيص
- إضافة automation scripts إن أمكن

## أدوات التشخيص السريع

### Query للبحث عن الأخطاء:

```bash
# في Loki
{job="kaleem-api"} | json | status_code >= 500 | line_format "{{.message}}"
```

### فحص قاعدة البيانات:

```javascript
// في MongoDB
db.products.find({}).explain('executionStats');
```

### مراقبة الطوابير:

```bash
watch -n 5 'rabbitmqctl list_queues name messages consumers'
```

## المراجع

- [Grafana Dashboards](https://grafana.kaleem-ai.com/)
- [Loki Logs](https://loki.kaleem-ai.com/)
- [Tempo Traces](https://tempo.kaleem-ai.com/)
- [AlertManager](https://alertmanager.kaleem-ai.com/)

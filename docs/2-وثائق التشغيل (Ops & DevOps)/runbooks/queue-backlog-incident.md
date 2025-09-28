# Runbook — Queue Backlog (تراكم الطابور)

## نظرة عامة

حادث: تراكم الرسائل في الطوابير (RabbitMQ/Redis Queue) مما يؤدي لتأخر في المعالجة.

**الأولوية**: عالية (P1) - يؤثر على معالجة المهام
**MTTR هدف**: 10 دقائق
**MTTD هدف**: 2 دقيقة

## مخطط الإجراءات (Action Flowchart)

```mermaid
flowchart TD
    A[تلقي التنبيه<br/>Queue Backlog] --> B{فحص حالة الطابور<br/>Queue Status}

    B --> C{عدد الرسائل عالي؟}

    C -->|نعم| D[فحص Workers<br/>Worker Status]

    C -->|لا| E[فحص الشبكة<br/>Network Issues]

    D --> F{Workers نشطة؟}

    F -->|نعم| G[فحص نوع الرسائل<br/>Message Types]

    F -->|لا| H[إعادة تشغيل Workers<br/>Restart Workers]

    G --> I{رسائل معقدة؟}

    I -->|نعم| J[زيادة Workers<br/>Scale Workers]

    I -->|لا| K[فحص الاتصالات<br/>Connection Issues]

    H --> L{نجح إعادة التشغيل؟}

    L -->|نعم| M[مراقبة الطابور<br/>Monitor Queue]

    L -->|لا| N[فحص موارد النظام<br/>System Resources]

    N --> O{موارد كافية؟}

    O -->|نعم| P[فحص التكوين<br/>Configuration]

    O -->|لا| Q[زيادة الموارد<br/>Scale Resources]

    P --> R{التكوين صحيح؟}

    R -->|نعم| S[فحص قاعدة البيانات<br/>Database Issues]

    R -->|لا| T[إصلاح التكوين<br/>Fix Configuration]

    S --> U{قاعدة البيانات متاحة؟}

    U -->|نعم| V[تشخيص متقدم<br/>Advanced Diagnostics]

    U -->|لا| W[إصلاح قاعدة البيانات<br/>Fix Database]

    V --> X{تم حل المشكلة؟}

    X -->|نعم| Y[التحقق النهائي<br/>Final Verification]

    X -->|لا| Z[تصعيد للفريق<br/>Team Escalation]

    Y --> AA[إعادة التنبيه<br/>Alert Recovery]

    Z --> BB[إشعار الإدارة<br/>Management Notification]

    K --> X
    E --> X
    J --> X
    M --> X
    Q --> X
    T --> X
    W --> X
```

## مخطط مسؤوليات الفريق (Team Responsibilities Swimlane)

```mermaid
graph TD
    subgraph "الكشف والتشخيص"
        Alert[AlertManager<br/>كشف التراكم] --> DevOps[DevOps Engineer<br/>التحقق الأولي]
        DevOps --> QueueAdmin[Queue Administrator<br/>تشخيص الطوابير]
    end

    subgraph "الحلول الفورية"
        QueueAdmin --> WorkerRestart[إعادة تشغيل Workers<br/>Worker Restart]
        QueueAdmin --> ScaleWorkers[زيادة عدد Workers<br/>Worker Scaling]
        QueueAdmin --> ConfigFix[إصلاح التكوين<br/>Configuration Fix]
    end

    subgraph "التحقق والمراقبة"
        WorkerRestart --> QueueCheck[فحص حالة الطابور<br/>Queue Check]
        ScaleWorkers --> QueueCheck
        ConfigFix --> QueueCheck
        QueueCheck --> MetricsMonitor[مراقبة المقاييس<br/>Metrics Monitoring]
    end

    subgraph "التصعيد"
        MetricsMonitor -->|إذا استمر| OnCall[On-Call Engineer<br/>التصعيد]
        OnCall -->|إذا استمر| Manager[Engineering Manager<br/>إشعار الإدارة]
    end

    subgraph "ما بعد الحادثة"
        Manager --> RCA[تحليل السبب الجذري<br/>Root Cause Analysis]
        RCA --> CodeReview[مراجعة الكود<br/>Code Review]
        CodeReview --> Optimization[تحسينات وقائية<br/>Preventive Measures]
    end

    %% أدوار متعددة
    DevOps -.->|مسؤول عن| WorkerRestart
    DevOps -.->|مسؤول عن| ScaleWorkers
    QueueAdmin -.->|مسؤول عن| WorkerRestart
    QueueAdmin -.->|مسؤول عن| ConfigFix
    DevOps -.->|مسؤول عن| MetricsMonitor
    OnCall -.->|مسؤول عن| RCA
    Manager -.->|مسؤول عن| Optimization

    %% حلقات التغذية الراجعة
    Optimization -.->|يحسن| Alert
    CodeReview -.->|يحسن| Alert
```

## الأعراض والكشف

### الأعراض الرئيسية

- **تنبيهات Grafana**: `rabbitmq_queue_messages > 1000`
- **تأخر في المعالجة**: زمن معالجة أطول من 5 دقائق
- **تراكم في الطوابير**: رسائل معلقة لساعات
- **أخطاء في التطبيق**: Queue timeout أو connection errors

### كيفية الكشف

```yaml
# alerts/queue-backlog.yml
groups:
  - name: queues
    rules:
      - alert: QueueBacklogDetected
        expr: rabbitmq_queue_messages > 1000
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: 'تراكم في الطوابير'
          runbook_url: 'https://kb.kaleem-ai.com/runbooks/queue-backlog-incident'
```

## خطوات الحل

### الحلول الفورية (المستوى 1)

```bash
# إعادة تشغيل Workers
kubectl rollout restart deployment/workers

# زيادة عدد Workers
kubectl scale deployment workers --replicas=5

# فحص حالة الطوابير
kubectl exec rabbitmq-pod -- rabbitmqctl list_queues
```

### الحلول المتقدمة (المستوى 2)

```typescript
// تحسين معالجة الرسائل
async processMessageOptimized(message: any) {
  // معالجة بالتوازي
  const promises = messages.map(msg => this.processSingle(msg));
  await Promise.allSettled(promises);

  // تنظيف الطابور
  await this.queue.purge();
}
```

## التحقق والمراقبة

```bash
# فحص حالة الطوابير
rabbitmqadmin list queues

# فحص Workers
kubectl top pods -l app=workers

# مراقبة المقاييس
curl http://localhost:3000/metrics | grep queue
```

---

_تم إنشاء هذا الـ runbook بواسطة فريق العمليات في كليم_

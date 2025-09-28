# Runbook — API Overload (تحميل زائد على API)

## نظرة عامة

حادث: زيادة مفاجئة في طلبات API تؤدي لتدهور الأداء أو فشل الخدمة.

**الأولوية**: حرجة (P0) - يوقف الخدمة للمستخدمين
**MTTR هدف**: 5 دقائق
**MTTD هدف**: 1 دقيقة

## مخطط الإجراءات (Action Flowchart)

```mermaid
flowchart TD
    A[تلقي التنبيه<br/>API Overload] --> B{فحص المقاييس<br/>API Metrics}

    B --> C{عدد الطلبات عالي؟}

    C -->|نعم| D[فحص مصادر الطلبات<br/>Request Sources]

    C -->|لا| E[فحص زمن الاستجابة<br/>Response Time]

    D --> F{طلبات من مصدر واحد؟}

    F -->|نعم| G[حظر المصدر المسيء<br/>Block Malicious Source]

    F -->|لا| H[فحص نوع الطلبات<br/>Request Types]

    E --> I{زمن الاستجابة عالي؟}

    I -->|نعم| J[فحص قاعدة البيانات<br/>Database Load]

    I -->|لا| K[فحص الكاش<br/>Cache Performance]

    H --> L{طلبات غير طبيعية؟}

    L -->|نعم| M[تفعيل Rate Limiting<br/>Enable Rate Limiting]

    L -->|لا| N[فحص الشبكة<br/>Network Issues]

    J --> O{قاعدة البيانات مكتظة؟}

    O -->|نعم| P[تحسين الاستعلامات<br/>Query Optimization]

    O -->|لا| Q[زيادة موارد DB<br/>Scale Database]

    K --> R{الكاش فعال؟}

    R -->|نعم| S[فحص التطبيق<br/>Application Issues]

    R -->|لا| T[تحسين الكاش<br/>Cache Optimization]

    N --> U{مشكلة شبكة؟}

    U -->|نعم| V[إصلاح الشبكة<br/>Network Fix]

    U -->|لا| W[فحص Load Balancer<br/>Load Balancer Issues]

    P --> X{تحسن الأداء؟}

    Q --> X

    T --> X

    M --> X

    G --> X

    X -->|نعم| Y[التحقق النهائي<br/>Final Verification]

    X -->|لا| Z[تصعيد للفريق<br/>Team Escalation]

    Y --> AA[إعادة التنبيه<br/>Alert Recovery]

    Z --> BB[إشعار الإدارة<br/>Management Notification]

    S --> X
    V --> X
    W --> X
```

## مخطط مسؤوليات الفريق (Team Responsibilities Swimlane)

```mermaid
graph TD
    subgraph "الكشف والتشخيص"
        Alert[AlertManager<br/>كشف التحميل الزائد] --> DevOps[DevOps Engineer<br/>التحقق الأولي]
        DevOps --> Backend[Backend Developer<br/>تحليل API]
    end

    subgraph "الحلول الفورية"
        DevOps --> RateLimit[تفعيل Rate Limiting<br/>Immediate Protection]
        DevOps --> ScaleAPI[زيادة موارد API<br/>API Scaling]
        Backend --> QueryOpt[تحسين الاستعلامات<br/>Query Optimization]
    end

    subgraph "التحقق والمراقبة"
        RateLimit --> APICheck[فحص حالة API<br/>API Health Check]
        ScaleAPI --> APICheck
        QueryOpt --> APICheck
        APICheck --> MetricsMonitor[مراقبة المقاييس<br/>Metrics Monitoring]
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
    DevOps -.->|مسؤول عن| RateLimit
    DevOps -.->|مسؤول عن| ScaleAPI
    Backend -.->|مسؤول عن| QueryOpt
    Backend -.->|مسؤول عن| CodeReview
    DevOps -.->|مسؤول عن| MetricsMonitor
    OnCall -.->|مسؤول عن| RCA
    Manager -.->|مسؤول عن| Optimization

    %% حلقات التغذية الراجعة
    Optimization -.->|يحسن| Alert
    CodeReview -.->|يحسن| Alert
```

## الأعراض والكشف

### الأعراض الرئيسية

- **تنبيهات Grafana**: `http_requests_total > 10000` أو `response_time > 2s`
- **بطء في الاستجابة**: زمن استجابة أطول من 2 ثانية
- **أخطاء 5xx**: زيادة في معدل الأخطاء
- **ارتفاع استخدام CPU**: لخوادم API

### كيفية الكشف

```yaml
# alerts/api-overload.yml
groups:
  - name: api
    rules:
      - alert: APIOverloadDetected
        expr: |
          (rate(http_requests_total[5m]) > 10000) OR
          (histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 2)
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: 'تحميل زائد على API'
          runbook_url: 'https://kb.kaleem-ai.com/runbooks/api-overload-incident'
```

## خطوات الحل

### الحلول الفورية (المستوى 1)

```bash
# تفعيل Rate Limiting
kubectl patch deployment kaleem-api -p '{"spec":{"template":{"spec":{"containers":[{"name":"kaleem-api","env":[{"name":"RATE_LIMIT_ENABLED","value":"true"}]}]}}}}'

# زيادة موارد API
kubectl scale deployment kaleem-api --replicas=5

# حظر IPs المسيئة
kubectl exec nginx-pod -- iptables -A INPUT -s 192.168.1.100 -j DROP
```

### الحلول المتقدمة (المستوى 2)

```typescript
// تحسين الاستعلامات
async getOptimizedData(query: any) {
  // استخدام database indexes
  // تقليل عدد الاستعلامات
  // إضافة pagination
}
```

## التحقق والمراقبة

```bash
# فحص حالة API
curl http://localhost:3000/health

# فحص المقاييس
curl http://localhost:3000/metrics | grep http

# فحص Load Balancer
kubectl get svc nginx-service
```

---

_تم إنشاء هذا الـ runbook بواسطة فريق العمليات في كليم_

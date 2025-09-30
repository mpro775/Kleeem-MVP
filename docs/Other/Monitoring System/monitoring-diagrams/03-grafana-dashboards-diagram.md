# مخطط لوحات Grafana

## 📊 مخطط لوحات Grafana

```mermaid
graph TB
    %% مصادر البيانات
    subgraph "Data Sources"
        P["📈 Prometheus<br/>Metrics"]
        L["📚 Loki<br/>Logs"]
        T["🔍 Tempo<br/>Traces"]
    end

    %% لوحات Grafana
    subgraph "Grafana Dashboards"
        D1["🖥️ System Overview<br/>CPU, Memory, Disk"]
        D2["📊 Application Metrics<br/>HTTP, Business Logic"]
        D3["🤖 RAG & AI<br/>Embeddings, Vector Search"]
        D4["🗄️ Database<br/>MongoDB, Redis, Qdrant"]
        D5["🔒 Security<br/>Auth, Rate Limiting"]
        D6["📊 Performance<br/>Response Times, Throughput"]
    end

    %% المستخدمون
    subgraph "Users"
        U1["👨‍💻 DevOps Engineer"]
        U2["👤 Backend Developer"]
        U3["👤 AI Engineer"]
        U4["👤 Security Team"]
    end

    %% العلاقات
    P --> D1
    P --> D2
    P --> D3
    P --> D4
    P --> D5
    P --> D6

    L --> D1
    L --> D2
    L --> D5

    T --> D2
    T --> D6

    D1 --> U1
    D2 --> U2
    D3 --> U3
    D4 --> U2
    D5 --> U4
    D6 --> U1
```

## 📋 وصف اللوحات

### مصادر البيانات (Data Sources)

- **Prometheus**: مقاييس النظام والتطبيق
- **Loki**: سجلات التطبيق والنظام
- **Tempo**: آثار التتبع الموزع

### لوحات Grafana (Grafana Dashboards)

- **System Overview**: نظرة عامة على النظام
- **Application Metrics**: مقاييس التطبيق
- **RAG & AI**: مقاييس الذكاء الاصطناعي
- **Database**: مقاييس قواعد البيانات
- **Security**: مقاييس الأمان
- **Performance**: مقاييس الأداء

### المستخدمون (Users)

- **DevOps Engineer**: مراقبة النظام والأداء
- **Backend Developer**: مراقبة التطبيق وقواعد البيانات
- **AI Engineer**: مراقبة الذكاء الاصطناعي
- **Security Team**: مراقبة الأمان

## 🔗 اللوحات الفعلية المُطبقة

| اللوحة              | الملف الفعلي                                    | المستخدم          | الحالة |
| ------------------- | ---------------------------------------------- | ----------------- | ------ |
| API Health          | `api-health.json`                             | Backend Developer | ✅ مُطبق |
| Business KPIs       | `business-kpis.json`                          | Product Manager   | ✅ مُطبق |
| System Overview     | `system-overview.json` (مستقبلاً)             | DevOps Engineer   | 🔄 مخطط |
| RAG & AI            | `ai-metrics.json` (مستقبلاً)                  | AI Engineer       | 🔄 مخطط |
| Database            | `database-metrics.json` (مستقبلاً)            | Backend Developer | 🔄 مخطط |
| Security            | `security-metrics.json` (مستقبلاً)            | Security Team     | 🔄 مخطط |

### اللوحات المُطبقة فعلياً

#### 1. API Health Dashboard
**الملف**: `api-health.json`
**المقاييس**:
- Request Rate (RPS) حسب المسار والطريقة
- Error Rate (5xx %) مع فلترة
- Latency p95 (s) حسب المسار
- DB Query p95 (s) حسب العملية والمجموعة
- Cache Hit Rate (%)
- WS Active Connections

#### 2. Business KPIs Dashboard
**الملف**: `business-kpis.json`
**المقاييس**:
- Merchants Created (معدل/5دقائق)
- n8n Workflows Created (معدل/5دقائق)
- Products Created/Updated/Deleted
- Active Merchants
- Email Verification Success/Failure
- Password Changes

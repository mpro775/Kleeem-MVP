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

## 🔗 روابط اللوحات

| اللوحة              | الرابط                                                | المستخدم          |
| ------------------- | ----------------------------------------------------- | ----------------- |
| System Overview     | `https://grafana.kaleem-ai.com/d/system-overview`     | DevOps Engineer   |
| Application Metrics | `https://grafana.kaleem-ai.com/d/application-metrics` | Backend Developer |
| RAG & AI            | `https://grafana.kaleem-ai.com/d/rag-ai-metrics`      | AI Engineer       |
| Database            | `https://grafana.kaleem-ai.com/d/database-metrics`    | Backend Developer |
| Security            | `https://grafana.kaleem-ai.com/d/security-metrics`    | Security Team     |
| Performance         | `https://grafana.kaleem-ai.com/d/performance-metrics` | DevOps Engineer   |

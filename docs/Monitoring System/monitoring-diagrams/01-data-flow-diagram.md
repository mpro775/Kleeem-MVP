# مخطط تدفق البيانات في نظام المراقبة

## 📊 مخطط تدفق البيانات

```mermaid
graph TB
    %% مصادر البيانات
    subgraph "Data Sources"
        App["📱 Application<br/>NestJS + Workers"]
        DB["🗄️ Databases<br/>MongoDB, Redis, Qdrant"]
        Queue["🐰 Message Queues<br/>RabbitMQ, Bull"]
        System["🖥️ System<br/>Docker, Nginx"]
    end

    %% جمع البيانات
    subgraph "Data Collection"
        Promtail["📝 Promtail<br/>Log Collection"]
        Exporters["📊 Exporters<br/>Node, Redis, MongoDB"]
        OTEL["🔍 OpenTelemetry<br/>Tracing"]
    end

    %% تخزين البيانات
    subgraph "Data Storage"
        Loki["📚 Loki<br/>Log Storage"]
        Prometheus["📈 Prometheus<br/>Metrics Storage"]
        Tempo["🔍 Tempo<br/>Trace Storage"]
    end

    %% المراقبة والتنبيهات
    subgraph "Monitoring & Alerting"
        Grafana["📊 Grafana<br/>Dashboards"]
        AlertManager["🚨 AlertManager<br/>Alert Management"]
        Telegram["📱 Telegram<br/>Notifications"]
    end

    %% العلاقات
    App --> Promtail
    DB --> Exporters
    Queue --> Exporters
    System --> Promtail

    Promtail --> Loki
    Exporters --> Prometheus
    OTEL --> Tempo

    Loki --> Grafana
    Prometheus --> Grafana
    Tempo --> Grafana

    Prometheus --> AlertManager
    AlertManager --> Telegram
```

## 📋 وصف المكونات

### مصادر البيانات (Data Sources)

- **Application**: التطبيق الرئيسي والعمال
- **Databases**: قواعد البيانات المختلفة
- **Message Queues**: طوابير الرسائل
- **System**: النظام والخدمات

### جمع البيانات (Data Collection)

- **Promtail**: جمع السجلات من الحاويات
- **Exporters**: جمع المقاييس من الخدمات
- **OpenTelemetry**: جمع الآثار الموزعة

### تخزين البيانات (Data Storage)

- **Loki**: تخزين السجلات
- **Prometheus**: تخزين المقاييس
- **Tempo**: تخزين الآثار

### المراقبة والتنبيهات (Monitoring & Alerting)

- **Grafana**: عرض البيانات واللوحات
- **AlertManager**: إدارة التنبيهات
- **Telegram**: إرسال التنبيهات

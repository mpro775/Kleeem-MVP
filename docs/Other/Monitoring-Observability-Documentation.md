# وثيقة نظام المراقبة والمراقبة - منصة Kaleem

## 📋 نظرة عامة

هذه الوثيقة تصف نظام المراقبة والمراقبة الشامل في منصة Kaleem، والذي يتضمن جمع السجلات (Loki/Promtail)، المقاييس (Prometheus)، التتبع الموزع (Tempo)، لوحات Grafana، والتنبيهات (Alerts/SLO).

---

## 📊 مصادر السجلات (Log Sources)

### 1. مصادر السجلات الرئيسية

#### أ) سجلات التطبيق (Application Logs)

- **المصدر**: NestJS Application + Workers
- **التقنية**: Pino Logger
- **المستوى**: `debug` (development) / `info` (production)
- **التنسيق**: JSON structured logs
- **المحتوى**:
  - HTTP requests/responses
  - Database queries
  - Business logic events
  - Error traces
  - Performance metrics

#### ب) سجلات الحاويات (Container Logs)

- **المصدر**: Docker containers
- **التقنية**: Docker logging driver
- **المحتوى**:
  - Container startup/shutdown
  - Health check results
  - Resource usage
  - System events

#### ج) سجلات قاعدة البيانات (Database Logs)

- **MongoDB**: Query logs, connection logs, slow queries
- **Redis**: Command logs, connection logs, memory usage
- **Qdrant**: Search logs, indexing logs, performance metrics

#### د) سجلات الشبكة (Network Logs)

- **Nginx**: Access logs, error logs, rate limiting
- **Load Balancer**: Connection logs, health checks

### 2. تكوين Promtail

```yaml
# observability/promtail/config.yml
server:
  http_listen_port: 9080
  grpc_listen_port: 0

clients:
  - url: http://loki:3100/loki/api/v1/push

positions:
  filename: /tmp/positions.yaml

scrape_configs:
  - job_name: docker-logs
    docker_sd_configs:
      - host: unix:///var/run/docker.sock
        refresh_interval: 10s
    pipeline_stages:
      - docker: {}
    relabel_configs:
      - source_labels: ["__meta_docker_container_name"]
        regex: "/(.*)"
        target_label: "container"
      - source_labels: ["__meta_docker_container_log_stream"]
        target_label: "stream"
      - source_labels:
          ["__meta_docker_container_label_com_docker_compose_service"]
        target_label: "service"
      - source_labels:
          ["__meta_docker_container_label_com_docker_compose_project"]
        target_label: "compose_project"
```

### 3. تكوين Loki

```yaml
# observability/loki/config.yml
auth_enabled: false
server:
  http_listen_port: 3100

common:
  path_prefix: /loki
  storage:
    filesystem:
      chunks_directory: /loki/chunks
      rules_directory: /loki/rules
  replication_factor: 1
  ring:
    instance_addr: 127.0.0.1
    kvstore:
      store: inmemory

schema_config:
  configs:
    - from: 2020-10-24
      store: boltdb-shipper
      object_store: filesystem
      schema: v13
      index:
        prefix: index_
        period: 24h

limits_config:
  ingestion_rate_mb: 16
  ingestion_burst_size_mb: 32
  max_global_streams_per_user: 0
  reject_old_samples: true
  reject_old_samples_max_age: 168h
```

---

## 📈 المقاييس (Metrics)

### 1. مصادر المقاييس

#### أ) مقاييس التطبيق (Application Metrics)

- **HTTP Requests**: `http_requests_total`, `http_request_duration_seconds`
- **Business Metrics**: `conversations_total`, `messages_processed_total`
- **Error Rates**: `http_errors_total`, `business_errors_total`
- **Performance**: `response_time_histogram`, `memory_usage_gauge`

#### ب) مقاييس النظام (System Metrics)

- **CPU Usage**: `container_cpu_usage_seconds_total`
- **Memory Usage**: `container_memory_usage_bytes`
- **Disk Usage**: `container_fs_usage_bytes`
- **Network**: `container_network_receive_bytes_total`

#### ج) مقاييس قواعد البيانات (Database Metrics)

- **MongoDB**: `mongodb_connections_current`, `mongodb_operations_total`
- **Redis**: `redis_connected_clients`, `redis_commands_processed_total`
- **Qdrant**: `qdrant_collections_total`, `qdrant_points_total`

#### د) مقاييس الرسائل (Message Queue Metrics)

- **RabbitMQ**: `rabbitmq_queue_messages`, `rabbitmq_consumers_total`
- **Bull Queues**: `bull_jobs_total`, `bull_jobs_failed_total`

### 2. تكوين Prometheus

```yaml
# observability/prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s
  external_labels:
    cluster: kaleem

alerting:
  alertmanagers:
    - static_configs:
        - targets: ["kaleem-alertmanager:9093"]

rule_files:
  - /etc/prometheus/alerts/*.yml

scrape_configs:
  - job_name: "prometheus"
    static_configs:
      - targets: ["localhost:9090"]

  - job_name: "api"
    metrics_path: /metrics
    static_configs:
      - targets: ["kaleem-api:3000"]

  - job_name: "ai-reply-worker"
    metrics_path: /metrics
    static_configs:
      - targets: ["kaleem-ai-reply:9101"]

  - job_name: "webhook-dispatcher"
    metrics_path: /metrics
    static_configs:
      - targets: ["kaleem-webhook-dispatcher:9102"]

  - job_name: "indexing-worker"
    metrics_path: /metrics
    static_configs:
      - targets: ["kaleem-indexing:9103"]

  - job_name: "rabbitmq"
    static_configs:
      - targets: ["kaleem-rabbitmq:15692"]

  - job_name: "redis"
    static_configs:
      - targets: ["kaleem-redis-exporter:9121"]

  - job_name: "mongodb"
    static_configs:
      - targets: ["kaleem-mongodb-exporter:9216"]

  - job_name: "cadvisor"
    static_configs:
      - targets: ["kaleem-cadvisor:8080"]

  - job_name: "node"
    static_configs:
      - targets: ["kaleem-node-exporter:9100"]

  - job_name: "otel-collector"
    static_configs:
      - targets: ["otel-collector:8889"]
```

### 3. مقاييس مخصصة (Custom Metrics)

```typescript
// src/metrics/business.metrics.ts
export class BusinessMetrics {
  private readonly conversationsTotal = new Counter({
    name: "conversations_total",
    help: "Total number of conversations",
    labelNames: ["merchant_id", "channel", "status"],
  });

  private readonly messagesProcessed = new Counter({
    name: "messages_processed_total",
    help: "Total number of messages processed",
    labelNames: ["merchant_id", "type", "status"],
  });

  private readonly embeddingGenerationTime = new Histogram({
    name: "embedding_generation_seconds",
    help: "Time taken to generate embeddings",
    labelNames: ["model", "text_length"],
    buckets: [0.1, 0.5, 1, 2, 5, 10],
  });

  private readonly vectorSearchTime = new Histogram({
    name: "vector_search_seconds",
    help: "Time taken for vector search",
    labelNames: ["collection", "top_k"],
    buckets: [0.01, 0.05, 0.1, 0.5, 1, 2],
  });
}
```

---

## 🔍 التتبع الموزع (Distributed Tracing)

### 1. تكوين OpenTelemetry

```yaml
# observability/otel/config.yaml
receivers:
  otlp:
    protocols:
      http:
        endpoint: 0.0.0.0:4318
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  batch:

exporters:
  otlphttp/tempo:
    endpoint: http://tempo:3200
    url_path: /api/traces
  debug:
    verbosity: basic

extensions:
  health_check:
  cors:
    allowed_origins:
      - https://kaleem-ai.com
      - https://*.kaleem-ai.com
    allowed_headers:
      [
        "Content-Type",
        "Accept",
        "User-Agent",
        "Traceparent",
        "Baggage",
        "Authorization",
      ]
    max_age: 7200

service:
  telemetry:
    logs:
      level: "info"
    metrics:
      address: "0.0.0.0:8889"
  extensions: [health_check, cors]
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlphttp/tempo]
```

### 2. تكوين Tempo

```yaml
# observability/tempo/tempo.yml
server:
  http_listen_port: 3200

distributor:
  receivers:
    otlp:
      protocols:
        http:
          endpoint: 0.0.0.0:4318
        grpc:
          endpoint: 0.0.0.0:4317

storage:
  trace:
    backend: local
    wal:
      path: /var/tempo/wal
    local:
      path: /var/tempo/blocks

compactor:
  compaction:
    block_retention: 48h
```

### 3. التتبع في التطبيق

```typescript
// src/tracing.ts
import { NodeSDK } from "@opentelemetry/sdk-node";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";

const sdk = new NodeSDK({
  traceExporter: new OTLPTraceExporter({
    url:
      process.env.OTEL_EXPORTER_OTLP_ENDPOINT ||
      "http://localhost:4318/v1/traces",
  }),
  instrumentations: [getNodeAutoInstrumentations()],
});

sdk.start();
```

---

## 📊 لوحات Grafana

### 1. مصادر البيانات (Data Sources)

```yaml
# observability/grafana/datasource.yml
apiVersion: 1
datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
    editable: true

  - name: Loki
    type: loki
    access: proxy
    url: http://loki:3100
    isDefault: false
    editable: true

  - name: Tempo
    type: tempo
    access: proxy
    url: http://tempo:3200
    isDefault: false
    editable: true
```

### 2. لوحات المراقبة الرئيسية

#### أ) لوحة النظام العامة (System Overview)

- **URL**: `https://grafana.kaleem-ai.com/d/system-overview`
- **المحتوى**:
  - CPU Usage across all containers
  - Memory Usage trends
  - Disk I/O metrics
  - Network traffic
  - Container health status

#### ب) لوحة التطبيق (Application Dashboard)

- **URL**: `https://grafana.kaleem-ai.com/d/application-metrics`
- **المحتوى**:
  - HTTP request rate and latency
  - Error rates by endpoint
  - Business metrics (conversations, messages)
  - Database performance
  - Queue processing rates

#### ج) لوحة RAG والذكاء الاصطناعي (RAG & AI Dashboard)

- **URL**: `https://grafana.kaleem-ai.com/d/rag-ai-metrics`
- **المحتوى**:
  - Embedding generation time
  - Vector search performance
  - Knowledge base statistics
  - AI model response times
  - Document processing rates

#### د) لوحة قاعدة البيانات (Database Dashboard)

- **URL**: `https://grafana.kaleem-ai.com/d/database-metrics`
- **المحتوى**:
  - MongoDB connection pool
  - Redis memory usage
  - Qdrant collection stats
  - Query performance
  - Index usage

#### هـ) لوحة الرسائل والطوابير (Message Queue Dashboard)

- **URL**: `https://grafana.kaleem-ai.com/d/queue-metrics`
- **المحتوى**:
  - RabbitMQ queue lengths
  - Message processing rates
  - Consumer health
  - Dead letter queues
  - Bull queue statistics

### 3. لوحات متخصصة

#### أ) لوحة الأمان (Security Dashboard)

- **URL**: `https://grafana.kaleem-ai.com/d/security-metrics`
- **المحتوى**:
  - Failed authentication attempts
  - Rate limiting violations
  - Suspicious activity patterns
  - API key usage
  - Security events

#### ب) لوحة الأداء (Performance Dashboard)

- **URL**: `https://grafana.kaleem-ai.com/d/performance-metrics`
- **المحتوى**:
  - Response time percentiles
  - Throughput metrics
  - Resource utilization
  - Cache hit rates
  - Performance bottlenecks

---

## 🚨 التنبيهات (Alerts)

### 1. تكوين AlertManager

```yaml
# observability/alertmanager.yml
global:
  resolve_timeout: 5m

route:
  receiver: "telegram"
  group_by: ["alertname"]

receivers:
  - name: "telegram"
    telegram_configs:
      - bot_token: "YOUR_BOT_TOKEN"
        chat_id: -7730412580
        parse_mode: "HTML"
        message: |
          <b>{{ .CommonAnnotations.summary }}</b>
          {{ range .Alerts }}
          <pre>{{ .Annotations.description }}</pre>
          {{ end }}
```

### 2. قواعد التنبيه (Alert Rules)

```yaml
# observability/alerts/core.yml
groups:
  - name: core
    rules:
      - alert: APIHighErrorRate
        expr: sum(rate(http_requests_total{job="api",status=~"5.."}[5m]))
          / sum(rate(http_requests_total{job="api"}[5m])) > 0.05
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "API 5xx > 5% لمدة 5 دقائق"
          description: "تحقق من لوجات api و backend."

      - alert: RabbitMQQueueBacklog
        expr: rabbitmq_queue_messages{queue=~".*\\.q$"} > 1000
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "RabbitMQ backlog مرتفع"
          description: "الطابور {{ $labels.queue }} تجاوز 1000 رسالة."

      - alert: InstanceHighCPU
        expr: rate(container_cpu_usage_seconds_total[5m]) > 0.8
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "CPU > 80% لوقت طويل"
          description: "تحقق من الخدمة: {{ $labels.container_label_com_docker_compose_service }}"

      - alert: QdrantDown
        expr: up{job="cadvisor"} < 1 and on() vector(0) == 0
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "تحقق من qdrant"
          description: "جرّب healthcheck و/أو راقب اللوجات عبر Loki."
```

### 3. تنبيهات متخصصة

#### أ) تنبيهات الأداء (Performance Alerts)

```yaml
- alert: HighResponseTime
  expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 2
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "Response time > 2s for 95th percentile"
    description: "API response time is too high"

- alert: LowThroughput
  expr: rate(http_requests_total[5m]) < 10
  for: 10m
  labels:
    severity: warning
  annotations:
    summary: "Low API throughput"
    description: "API request rate is below expected threshold"
```

#### ب) تنبيهات قاعدة البيانات (Database Alerts)

```yaml
- alert: MongoDBHighConnections
  expr: mongodb_connections_current > 80
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "MongoDB connection pool high"
    description: "MongoDB connections: {{ $value }}"

- alert: RedisMemoryHigh
  expr: redis_memory_used_bytes / redis_memory_max_bytes > 0.9
  for: 5m
  labels:
    severity: critical
  annotations:
    summary: "Redis memory usage > 90%"
    description: "Redis memory: {{ $value | humanizePercentage }}"
```

#### ج) تنبيهات RAG والذكاء الاصطناعي (RAG & AI Alerts)

```yaml
- alert: EmbeddingGenerationSlow
  expr: histogram_quantile(0.95, rate(embedding_generation_seconds_bucket[5m])) > 5
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "Embedding generation slow"
    description: "95th percentile embedding time: {{ $value }}s"

- alert: VectorSearchSlow
  expr: histogram_quantile(0.95, rate(vector_search_seconds_bucket[5m])) > 1
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "Vector search slow"
    description: "95th percentile search time: {{ $value }}s"
```

---

## 📊 حدود التنبيه (SLO Breaches)

### 1. Service Level Objectives (SLOs)

#### أ) SLOs الأداء (Performance SLOs)

- **Response Time**: 95% of requests < 500ms
- **Availability**: 99.9% uptime
- **Throughput**: > 1000 requests/minute
- **Error Rate**: < 0.1% of requests

#### ب) SLOs قاعدة البيانات (Database SLOs)

- **Query Time**: 95% of queries < 100ms
- **Connection Pool**: < 80% utilization
- **Cache Hit Rate**: > 90%
- **Index Usage**: > 95% of queries use indexes

#### ج) SLOs RAG والذكاء الاصطناعي (RAG & AI SLOs)

- **Embedding Generation**: 95% < 2 seconds
- **Vector Search**: 95% < 500ms
- **Document Processing**: 95% < 30 seconds
- **AI Response Time**: 95% < 3 seconds

### 2. قواعد SLO Breach

```yaml
- alert: SLOResponseTimeBreach
  expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 0.5
  for: 2m
  labels:
    severity: critical
    slo: "response_time"
  annotations:
    summary: "SLO Breach: Response time > 500ms"
    description: "95th percentile response time: {{ $value }}s"

- alert: SLOAvailabilityBreach
  expr: (up{job="api"} == 0) or (rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m]) > 0.001)
  for: 1m
  labels:
    severity: critical
    slo: "availability"
  annotations:
    summary: "SLO Breach: Availability < 99.9%"
    description: "Service availability compromised"
```

---

## 🔗 الروابط والوصول

### 1. روابط Grafana

| الخدمة          | الرابط                                                | الوصف                   |
| --------------- | ----------------------------------------------------- | ----------------------- |
| Grafana Main    | `https://grafana.kaleem-ai.com`                       | لوحة المراقبة الرئيسية  |
| System Overview | `https://grafana.kaleem-ai.com/d/system-overview`     | نظرة عامة على النظام    |
| Application     | `https://grafana.kaleem-ai.com/d/application-metrics` | مقاييس التطبيق          |
| RAG & AI        | `https://grafana.kaleem-ai.com/d/rag-ai-metrics`      | مقاييس الذكاء الاصطناعي |
| Database        | `https://grafana.kaleem-ai.com/d/database-metrics`    | مقاييس قاعدة البيانات   |
| Security        | `https://grafana.kaleem-ai.com/d/security-metrics`    | مقاييس الأمان           |
| Performance     | `https://grafana.kaleem-ai.com/d/performance-metrics` | مقاييس الأداء           |

### 2. روابط الخدمات الأخرى

| الخدمة          | الرابط                  | الوصف            |
| --------------- | ----------------------- | ---------------- |
| Prometheus      | `http://localhost:9090` | واجهة Prometheus |
| AlertManager    | `http://localhost:9093` | إدارة التنبيهات  |
| Loki            | `http://localhost:3100` | واجهة Loki       |
| Tempo           | `http://localhost:3200` | واجهة Tempo      |
| Redis Commander | `http://localhost:8082` | إدارة Redis      |
| Mongo Express   | `http://localhost:8081` | إدارة MongoDB    |

### 3. معلومات الوصول

- **Grafana Username**: `admin`
- **Grafana Password**: `admin123`
- **Prometheus**: لا يتطلب مصادقة
- **Loki**: لا يتطلب مصادقة
- **Tempo**: لا يتطلب مصادقة

---

## 🛠️ الصيانة والتحسين

### 1. تنظيف البيانات

```bash
# تنظيف سجلات Loki القديمة
curl -X POST "http://localhost:3100/loki/api/v1/admin/delete" \
  -H "Content-Type: application/json" \
  -d '{"query": "{job=\"api\"}", "start": "2024-01-01T00:00:00Z", "end": "2024-01-31T23:59:59Z"}'

# تنظيف مقاييس Prometheus القديمة
# يتم تلقائياً حسب retention policy
```

### 2. مراقبة الأداء

- **مراقبة استخدام الذاكرة**: تتبع استخدام ذاكرة Loki و Prometheus
- **مراقبة التخزين**: مراقبة مساحة القرص المستخدمة
- **مراقبة الشبكة**: تتبع حركة البيانات بين الخدمات
- **مراقبة المعالجة**: تتبع سرعة معالجة السجلات والمقاييس

### 3. النسخ الاحتياطي

- **Grafana**: نسخ احتياطية للوحات والإعدادات
- **Prometheus**: نسخ احتياطية للقواعد والتنبيهات
- **Loki**: نسخ احتياطية للفهارس
- **Tempo**: نسخ احتياطية للآثار

---

## 📋 خطة التطوير المستقبلية

### 1. تحسينات قصيرة المدى (3 أشهر)

- [ ] إضافة لوحات متخصصة للـ RAG
- [ ] تحسين قواعد التنبيه
- [ ] إضافة مراقبة الأمان المتقدمة
- [ ] تحسين واجهة Grafana

### 2. تحسينات متوسطة المدى (6 أشهر)

- [ ] إضافة مراقبة الأعمال (Business Monitoring)
- [ ] تطوير تنبيهات ذكية
- [ ] إضافة تحليلات متقدمة
- [ ] تحسين الأداء

### 3. تحسينات طويلة المدى (12 شهر)

- [ ] إضافة مراقبة متعددة المناطق
- [ ] تطوير نظام تنبيهات متقدم
- [ ] إضافة مراقبة الأمان بالذكاء الاصطناعي
- [ ] تطوير لوحات تفاعلية

---

## 🔗 المراجع والروابط

- [Grafana Documentation](https://grafana.com/docs/)
- [Prometheus Documentation](https://prometheus.io/docs/)
- [Loki Documentation](https://grafana.com/docs/loki/)
- [Tempo Documentation](https://grafana.com/docs/tempo/)
- [OpenTelemetry Documentation](https://opentelemetry.io/docs/)
- [AlertManager Documentation](https://prometheus.io/docs/alerting/latest/alertmanager/)

---

_آخر تحديث: ديسمبر 2024_
_الإصدار: 1.0.0_

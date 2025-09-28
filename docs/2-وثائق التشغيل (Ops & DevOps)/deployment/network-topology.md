# 🌐 Network Topology (الحالي - Docker Compose)

```mermaid
flowchart LR
  subgraph "🌍 Internet"
    Users[Users/Bots/Clients]
    APIs[External APIs]
  end

  subgraph "🔒 Edge Layer"
    Cloudflare[Cloudflare CDN]
    NginxProxy[Nginx Reverse Proxy]
  end

  Users --> Cloudflare --> NginxProxy

  subgraph "🐳 Docker Compose Network"
    subgraph "🚀 Application Services"
      API[Backend API<br/>NestJS + Multi-tenancy]
      Frontend[Frontend<br/>React/Vite SPA]
      N8N[n8n Workflows<br/>Automation]
      Workers[Background Workers<br/>Queue Processing]
    end

    subgraph "💾 Data Services"
      MongoDB[(MongoDB<br/>Primary DB)]
      Redis[(Redis<br/>Cache L1/L2)]
      Qdrant[(Qdrant<br/>Vector DB)]
      MinIO[(MinIO<br/>S3 Storage)]
      RabbitMQ[(RabbitMQ<br/>Message Queue)]
    end

    subgraph "📊 Monitoring (مستقبلي)"
      Prometheus[(Prometheus<br/>Metrics)]
      Grafana[(Grafana<br/>Dashboards)]
      Loki[(Loki<br/>Logs)]
    end
  end

  %% External connections
  APIs -.->|Webhook Calls| N8N
  APIs -.->|API Calls| API

  %% Internal service connections
  NginxProxy -->|HTTPS| Frontend
  NginxProxy -->|HTTP/HTTPS| API
  NginxProxy -->|HTTPS| N8N

  API <-->|TCP| MongoDB
  API <-->|TCP| Redis
  API <-->|HTTP| Qdrant
  API <-->|HTTP| MinIO
  API <-->|AMQP| RabbitMQ

  N8N <-->|HTTP| API
  N8N <-->|TCP| MongoDB
  N8N <-->|AMQP| RabbitMQ

  Workers <-->|AMQP| RabbitMQ
  Workers <-->|HTTP| API

  %% Monitoring connections (مستقبلي)
  API -.->|Metrics| Prometheus
  N8N -.->|Metrics| Prometheus
  API -.->|Logs| Loki
  Frontend -.->|Logs| Loki
  Grafana --> Prometheus
  Grafana --> Loki
```

## 🏗️ **البنية التحتية الحالية**

### Environment Setup
- **Single VPS**: Ubuntu Server مع Docker + Docker Compose
- **Domain**: `kaleem-ai.com` مع Cloudflare DNS
- **SSL/TLS**: Cloudflare SSL certificates
- **Load Balancing**: Nginx reverse proxy (single instance)

### Service Architecture
- **API Gateway**: Nginx handles routing and SSL termination
- **Service Discovery**: Docker Compose internal networking
- **Database**: MongoDB replica set (single node currently)
- **Cache**: Redis standalone instance
- **Vector DB**: Qdrant standalone instance
- **Storage**: MinIO S3-compatible storage

### Security Layers
- **Perimeter**: Cloudflare WAF + DDoS protection
- **Transport**: HTTPS/TLS encryption everywhere
- **Application**: JWT authentication + rate limiting
- **Network**: Internal Docker network isolation
- **Container**: Non-root users + minimal privileges

## 🔮 **خارطة الطريق المستقبلية**

### Kubernetes Migration
```mermaid
flowchart TD
  A[Current: Docker Compose] --> B[Phase 1: k8s manifests]
  B --> C[Phase 2: Multi-environment]
  C --> D[Phase 3: Auto-scaling]
  D --> E[Phase 4: Service Mesh]

  F[Single VPS] --> G[Multi-region deployment]
  G --> H[Global load balancing]
  H --> I[CDN integration]
```

### Advanced Features
- **Multi-region**: Disaster recovery across regions
- **Auto-scaling**: HPA + VPA for dynamic scaling
- **Service Mesh**: Istio for traffic management
- **GitOps**: ArgoCD for declarative deployments
- **Policy Engine**: Kyverno for security policies

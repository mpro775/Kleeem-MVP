# C4 Level 2 — Container Diagram
*Last updated: 2025-09-27 18:50*

> **C4 Container Diagram** — Shows the runtime containers, their responsibilities, and relationships within the Kaleem AI platform. This is the intermediate level of C4 model abstraction, focusing on application structure and data flow.

---

## 🎯 Purpose & Scope

**Primary Purpose:** Illustrate the main application containers, their responsibilities, and how they interact to deliver the Kaleem AI platform functionality.

**Scope:** This diagram focuses on **runtime containers** and their relationships rather than infrastructure deployment details. It answers:
- What are the main application components?
- How do they communicate (synchronous vs asynchronous)?
- What external dependencies do they have?

**Target Audience:**
- 👨‍💻 **Backend Engineers** — understand service boundaries and API contracts
- 🛡️ **SRE/DevOps** — plan deployment, scaling, and monitoring strategies
- 🔧 **Frontend Engineers** — understand integration points and data flow
- 📊 **Technical Leads** — assess system complexity and identify coupling points

---

## 🏗️ Diagram Architecture

### Source File
- **Location:** [`kaleem-container.mmd`](./kaleem-container.mmd)
- **Format:** Mermaid flowchart (TD - top-down layout)
- **Generated:** Auto-rendered via CI/CD pipeline

### Visual Organization

The diagram is organized into logical layers:

1. **System Actors** — Users and external clients
2. **Edge/DMZ Layer** — Network perimeter and ingress
3. **Core Application** — Main business logic containers
4. **External Systems** — Third-party services and platforms
5. **Data & Storage** — Persistence and caching layers
6. **Observability** — Monitoring and logging stack
7. **Security & Configuration** — Secret and access management

---

## 👥 System Actors

| Actor | Role | Interaction Method |
|-------|------|-------------------|
| **End Customer** | Service consumer | HTTPS/WebSocket through web interface |
| **Merchant/Store Owner** | Platform administrator | HTTPS dashboard access |
| **Webchat Widget** | Embedded customer interface | HTTPS embedded in merchant websites |

---

## 🏢 Container Architecture

### Edge / DMZ Layer
**Network perimeter handling ingress traffic and external API gateways:**

- **Nginx** — TLS termination, reverse proxy, load balancing, static asset serving
- **WhatsApp Evolution API** — Self-hosted WhatsApp Business API gateway for enhanced message handling

### Core Application Layer

#### Frontend Applications
**Client-side interfaces for different user types:**

- **Merchant Dashboard** — React/Vite SPA for store management, analytics, and configuration
- **Webchat Widget** — Embedded chat interface for customer interactions

#### Backend Services
**Core business logic and processing engines:**

- **API Server** — NestJS-based REST/GraphQL API handling HTTP requests and business logic
- **Background Workers** — Node.js processes handling asynchronous jobs, queues, and batch operations
- **n8n Workflow Engine** — Business process automation and integration workflows

#### Data Persistence Layer
**Primary data storage and caching systems:**

- **MongoDB** — Primary document database with multi-tenant collections
- **Redis Cluster** — Distributed cache, session storage, rate limiting, message queues
- **Qdrant** — Vector database for semantic search and similarity matching
- **MinIO** — Object storage for media files, documents, and assets

---

## 🔗 External Systems & Integrations

### External Channels
**Messaging platforms for customer communication:**

- **Telegram Bot API** — Conversational commerce through Telegram bots
- **WhatsApp Cloud API** — Official WhatsApp Business messaging
- **Instagram Basic Display API** — Social commerce integration
- **Facebook Messenger Platform** — Direct messaging capabilities

### E-commerce Platforms
**Store management and order processing integrations:**

- **Salla API** — Saudi Arabian e-commerce platform integration
- **Zid API** — MENA region e-commerce platform
- **Shopify API** — Global e-commerce platform
- **WooCommerce API** — WordPress-based online stores

### AI & ML Services
**External AI processing capabilities:**

- **Google Gemini API** — Primary LLM for conversational AI and text embeddings
- **OpenAI API** — Alternative GPT models for advanced AI features

### Observability & Monitoring
**System monitoring and debugging infrastructure:**

- **Prometheus** — Metrics collection and alerting system
- **Grafana** — Dashboard visualization and alerting interface
- **Loki** — Centralized log aggregation and querying
- **Tempo** — Distributed tracing for request flow analysis

### Security & Configuration
**Secret and access management:**

- **Secrets Manager** — Environment variables, API keys, and sensitive configuration
- **HashiCorp Vault** — Enterprise-grade secret management and encryption

---

## 🔄 System Interactions & Data Flow

### Synchronous Interactions (Real-time)
**Immediate request-response patterns:**

```
Customer/Merchant → HTTPS → Nginx → Load Balanced → API Server
API Server → HTTP → MongoDB (CRUD Operations)
API Server → Cache → Redis (Session/Cache Operations)
API Server → Vector Queries → Qdrant (Semantic Search)
API Server → File Operations → MinIO (Media Management)
API Server → Secret Retrieval → Secrets Manager
```

### Asynchronous Interactions (Background Processing)
**Deferred processing and event-driven patterns:**

```
API Server → Job Queue → Redis → Background Workers
Background Workers → Data Operations → MongoDB
Background Workers → Vector Operations → Qdrant
Background Workers → File Operations → MinIO
Background Workers → Message Publishing → External Channels
Background Workers → AI Processing → Gemini/OpenAI APIs
```

### WhatsApp Evolution Gateway
**Self-hosted WhatsApp Business API handling:**

```
External WhatsApp → Webhook/SendMessage → Evolution API → API Server
```

---

## 📊 Container Responsibilities

| Container | Primary Responsibility | Technology | Scalability |
|-----------|----------------------|------------|-------------|
| **API Server** | HTTP API, Business Logic, Request Routing | NestJS, TypeScript | Horizontal scaling |
| **Background Workers** | Async Jobs, Queue Processing, Integrations | Node.js, TypeScript | Horizontal scaling |
| **n8n Orchestrator** | Workflow Automation, Business Processes | n8n, JavaScript | Single instance |
| **MongoDB** | Document Storage, Multi-tenancy | MongoDB | Read replicas, sharding |
| **Redis** | Cache, Sessions, Queues, Rate Limiting | Redis Cluster | Cluster mode |
| **Qdrant** | Vector Search, Similarity Matching | Qdrant | Horizontal scaling |
| **MinIO** | Object Storage, Media Management | MinIO | Distributed deployment |

---

## 🎨 Visual Design Principles

### Color Coding
- **Blue (Actors)** — System users and external clients
- **Orange (Edge)** — Network perimeter and ingress components
- **Light Blue (Frontend)** — Client-side applications
- **Green (Backend)** — Server-side business logic
- **Red (Database)** — Data persistence and storage
- **Gray (External)** — Third-party systems and APIs
- **Slate (Monitoring)** — Observability and logging
- **Orange (Security)** — Security and configuration management

### Layout Strategy
- **Top Section:** System actors and entry points
- **Network Perimeter:** Edge/DMZ components
- **Application Core:** Frontend and backend services
- **External Dependencies:** Third-party integrations
- **Data & Monitoring:** Storage and observability stack
- **Connection Style:** Solid arrows for internal, dashed for external

---

## 🔍 Reading the Diagram

### What This Diagram Shows

1. **Application Structure** — Main runtime containers and their purposes
2. **Data Flow Patterns** — Synchronous vs asynchronous communication
3. **External Dependencies** — Integration points with third-party services
4. **Technology Choices** — Framework and database selections
5. **Scalability Boundaries** — Which components can be horizontally scaled

### What This Diagram Does NOT Show

- **Internal Component Details** — See API Components diagram for module structure
- **Infrastructure Topology** — See Deployment diagram for server layout
- **Network Security** — Abstracted to focus on application concerns
- **Data Schema Details** — See ERD documentation for database design

---

## 📈 Integration Complexity Matrix

| Integration Type | Protocol | Frequency | Complexity | Criticality |
|-----------------|----------|-----------|------------|-------------|
| **Messaging APIs** | Webhook/HTTP | High | Medium | High |
| **E-commerce Sync** | Webhook/REST | Medium | High | High |
| **AI Processing** | REST API | Low | Low | Medium |
| **Data Storage** | Native Driver | High | Low | Critical |
| **Monitoring** | Push/Pull | Continuous | Low | High |
| **Security** | Various | Low | Medium | Critical |

---

## 🚀 Operational Considerations

### Deployment Strategy
- **Container Orchestration:** Docker Compose (development), Kubernetes (production)
- **Service Discovery:** Internal DNS and load balancing
- **Configuration Management:** Environment-based configuration with secrets

### Scalability Patterns
- **API Server:** Horizontal scaling with load balancer
- **Background Workers:** Scale based on queue depth
- **Databases:** Read replicas and sharding strategies
- **Cache:** Redis cluster for high availability

### Monitoring & Alerting
- **Application Metrics:** Request latency, error rates, throughput
- **Infrastructure Metrics:** CPU, memory, disk utilization
- **Business Metrics:** Conversion rates, user engagement
- **Alert Routing:** Based on severity and component

---

## 🔧 Development & Testing

### Local Development
- **Docker Compose:** Full stack for local development
- **Hot Reload:** API and frontend development
- **Debug Configuration:** Development-optimized settings

### Testing Strategy
- **Unit Tests:** Individual container logic
- **Integration Tests:** Container-to-container communication
- **E2E Tests:** Full user journey testing
- **Performance Tests:** Load testing and stress testing

---

## 🔗 Related Documentation

### Predecessors
- **[Context Diagram](./context.md)** — System context and external dependencies
- **[System Overview](../../../1-%D9%88%D8%AB%D8%A7%D8%A6%D9%82%20%D8%A7%D9%84%D9%87%D9%86%D8%AF%D8%B3%D8%A9%20%D9%88%D8%A7%D9%84%D8%AA%D8%B7%D9%88%D9%8A%D8%B1/1-%20Architecture%20Docs/1-System%20Overview/Kaleem-System-Overview-EN.md)** — Executive summary

### Successors
- **[API Components](./api-components.md)** — Internal module structure
- **[Full Stack Container](./container-full.md)** — Complete Docker Compose stack
- **[Deployment Diagram](./deployment.md)** — Infrastructure topology

### External References
- **[NestJS Documentation](https://docs.nestjs.com/)** — Backend framework reference
- **[Mermaid Documentation](https://mermaid.js.org/)** — Diagram syntax reference
- **[Docker Documentation](https://docs.docker.com/)** — Container orchestration

---

## 📝 Maintenance & Updates

### Update Triggers
- New service or container introduction
- Changes in technology stack
- Modifications to integration patterns
- Performance or scalability requirements

### Review Cycle
- **Monthly:** Technical accuracy and completeness check
- **Quarterly:** Operational readiness assessment
- **Annually:** Complete architecture review and modernization

### Version History
- **v1.0 (2025-09-27):** Professional C4 Container diagram with detailed interactions
- **v0.1 (2025-09-27):** Basic container layout with core services

---

> **Next Steps:** After understanding container relationships, proceed to **[API Components](./api-components.md)** for internal module architecture, or **[Deployment Diagram](./deployment.md)** for infrastructure layout.

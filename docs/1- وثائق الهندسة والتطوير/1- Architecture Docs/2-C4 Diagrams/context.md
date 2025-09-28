# C4 Level 1 — Context Diagram
*Last updated: 2025-09-27 18:45*

> **C4 Context Diagram** — Shows the Kaleem AI system in its operational environment, including key actors, external systems, and major dependencies. This is the highest level of abstraction in the C4 model.

---

## 🎯 Purpose & Scope

**Primary Purpose:** Provide a "big picture" view of the Kaleem AI ecosystem, showing who interacts with the system and which external systems are critical for its operation.

**Scope:** This diagram focuses on **context** rather than implementation details. It answers:
- Who uses the system?
- What external systems does it depend on?
- What are the major categories of interaction?

**Target Audience:**
- 🏗️ **Product Managers** — understand market positioning and user base
- 👨‍💻 **Engineers** — grasp system boundaries and external interfaces
- 🛡️ **SRE/Security** — identify operational dependencies and security perimeter
- 📊 **Stakeholders** — quick understanding of system ecosystem

---

## 🏗️ Diagram Architecture

### Source File
- **Location:** [`kaleem-context.mmd`](./kaleem-context.mmd)
- **Format:** Mermaid flowchart (TD - top-down layout)
- **Generated:** Auto-rendered via CI/CD pipeline

### Visual Organization

The diagram is organized into logical groupings:

1. **👥 System Actors** — Primary users and operators
2. **🧠 Core System** — The Kaleem AI platform itself
3. **📱 Messaging Channels** — Communication platforms
4. **🛒 E-commerce Platforms** — Store management systems
5. **🤖 AI & ML Services** — AI processing providers
6. **💾 Data & Storage** — Database and storage systems
7. **📊 Observability Stack** — Monitoring and logging
8. **🔐 Security & Configuration** — Secrets and access management

---

## 👥 Key Actors (Personas)

| Actor | Role | Primary Interactions |
|-------|------|---------------------|
| **🏪 Merchant / Store Owner** | System administrator | Configure stores, manage products, monitor analytics |
| **👤 End Customer** | Service consumer | Chat with bots, browse products, place orders |
| **⚙️ Ops / SRE / Security** | Platform operators | Monitor health, manage deployments, ensure security |

---

## 🏢 External Systems & Dependencies

### 📱 Messaging Channels
Communication platforms that customers use to interact with Kaleem-powered bots:

- **Telegram** — Bot API integration for conversational commerce
- **WhatsApp Business** — Cloud API + Evolution API for business messaging
- **Instagram** — IG Business API for social commerce
- **Facebook Messenger** — Messenger Platform for direct messaging

### 🛒 E-commerce Platforms
Store management systems that integrate with Kaleem:

- **Salla** — Saudi Arabian e-commerce platform
- **Zid** — MENA-focused e-commerce solution
- **Shopify** — Global e-commerce platform
- **WooCommerce** — WordPress-based online stores

### 🤖 AI & ML Services
External AI providers for intelligent features:

- **Google Gemini** — Primary LLM for conversational AI and embeddings
- **OpenAI** — Alternative GPT models for advanced AI features

### 💾 Data & Storage Systems
Core data infrastructure:

- **MongoDB** — Primary document database (multi-tenant)
- **Qdrant** — Vector database for semantic search
- **Redis** — In-memory cache and session storage
- **MinIO** — Object storage for media and documents

### 📊 Observability Stack
Monitoring and logging infrastructure:

- **Prometheus** — Metrics collection and alerting
- **Grafana** — Dashboard visualization and alerting
- **Loki** — Centralized log aggregation
- **Tempo** — Distributed tracing system

### 🔐 Security & Configuration
Security and configuration management:

- **Secrets Manager** — Environment variables and API keys
- **HashiCorp Vault** — Enterprise-grade secret management

---

## 🔗 System Interactions

### Actor → System Relationships
```
Merchants → Configure & Monitor → Kaleem AI Platform
Customers → Chat & Shop → Kaleem AI Platform
Ops/SRE → Operate & Secure → Kaleem AI Platform
```

### System → External Dependencies
```
Kaleem AI ←→ Messaging Channels (Message APIs)
Kaleem AI ←→ E-commerce Platforms (Catalog Sync)
Kaleem AI ←→ AI Services (AI Processing)
Kaleem AI ←→ Data Systems (Storage)
Kaleem AI → Observability (Telemetry)
Kaleem AI → Security (Secret Access)
```

---

## 🎨 Visual Design Principles

### Color Coding
- **🟦 Blue (Personas)** — System actors and users
- **🟠 Orange (System)** — Core Kaleem platform
- **🟣 Purple (Channels)** — Messaging platforms
- **🟢 Green (E-commerce)** — Store platforms
- **🟡 Yellow (AI)** — AI and ML services
- **🔴 Pink (Database)** — Data storage systems
- **🔵 Blue (Monitoring)** — Observability tools
- **🔴 Red (Security)** — Security and configuration

### Layout Strategy
- **Top Section:** System actors (left-to-right flow)
- **Center:** Core Kaleem AI system
- **Bottom Sections:** External dependencies (grouped logically)
- **Connection Style:** Solid lines for strong dependencies, dashed for optional

---

## 🔍 Reading the Diagram

### What This Diagram Tells You

1. **System Boundaries** — Clear separation between Kaleem and external systems
2. **Integration Points** — Where Kaleem connects to external services
3. **User Base** — Who uses the system and how
4. **Dependencies** — What external systems Kaleem relies on
5. **Technology Stack** — Major technology categories involved

### What This Diagram Does NOT Show

- **Internal Architecture** — See Container diagrams for implementation details
- **Data Flow Protocols** — Abstracted to focus on relationships
- **Deployment Topology** — See Deployment diagram for infrastructure layout
- **API Contracts** — See API Component diagrams for interface details

---

## 📊 Integration Complexity

| Integration Type | Complexity | Criticality | Notes |
|-----------------|------------|-------------|-------|
| **Messaging APIs** | Medium | High | Real-time customer interactions |
| **E-commerce Sync** | High | High | Product catalog and order management |
| **AI Processing** | Low | Medium | LLM calls and embeddings |
| **Data Storage** | Low | Critical | Core system functionality |
| **Monitoring** | Low | High | Operational visibility |
| **Security** | Medium | Critical | Authentication and secrets |

---

## 🚀 Evolution & Growth

### Current State (v1.0)
- **Primary Focus:** WhatsApp Business integration
- **AI Provider:** Google Gemini
- **Storage:** MongoDB + Qdrant
- **Monitoring:** Prometheus/Grafana stack

### Growth Path (v1.5+)
- **Multi-AI:** Support for multiple AI providers
- **Advanced Storage:** Additional caching layers
- **Enhanced Monitoring:** More sophisticated alerting
- **Security Hardening:** Advanced secret management

---

## 🔗 Related Documentation

### Predecessors
- **[System Overview](../1-System%20Overview/Kaleem-System-Overview-EN.md)** — Executive summary and KPIs
- **[System Overview (AR)](../1-System%20Overview/Kaleem-System-Overview-AR.md)** — Arabic version

### Successors
- **[Container Diagram](./container.md)** — Internal system components
- **[API Components](./api-components.md)** — Module structure and guards
- **[Deployment Diagram](./deployment.md)** — Infrastructure topology

### External References
- **[C4 Model](https://c4model.com/)** — Architectural modeling standard
- **[Mermaid Documentation](https://mermaid.js.org/)** — Diagram syntax reference
- **[Runbooks](../../../2-%D9%88%D8%AB%D8%A7%D8%A6%D9%82%20%D8%A7%D9%84%D8%AA%D8%B4%D8%BA%D9%8A%D9%84%20%28Ops%20&%20DevOps%29/)** — Operational procedures

---

## 📝 Maintenance & Updates

### Update Triggers
- New external system integration
- Changes in technology stack
- Addition of new user personas
- Modifications to system boundaries

### Review Cycle
- **Monthly:** Technical accuracy check
- **Quarterly:** Business alignment review
- **Annually:** Complete architecture audit

### Version History
- **v1.0 (2025-09-27):** Initial professional C4 Context diagram
- **v0.1 (2025-09-27):** Basic structure with key components

---

> **Next Steps:** After understanding the system context, proceed to the **[Container Diagram](./container.md)** for internal architecture details, or **[API Components](./api-components.md)** for module structure.

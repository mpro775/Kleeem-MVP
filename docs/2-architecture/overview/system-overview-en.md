# Kaleem AI — System Overview
*Last updated: 2025-09-27 00:30*

> **One–two page executive‑technical brief** explaining the big picture so any stakeholder (Engineering/Product/SRE/Security) can quickly grasp how Kaleem works and where to dive deeper next (API Docs, Runbooks, ERD, etc.).

---

## 1) Purpose & Scope
**Kaleem AI** is a multi-tenant SaaS platform for intelligent e-commerce that enables merchants to manage their stores and interact with customers across messaging channels (Telegram, WhatsApp Business, Instagram, Facebook Messenger) with advanced semantic search and automated customer service.
This document covers: high-level architecture, primary flows, deployment & operations, security, observability, and integrations.

## 2) Personas & Top Use Cases
- **Merchant / Store Owner**: configure channels, set up storefront, sync products, track conversations and orders.
- **End Customer**: chat with the bot to find products, ask questions, build cart/place orders.
- **Ops/SRE/Security**: operate the platform, monitor health, respond to incidents, manage secrets and access.

**Top 3 use cases**
1) Customer asks about a product → bot runs semantic search → returns compatible products, nudges to cart/order.
2) Customer asks store policy (shipping/returns) → bot fetches store context and answers automatically.
3) External webhook event (channel/store) → processed by Worker → updates conversation and merchant dashboard.

## 3) Value & KPIs
**Value**: faster responses, higher answer accuracy and conversions, unified channel operations, smart automation.
**Sample KPIs**:
- Bot answer coverage ≥ 85%; conceptual accuracy ≥ 90% for frequent policies.
- First response time (FRT) ≤ 2s across common channels.
- Conversation→order conversion rate ≥ 3–5% for active stores.
- API monthly availability ≥ 99.9%; webhook delivery success ≥ 99%.
- Cache hit ratio: L1 ≥ 40%, L2 (Redis) ≥ 80% for hot reads.

## 4) High-Level Architecture (C4)
**Primary containers:**
- **API (NestJS)**: public/internal REST/GraphQL, JWT auth, webhook signature protection, Idempotency guard.
- **Workers**: async task processing (webhooks, embeddings, messaging, Outbox).
- **Datastores**:
  - **MongoDB** as the primary multi-tenant store (using `merchantId` for tenancy).
  - **Qdrant** as Vector DB for semantic search.
  - **Redis** for caching, sessions, queues.
- **Object Storage**: **MinIO** for media/docs.
- **Automation**: **n8n** for workflows and automations.
- **Frontend**:
  - **Merchant Dashboard** (React/Vite) for configuration, analytics, and operations.
  - **Webchat** for customer interactions.
- **Edge**: **Nginx** for TLS, reverse proxy, compression.

**External integrations**: Telegram, WhatsApp Business, Instagram, Facebook Messenger; commerce platforms (Salla, Zid, Shopify).

## 5) Request & Event Flows
**Synchronous (reads/writes):**
- Client → Channel → API → Cache/DB → immediate response.
- Idempotency-Key on sensitive operations (orders/payments).

**Asynchronous (webhooks/queues):**
- Webhook from channel → API (signature verification) → queue → Worker.
- **Outbox Pattern** for reliable publishing; **Retries with backoff**; **DLQ** on failure.
- **Cache Warmer** for hot keys (lists/categories) and background refreshes.

## 6) Data Model Essentials
- **Multi-tenancy key**: `merchantId` on all core entities.
- **Core aggregates**: Merchant, Channel, Product, Category, Order, Lead, Conversation, Message, WebhookEvent, OutboxEvent.
- **Performance-critical indexes**:
  - `products(tenantId, status, categoryId, price, createdAt)`
  - `orders(tenantId, status, customerId, createdAt)`
  - Text/vector indexes in MongoDB and Qdrant for search.
- **Eventual consistency** for derived data (counters, denormalized views) via Workers.

## 7) Deployment & Environments
- **Environments**: development, staging, production (strict separation; validated env schema).
- **Hosting**: Docker Compose on VPS with growth path to Kubernetes.
- **Release/Rollback**: versioned images (SemVer), gradual upgrades, rollback by re-enabling previous tag, safe DB migrations.

## 8) Availability & Performance
- **API SLO**: 99.9% monthly availability; **p95 latency** reads ≤ 300ms, writes ≤ 500ms.
- **Bot SLO**: **TTFR** ≤ 2s; async task completion ≤ 60s (typical).
- **Scalability**: scale‑out API/Workers; Mongo/Qdrant read‑replica/sharding when needed; Redis Cluster at high load.
- **Perf tactics**: cursor pagination, L1 (memory) + L2 (Redis) cache, avoid N+1, tuned connection pooling.

## 9) Security & Compliance
- **AuthN/Z**: short-lived access JWT + rotating refresh, **Redis blacklist** and proper **logout**, RBAC.
- **Edge protection**: strict CORS allow-list, Helmet/CSP, per-token/channel rate limiting, body-size limits, Webhook Signature guard, Service-Token guard.
- **Data**: TLS in transit, encrypt sensitive PII at rest, least-privilege access, secrets via Vault/Secrets Manager in prod.
- **Audit**: comprehensive audit logs for sensitive actions (logins, role changes, store settings).

## 10) Observability & Operations
- **Metrics**: Prometheus (HTTP, DB, Cache, Queue, business KPIs).
- **Logs**: Pino → Loki with correlation (trace/span ids).
- **Traces**: OpenTelemetry → Tempo.
- **Dashboards & Alerts**: Grafana + Alertmanager (Error Rate, Latency, Queue Backlog, Cache Hit Ratio).
- **Runbooks**: documentation per service (API, Workers, DB, Deploy, Incidents).
- **Testing**: periodic health probes + E2E (Playwright) on critical paths.

## 11) External Integrations
- **Messaging Channels**: provider-specific rate limits; circuit breaker, DLQ for failures.
- **Commerce Platforms**: catalog/order sync, webhooks, idempotency fields for matching.
- **AI Services**: embedding/LLM calls with budget and guarded outputs.

## 12) Risks & Limitations + Mitigations
- **Single VPS** → improve HA with multi-node setup; backups; health checks.
- **Vector growth** → TTL/archival policies, Qdrant sharding, memory/storage monitoring.
- **Provider constraints** → circuit breaker, DLQ, manual fallbacks for critical operations.
- **Knowledge quality** → merchant KB tooling, answer-gap analytics, content enrichment recommendations.

## 13) Glossary
- **Tenant**: an isolated merchant within the same platform.
- **L1/L2 Cache**: process memory/Redis layers to speed up reads.
- **Outbox Pattern**: persist events before publishing to ensure reliable delivery.
- **DLQ**: queue for messages that failed after multiple retries.
- **Idempotency**: an operation executes once even if requests are replayed.
- **Cursor Pagination**: stable, index-friendly pagination method.
- **SLO/SLI/SLA**: service targets/indicators/agreements.
- **TTFR**: time to first response from the bot.

---

**Internal References**
- API Docs & OpenAPI (public & internal)
- Runbooks (operations/incidents/rollback/backup/upgrades)
- ERD & Data Dictionary
- Dashboards (Grafana) & Alerting Rules
- Security Playbooks & Compliance Notes

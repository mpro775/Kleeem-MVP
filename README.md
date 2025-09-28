
# Kaleem AI — Monorepo Overview

> Multi‑tenant SaaS for AI‑powered commerce (Arabic‑first).  
> **Stack:** NestJS (Backend) • React/Vite (Dashboard & Storefront Builder) • MongoDB • Redis • Qdrant (vector DB) • MinIO (object storage) • n8n (workflows) • Prometheus+Grafana+Loki (observability) • Docker Compose

---

## 1) What’s in this repo?

- **backend/** — NestJS modular monolith
  - `src/modules/*` (auth, products, orders, leads, webhooks, analytics, integrations, vector, messaging, documents, etc.)
  - Swagger at **/api/docs** (OpenAPI 3)
- **frontend/** — React/Vite merchant dashboard & builder
- **devops/** — Docker Compose, Prometheus/Grafana/Loki, cAdvisor, Node Exporter, Alertmanager
- **n8n/** — workflows for AI agent, embeddings, analytics
- **docs/** — technical docs (setup, deployment, architecture, api, troubleshooting, style, contributing, review process, performance testing)

> If you’re only looking for **how to run** Kaleem locally, jump to **Quick Start**.

---

## 2) Requirements

- Node.js 20+ and npm 10+
- Docker & Docker Compose
- Git
- (Optional) pnpm 9+
- For Mac/Windows: make sure Docker has ≥ 8 GB RAM assigned.

---

## 3) Environment Variables

Create a `.env` in **backend/** and **frontend/** (examples below).

**backend/.env (example):**
```
# App
PORT=3000
NODE_ENV=development
FRONTEND_ORIGIN=http://localhost:5173

# Database
MONGO_URI=mongodb://mongo:27017/kaleem
MONGO_DB=kaleem

# Cache / Queue
REDIS_URL=redis://redis:6379

# Vector DB
QDRANT_URL=http://qdrant:6333
QDRANT_API_KEY=

# Object Storage
MINIO_ENDPOINT=minio
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=kaleem

# Observability
PROMETHEUS_ENABLED=true
OTEL_EXPORTER_OTLP_ENDPOINT=

# Security
JWT_ACCESS_TTL=900          # 15m
JWT_REFRESH_TTL=604800      # 7d
JWT_SECRET=change-me
JWT_REFRESH_SECRET=change-me-too

# CORS
CORS_ALLOWED_ORIGINS=http://localhost:5173
```

**frontend/.env (example):**
```
VITE_API_BASE_URL=http://localhost:3000/api
VITE_WS_URL=ws://localhost:3000
VITE_APP_NAME=Kaleem
```

---

## 4) Quick Start (Local)

> One‑command stack with Docker Compose (MongoDB, Redis, Qdrant, MinIO, Prometheus, Grafana, Loki, n8n).

```bash
# From repo root
docker compose -f devops/docker-compose.yml up -d

# Backend (NestJS)
cd backend
npm install
npm run start:dev     # Swagger at http://localhost:3000/api/docs

# Frontend (React/Vite)
cd ../frontend
npm install
npm run dev           # Dashboard at http://localhost:5173
```

### Default Dev URLs
- API base: `http://localhost:3000/api`
- Swagger: `http://localhost:3000/api/docs`
- Dashboard: `http://localhost:5173`
- Grafana: `http://localhost:3001`
- Prometheus: `http://localhost:9090`
- Loki: `http://localhost:3100`
- n8n: `http://localhost:5678`

> **Credentials** are configured via `.env` and docker secrets. Never commit real secrets.

---

## 5) Project Conventions

- **TypeScript everywhere** (strict mode).
- **Clean Modular Architecture**: each feature under `src/modules/<feature>` with DTOs, services, controllers, repositories.
- **Testing**: Jest unit & e2e (Playwright for flows).
- **Lint/Format**: ESLint + Prettier + import order. See `docs/CODE_STYLE.md`.
- **Commits**: Conventional Commits (`feat:`, `fix:`, `docs:`, `chore:`…).

---

## 6) Key Modules (Backend)

- **auth**: JWT access/refresh, rotation, blacklist on Redis, logout & revoke, session guard, roles/permissions.
- **products**: multi‑language fields, indexing, filtering, compatibility by car model, vector search hooks.
- **orders**: checkout flow, status transitions, webhooks for channels, saga/outbox for reliability.
- **vector**: embedding service integration, Qdrant collections, upserts, hybrid search endpoints.
- **webhooks**: signature verification guard, replay‑attack prevention, per‑merchant per‑channel secrets.
- **analytics**: Prometheus metrics, business counters (orders_created_total…), latency histograms.
- **documents**: MinIO storage, PDF/Excel chunking, metadata, ingestion to vectors.
- **messaging**: Telegram/WhatsApp/IG/FB connectors (via integrations), rate limiting, normalization.

---

## 7) Observability

- **HTTP metrics** via Nest interceptors (latency, status codes, errors).
- **Logs**: Pino → Loki (via Promtail).
- **Dashboards**: Grafana (APIs latency, cache hit ratio, DB ops, memory).
- Health endpoints: `/api/health` (liveness), `/api/ready` (readiness), `/metrics` (Prometheus).

---

## 8) Security

- **CORS whitelist** (no wildcard in prod).
- **Helmet + CSP** (tuned per channel).
- **JWT best practices** (short access TTL, rotated refresh, blacklist on logout).
- **Webhook signature guard** per merchant & per channel; constant‑time comparison; nonce cache.
- **Rate limits** on public endpoints; input validation with class‑validator (i18n errors).

---

## 9) Deployment (Brief)

- Build images using multi‑stage Dockerfiles.
- Push to registry.
- Provision VPS with Docker + compose v2.
- Configure domain & TLS (reverse proxy).
- Bring up stack: `docker compose -f devops/docker-compose.yml up -d`.
- Run migrations & seed scripts if any.
- Verify health, metrics, dashboards.
- Full guide: see `docs/DEPLOYMENT.md`.

---

## 10) Documentation Map

All detailed docs live in **/docs**:

- `SETUP.md` — local & production setup (step‑by‑step).
- `ARCHITECTURE.md` — modules, flows, diagrams.
- `API.md` — endpoints, auth, pagination (cursor), error envelope, webhooks contracts.
- `DEPLOYMENT.md` — CI/CD, environments, DNS/TLS, backups.
- `TROUBLESHOOTING.md` — common issues & fixes.
- `CODE_STYLE.md` — ESLint/Prettier rules & examples.
- `CONTRIBUTING.md` — PR flow, branching model.
- `REVIEW_CHECKLIST.md` — code review process.
- `PERFORMANCE_TESTING.md` — k6 scenarios & benchmarks template.

---

## 11) Licensing & Credits

© Kaleem AI. Internal repository. See LICENSE if present.

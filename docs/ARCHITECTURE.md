# SEHAT — System Architecture

> **Sistem Ekosistem Health, Analytics & Telemedicine** — Employee Health
> Intelligence Platform untuk KPU Indonesia.

This document describes the **full enterprise target architecture** and how the
**shipped PWA** (this repository) maps onto it. The shipped app is the
*cheapest deployable slice*: a 100% static, offline-capable PWA hosted on
GitHub Pages for **$0/month**, with all clinical logic running client-side.
The same UI contracts are designed to plug into the backend below with no UI
rewrite.

---

## 1. Two delivery modes

| | **Shipped now (this repo)** | **Full enterprise target** |
|---|---|---|
| Hosting | GitHub Pages / any static CDN ($0) | Kubernetes (GKE/EKS/AKS) |
| Frontend | Static PWA (vanilla ES modules) | Next.js 15 + TypeScript + Tailwind PWA |
| Backend | None (client-side logic) | FastAPI microservices (Python) |
| Data | `localStorage` (per device) | PostgreSQL + Redis |
| AI | Rule-based engine (`js/ai.js`) | OpenAI + LangChain + Vector DB (RAG) |
| Auth | Mock SSO + RBAC | OIDC/SAML SSO + JWT + RBAC |
| Analytics | Synthetic aggregates | Power BI-compatible analytics API |

The PWA was built so that swapping `js/store.js` (persistence) and `js/ai.js`
(inference) for HTTP calls is the only change required to graduate to the full
backend.

---

## 2. C4 — System Context

```mermaid
graph TD
  EMP["👤 Pegawai"] -->|PWA| SEHAT
  HR["👤 HR Administrator"] -->|PWA| SEHAT
  EXE["👤 Executive"] -->|PWA| SEHAT
  SEHAT["SEHAT Platform"] --> SSO["KPU SSO / Identity Provider (OIDC/SAML)"]
  SEHAT --> LLM["OpenAI API"]
  SEHAT --> TELE["Mitra Telemedicine (Halodoc/Alodokter API)"]
  SEHAT --> BI["Power BI / Executive BI"]
  SEHAT --> NOTIF["Push / WhatsApp / Email Gateway"]
```

## 3. Container / Microservice view

```mermaid
graph LR
  subgraph Client
    PWA["Next.js 15 PWA\n(TS, Tailwind, Service Worker)"]
  end
  subgraph Edge
    GW["API Gateway\n(JWT verify, rate-limit, WAF)"]
  end
  subgraph Services["FastAPI Microservices"]
    AUTH["auth-svc\nSSO/JWT/RBAC"]
    SYMP["symptom-svc\ntriage + ICD-11"]
    AIGW["ai-gateway\nLangChain + RAG"]
    FIT["fitness-svc"]
    MENTAL["mental-svc\nPHQ-9/GAD-7/WHO-5"]
    OCC["occhealth-svc\nburnout/overtime"]
    TELE["telemed-svc\nreferral/appointments"]
    ANALYTICS["analytics-svc\nPower BI API"]
    NOTIFY["notify-svc"]
  end
  subgraph Data
    PG[("PostgreSQL")]
    REDIS[("Redis")]
    VDB[("Vector DB\nQdrant/pgvector")]
    OBJ[("Object Storage\nS3/MinIO")]
  end
  PWA --> GW
  GW --> AUTH & SYMP & FIT & MENTAL & OCC & TELE & ANALYTICS
  SYMP --> AIGW
  AIGW --> VDB
  AIGW --> OPENAI["OpenAI"]
  AUTH --> PG & REDIS
  SYMP & FIT & MENTAL & OCC & TELE & ANALYTICS --> PG
  ANALYTICS --> REDIS
  NOTIFY --> Q["Message Queue (RabbitMQ/Kafka)"]
  TELE --> NOTIFY
```

### Service responsibilities

| Service | Responsibility | Key endpoints |
|---|---|---|
| `auth-svc` | SSO exchange, JWT issue/refresh, RBAC, audit | `/auth/sso`, `/auth/refresh`, `/auth/me` |
| `ai-gateway` | LLM orchestration, RAG retrieval, prompt safety | `/ai/chat`, `/ai/embed` |
| `symptom-svc` | Symptom extraction, differential, ICD-11, red-flags | `/symptom/session`, `/symptom/answer` |
| `fitness-svc` | Steps/water/sleep/weight/BMI, daily check-ins | `/fitness/*`, `/checkins` |
| `mental-svc` | Validated screening + scoring + history | `/screening/*` |
| `occhealth-svc` | Workload, overtime, travel fatigue, burnout model | `/occ/*` |
| `telemed-svc` | Doctor referral, scheduling, consult history | `/telemed/*` |
| `analytics-svc` | Anonymous aggregation, trends, predictions, BI feeds | `/analytics/*`, `/bi/*` |
| `notify-svc` | Push/WA/email reminders (meds, stretching) | async via queue |

## 4. Clean / modular architecture (per service)

```
service/
├── api/            # FastAPI routers (transport layer)
├── domain/         # entities, value objects, domain services (pure)
├── application/    # use-cases / orchestrators
├── infrastructure/ # repositories (SQLAlchemy), clients (OpenAI, Redis)
├── schemas/        # Pydantic DTOs
└── tests/
```
Dependency rule: `api → application → domain ← infrastructure`. The domain layer
has zero framework imports — mirrored in the shipped PWA where `js/ai.js` and
`js/data.js` are pure and DOM-free (unit-tested in Node).

## 5. AI / RAG pipeline (target)

```mermaid
sequenceDiagram
  participant U as User
  participant S as symptom-svc
  participant A as ai-gateway
  participant V as Vector DB
  participant O as OpenAI
  U->>S: free-text symptoms
  S->>S: extract symptoms, red-flag scan
  S->>A: context + symptoms
  A->>V: similarity search (medical KB embeddings)
  V-->>A: top-k passages (ICD-11, guidelines)
  A->>O: prompt (system + retrieved context + safety rails)
  O-->>A: structured triage (differential, risk, follow-ups)
  A-->>S: validated JSON
  S-->>U: dynamic question / triage result
```

The shipped PWA implements the **same contract** with a transparent rule-based
engine (`differential()`, `classifyRisk()`, `detectEmergency()`), so it works
offline and free, and can be swapped for the RAG call by changing one module.

## 6. Folder structure (shipped PWA)

```
sehat/
├── index.html                 # app shell
├── manifest.webmanifest       # PWA manifest
├── sw.js                      # service worker (offline cache)
├── css/styles.css             # mobile-first UI
├── js/
│   ├── app.js                 # router, shell, all views, RBAC
│   ├── store.js               # state + localStorage persistence
│   ├── data.js                # KB, ICD-11 map, questionnaires, seed
│   ├── ai.js                  # triage engine, scoring, recommendations
│   └── charts.js              # dependency-free SVG charts
├── icons/                     # generated PNG icons (any + maskable)
├── scripts/generate-icons.mjs # zero-dep PNG icon generator
├── docs/                      # architecture, ERD, API, security, journeys
└── .github/workflows/deploy-pages.yml  # CI/CD for standalone repo
```

See also: [`ERD.md`](./ERD.md) · [`API-SPEC.md`](./API-SPEC.md) ·
[`SECURITY.md`](./SECURITY.md) · [`DEPLOYMENT.md`](./DEPLOYMENT.md) ·
[`USER-JOURNEYS.md`](./USER-JOURNEYS.md).

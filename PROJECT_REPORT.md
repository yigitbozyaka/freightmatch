# FreightMatch — Project Report

A detailed walkthrough of the FreightMatch platform: what it does, how it is built, why each architectural choice was made, and how the codebase is organized for long-term maintenance. This document complements the in-tree per-service READMEs and the API reference site by tying everything together at the system level.

---

## Table of contents

1. [Executive summary](#1-executive-summary)
2. [Domain model](#2-domain-model)
3. [System architecture](#3-system-architecture)
4. [Technology stack](#4-technology-stack)
5. [Microservices catalogue](#5-microservices-catalogue)
6. [Inter-service communication](#6-inter-service-communication)
7. [Data layer](#7-data-layer)
8. [API gateway](#8-api-gateway)
9. [Authentication & authorization](#9-authentication--authorization)
10. [Security hardening](#10-security-hardening)
11. [AI integration](#11-ai-integration)
12. [Frontend application](#12-frontend-application)
13. [Shared packages](#13-shared-packages)
14. [Observability stack](#14-observability-stack)
15. [Continuous integration & delivery](#15-continuous-integration--delivery)
16. [Local development workflow](#16-local-development-workflow)
17. [Containerization & deployment](#17-containerization--deployment)
18. [Code quality & testing](#18-code-quality--testing)
19. [API documentation strategy](#19-api-documentation-strategy)
20. [Project organization](#20-project-organization)
21. [Engineering decisions & trade-offs](#21-engineering-decisions--trade-offs)
22. [Future work](#22-future-work)

---

## 1. Executive summary

**FreightMatch** is a two-sided freight logistics marketplace that connects two roles:

- **Shippers** — businesses with cargo that needs to move from origin A to destination B by a deadline.
- **Carriers** — fleet operators who own trucks (flatbed, refrigerated, dry-van, tanker) and bid on the cargo they can fulfill.

The platform handles the end-to-end workflow: a shipper posts a load, an AI matching engine ranks suitable carriers, carriers submit competitive bids, the shipper accepts the best one, and the load progresses through `Posted → Booked → In Transit → Delivered` states.

The project was built deliberately as a **production-shaped reference system**, not a single-process monolith. Functionality is decomposed into four independent microservices behind a reverse-proxy gateway, communicating via both synchronous REST and asynchronous Kafka events. A Next.js web client consumes the API surface, an LLM (Claude 3.5 Haiku via OpenRouter) powers the matching and conversational features, and a full observability stack (Prometheus, Grafana, OpenTelemetry, Loki) instruments every request.

The repository is a **pnpm monorepo** with strict TypeScript across every package, a CI pipeline that builds only the changed services, an OpenAPI documentation site published to GitHub Pages, and Docker images for every service produced from a single multi-stage `Dockerfile` per service.

---

## 2. Domain model

### Roles
- **Shipper** — owns loads, accepts bids, confirms delivery.
- **Carrier** — sees the marketplace, submits bids, executes deliveries. Carriers carry a structured profile (truck type, capacity, home city, rating, on-time rate, completed shipments, trust score).

### Core entities

| Entity | Owner service | Lifecycle |
|---|---|---|
| `User` | user-service | Registration → optional profile completion → active |
| `Load` | load-service | `Posted` → `Booked` → `In Transit` → `Delivered` (or `Cancelled`) |
| `Bid` | bidding-service | `Pending` → `Accepted` / `Rejected` |
| `Recommendation` | matching-service | Generated from `load.created` event; cached per load |

### Key invariants
- A load may have many bids but only **one** `Accepted` bid; accepting a bid auto-rejects the rest and transitions the load to `Booked`.
- A carrier may have at most **one** bid per load (uniqueness enforced at the bidding-service level).
- A load can only move forward in its state machine. Reverse transitions are rejected.
- Only the load's owning shipper can transition its status; only the bid's owning carrier can withdraw.

---

## 3. System architecture

### High-level topology

```
                       ┌──────────────────────────┐
                       │  Browser (Next.js SPA)   │
                       └────────────┬─────────────┘
                                    │ HTTPS / cookies
                                    ▼
                       ┌──────────────────────────┐
                       │   NGINX gateway (:80)    │
                       │  rate-limit · headers    │
                       └────────────┬─────────────┘
                                    │ HTTP
        ┌───────────────┬───────────┼───────────┬────────────────┐
        ▼               ▼           ▼           ▼                ▼
  ┌──────────┐   ┌────────────┐ ┌──────────┐ ┌──────────────┐
  │  user-   │   │   load-    │ │ bidding- │ │  matching-   │
  │ service  │   │  service   │ │ service  │ │   service    │
  │  :3001   │   │   :3002    │ │  :3003   │ │    :3004     │
  └────┬─────┘   └─────┬──────┘ └────┬─────┘ └──────┬───────┘
       │               │             │              │
       │     ┌─────────┴───────┐     │      ┌───────┴──────┐
       │     ▼                 ▼     ▼      ▼              ▼
       │  Kafka topic       Kafka topic                 OpenRouter
       │  load.created      bid.accepted                Claude 3.5
       │     │                 │                        Haiku
       └─────┼─────────────────┘
             ▼
    ┌────────────────────┐
    │   MongoDB (rs0)    │
    │  one DB per svc    │
    └────────────────────┘
```

### Why microservices?
The system was decomposed along **bounded contexts**: identity, freight, marketplace, and intelligence. Each bounded context has its own data ownership and lifecycle, which means each service can be deployed, scaled, and reasoned about independently. The trade-offs (network hops, eventual consistency, distributed-state debugging) are accepted in exchange for clear ownership and the ability to swap implementations behind stable contracts.

### Communication patterns
- **Synchronous REST** for user-facing requests routed through NGINX.
- **Service-to-service REST** (e.g. matching-service → user-service for carrier lookups) gated by a shared internal secret.
- **Asynchronous Kafka events** for cross-context state propagation (`load.created`, `bid.accepted`).

Detailed in [§6 Inter-service communication](#6-inter-service-communication).

---

## 4. Technology stack

### Backend
| Concern | Choice | Why |
|---|---|---|
| Runtime | Node.js 20 LTS | First-class TypeScript, mature ecosystem |
| Language | TypeScript (strict mode) | Type safety across service boundaries |
| HTTP framework | Express 4 | Minimal, well-understood, easy to instrument |
| Validation | Zod | Single source of truth for request schemas + inferred types |
| ORM/ODM | Mongoose | Schema-per-service, change streams compatible with replica sets |
| Auth | jsonwebtoken (HS256) + bcryptjs | Standard, audited primitives |
| Event bus | Apache Kafka via kafkajs | Durable, ordered, replayable |
| Security middleware | Helmet + cors + express-rate-limit | Defense in depth |
| Testing | Jest + ts-jest | Native TS support, snapshot/coverage out of the box |

### Frontend
| Concern | Choice | Why |
|---|---|---|
| Framework | Next.js 15 (App Router) | RSC + colocated layouts + server actions for HttpOnly cookie flows |
| UI | React 19 + TypeScript strict | Concurrent features, Suspense |
| Styling | Tailwind CSS v4 with `@theme` tokens | Utility-first with semantic design tokens |
| Data layer | TanStack Query 5 | Cache, dedup, retry, optimistic updates |
| Forms | react-hook-form + zod resolvers | Same Zod schemas reused on the wire |
| Maps | react-leaflet + Carto Dark Matter tiles | Lightweight, themable, dynamically imported |
| Animation | motion/react with `LazyMotion` | Tree-shaken, code-split |
| Charts | @visx/* | SVG, controllable, no canvas runtime |

### Infrastructure & tooling
| Concern | Choice |
|---|---|
| Reverse proxy | NGINX (alpine) |
| Database | MongoDB 7 (replica set `rs0`) |
| Event broker | Kafka 7.5 (Confluent images) + Zookeeper |
| Container runtime | Docker + Docker Compose |
| Package manager | pnpm 10 with workspaces |
| Monorepo layout | Native pnpm workspaces (no extra tool) |
| Lint/format | Prettier 3 + lint-staged + Husky |
| CI | GitHub Actions |
| API docs | OpenAPI 3.1 + Scalar (hosted on GitHub Pages) |
| Observability | Prometheus, Grafana, OpenTelemetry SDK, Loki, Winston |
| LLM | Anthropic Claude 3.5 Haiku via OpenRouter |

---

## 5. Microservices catalogue

### 5.1 user-service (port 3001)

**Responsibilities**
- Registration with role selection (`Shipper` | `Carrier`).
- Authentication (login, refresh, logout) with JWT access + refresh tokens.
- Password hashing (bcrypt, 12 rounds) and complexity validation.
- Account lockout (5 failed attempts → 15 minute lock).
- Carrier and shipper profile CRUD.
- Profile photo upload (multer with disk storage).
- Internal endpoints for service-to-service carrier lookups (gated by `INTERNAL_SERVICE_SECRET`).
- Computes a derived `trustScore` for carriers (pure utility under `src/utils/trust-score.util.ts`).

**Key folders** (`services/user-service/src/`)
```
config/        # Environment validation (Zod)
controllers/   # auth, user, carrier, shipper, photo
middlewares/   # auth, internal, rateLimit, upload, validate
models/        # user.model.ts (Shipper + Carrier polymorphic profiles)
repositories/  # data access wrapping Mongoose
routes/        # express.Router definitions
services/      # business logic
utils/         # trust-score, validators, with __tests__/
```

**Highlights**
- Uses `@freightmatch/instrumentation` for metrics, tracing, logger, and resilience helpers.
- Token blacklist on logout (in-memory; documented as a Redis upgrade candidate).
- 100% unit-test coverage on `trust-score.util.ts` (16 cases, see `services/user-service/src/utils/__tests__/`).

### 5.2 load-service (port 3002)

**Responsibilities**
- Load CRUD: create (with validation of weight/deadline/cargo type), list (with filters and pagination), detail.
- Load lifecycle transitions enforced server-side as a state machine.
- Publishes `load.created` to Kafka when a load enters `Posted`.
- Consumes `bid.accepted` from Kafka and transitions the load to `Booked`.

**Notable**
- Dual Kafka role (producer + consumer), exemplifying a service that both emits and reacts to events.
- Mongoose `Load` schema declares status enum, indexed `createdAt`, and references the owning shipper user id.

### 5.3 bidding-service (port 3003)

**Responsibilities**
- Bid CRUD scoped to a load: submit, list (per-load and per-carrier), accept, reject.
- Enforces the "one bid per (carrier, load)" invariant.
- On accept: marks the chosen bid `Accepted`, all sibling bids `Rejected`, emits `bid.accepted` to Kafka so the load-service can transition the load.

**Notable**
- Stricter rate-limit zone (20 bid submissions / 15 min).
- Validates that the caller is the shipper who owns the load before allowing accept/reject.

### 5.4 matching-service (port 3004)

**Responsibilities**
- AI carrier-matching engine (`/api/match/:loadId`).
- AI conversational assistant ("Ask Ops") for routing, pricing, hazmat advice, etc.
- Subscribes to `load.created` and proactively generates recommendations.
- Calls the user-service over an internal-secret-gated channel to fetch the carrier roster.

**AI integration** ([§11](#11-ai-integration))
- Provider: OpenRouter
- Model: Claude 3.5 Haiku (low temperature 0.3 for matching, 0.7 for chat)
- Resilience: circuit-breaker + retry helpers from `@freightmatch/instrumentation` with a deterministic fallback ranking algorithm if the LLM is unavailable.

---

## 6. Inter-service communication

### 6.1 Synchronous (HTTP)
Service-to-service synchronous calls go through internal endpoints exposed by the target service. The caller sends:

```
GET /api/internal/carriers
x-internal-secret: <shared secret>
```

The target validates the secret in middleware (`internal.middleware.ts`). Public traffic never reaches these routes because NGINX does not forward the `x-internal-secret` header from clients.

### 6.2 Asynchronous (Kafka)
Topics, schemas, and ownership are defined in `shared/contracts/kafka-topics.ts`:

```ts
export const KAFKA_TOPICS = {
  LOAD_CREATED: 'load.created',
  BID_ACCEPTED: 'bid.accepted',
} as const;
```

| Topic | Producer | Consumer | Trigger | Purpose |
|---|---|---|---|---|
| `load.created` | load-service | matching-service | Load reaches `Posted` | Spawn AI carrier recommendations |
| `bid.accepted` | bidding-service | load-service | Shipper accepts a bid | Transition load to `Booked` |

Detailed JSON schemas live in [`docs/kafka-topics.md`](docs/kafka-topics.md).

The shared contract is consumed as a workspace package (`@freightmatch/contracts`) by every producer/consumer, eliminating drift between services.

### 6.3 Why both?
- Use **HTTP** when the caller needs an immediate answer (carrier lookup during ranking).
- Use **Kafka** when the producer just needs to fire-and-forget and the consumer can catch up later (recommendations are eventual; a temporarily unreachable matching-service should not block load creation).

---

## 7. Data layer

Each service owns its own database to prevent cross-service joins and accidental coupling at the storage layer:

| Service | Database |
|---|---|
| user-service | `freightmatch-users` |
| load-service | `freightmatch-loads` |
| bidding-service | `freightmatch-bids` |
| matching-service | `freightmatch-matching` |

All run on a single MongoDB **replica set** (`rs0`) — a deliberate choice so that:
- change streams are available if needed for future event sourcing,
- transactions are usable inside a service that touches multiple collections,
- the development image is a single-node replica set, identical to production topology.

Mongoose models declare strict TypeScript interfaces. Where one service references another's identifier (e.g. a `Bid` storing a `loadId` and `carrierId`), the value is stored as a `string` ObjectId — never as a populated reference. Cross-service joins are achieved through API calls or events, never database links.

---

## 8. API gateway

NGINX (alpine) sits at port 80 and is the only externally reachable entrypoint. Configuration lives at [`infra/nginx/nginx.conf`](infra/nginx/nginx.conf).

**Routing table** (excerpt)
```
/api/users/(login|register|refresh)  → user-service     (zone: api_auth)
/api/users                            → user-service     (zone: api_general)
/api/loads                            → load-service    (zone: api_general)
/api/bids                             → bidding-service (zone: api_general)
/api/match                            → matching-service(zone: api_general)
/api/chat                             → matching-service(zone: api_chat)
/uploads/                             → user-service     (multipart, 6 MB cap)
```

**Defenses applied at the edge**
- HSTS, CSP, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`.
- `server_tokens off` (no NGINX version banner).
- Three rate-limit zones tuned per endpoint class (auth: 5 r/s, general: 30 r/s, chat: 2 r/s).
- 6 MB body cap for the photo upload route.
- The `x-internal-secret` header is **not** forwarded from clients; only sibling services on the docker network can use it.

---

## 9. Authentication & authorization

### Tokens
- **Access token** — 15 minute lifetime, HS256, claims: `userId`, `email`, `role`.
- **Refresh token** — 7 day lifetime, HS256, separate secret.
- Both are stored as **HttpOnly cookies** by the web app (`fm_access`, `fm_refresh`); the SPA never reads them via JavaScript.

### Flow
1. `POST /api/users/login` → on success, the API sets two HttpOnly cookies and returns the user shape.
2. The web app's BFF route handler at `app/api/proxy/[...path]/route.ts` forwards subsequent calls server-side, attaching the cookie token to upstream requests.
3. On 401 with an expired access token, the proxy attempts a `/refresh` and replays the original request transparently.
4. `POST /api/users/logout` blacklists both tokens.

### Role-based access control
Each protected route group in the web app (`(carrier)`, `(shipper)`) verifies the caller's role server-side via `RequireRole`. Backend endpoints additionally re-check the role inside their controllers — authorization is layered, not delegated.

### Account lockout
Five consecutive failed logins → user is locked for 15 minutes. The lockout time remaining is returned with a `423 Locked` status so the UI can show a countdown.

---

## 10. Security hardening

Beyond authentication, additional layers are applied across the stack:

- **Helmet** sets sane defaults (CSP, HSTS, no sniff, no XSS, frameguard) on every service.
- **CORS** is locked to the configured `WEB_ORIGIN`.
- **Zod validation** on every request body — invalid shapes are rejected before reaching business logic.
- **bcrypt 12 rounds** for password storage; passwords must satisfy length + character-class rules and are validated both at the schema layer and in the service layer.
- **Internal endpoints** validate the shared secret and only accept calls from services on the docker network.
- **Token blacklist** revokes JTI-style invalidation on logout.
- **Rate limiting** at two layers: NGINX zones for the network edge, `express-rate-limit` per-service for application-aware quotas.
- **No secrets in code** — all credentials come from `.env` files, validated at boot by Zod.
- **Health endpoints** (`/health`) are public so orchestrators can probe without authentication, but they expose only liveness/readiness booleans, never internal state.

The full security write-up lives in [`docs/SECURITY_DESIGN.md`](docs/SECURITY_DESIGN.md).

---

## 11. AI integration

Two AI features power the platform:

### 11.1 Automated carrier matching
When a load is posted, `load.created` triggers the matching-service. It:
1. Fetches all carriers (internal call to user-service).
2. Builds a deterministic prompt summarizing the load (origin, destination, weight, cargo type, deadline) and the carrier roster (id, truck type, capacity, rating, completed shipments, home city).
3. Calls Claude 3.5 Haiku via OpenRouter at `temperature=0.3` (low → reproducible), expecting a JSON response with the top three carriers and reasoning.
4. Parses, validates, and stores the recommendation set keyed by load id.
5. Falls back to a rating-based heuristic ranking if the LLM call fails (circuit-breaker open or non-2xx).

### 11.2 Conversational assistant ("Ask Ops")
The web app's chat dock and `/chat` page POST messages to `matching-service`'s `/api/chat` endpoint. The service streams Claude's response back. Suggested prompts are pre-seeded for common freight queries (pricing, route advice, hazmat regulations).

### Why this split?
Matching is **structured generation** (JSON-shaped output, low temperature, system prompt is large). Chat is **free-form conversation** (markdown output, higher temperature, smaller system prompt). Putting them in the same service lets us share the OpenRouter client, retry/circuit-breaker, and rate-limit zone, but they remain separate route handlers with different prompt templates.

The full feature spec lives in [`docs/AI_FEATURE.md`](docs/AI_FEATURE.md).

---

## 12. Frontend application

`apps/web/` is a Next.js 15 application using the App Router.

### Route groups
```
(auth)/        login, register
(shipper)/     shipper-only dashboard, loads index, /loads/new wizard, /loads/[id]
(carrier)/     carrier-only dashboard, marketplace, /marketplace/[id], my-bids, profile
(shared)/      settings, chat
```

Route groups (`(...)` directories) are URL-invisible — they exist purely to attach a different layout, middleware guard, or surface different navigation. The carrier and shipper layouts each verify the caller's role server-side via `RequireRole`.

### State & data
- TanStack Query is the only client-side cache. Mutations update the cache directly via `setQueryData` and broadly invalidate dependent queries.
- Form state lives in `react-hook-form` + Zod; the same Zod schemas are reused on the wire.
- The auth context (`lib/hooks/useAuth.ts`) is the single source of truth for the current user; cookies are read once on mount.

### Design system
- Tailwind v4 `@theme` declares the design tokens: slate palette (`slate-950..700`), amber palette (`amber-400/500`), semantic tokens (`danger`, `go`, `transit`), and three font families (`mono`, `sans`, `display`).
- Reusable primitives live in `components/primitives/`: `Button`, `Input`, `Select`, `Tabs`, `Drawer`, `Dialog`, `Table`, `KpiTile`, `MonoNum`, `SectionHeader`, `StatusPill`, `ToastHost`.
- Custom utility classes in `app/globals.css` provide the "industrial console" look: `.fm-panel-surface`, `.fm-panel-muted`, `.fm-grid-overlay`, `.fm-focus-ring`, `.fm-route-map`, `.fm-marketplace-pin`.

### Server-side gateway
`app/api/proxy/[...path]/route.ts` is a thin server-side proxy that:
- attaches the HttpOnly access cookie to upstream requests,
- transparently refreshes expired tokens,
- forwards multipart bodies for photo uploads,
- normalizes error envelopes.

This pattern keeps tokens out of JavaScript while still letting the SPA make calls as if it were talking to the gateway directly.

### Accessibility & motion
- Skip-to-main link in the root layout, wired to `id="main"` on every layout's `<main>`.
- All interactive elements use `.fm-focus-ring` (dark inner + amber outer) — visible on every background including amber primary buttons.
- Forms route field-level errors through `aria-describedby` on inputs and `role="alert"` on form-level error banners.
- A global `prefers-reduced-motion: reduce` rule neutralizes all CSS animations and transitions site-wide.
- Themed `not-found.tsx`, `error.tsx`, and `global-error.tsx` provide on-brand 404/500 experiences with ASCII codes and a "Return to base" CTA.

### Performance
- Leaflet is imported only via `next/dynamic` with `ssr: false`, so the ~150 KB tile-engine never lands in the initial JS bundle of pages that don't render a map.
- `motion/react` is used through `LazyMotion` + `domAnimation` for tree-shaken animations.
- The First Load JS for any route in the app sits between 103 KB (auth) and ~290 KB (interactive shipper pages), with the marketplace at 225 KB.

A manual QA checklist of golden paths is in [`apps/web/TESTING.md`](apps/web/TESTING.md).

---

## 13. Shared packages

Two workspace packages are consumed by the four services:

### 13.1 `@freightmatch/contracts`
Single source of truth for cross-service constants and types — most importantly, the Kafka topic names. Importing this package in both producer and consumer ensures topic strings cannot drift. The package is intentionally tiny and dependency-free.

### 13.2 `@freightmatch/instrumentation`
A reusable observability and resilience toolkit:

| Module | Purpose |
|---|---|
| `metrics.ts` | Prometheus registry with `httpRequestDuration`, `httpRequestTotal`, `kafkaMessagesSent/Received`, `mongoOperations`, `mongoConnectionStatus` |
| `logger.ts` | Winston logger configured with Loki transport in production, console transport in dev, and child-logger helpers |
| `tracing.ts` | OpenTelemetry SDK initialization with auto-instrumentation for HTTP, Express, Mongoose, KafkaJS |
| `health.ts` | Composable `createHealthCheck` builder for `/health` endpoints |
| `resilience.ts` | `CircuitBreaker`, `retry`, `RateLimiter` — used heavily by matching-service for OpenRouter calls |
| `kafka-client.ts` | Wrapped KafkaJS client with default retry config and metrics emission |

This package is the reason the service code stays small: every service imports the same three lines of metrics setup, the same `/metrics` route, and the same logger.

---

## 14. Observability stack

A separate Compose file at `monitoring/docker-compose.yml` brings up:

- **Prometheus** (`:9090`) — scrapes each service's `/metrics` endpoint at 15s intervals.
- **Grafana** (`:3000`) — provisioned dashboards (see `monitoring/provisioning/`) with the FreightMatch overview at `grafana-dashboard.json` (request rate, p50/p95 latency, Kafka throughput, Mongo op latency).
- **Loki** (when enabled) — log aggregation; Winston ships JSON-encoded logs over the Loki HTTP transport.

Each service exposes:
- `GET /health` — liveness/readiness booleans.
- `GET /metrics` — Prometheus exposition format.

Tracing is end-to-end via OpenTelemetry: a single trace spans NGINX → service → Mongo → Kafka publish → consumer service. Trace IDs are correlated with logs through Winston's MDC integration.

A monitoring `start.sh` brings the stack up in one command. Configuration env lives in `.env.monitoring.example`.

---

## 15. Continuous integration & delivery

### CI — `.github/workflows/ci.yml`
Triggered on every pull request to `master`:

1. **Detect changed paths** with `dorny/paths-filter` so we only build the services that actually changed.
2. **Install dependencies** once with `pnpm install` (cached by `actions/setup-node`).
3. **Build the web app** if `apps/web/**` changed (`pnpm --filter web build`).
4. **Build each service's Docker image** if its directory changed.

This pattern means a docs-only PR finishes in ~30 seconds, while a multi-service refactor builds everything that needs verification — without paying the cost of re-building unrelated services.

### Docs deploy — `.github/workflows/deploy-docs.yml`
Triggered on `master` pushes that touch `docs-site/**`:

1. Lint the four OpenAPI specs with Redocly.
2. Upload `docs-site/` as a Pages artifact.
3. Deploy to GitHub Pages.

The result is a Scalar-rendered, always-current API reference at https://yigitbozyaka.github.io/freightmatch/.

### Pre-commit
- **Husky** + **lint-staged** run Prettier on staged files before commit so formatting drift is impossible.
- Service `tsconfig`s use `strict: true` plus `noUncheckedIndexedAccess` so type errors surface early.

---

## 16. Local development workflow

The "no-Docker" path is the fastest inner loop:

```bash
pnpm install                   # one-shot install across all workspaces
pnpm dev                       # boots web + all services in parallel
```

`pnpm dev` runs `pnpm --parallel -r dev` from the root, which fans out to each package's own `dev` script. Service `dev` scripts use `tsx watch` — sub-second restart on save. The web app uses `next dev`.

Mongo and Kafka are still required as backing services. The recommended workflow:

```bash
docker compose -f infra/docker-compose.yaml up -d mongodb kafka zookeeper
pnpm dev
```

This combination gives a hot-reload dev server for every service while keeping the heavyweight infrastructure in containers.

The full bootstrap walkthrough lives in [`docs/setup-guide.md`](docs/setup-guide.md).

---

## 17. Containerization & deployment

### Per-service Dockerfile
Every service has a multi-stage `Dockerfile` (e.g. [`services/user-service/Dockerfile`](services/user-service/Dockerfile)) that:

1. **Builder stage** — installs the full workspace (root `package.json`, every service's `package.json`, both shared packages), copies the service's source, builds the `instrumentation` shared package, then builds the service.
2. **Runtime stage** — re-installs only production dependencies, copies just the built `dist/` output and `instrumentation/dist`, and runs `node dist/index.js`.

Both stages use `node:20-alpine`. The result is a small, deterministic image (~150 MB) per service.

### Compose
- [`infra/docker-compose.yaml`](infra/docker-compose.yaml) — local stack: Mongo replica set, Zookeeper + Kafka, four services, NGINX. Health checks on Mongo and Kafka guard service startup order via `condition: service_healthy`.
- [`infra/docker-compose.production.yaml`](infra/docker-compose.production.yaml) — production-shaped stack with `restart: unless-stopped`, JSON file logging with rotation, no host port exposure for backing services.

### NGINX
- Local: bind-mounts `infra/nginx/nginx.conf:ro`.
- Production: configuration is **baked into a custom image** so the running container is self-contained (commit `7bd163a` and predecessors).

---

## 18. Code quality & testing

### TypeScript strictness
Every package's `tsconfig.json` extends `tsconfig.base.json` which enables:
- `strict: true`
- `noUncheckedIndexedAccess`
- `noImplicitOverride`
- `forceConsistentCasingInFileNames`

This catches large classes of bugs at compile time and removes the need for many runtime guards.

### Testing
- **user-service** has Jest with `ts-jest` and a `__tests__/` folder colocated under `src/utils/`. Today it covers the trust-score utility (16 cases, 100 % branch coverage), validators, and user model behavior.
- The other services have minimal test scaffolding; expanding the suite is tracked as future work.
- Frontend tests are not committed yet; the manual checklist in `apps/web/TESTING.md` documents the golden paths to verify before promoting `master` to a release branch.

### Lint & format
- **Prettier 3** is the only formatter (no ESLint config beyond Next's default for the web app).
- **lint-staged** enforces Prettier on every commit via Husky.
- Type checking serves as the lint replacement for service code (`pnpm --filter <svc> typecheck` is wired as `lint`).

### Manual QA
[`apps/web/TESTING.md`](apps/web/TESTING.md) lists the six golden paths to walk through end-to-end before any release: shipper onboarding, posting a load, carrier discovery, bidding, accepting, and status transitions, plus accessibility, performance, and error-state checks.

---

## 19. API documentation strategy

Each service ships an **OpenAPI 3.1** spec under [`docs-site/specs/`](docs-site/specs/). The four specs are:
- `user-service.yaml`
- `load-service.yaml`
- `bidding-service.yaml`
- `matching-service.yaml`

A static `docs-site/index.html` loads Scalar from a CDN and renders all four specs in a single tabbed reference. The site is deployed to GitHub Pages by the `deploy-docs.yml` workflow on every `master` push that touches the specs.

Why specs over generated docs? **Specs are contracts.** Writing the spec first (or in lockstep with the implementation) forces the team to nail down request/response shapes before code is committed. Redocly's lint in CI rejects ambiguous or non-conformant specs.

A Postman collection is also committed at [`docs/FreightMatch.postman_collection.json`](docs/FreightMatch.postman_collection.json) for hand-testing.

---

## 20. Project organization

### Repository layout

```
freightmatch/
├── apps/
│   └── web/                  # Next.js 15 frontend
├── services/
│   ├── user-service/         # auth + profiles
│   ├── load-service/         # freight CRUD + lifecycle
│   ├── bidding-service/      # bids + accept/reject
│   └── matching-service/     # AI matching + chat
├── shared/
│   ├── contracts/            # Kafka topic names + types
│   └── instrumentation/      # metrics, logging, tracing, resilience
├── infra/
│   ├── docker-compose.yaml             # local stack
│   ├── docker-compose.production.yaml  # prod stack
│   └── nginx/nginx.conf                # gateway
├── monitoring/
│   ├── prometheus.yml
│   ├── docker-compose.yml              # Prometheus + Grafana
│   └── provisioning/                   # auto-provisioned dashboards
├── docs/
│   ├── ARCHITECTURE.md
│   ├── AI_FEATURE.md
│   ├── SECURITY_DESIGN.md
│   ├── kafka-topics.md
│   ├── setup-guide.md
│   ├── API.md
│   └── FreightMatch.postman_collection.json
├── docs-site/
│   ├── index.html
│   └── specs/                # one OpenAPI YAML per service
├── .github/workflows/
│   ├── ci.yml
│   └── deploy-docs.yml
├── PROJECT_REPORT.md         # this document
├── README.md
└── pnpm-workspace.yaml
```

### Branching & issue flow
The repository uses GitHub Issues as the project tracker, with labels for `frontend`, `backend`, `polish`, etc. Work follows a feature-branch flow:
- `master` is always deployable.
- Each issue gets its own `feat/issue-NN-short-name` branch.
- PRs reference the issue with `Closes #NN`, run CI, and merge as squash commits with semantic prefixes (`feat(web):`, `fix(infra):`, `docs:` …).

The recent commit history shows this discipline in practice (`feat(web): carrier marketplace…`, `feat(user-service): trust-score util…`, `[SH4] Load detail with timeline…`, etc.).

---

## 21. Engineering decisions & trade-offs

### Microservices over monolith
**Chose:** four services + gateway.
**Cost:** more moving parts, network hops, distributed state.
**Benefit:** clear bounded contexts, independent deployability, the option to scale only the AI service or only the bidding service when one becomes hot. Each service is small enough that a new contributor can read the entire codebase in an hour.

### Single MongoDB cluster, separate databases
**Chose:** one Mongo replica set, one DB per service.
**Cost:** the cluster is a shared resource; an outage takes everyone down.
**Benefit:** dramatically simpler ops than four separate clusters, while still preserving per-service schema ownership. The replica set unlocks change streams and transactions if we need them later.

### Kafka for cross-service state
**Chose:** Kafka for `load.created` and `bid.accepted`.
**Cost:** an extra moving part (and Zookeeper, in this version).
**Benefit:** producers don't block on consumers, events are durable and replayable, and the exact same topic can be consumed later by analytics or audit pipelines without modifying the producer.

### Shared internal secret over mTLS
**Chose:** `x-internal-secret` header validated in middleware.
**Cost:** the secret must be rotated manually, and a leaked secret bypasses internal authz.
**Benefit:** zero certificate management overhead for a small system. mTLS is the natural upgrade path.

### Next.js App Router over Pages
**Chose:** App Router with server components + server actions.
**Cost:** a younger paradigm with sharper edges around caching and Suspense.
**Benefit:** RSC unlocks fetching with HttpOnly cookies on the server, eliminates the need for a separate Node BFF layer beyond the proxy route, and lets us colocate layouts with route groups for clean role separation.

### Tailwind v4 with `@theme` over a CSS-in-JS solution
**Chose:** Tailwind v4 with declarative `@theme` tokens.
**Cost:** Tailwind v4 is newer and has fewer tutorials.
**Benefit:** zero runtime, design tokens that compile to CSS variables (so they work inside SVGs, motion props, and dynamic styles), and a single mental model that scales from the kitchen-sink showcase to one-off pages.

### LLM via OpenRouter rather than direct Anthropic
**Chose:** OpenRouter as the LLM gateway.
**Cost:** an extra hop (and OpenRouter's availability becomes a dependency).
**Benefit:** swap models without changing code, get usage metering/budgeting out of the box, and avoid tying the codebase to one provider's API quirks.

### pnpm workspaces over Nx/Turborepo
**Chose:** plain pnpm with parallel scripts.
**Cost:** no built-in task graph, no remote caching.
**Benefit:** zero configuration, instant onboarding for anyone who has used pnpm before, and CI build savings come from `dorny/paths-filter` rather than a black-box cache.

---

## 22. Future work

The platform is feature-complete for the marketplace flow but several improvements are tracked for iteration:

- **PATCH /api/bids** so carriers can edit a pending bid (currently the UI shows an existing bid as read-only).
- **Map clustering** at 100+ marketplace pins (current renderer is performant for tens of pins).
- **Redis-backed token blacklist** to support multi-instance user-service deployments.
- **mTLS for service-to-service** to replace the shared internal secret.
- **Test coverage parity** across all services (today only user-service has unit tests of substance).
- **Lighthouse and Axe DevTools** sweeps wired into CI for the web app on every PR (today the targets are documented in `apps/web/TESTING.md` as a manual QA gate).
- **Schema registry** for Kafka payloads (currently the contract is a TypeScript file; Confluent Schema Registry would let non-Node consumers join the bus).
- **CDC-based read model** for analytics queries that don't belong inside any service's transactional database.

---

## Appendix A — Document map

| Topic | Document |
|---|---|
| Quick start | [`README.md`](README.md) |
| Detailed setup | [`docs/setup-guide.md`](docs/setup-guide.md) |
| System architecture (Mermaid) | [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) |
| Security design | [`docs/SECURITY_DESIGN.md`](docs/SECURITY_DESIGN.md) |
| AI feature spec | [`docs/AI_FEATURE.md`](docs/AI_FEATURE.md) |
| Kafka contract | [`docs/kafka-topics.md`](docs/kafka-topics.md) |
| API reference site | [`docs/API.md`](docs/API.md) and https://yigitbozyaka.github.io/freightmatch/ |
| Web app dev notes | [`apps/web/README.md`](apps/web/README.md) |
| Manual QA checklist | [`apps/web/TESTING.md`](apps/web/TESTING.md) |
| Per-service READMEs | `services/<name>/README.md` |

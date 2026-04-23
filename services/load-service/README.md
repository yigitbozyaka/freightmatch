# Load Service

## Overview

Manages freight load lifecycle for the FreightMatch platform. Shippers create and manage loads; carriers browse available loads and bid on them. Publishes Kafka events when load status changes.

- **Port:** 3002
- **Database:** MongoDB (`freightmatch-loads`)
- **Kafka:** Producer — publishes `load.status.updated` events

---

## Endpoints

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `POST` | `/api/loads` | Bearer JWT (Shipper) | Create a new load (starts as Draft) |
| `GET` | `/api/loads/available` | Bearer JWT (Carrier) | List Posted loads; filters: `origin`, `destination`, `cargoType` |
| `GET` | `/api/loads/my-loads` | Bearer JWT (Shipper) | Get all loads owned by the shipper |
| `GET` | `/api/loads/:id` | Bearer JWT *or* `x-internal-secret` | Get a load by ID |
| `PATCH` | `/api/loads/:id` | Bearer JWT (Shipper, owner) | Partial update load fields |
| `DELETE` | `/api/loads/:id` | Bearer JWT (Shipper, owner) | Delete a load (204) |
| `PATCH` | `/api/loads/:id/status` | Bearer JWT (Shipper, owner) | Transition status: Draft → Posted → Matched → InTransit → Delivered / Cancelled |
| `GET` | `/health` | — | Service health check |
| `GET` | `/metrics` | — | Prometheus metrics |

**Rate limits:** 30 r/s general · 5 r/s auth routes

---

## Environment Variables

| Name | Required | Default | Description |
|------|----------|---------|-------------|
| `PORT` | No | `3002` | Service port |
| `MONGODB_URI` | Yes | — | MongoDB connection string |
| `JWT_SECRET` | Yes | — | JWT access token signing secret |
| `KAFKA_BROKER` | Yes | — | Kafka broker address (e.g. `kafka:9092`) |
| `INTERNAL_SERVICE_SECRET` | Yes | — | Shared secret for internal service calls |
| `CORS_ORIGIN` | No | `*` | Allowed CORS origins |

---

## Running Locally

```bash
# From the repo root
pnpm --filter @freightmatch/load-service dev
```

---

## API Reference

Full schemas, examples, and interactive "Try it" → **https://yigitbozyaka.github.io/freightmatch/**

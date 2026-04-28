# Bidding Service

## Overview

Manages carrier bid submission and evaluation for the FreightMatch platform. Carriers place bids on Posted loads; shippers review and accept bids. Accepting a bid publishes a Kafka event to transition the load to Matched status.

- **Port:** 3003
- **Database:** MongoDB (`freightmatch-bidding`)
- **Kafka:** Producer — publishes `bid.accepted` events; Consumer — listens for `load.status.updated`

---

## Endpoints

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `POST` | `/api/bids` | Bearer JWT (Carrier) | Place a bid on a Posted load |
| `GET` | `/api/bids/my` | Bearer JWT (Carrier) | Get all bids placed by the carrier |
| `GET` | `/api/bids/:loadId` | Bearer JWT (Shipper) | Get all bids for a specific load |
| `PATCH` | `/api/bids/:bidId/accept` | Bearer JWT (Shipper) | Accept a bid (triggers Kafka event) |
| `GET` | `/health` | — | Service health check |
| `GET` | `/metrics` | — | Prometheus metrics |

**Rate limit:** 30 r/s general

---

## Environment Variables

| Name | Required | Default | Description |
|------|----------|---------|-------------|
| `PORT` | No | `3003` | Service port |
| `MONGODB_URI` | Yes | — | MongoDB connection string |
| `JWT_SECRET` | Yes | — | JWT access token signing secret |
| `KAFKA_BROKER` | Yes | — | Kafka broker address (e.g. `kafka:9092`) |
| `LOAD_SERVICE_URL` | Yes | — | Load Service base URL for internal validation |
| `INTERNAL_SERVICE_SECRET` | Yes | — | Shared secret for internal service calls |
| `CORS_ORIGIN` | No | `*` | Allowed CORS origins |

---

## Running Locally

```bash
# From the repo root
pnpm --filter @freightmatch/bidding-service dev
```

---

## API Reference

Full schemas, examples, and interactive "Try it" → **https://yigitbozyaka.github.io/freightmatch/**

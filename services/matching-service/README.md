# Matching Service

## Overview

AI-powered load-to-carrier matching engine for the FreightMatch platform. Uses Claude 3.5 Haiku (via OpenRouter) to rank carriers against load requirements. Also exposes an AI chat assistant for logistics queries.

- **Port:** 3004
- **Database:** MongoDB (`freightmatch-matching`)
- **Kafka:** Consumer — listens for `load.status.updated` to auto-trigger matching

---

## Endpoints

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `GET` | `/api/match/:loadId` | — | Get cached carrier recommendations for a load |
| `POST` | `/api/match/recommend` | — | Manually trigger AI recommendation generation |
| `POST` | `/api/chat` | Bearer JWT | AI logistics chat assistant (rate-limit: 2 r/s) |
| `GET` | `/health` | — | Service health check |
| `GET` | `/metrics` | — | Prometheus metrics |

**Rate limits:** 2 r/s for `/api/chat` · 30 r/s general

---

## Environment Variables

| Name | Required | Default | Description |
|------|----------|---------|-------------|
| `PORT` | No | `3004` | Service port |
| `MONGODB_URI` | Yes | — | MongoDB connection string |
| `JWT_SECRET` | Yes | — | JWT access token signing secret |
| `KAFKA_BROKER` | Yes | — | Kafka broker address (e.g. `kafka:9092`) |
| `OPENROUTER_API_KEY` | Yes | — | OpenRouter API key for Claude 3.5 Haiku access |
| `USER_SERVICE_URL` | Yes | — | User Service base URL to fetch carrier list |
| `INTERNAL_SERVICE_SECRET` | Yes | — | Shared secret for internal service calls |
| `CORS_ORIGIN` | No | `*` | Allowed CORS origins |

---

## Running Locally

```bash
# From the repo root
pnpm --filter @freightmatch/matching-service dev
```

---

## API Reference

Full schemas, examples, and interactive "Try it" → **https://yigitbozyaka.github.io/freightmatch/**

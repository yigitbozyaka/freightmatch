# User Service

## Overview

Handles user registration, JWT authentication (access + refresh tokens), logout, profile retrieval, and carrier-profile management for the FreightMatch platform.

- **Port:** 3001
- **Database:** MongoDB (`freightmatch-users`)
- **Kafka:** Not used (no event publishing)

---

## Endpoints

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `POST` | `/api/users/register` | — | Register a Shipper or Carrier (rate-limit: 5 r/s) |
| `POST` | `/api/users/login` | — | Authenticate and receive JWT tokens (rate-limit: 5 r/s) |
| `POST` | `/api/users/refresh` | — | Exchange refresh token for new access token (rate-limit: 5 r/s) |
| `POST` | `/api/users/logout` | Bearer JWT | Revoke refresh token |
| `GET` | `/api/users/profile` | Bearer JWT | Get own profile |
| `GET` | `/api/users/:id` | Bearer JWT | Get user by ID |
| `PATCH` | `/api/users/carrier-profile` | Bearer JWT (Carrier) | Update carrier profile |
| `GET` | `/api/users/carriers` | `x-internal-secret` | List all carriers (internal only) |
| `GET` | `/api/users/carriers/:id` | `x-internal-secret` | Get carrier by ID (internal only) |
| `GET` | `/health` | — | Service health check |
| `GET` | `/metrics` | — | Prometheus metrics |

---

## Environment Variables

| Name | Required | Default | Description |
|------|----------|---------|-------------|
| `PORT` | No | `3001` | Service port |
| `MONGODB_URI` | Yes | — | MongoDB connection string |
| `JWT_SECRET` | Yes | — | JWT access token signing secret (min 32 chars) |
| `JWT_REFRESH_SECRET` | Yes | — | JWT refresh token signing secret (min 32 chars) |
| `INTERNAL_SERVICE_SECRET` | Yes | — | Shared secret for internal service calls (min 16 chars) |
| `CORS_ORIGIN` | No | `*` | Allowed CORS origins |

---

## Running Locally

```bash
# From the repo root
pnpm --filter @freightmatch/user-service dev
```

Or copy `.env.example` to `.env` and start in isolation:
```bash
cd services/user-service
cp .env.example .env
pnpm dev
```

---

## API Reference

Full schemas, examples, and interactive "Try it" → **https://yigitbozyaka.github.io/freightmatch/**

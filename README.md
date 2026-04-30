# FreightMatch

Microservices-based freight matching platform connecting shippers with carriers in real time.

![CI](https://github.com/yigitbozyaka/freightmatch/actions/workflows/ci.yml/badge.svg)

📘 **API Reference:** [FreightMatch API Documentation](https://yigitbozyaka.github.io/freightmatch/)

## Architecture

| Service | Port | Description |
|---------|------|-------------|
| **user-service** | 3001 | User registration, authentication, and profile management |
| **load-service** | 3002 | Freight load creation, search, and lifecycle management |
| **bidding-service** | 3003 | Carrier bid submission and bid evaluation |
| **matching-service** | 3004 | AI-powered load-to-carrier matching engine |

**Infrastructure:**
- **MongoDB** — primary data store for all services
- **Apache Kafka** — async event streaming between services
- **NGINX** — API gateway / reverse proxy (port 80)

## Prerequisites

- [Node.js 20](https://nodejs.org/) (see `.nvmrc`)
- [Docker & Docker Compose](https://docs.docker.com/get-docker/)
- [pnpm](https://pnpm.io/) (`npm install -g pnpm`)

## Quick Start

```bash
git clone https://github.com/yigitbozyaka/freightmatch.git
cd freightmatch

# Copy environment files for each service
cp services/user-service/.env.example services/user-service/.env
cp services/load-service/.env.example services/load-service/.env
cp services/bidding-service/.env.example services/bidding-service/.env
cp services/matching-service/.env.example services/matching-service/.env

# Start all infrastructure and services
cd infra
docker-compose up --build

# Verify the gateway is running
curl http://localhost/api/users/
```

You should receive `{ "service": "user-service", "status": "ok" }`.

## Development (without Docker)

```bash
pnpm install
pnpm dev
```

This starts all four services in parallel with hot-reload.

## Full Documentation

See [docs/setup-guide.md](docs/setup-guide.md) for detailed setup, configuration, and deployment instructions.

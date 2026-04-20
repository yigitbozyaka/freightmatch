# Load Service

## Overview
The Load Service is the core domain logic for managing freight. Shippers can create loads, update details, and publish them to the marketplace. It acts as a **Kafka Producer** (publishing `load.created` events when a load is posted) and a **Kafka Consumer** (listening to `bid.accepted` events to automatically update the load status to "Matched").

## Local Development (Outside Docker)
To run this service locally on your host machine:

1. Copy `.env.example` to `.env` and fill in the values (make sure your local `KAFKA_BROKER` is accessible).
2. Install dependencies:
   ```bash
   pnpm install
   ```
3. Start the development server:
   ```bash
   pnpm dev
   ```

## Endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/loads` | Create a new load (Draft status) |
| `GET` | `/api/loads/:id` | Get details of a specific load |
| `PATCH` | `/api/loads/:id` | Update load details |
| `DELETE` | `/api/loads/:id` | Delete a load |
| `GET` | `/api/loads/available` | List all available (Posted) loads |
| `PATCH` | `/api/loads/:id/status` | Update existing load status (e.g., to "Posted") |

## Required Environment Variables

You must define the following variables in your `.env` file (refer to `.env.example`):
- `PORT` (default: 3002)
- `MONGODB_URI`
- `JWT_SECRET`
- `KAFKA_BROKER`

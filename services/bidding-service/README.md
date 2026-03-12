# Bidding Service

## Overview
The Bidding Service manages the marketplace negotiation between Shippers and Carriers. Carriers submit bids for posted loads, and shippers can accept or reject these offers. Once a bid is accepted, the system broadcasts a `bid.accepted` Kafka event, which alerts the rest of the ecosystem (like the Load Service) that a match has been made.

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
| `POST` | `/api/bids` | Submit a new bid on a load |
| `GET` | `/api/bids/:loadId` | View all bids for a specific load |
| `PATCH` | `/api/bids/:bidId/accept` | Accept a carrier's bid |
| `GET` | `/api/bids/my` | View bids submitted by the logged-in carrier |

## Required Environment Variables

You must define the following variables in your `.env` file (refer to `.env.example`):
- `PORT` (default: 3003)
- `MONGODB_URI`
- `JWT_SECRET`
- `KAFKA_BROKER`

# Matching Service

## Overview
The Matching Service is the AI-powered recommendation engine of FreightMatch. It uses the Anthropic Claude AI API. It consumes `load.created` events via Kafka. Once a load is posted, it analyzes the load requirements (cargo type, origin, destination) against the registered carrier profiles to generate smart matching recommendations.

## Local Development (Outside Docker)
To run this service locally on your host machine:

1. Copy `.env.example` to `.env` and fill in the values (you will need a valid `ANTHROPIC_API_KEY`).
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
| `GET` | `/api/match/:loadId` | Get AI recommendations for a specific load |
| `POST` | `/api/match/recommend` | Manually trigger a recommendation generation |

## Required Environment Variables

You must define the following variables in your `.env` file (refer to `.env.example`):
- `PORT` (default: 3004)
- `MONGODB_URI`
- `ANTHROPIC_API_KEY` (Required for AI generation)
- `KAFKA_BROKER`

# User Service

## Overview
The User Service handles all user management and authentication logic for the FreightMatch platform. It manages registration for both Shippers and Carriers, generates and validates JWT tokens, and maintains carrier profile data (such as truck types and capacity) used by the matching engine.

## Local Development (Outside Docker)
To run this service locally on your host machine:

1. Copy `.env.example` to `.env` and fill in the values.
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
| `POST` | `/api/users/register` | Register a new shipper or carrier |
| `POST` | `/api/users/login` | Authenticate user and get JWT tokens |
| `POST` | `/api/users/refresh` | Get a new access token using a refresh token |
| `GET` | `/api/users/:id` | Get details of a specific user |
| `PATCH` | `/api/users/carrier-profile` | Update the authenticated carrier's profile |
| `GET` | `/api/carriers` | List all registered carriers |

## Required Environment Variables

You must define the following variables in your `.env` file (refer to `.env.example`):
- `PORT` (default: 3001)
- `MONGODB_URI`
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`

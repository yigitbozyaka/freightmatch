# Project Setup Guide

Welcome to the **FreightMatch** project. This guide will help you get the entire microservice architecture running locally on your machine from scratch.

## Prerequisites

Before you begin, ensure you have the following installed:
* **Node.js**: v20 or higher
* **pnpm**: Package manager (install via `npm i -g pnpm` if you don't have it)
* **Docker** & **Docker Compose**: For running Kafka and MongoDB
* **Git**: For version control

---

## Step-by-Step Instructions

### 1. Clone the Repository
Clone the repository and enter the project folder:
```bash
git clone https://github.com/yigitbozyaka/freightmatch.git
cd freightmatch
```

### 2. Configure Environment Variables
Each microservice has an `.env.example` file. You need to copy this file to `.env` in all 4 service directories and the infra/seed directory.

#### User Service
```bash
cd services/user-service
cp .env.example .env
```
📝 *Values:*
- MONGODB_URI: `mongodb://localhost:27017/freightmatch-users?directConnection=true`
- JWT_SECRET: `your_jwt_secret`
- JWT_REFRESH_SECRET: `your_refresh_secret`

#### Load Service
```bash
cd ../load-service
cp .env.example .env
```
📝 *Values:*
- MONGODB_URI: `mongodb://localhost:27017/freightmatch-loads?directConnection=true`
- JWT_SECRET: `your_jwt_secret`
- KAFKA_BROKER: `localhost:29092` (Localhost port mapping for Docker)

#### Bidding Service
```bash
cd ../bidding-service
cp .env.example .env
```
📝 *Values:*
- MONGODB_URI: `mongodb://localhost:27017/freightmatch-bidding?directConnection=true`
- JWT_SECRET: `your_jwt_secret`
- KAFKA_BROKER: `localhost:29092`

#### Matching Service
```bash
cd ../matching-service
cp .env.example .env
```
📝 *Values:*
- MONGODB_URI: `mongodb://localhost:27017/freightmatch-matching?directConnection=true`
- KAFKA_BROKER: `localhost:29092`
- ANTHROPIC_API_KEY: *(Ask the team lead for a valid Claude API Key)*

*(Return to the root directory)*
```bash
cd ../..
```

### 3. Start the Infrastructure (Docker)
Start MongoDB, Kafka, and Zookeeper using Docker Compose. This runs the required databases and message brokers in the background.

```bash
cd infra
docker compose up -d
```
*(Wait 10-15 seconds for Kafka to be fully initialized)*

### 4. Install Dependencies
Install all Node.js dependencies at the workspace level using pnpm:
```bash
cd ..
pnpm install
```

### 5. Run the Database Seed Script
To test the API properly, you need mock data (Shippers, Carriers, and Loads). Run the seed script to populate MongoDB automatically.

```bash
cd infra/seed
pnpm seed
```
> This will create 5 users (with hashed passwords) and 5 sample loads.

### 6. Start the Services
You can run all services simultaneously using the root pnpm workspace command:
```bash
cd ../..
pnpm dev
```

### 7. Import Postman Collection for Testing
1. Open **Postman**.
2. Click **Import** and select the file located at: `docs/FreightMatch.postman_collection.json`.
3. You can now use the endpoints! (e.g., Use `Auth/Login` to get tokens and start testing).

---

## Troubleshooting

### Kafka Not Ready
If you see errors like `BrokerNotAvailableError`, Kafka is likely still starting up. 
* **Solution**: Wait about 15-20 seconds after running `docker compose up -d`. Kafka requires Zookeeper to be fully healthy before it accepts connections.

### MongoDB Connection Failed
If a service or the seed script cannot connect to `mongodb`:
* **Explanation**: The MongoDB instance in `docker-compose.yml` runs as a Replica Set (`rs0`) with the hostname `mongodb`. From your local computer, this hostname cannot be resolved.
* **Solution**: Ensure your `MONGODB_URI` inside your `.env` files ends with `?directConnection=true` (e.g., `mongodb://localhost:27017/freightmatch-users?directConnection=true`). This forces mongoose to connect directly instead of relying on the replica set topology list.

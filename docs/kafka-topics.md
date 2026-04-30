# Kafka Topics & Events Documentation

The FreightMatch system utilizes Apache Kafka for asynchronous communication between microservices, ensuring decoupled, event-driven architecture.

## Overview

| Topic | Producer | Consumer | Description |
|---|---|---|---|
| `load.created` | `load-service` | `matching-service` | Fired when a load is moved to the "Posted" status. Triggers the AI matching engine to find suitable carriers. |
| `bid.accepted` | `bidding-service` | `load-service` | Fired when a shipper accepts a carrier's bid on a load. Used to transition the load status to "Matched". |

---

## JSON Payload Schemas

### 1. Topic: `load.created`

This event is published by the **Load Service**.

```json
{
  "loadId": "65b9df2e4f1a2c001234abcd",
  "title": "Fresh Produce Delivery",
  "origin": "Istanbul",
  "destination": "Ankara",
  "cargoType": "perishable",
  "weightKg": 1800,
  "deadlineHours": 24,
  "timestamp": "2024-02-12T10:30:00.000Z"
}
```

**Schema Details:**
- `loadId` (string): The unique MongoDB ObjectId of the load.
- `title` (string): Short description of the load.
- `origin` (string): Starting city/location.
- `destination` (string): Ending city/location.
- `cargoType` (string): The type of cargo (e.g., perishable, construction, electronics).
- `weightKg` (number): Total weight of the load in kilograms.
- `deadlineHours` (number): Allowed transit time in hours.
- `timestamp` (string/Date): ISO 8601 string of when the event occurred.

---

### 2. Topic: `bid.accepted`

This event is published by the **Bidding Service**.

```json
{
  "bidId": "65b9df9f4f1a2c005678efgh",
  "loadId": "65b9df2e4f1a2c001234abcd",
  "carrierId": "65b9dd114f1a2c009999zzzz",
  "amount": 2500,
  "timestamp": "2024-02-12T11:45:00.000Z"
}
```

**Schema Details:**
- `bidId` (string): The unique MongoDB ObjectId of the accepted bid.
- `loadId` (string): The MongoDB ObjectId of the load that the bid belongs to.
- `carrierId` (string): The unique MongoDB ObjectId of the carrier who won the bid.
- `amount` (number): The final accepted bid amount in the platform currency (e.g., TL/USD).
- `timestamp` (string/Date): ISO 8601 string of when the bid was accepted.

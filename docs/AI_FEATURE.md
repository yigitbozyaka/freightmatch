# FreightMatch AI Feature Documentation

## Overview

FreightMatch integrates AI capabilities via **OpenRouter** (LLM provider) using the **Claude 3.5 Haiku** model. The platform features two AI-powered components:

1. **AI Carrier Matching** — Automated carrier recommendation engine
2. **AI Freight Chatbot** — Intelligent assistant for freight logistics queries

---

## 1. AI Carrier Matching (Existing + Enhanced)

### How It Works
When a shipper creates a new load, the system automatically generates AI-powered carrier recommendations:

```
Shipper creates load → Kafka event (load.created) → Matching Service
    → Fetches all carriers from User Service
    → Sends cargo + carrier data to Claude 3.5 Haiku via OpenRouter
    → Claude ranks top 3 carriers by suitability (0-100 score + reasoning)
    → Recommendations stored in MongoDB
```

### API Endpoints

#### Get Recommendations for a Load
```
GET /api/match/:loadId
```
**Response:**
```json
{
  "loadId": "6621abc...",
  "recommendations": [
    {
      "carrierId": "6621def...",
      "score": 95,
      "reason": "Refrigerated truck with high capacity, located near origin city, excellent 4.8/5 rating"
    },
    {
      "carrierId": "6621ghi...",
      "score": 82,
      "reason": "Dry-van with adequate capacity, 4.5/5 rating, 50+ completed shipments"
    }
  ],
  "generatedAt": "2026-04-10T12:00:00Z"
}
```

#### Manual Recommendation Trigger
```
POST /api/match/recommend
Content-Type: application/json

{
  "loadId": "6621abc...",
  "origin": "Chicago, IL",
  "destination": "Dallas, TX",
  "cargoType": "Electronics",
  "weightKg": 5000,
  "deadlineHours": 48,
  "shipperId": "6621xyz..."
}
```

### Fallback Mechanism
If the AI API is unavailable, the system falls back to a rating-based ranking algorithm that sorts carriers by their historical rating (5-star system).

---

## 2. AI Freight Chatbot (New Feature)

### Description
An intelligent conversational assistant that helps users with freight logistics queries, route planning, pricing estimates, cargo advice, and platform guidance.

### Architecture
```
User → POST /api/chat → Auth Middleware → Rate Limiter → Chat Controller
    → Chat Service → OpenRouter API (Claude 3.5 Haiku) → Response
```

### API Endpoint

#### Send Chat Message
```
POST /api/chat
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "message": "What truck type should I use for shipping frozen food from Chicago to Miami?",
  "conversationHistory": []
}
```

**Response:**
```json
{
  "reply": "For shipping frozen food from Chicago to Miami, you should use a **refrigerated truck** (reefer). Here's why:\n\n- **Temperature Control**: Frozen food requires consistent temperatures between -10°F to 0°F\n- **Distance**: Chicago to Miami is approximately 1,380 miles (roughly 22-24 hours of driving)\n- **Compliance**: FDA Food Safety Modernization Act requires temperature monitoring for perishable goods\n\n**Estimated Cost**: $3.50-$5.00 per mile for refrigerated freight, so approximately $4,800-$6,900 for this route.\n\n*Note: These are rough estimates. Actual pricing depends on seasonal demand, fuel costs, and carrier availability.*",
  "model": "anthropic/claude-3.5-haiku",
  "tokensUsed": 287
}
```

### Multi-Turn Conversations
The chatbot supports conversation history for contextual follow-up questions:

```json
{
  "message": "What about the weight limit for that truck type?",
  "conversationHistory": [
    {
      "role": "user",
      "content": "What truck type should I use for shipping frozen food from Chicago to Miami?"
    },
    {
      "role": "assistant",
      "content": "For shipping frozen food... (previous response)"
    }
  ]
}
```

The system keeps the last 10 messages for context, preventing excessive token usage.

### Chatbot Capabilities

| Capability | Description |
|------------|-------------|
| Route Planning | Suggests optimal routes between cities |
| Pricing Estimates | Rough freight cost estimates with disclaimers |
| Cargo Advice | Recommends truck types based on cargo characteristics |
| Best Practices | Packaging, timing, regulations, documentation advice |
| Platform Help | Guides users on creating loads, bidding, tracking |
| Market Insights | Freight industry trends, seasonal patterns |

### Rate Limiting
The chatbot has dedicated rate limiting to protect against API cost abuse:
- **NGINX Layer**: 2 requests/second, burst of 5
- **Application Layer**: 20 requests per 15-minute window
- **Authentication Required**: Only logged-in users can access the chatbot

### Security
- JWT authentication required (both Shipper and Carrier roles)
- Input sanitized through Express JSON parser with 1MB body limit
- No user data sent to AI beyond the conversation content
- AI responses are stateless (no conversation persistence on server)

---

## 3. AI Provider Configuration

### OpenRouter Setup
- **Provider**: OpenRouter (https://openrouter.ai)
- **Model**: `anthropic/claude-3.5-haiku`
- **API Key**: Stored in `OPENROUTER_API_KEY` environment variable
- **Base URL**: `https://openrouter.ai/api/v1/chat/completions`

### Model Parameters

| Parameter | Matching Service | Chat Service |
|-----------|-----------------|-------------|
| Temperature | 0.3 (deterministic) | 0.7 (conversational) |
| Max Tokens | 1024 | 1024 |
| Context Window | Single prompt | Last 10 messages |

### Cost Management
- Rate limiting prevents excessive API calls
- Token usage returned in chat responses for monitoring
- Matching uses fallback algorithm when API fails (no retry loops)
- Prometheus metrics track API call volume

---

## 4. Testing the AI Features

### Prerequisites
1. Set `OPENROUTER_API_KEY` in matching-service `.env` file
2. Start the services: `pnpm dev` or `docker-compose up`
3. Register a user and obtain a JWT token

### Test the Chatbot
```bash
# 1. Register a user
curl -X POST http://localhost:3001/api/users/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!@#","role":"Shipper"}'

# 2. Login to get token
TOKEN=$(curl -s -X POST http://localhost:3001/api/users/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!@#"}' | jq -r '.accessToken')

# 3. Chat with AI
curl -X POST http://localhost:3004/api/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"message":"What is the best truck type for shipping 10000kg of steel beams?","conversationHistory":[]}'
```

### Test Carrier Matching
```bash
# Create a load (as Shipper) - matching runs automatically via Kafka
curl -X POST http://localhost:3002/api/loads \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "title":"Steel Shipment",
    "origin":"Houston, TX",
    "destination":"Detroit, MI",
    "cargoType":"Steel",
    "weightKg":15000,
    "deadlineHours":72
  }'

# Check AI recommendations
curl http://localhost:3004/api/match/<loadId>
```

---

## 5. Architecture Diagram

See `docs/ARCHITECTURE.md` for the updated system architecture diagram showing AI integration points and security layers.

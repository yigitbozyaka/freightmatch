# FreightMatch System Architecture

## Updated Architecture Diagram

```mermaid
graph TB
    subgraph "Client Layer"
        CLIENT[Client Applications<br/>Web / Mobile / API]
    end

    subgraph "Security Gateway"
        NGINX[NGINX Reverse Proxy<br/>Port 80]
        NGINX_SEC[Security Headers<br/>HSTS, CSP, X-Frame-Options<br/>X-Content-Type-Options]
        NGINX_RL[Rate Limiting<br/>api_auth: 5r/s<br/>api_general: 30r/s<br/>api_chat: 2r/s]
        NGINX --- NGINX_SEC
        NGINX --- NGINX_RL
    end

    subgraph "Authentication Layer"
        JWT[JWT Authentication<br/>Access: 15min / Refresh: 7d]
        RBAC[Role-Based Access Control<br/>Shipper | Carrier]
        LOCKOUT[Account Lockout<br/>5 failures → 15min lock]
        BLACKLIST[Token Blacklist<br/>Logout Revocation]
        JWT --- RBAC
        JWT --- LOCKOUT
        JWT --- BLACKLIST
    end

    subgraph "Microservices"
        subgraph "User Service :3001"
            US[Express + Helmet + CORS]
            US_AUTH[Auth: Register / Login<br/>Logout / Refresh]
            US_PWD[Password Security<br/>bcrypt 12 rounds<br/>Complexity Rules]
            US_CARRIER[Carrier Profiles<br/>Internal Auth]
            US --- US_AUTH
            US --- US_PWD
            US --- US_CARRIER
        end

        subgraph "Load Service :3002"
            LS[Express + Helmet + CORS]
            LS_CRUD[Load CRUD<br/>Status Transitions]
            LS_RL[Rate Limiter<br/>100 req/15min]
            LS --- LS_CRUD
            LS --- LS_RL
        end

        subgraph "Bidding Service :3003"
            BS[Express + Helmet + CORS]
            BS_BIDS[Bid Management<br/>Submit / Accept]
            BS_RL[Rate Limiter<br/>100 req/15min<br/>Bids: 20/15min]
            BS --- BS_BIDS
            BS --- BS_RL
        end

        subgraph "Matching Service :3004"
            MS[Express + Helmet + CORS]
            MS_MATCH[AI Carrier Matching<br/>Auto-recommendations]
            MS_CHAT[AI Freight Chatbot<br/>Route / Pricing / Advice]
            MS_RL[Rate Limiter<br/>60 req/15min<br/>Chat: 20/15min]
            MS --- MS_MATCH
            MS --- MS_CHAT
            MS --- MS_RL
        end
    end

    subgraph "AI Layer"
        OPENROUTER[OpenRouter API<br/>LLM Provider]
        CLAUDE[Claude 3.5 Haiku<br/>Matching: temp 0.3<br/>Chat: temp 0.7]
        FALLBACK[Fallback Algorithm<br/>Rating-based ranking]
        OPENROUTER --- CLAUDE
        MS_MATCH --> OPENROUTER
        MS_CHAT --> OPENROUTER
        MS_MATCH -.->|API failure| FALLBACK
    end

    subgraph "Event Bus"
        KAFKA[Apache Kafka]
        TOPIC1[load.created]
        TOPIC2[bid.accepted]
        KAFKA --- TOPIC1
        KAFKA --- TOPIC2
    end

    subgraph "Data Layer"
        MONGO[(MongoDB 7<br/>Replica Set)]
        DB1[(freightmatch-users)]
        DB2[(freightmatch-loads)]
        DB3[(freightmatch-bidding)]
        DB4[(freightmatch-matching)]
        MONGO --- DB1
        MONGO --- DB2
        MONGO --- DB3
        MONGO --- DB4
    end

    subgraph "Observability"
        PROM[Prometheus<br/>Metrics Collection]
        GRAFANA[Grafana<br/>Dashboards]
        OTEL[OpenTelemetry<br/>Distributed Tracing]
        WINSTON[Winston + Loki<br/>Structured Logging]
        PROM --> GRAFANA
    end

    subgraph "Secrets Management"
        ENV[Environment Variables<br/>Zod Validated]
        SEC_JWT[JWT Secrets<br/>min 32 chars]
        SEC_INT[Internal Secret<br/>min 16 chars]
        SEC_API[API Keys<br/>OpenRouter]
        ENV --- SEC_JWT
        ENV --- SEC_INT
        ENV --- SEC_API
    end

    CLIENT --> NGINX
    NGINX --> US
    NGINX --> LS
    NGINX --> BS
    NGINX --> MS

    US --> DB1
    LS --> DB2
    BS --> DB3
    MS --> DB4

    LS -->|publish| TOPIC1
    BS -->|publish| TOPIC2
    MS -->|subscribe| TOPIC1

    MS -->|x-internal-secret| US_CARRIER

    US --> PROM
    LS --> PROM
    BS --> PROM
    MS --> PROM

    US --> OTEL
    LS --> OTEL
    BS --> OTEL
    MS --> OTEL
```

## Security Flow Diagram

```mermaid
sequenceDiagram
    participant C as Client
    participant N as NGINX Gateway
    participant U as User Service
    participant DB as MongoDB
    participant L as Load Service
    participant K as Kafka
    participant M as Matching Service
    participant AI as OpenRouter (Claude)

    Note over N: Rate Limiting Check
    Note over N: Security Headers Applied

    C->>N: POST /api/users/register
    N->>U: Forward (rate: 5r/s)
    Note over U: Zod Validation
    Note over U: Password Complexity Check
    U->>DB: Hash password (bcrypt 12)
    U-->>C: 201 Created

    C->>N: POST /api/users/login
    N->>U: Forward (rate: 5r/s)
    Note over U: Check Account Lockout
    U->>DB: Verify credentials
    alt Invalid Password
        Note over U: Increment failed attempts
        alt 5+ failures
            Note over U: Lock account 15min
        end
        U-->>C: 401/423 Error
    else Valid Password
        Note over U: Reset failed attempts
        Note over U: Sign JWT (15min + 7d refresh)
        U-->>C: 200 {accessToken, refreshToken}
    end

    C->>N: POST /api/loads (Bearer token)
    N->>L: Forward (rate: 30r/s)
    Note over L: JWT Verification
    Note over L: Role: Shipper only
    L->>DB: Create Load
    L->>K: Publish load.created
    L-->>C: 201 Load Created

    K->>M: Consume load.created
    M->>U: GET /api/users/carriers<br/>(x-internal-secret)
    Note over U: Validate Internal Secret
    U-->>M: Carrier List
    M->>AI: Rank carriers (temp: 0.3)
    AI-->>M: Top 3 recommendations
    M->>DB: Store recommendations

    C->>N: POST /api/chat (Bearer token)
    N->>M: Forward (rate: 2r/s)
    Note over M: JWT Verification
    Note over M: App Rate Limit (20/15min)
    M->>AI: Chat query (temp: 0.7)
    AI-->>M: AI Response
    M-->>C: {reply, model, tokensUsed}

    C->>N: POST /api/users/logout (Bearer token)
    N->>U: Forward
    Note over U: Blacklist access + refresh tokens
    U-->>C: 200 Logged Out
```

## Service Communication Matrix

```mermaid
graph LR
    subgraph "External"
        C[Client]
        OR[OpenRouter API]
    end

    subgraph "Internal Network"
        N[NGINX :80]
        US[User :3001]
        LS[Load :3002]
        BS[Bidding :3003]
        MS[Matching :3004]
        K[Kafka :9092]
        M[(MongoDB :27017)]
    end

    C -->|HTTPS| N
    N -->|HTTP| US
    N -->|HTTP| LS
    N -->|HTTP| BS
    N -->|HTTP| MS

    MS -->|x-internal-secret| US
    BS -->|x-internal-secret| LS

    LS -->|produce| K
    BS -->|produce| K
    MS -->|consume| K

    MS -->|HTTPS| OR

    US --> M
    LS --> M
    BS --> M
    MS --> M

    style C fill:#e1f5fe
    style OR fill:#fff3e0
    style N fill:#c8e6c9
    style K fill:#f3e5f5
    style M fill:#ffecb3
```

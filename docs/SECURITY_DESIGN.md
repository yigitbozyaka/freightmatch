# FreightMatch Security Design Report

## 1. Executive Summary

This document outlines the comprehensive security architecture implemented across the FreightMatch microservices platform. The security strategy follows a defense-in-depth approach with multiple layers of protection at the network, application, and data levels.

---

## 2. Authentication Security

### 2.1 JWT-Based Authentication
- **Access Tokens**: Short-lived (15 min) JWT tokens for API authentication
- **Refresh Tokens**: Long-lived (7 days) tokens for session continuity
- **Token Signing**: HMAC-SHA256 with enforced minimum 32-character secrets
- **Token Payload**: Contains `userId`, `email`, and `role` claims

### 2.2 Password Security
| Feature | Implementation |
|---------|---------------|
| Hashing Algorithm | bcrypt with 12 salt rounds |
| Complexity Requirements | Min 8 chars, uppercase, lowercase, number, special character |
| Validation Layer | Dual validation (Zod schema + service-level) |
| Storage | Only hashed passwords stored; plaintext never persisted |

### 2.3 Account Lockout Protection
- **Threshold**: 5 consecutive failed login attempts
- **Lock Duration**: 15 minutes
- **Reset**: Successful login resets the failed attempt counter
- **User Feedback**: Returns remaining lockout time in error response
- **Status Code**: 423 (Locked) with descriptive message

### 2.4 Token Blacklisting (Logout)
- `POST /api/users/logout` endpoint (requires authentication)
- Blacklists both access and refresh tokens on logout
- Middleware checks blacklist before accepting any token
- In-memory store (recommended: upgrade to Redis for multi-instance deployments)

### 2.5 Secure Internal Service Communication
- **Before**: Any request with `x-internal-request` header was trusted
- **After**: Shared secret (`INTERNAL_SERVICE_SECRET`) validated via `x-internal-secret` header
- Minimum 16-character secret enforced by Zod validation
- Applied to all inter-service calls (matching-service -> user-service, etc.)

---

## 3. Rate Limiting

### 3.1 Multi-Layer Rate Limiting

#### NGINX Gateway Layer
| Zone | Rate | Burst | Use Case |
|------|------|-------|----------|
| `api_auth` | 5 req/s | 10 | Login, register, token refresh |
| `api_general` | 30 req/s | 20 | All standard API endpoints |
| `api_chat` | 2 req/s | 5 | AI chatbot (expensive operations) |

#### Application Layer (express-rate-limit)
| Service | Endpoint Type | Window | Max Requests |
|---------|--------------|--------|-------------|
| user-service | Auth endpoints | 15 min | 10 |
| load-service | All endpoints | 15 min | 100 |
| load-service | Write operations | 15 min | 30 |
| bidding-service | All endpoints | 15 min | 100 |
| bidding-service | Bid submissions | 15 min | 20 |
| matching-service | All endpoints | 15 min | 60 |
| matching-service | AI chat | 15 min | 20 |

### 3.2 Rate Limit Headers
- `RateLimit-Limit`: Maximum requests allowed
- `RateLimit-Remaining`: Requests remaining in window
- `RateLimit-Reset`: Time when the window resets
- Standard headers enabled; legacy headers disabled

---

## 4. HTTP Security Headers

### 4.1 Helmet.js (Application Layer)
All 4 microservices use `helmet()` middleware which sets:
- `Content-Security-Policy`
- `X-DNS-Prefetch-Control`
- `X-Download-Options`
- `X-Content-Type-Options: nosniff`
- `X-Permitted-Cross-Domain-Policies`
- `Referrer-Policy`
- `Strict-Transport-Security`
- `X-XSS-Protection`

### 4.2 NGINX Gateway Headers
Additional headers at the reverse proxy level:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Content-Security-Policy: default-src 'self'`
- `Strict-Transport-Security: max-age=31536000; includeSubDomains`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- `server_tokens off` (hides NGINX version)

---

## 5. Secrets Management

### 5.1 Environment Variable Validation
All services use Zod schemas to validate environment variables at startup:
- **JWT_SECRET**: Minimum 32 characters enforced
- **JWT_REFRESH_SECRET**: Minimum 32 characters enforced
- **INTERNAL_SERVICE_SECRET**: Minimum 16 characters enforced
- **OPENROUTER_API_KEY**: Required, non-empty validation

### 5.2 Secret Hygiene
- `.env` files are `.gitignore`d
- `.env.example` files contain placeholder values only
- No secrets hardcoded in source code
- Application exits immediately if required secrets are missing or too short

### 5.3 Configuration Isolation
- Each microservice has its own `.env` file
- Docker Compose uses `env_file` directive for container injection
- Secrets are never logged (Winston logger configured appropriately)

---

## 6. CORS Configuration

- Configurable `CORS_ORIGIN` per service via environment variable
- Default: `*` (development); should be restricted in production
- Allowed methods: `GET, POST, PATCH, DELETE`
- Allowed headers: `Content-Type, Authorization`
- Preflight cache: 24 hours (`maxAge: 86400`)

---

## 7. Input Validation

### 7.1 Request Body Validation
- Zod schemas validate all request bodies before reaching controllers
- Type-safe parsing with descriptive error messages
- Email format validation on registration/login

### 7.2 Body Size Limits
- Express JSON parser: 1MB limit per request
- NGINX: 1MB client max body size

---

## 8. Authorization (RBAC)

| Role | Permissions |
|------|------------|
| **Shipper** | Create/update/delete loads, view bids, accept bids, update status |
| **Carrier** | View available loads, submit bids, manage carrier profile |
| **Internal** | Service-to-service calls (carrier lookup, load details) |

Authorization is enforced via `authorize()` middleware on every protected route.

---

## 9. Infrastructure Security

### 9.1 Docker Security
- Multi-stage builds minimize container attack surface
- Node 20 Alpine base images (minimal OS)
- Non-root process execution via Node.js
- Production dependencies only in runtime stage

### 9.2 Network Security
- All services communicate through Docker internal network
- Only NGINX exposed on port 80 externally
- MongoDB and Kafka not exposed to host in production
- `X-Powered-By` header disabled on all services

---

## 10. Security Monitoring

### 10.1 Observability Stack
- **Logging**: Winston structured JSON logs with optional Grafana Loki transport
- **Metrics**: Prometheus counters for HTTP requests, Kafka messages, MongoDB operations
- **Tracing**: OpenTelemetry distributed tracing across all services
- **Health Checks**: `/health` endpoints with MongoDB and memory monitoring

### 10.2 Security-Relevant Metrics
- `http_requests_total` — tracks all requests by method/route/status (monitors 401/403 spikes)
- Rate limit exhaustion visible in response headers
- Failed login attempts tracked in user model

---

## 11. Threat Mitigation Summary

| Threat | Mitigation |
|--------|-----------|
| Brute Force Login | Rate limiting (5 req/s at gateway, 10/15min at app) + account lockout after 5 failures |
| JWT Theft | Short-lived tokens (15min), token blacklisting on logout |
| Password Weakness | Complexity requirements + bcrypt with 12 salt rounds |
| XSS | Helmet CSP headers, X-XSS-Protection |
| Clickjacking | X-Frame-Options: DENY |
| MIME Sniffing | X-Content-Type-Options: nosniff |
| Internal API Abuse | Shared secret authentication for service-to-service calls |
| Secret Exposure | Zod validation, .gitignore, no hardcoded secrets |
| DDoS / Abuse | Multi-layer rate limiting (NGINX + application) |
| Data Injection | Zod input validation on all endpoints |

---

## 12. Recommendations for Production

1. **TLS Termination**: Add SSL/TLS certificates to NGINX (Let's Encrypt)
2. **Redis Token Store**: Replace in-memory blacklist with Redis for multi-instance support
3. **Secret Rotation**: Implement automated JWT secret rotation with grace period
4. **WAF**: Deploy a Web Application Firewall (e.g., ModSecurity, Cloudflare)
5. **Audit Logging**: Add dedicated security event logging for compliance
6. **Dependency Scanning**: Integrate `npm audit` and Snyk into CI/CD pipeline
7. **Container Scanning**: Add Trivy or similar image vulnerability scanning
8. **CORS Restriction**: Set `CORS_ORIGIN` to specific frontend domain(s) in production

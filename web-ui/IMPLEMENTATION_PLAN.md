# Dashboard Pages & Service Health Indicator — Implementation Plan

Build role-aware dashboards with quick-action cards, a service health indicator in the navbar, and functional page content.

---

## Key Decisions

- The Dashboard page renders **different cards** based on `user.role`. Shipper sees "New Load" + "My Loads". Carrier sees "Browse Loads" + "My Bids" + "My Profile". No separate routes — just conditional rendering.
- The health dots will poll `/health/users`, `/health/loads`, `/health/bids`, `/health/match` every 30 seconds. Each dot shows green (healthy) / red (down) / gray (checking). Hovering shows the service name and DB status.

---

## Proposed Changes

### 1. Navbar — Service Health Indicator

**[NEW] `src/components/ServiceHealthDots.tsx`**
- A compact row of 4 colored dots in the top bar (between the logo and user info).
- Polls the 4 health endpoints every 30s via `setInterval`.
- Each dot: 🟢 green = healthy, 🔴 red = down/error, ⚫ gray = loading.
- Tooltip on hover shows service name + `db: connected/disconnected`.

**[MODIFY] `src/layouts/DashboardLayout.tsx`**
- Insert `<ServiceHealthDots />` into the navbar between logo and user section.
- Add a link on the "F" logo to navigate to `/` (dashboard home).

---

### 2. Dashboard — Role-Based Quick Actions

**[MODIFY] `src/pages/Dashboard.tsx`**
- Replace current hardcoded mock content with role-conditional cards.
- **Shipper Dashboard**: 2 big cards side by side:
  - 📦 "Post New Load" → links to `/create-load`
  - 📋 "My Loads" → links to `/my-loads`
- **Carrier Dashboard**: 3 big cards:
  - 🔍 "Browse Available Loads" → links to `/available-loads`
  - 💰 "My Bids" → links to `/my-bids`
  - 🚛 "My Profile" → links to `/carrier-profile`
- Uses Shadcn `<Card>` components, each with an emoji icon, title, and subtitle.

---

### 3. Shipper Pages

**[MODIFY] `src/pages/shipper/MyLoads.tsx`**
- Fetch `GET /api/loads/my-loads` on mount.
- Display loads in a list/table with: title, origin → destination, status badge, created date.
- Each row links to `/loads/:id`.
- "Create Load" button at the top.

**[MODIFY] `src/pages/shipper/CreateLoad.tsx`**
- Form with fields: title, origin, destination, cargo type, weight (kg), deadline (hours).
- Submit calls `POST /api/loads/`.
- On success, redirect to `/my-loads`.

**[MODIFY] `src/pages/shipper/LoadDetail.tsx`**
- Fetch load details via `GET /api/loads/:id`.
- Show load info card + status badge + status actions (e.g. "Post Load" button if Draft).
- Below: two sections side-by-side:
  - **Bids** panel: fetch `GET /api/bids/:loadId`, list bids with price + delivery time + "Accept" button.
  - **AI Recommendations** panel: fetch `GET /api/match/:loadId`, show ranked carriers with scores.

---

### 4. Carrier Pages

**[MODIFY] `src/pages/carrier/AvailableLoads.tsx`**
- Fetch `GET /api/loads/available` on mount.
- Display loads in cards with: title, origin → destination, cargo type, weight, deadline.
- Each card has a "Place Bid" action that opens an inline form (price + estimated hours).

**[MODIFY] `src/pages/carrier/MyBids.tsx`**
- Fetch `GET /api/bids/my` on mount.
- List bids with: load info, price, delivery estimate, status badge (Pending/Accepted/Rejected).

**[MODIFY] `src/pages/carrier/CarrierProfile.tsx`**
- Fetch current profile from `GET /api/users/profile`.
- Form: truck type (select), capacity (number), home city (text).
- Submit calls `PATCH /api/users/carrier-profile`.

---

### 5. API Layer (New Service Files)

**[NEW] `src/services/load-endpoints.ts`**
- `getMyLoads()`, `getAvailableLoads()`, `getLoadById(id)`, `createLoad(data)`, `updateLoadStatus(id, status)`, `deleteLoad(id)`

**[NEW] `src/services/bid-endpoints.ts`**
- `getMyBids()`, `getBidsByLoad(loadId)`, `createBid(data)`, `acceptBid(bidId)`

**[NEW] `src/services/match-endpoints.ts`**
- `getRecommendations(loadId)`

**[NEW] `src/services/health-endpoints.ts`**
- `checkServiceHealth(service)` — hits `/health/{service}` and returns status

---

## Execution Order

1. API endpoint files (foundation)
2. ServiceHealthDots component + DashboardLayout update
3. Dashboard page (role-based cards)
4. Shipper pages (CreateLoad → MyLoads → LoadDetail)
5. Carrier pages (AvailableLoads → MyBids → CarrierProfile)

---

## Verification Plan

- Register a Shipper and a Carrier account.
- Verify each sees the correct dashboard cards.
- Create a load as Shipper, post it, verify Carrier can see it.
- Place a bid as Carrier, accept it as Shipper.
- Verify health dots turn green when services are up.

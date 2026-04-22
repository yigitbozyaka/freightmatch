## Goal

Give the UI the richer profile fields it needs (photo, bio, trust score, avg ETA) and fill the gap that shippers currently have no profile object at all.

## Scope

Files: `services/user-service/src/models/user.model.ts`, validators, routes, controllers.

- Extend `ICarrierProfile`:
  - `profilePhotoUrl: string | null`
  - `avgEtaHours: number` (default 0; recomputed on `load.delivered` Kafka events — wiring is out of scope here, just the field)
  - `trustScore: number` (0–100, default 0; computed via util from B2)
  - `bio: string | null`
- Add `IShipperProfile` (currently absent):
  - `companyName: string | null`
  - `profilePhotoUrl: string | null`
  - `bio: string | null`
  - `completedLoads: number` (default 0)
  - `avgTimeToAcceptHours: number` (default 0)
- Add `shipperProfile?: IShipperProfile` to the User schema (conditional on `role === 'Shipper'`, mirror the carrierProfile pattern).
- Zod update + new endpoint `PATCH /api/users/shipper-profile` (shipper-only).
- `GET /api/users/profile` returns the new fields.
- Mongoose migration NOT needed (new optional fields; existing docs keep working).

## Acceptance criteria

- Jest unit tests updated/added for model + validator
- `GET /profile` includes new fields for both roles
- `PATCH /carrier-profile` and `PATCH /shipper-profile` accept and persist new fields
- Postman collection entry added for the new shipper-profile PATCH

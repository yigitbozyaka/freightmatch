# User Approval Operations

FreightMatch is an open-source project; the running deployments don't expose registration to the public. Anyone can `POST /api/users/register` and create an account, but the account stays in a **pending** state until an administrator approves it. Login is gated server-side on `isApproved=true`.

This document is the runbook for approving (and revoking) accounts.

---

## How the gate works

- New accounts are created with `isApproved: false` (Mongoose schema default in `services/user-service/src/models/user.model.ts`).
- The login flow in `services/user-service/src/services/auth.service.ts` validates credentials, lockout, then `isApproved`. Unapproved accounts get **`403 PENDING_APPROVAL`** with a friendly message.
- The web app maps this code to a banner on `/register` (post-registration) and `/login`.

There is intentionally **no admin UI** and **no admin endpoint**. Approval is a manual database operation — by design, so an attacker who compromises the web app cannot self-approve.

---

## Connect to the database

The user-service stores accounts in the `freightmatch-users` database. Connect via `mongosh`:

```bash
# Local (non-Docker dev)
mongosh "mongodb://localhost:27017/freightmatch-users?directConnection=true"

# From the Docker host into the running compose stack
docker exec -it $(docker ps -qf name=mongodb) mongosh freightmatch-users
```

---

## Common operations

### List pending accounts

```js
db.users.find(
  { isApproved: false },
  { email: 1, role: 1, createdAt: 1 }
).sort({ createdAt: -1 })
```

### Approve a single user

```js
db.users.updateOne(
  { email: "newcarrier@example.com" },
  { $set: { isApproved: true } }
)
```

### Approve by id

```js
db.users.updateOne(
  { _id: ObjectId("665a1b2c3d4e5f6789012345") },
  { $set: { isApproved: true } }
)
```

### Revoke approval (force re-approval)

```js
db.users.updateOne(
  { email: "spammer@example.com" },
  { $set: { isApproved: false } }
)
```

The next time the user attempts to refresh their access token (every 15 minutes) or sign in, they will be locked out. Existing access tokens remain valid until they expire — to revoke immediately, you can also wipe their refresh token blacklist or manually invalidate the user's session.

### Approve every existing user (one-time grandfather)

If you are upgrading an existing deployment that pre-dates the approval gate, every existing user will be locked out on the next login. To grandfather them in, run **once** after the deploy:

```js
db.users.updateMany({}, { $set: { isApproved: true } })
```

---

## Recommended workflow

1. After deployment, register the project owner's account through `/register`.
2. Connect to Mongo and run the single-user approve command for that account.
3. Anyone else who needs access registers and pings the project owner out-of-band.
4. The owner reviews the request and runs `updateOne` to flip the flag.

For higher volumes, consider promoting this operation to:

- a CLI tool that wraps `mongosh` with the right auth,
- a private admin endpoint behind `INTERNAL_SERVICE_SECRET`, or
- a small `seed` script that approves a list of allowlisted emails after each deploy.

These improvements live in the future-work backlog and are intentionally **not** committed to the public repo today.

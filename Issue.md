https://github.com/yigitbozyaka/freightmatch/pull/66

Issues / suggestions

1. PATCH semantics overwrite the entire sub-document — silent data loss for shippers (user.repository.ts:24-29,
   mirrored from the carrier impl)
   { $set: { shipperProfile: profile } }
  Because every field in shipperProfileSchema is optional, a request like PATCH { bio: "new" } will replace the
  whole shipperProfile and wipe companyName, completedLoads, etc. The carrier side gets away with this only because
  Zod requires truckType/capacityKg/homeCity, forcing full replacement on every PATCH (which is itself a poor PATCH
  contract). Use dot-notation $set keys or merge with the existing doc:
  const update = Object.fromEntries(
    Object.entries(profile).map(([k, v]) => [`shipperProfile.${k}`, v])
   );
   return User.findByIdAndUpdate(userId, { $set: update }, { new: true });

2. User-controllable fields that should be system-computed
   The PR description explicitly says trustScore is "computed via util from B2" and avgEtaHours is "recomputed on
   load.delivered Kafka events." Yet carrierProfileSchema accepts both from the client, and shipperProfileSchema
   accepts completedLoads and avgTimeToAcceptHours. As written, a user can PATCH { trustScore: 100, completedLoads:
   9999 }. Strip these from the PATCH validators; let the upstream computation own them.

3. ts-jest / Jest version mismatch (package.json)
   jest@^30.3.0 paired with ts-jest@^29.4.9. ts-jest 29 targets Jest 29; Jest 30 needs ts-jest ^30. Bump ts-jest to
   ^30 to avoid peer-dep warnings and surprises during CI upgrades.

4. Postman response inconsistency
   Carrier example response uses \_id, the new shipper example uses id. The actual service returns id for both —
   update the carrier example to match reality, or both will mislead consumers.

5. profilePhotoUrl URL validation may be too strict
   z.string().url() rejects relative paths or signed-storage keys. If photos are uploaded to your own storage and
   referenced relatively, this will break. Confirm the photo source flow (S3 signed URL? CDN absolute URL?) before
   merging.

6. No service-level role guard
   userService.upsertShipperProfile writes shipperProfile regardless of user.role. The route's authorize('Shipper')
   covers the HTTP path, but if this method is reused elsewhere a Carrier doc could end up with both sub-docs. Cheap
   to add: load the user first and assert role, or include { role: 'Shipper' } in the findByIdAndUpdate filter.

7. Tests cover model + validators only
   No coverage for the new getProfile role branching or for the controller/repository PATCH flow. The two
   highest-risk pieces (issue #1 and #2 above) would have been caught by an integration test against an in-memory
   Mongo.

8. Minor

- shipper.controller.ts has a trailing blank line + final export — fine, but inconsistent with
  carrier.controller.ts.
- Issue.md at repo root is being rewritten per-PR; consider moving to docs/issues/ or removing entirely (issue
  body lives on GitHub).
- user.model.test.ts has a beforeAll that is a no-op with only a comment — drop it.

Risk summary

- Blocking: #1 (data loss on shipper PATCH) and #2 (user-controllable trust/completion metrics) are
  correctness/security concerns and should be fixed before merge.
- Should-fix: #3 (test tooling), #4 (Postman accuracy).
- Nice-to-have: #5–#8

https://github.com/yigitbozyaka/freightmatch/pull/67

Blocking issues

1. big*file.jpg committed at repo root
   A binary test artifact slipped into the diff. Remove and git rm. Add a clearer ignore for ad-hoc test files (e.g.
   *.test.jpg or tmp-\_.jpg) so it doesn't recur.
2. Photo upload can corrupt the user document for users without an existing profile sub-doc
   updateProfilePhotoUrl does $set: { 'carrierProfile.profilePhotoUrl': url }. If a Carrier hasn't called PATCH
   /carrier-profile yet, Mongo creates a partial carrierProfile containing only profilePhotoUrl — missing required
   truckType, capacityKg, homeCity. Subsequent reads/validates will see a malformed sub-document. Same hazard for
   Shippers (less severe since all fields are optional, but still creates the sub-doc with only one field set, no
   defaults applied for completedLoads etc.).
   Either: (a) require the profile to exist first (return 409/400 if not), (b) $setOnInsert defaults atomically, or
   (c) load → mutate → save so Mongoose applies defaults.

3. validate: { xForwardedForHeader: false } silences the warning instead of fixing it
   Behind nginx the right fix is app.set('trust proxy', 1) (or the nginx IP). Disabling the validation means the
   limiter is now using the socket IP — which behind nginx is always nginx itself, so all traffic shares one bucket
   and rate limiting is effectively broken. Set trust proxy instead.

Should-fix

4. Orphaned files on failure
   Multer writes to disk before the controller runs. If updateProfilePhotoUrl returns null (404) or throws, the saved
   file stays on disk forever. Wrap the controller path so failures fs.unlink the temp file.

5. No cleanup of previous photo
   Each new upload leaks the old file. Read the current profilePhotoUrl (if local), unlink after a successful update.

6. No rate limit on /profile/photo
   Authenticated user can spam 5 MB uploads to fill the docker volume. Add a per-user upload limiter (e.g. 10 /
   hour). //ignore this. What do you mean rate limit for authenticated users?

7. client_max_body_size 6m set globally in nginx
   Move inside the location /uploads/ (and the upload POST path) block. Otherwise every JSON endpoint now accepts 6
   MB payloads, expanding the abuse surface.

8. Misuse of LIMIT_UNEXPECTED_FILE for MIME rejection
   fileFilter raises new multer.MulterError('LIMIT_UNEXPECTED_FILE', ...) to signal a wrong content-type. Multer's
   own meaning is "fieldname mismatch." It happens to work because handleMulterError maps it to 415, but a real
   fieldname-mismatch will now incorrectly be reported as "wrong MIME type." Pass a distinct error (custom subclass
   or cb(new Error('UNSUPPORTED_MIME'))) and discriminate in the handler.

9. Postman collection missing the new endpoint
   This PR's headline is POST /profile/photo, but the collection only carries forward the PR #66 shipper-profile
   entry. Add a multipart example for the photo endpoint.

Nice-to-have

- req.user?.userId ?? 'unknown' in filename() — auth middleware guarantees req.user, so this fallback hides bugs.
  Throw or cb(new Error(...)).
- express.static options: pass { dotfiles: 'deny', maxAge: '1h', index: false }. Files are not secret per design,
  but cheap hardening.
- Static via Node + nginx proxy is fine for dev, but worth noting that S3/CDN is the eventual path (already
  deferred — keep this short-term scope).
- No tests for the upload middleware (MIME reject, size limit) or the photo controller. The most error-prone new
  code has zero coverage.
- PR scope creep: half the diff is PR #66's changes. Rebase once #66 merges so the diff isolates the upload work.

Security summary

- Path traversal: safe — userId is from JWT (ObjectId), extension is from a whitelist of MIMEs, originalname
  fallback only fires for filtered-out MIMEs.
- Auth: endpoint requires a valid JWT but no role check; intentional (any role can have a photo). OK.
- DoS: filesize cap (5 MB) is in place, but no request-rate cap and no disk-quota → see #6.
- Rate limit bypass: see #3 — current change weakens, not fixes, the limiter.

Risk summary

- Blocking: #1 (binary in repo), #2 (partial-sub-doc corruption), #3 (rate limiter bypass).
- Should-fix before merge: #4–#9.
- Follow-up acceptable: test coverage, S3 migration.

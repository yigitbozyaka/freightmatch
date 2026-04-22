## Goal

`POST /api/users/profile/photo` accepts multipart and returns a URL the UI can read back. Dev-only: writes to disk, served statically. Production S3 path is explicitly deferred.

## Scope

- Install `multer` in user-service.
- Route: `POST /api/users/profile/photo` (authenticated, any role)
  - Accepts `multipart/form-data` with field `photo`
  - Validates: JPEG/PNG/WebP, max 5MB
  - Saves to `services/user-service/uploads/<userId>-<timestamp>.<ext>`
  - Updates the active profile's `profilePhotoUrl` to `/uploads/<filename>`
  - Returns `{ profilePhotoUrl }`
- Serve `/uploads/*` statically from user-service.
- Add nginx location block `/uploads/` → user-service.
- Add `uploads/` to service-level `.gitignore`.

## Acceptance criteria

- Uploading via curl persists file and updates the user doc
- Fetching `http://localhost/uploads/<file>` via gateway serves the image
- Rejects non-image mimes with 415
- Rejects >5MB with 413

## Notes

S3 / signed URLs are explicitly out of scope — follow-up task.

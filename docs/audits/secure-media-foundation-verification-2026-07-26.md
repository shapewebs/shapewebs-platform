# Secure media foundation verification — 26 July 2026

## Scope

This evidence covers the private image upload boundary, migration
`0016_secure-media-foundation`, failure reconciliation, and local/disposable
verification. It does not create a Vercel Blob store, apply the migration to
persistent staging, publish an asset, change a production environment, or
promote a production deployment.

## Implemented boundary

- The admin application owns every media mutation.
- Owners and editors require an authenticated session with completed TOTP.
- The exact trusted admin origin is required before any body is read.
- The complete multipart request is streamed into a 4,400,000-byte bound
  before parsing; encoded bodies, unknown fields, duplicates, invalid metadata,
  and files larger than 4 MiB fail closed.
- JPEG, PNG, and WebP are accepted only when extension, declared MIME, and
  decoded format agree.
- Sharp limits source dimensions to 8192 pixels and 32 megapixels, rejects
  multipage/animated sources, auto-orients, fits within 3840 pixels, converts to
  sRGB, removes source metadata, emits WebP, and records its SHA-256.
- Server-generated UUID paths are scoped to the organization and draft
  namespace.
- The private store ID is opaque, validated, server-only, and passed to the
  [Vercel Blob SDK](https://vercel.com/docs/vercel-blob/using-blob-sdk).
  Application access uses
  [Vercel OIDC](https://vercel.com/changelog/vercel-blob-now-supports-oidc-authentication);
  no static Blob token is added to the repository.
- Provider URLs, ETags, paths, store IDs, and digests are excluded from admin
  response DTOs.

The initial store is private by design. Vercel documents that
[private Blob reads require authenticated server access](https://vercel.com/docs/vercel-blob/private-storage).
Publishing will therefore use a later reviewed operation that copies the
normalized asset into a distinct public store. An upload never publishes.

## Failure semantics

The route reserves the media row and localization atomically before calling
Blob. It acknowledges success only after the exact provider response is
validated and the ready-state database transaction commits.

- A provider error leaves the reservation pending because a timeout can occur
  after storage accepted the object.
- A definite database-finalization failure deletes the Blob and marks the row
  failed.
- A failed deletion records `cleanup_required`.
- An uncertain database-finalization result is inspected. A matching ready row
  is accepted; a proven pending row is cleaned; an unavailable or contradictory
  state is not deleted.
- A bounded worker reconciles stale pending and cleanup-required rows by exact
  pathname and ETag where available.

This prevents both silently acknowledged loss and deletion of an object whose
ready-state commit may already have succeeded.

## Database authorization

Migration `0016` adds explicit lifecycle/provider columns and localized alt
text/captions. Both `app.files` and `app.file_localizations` use forced RLS.

The disposable six-identity suite proved:

- owners/editors see only current-organization files and localizations;
- cross-tenant updates return no rows;
- web sees only current-organization, public-ready files;
- web sees only the reviewed file/localization projection;
- private drafts and other-tenant public files remain invisible;
- store IDs remain unreadable;
- web insertion is denied; and
- portal and public-reader media access is denied.

## Verification evidence

- Canonical `pnpm verify`: passed.
- Unit tests: 199 passed.
- Coverage-gated modules: 95.71% statements, 93.58% branches, 92.06%
  functions, and 95.66% lines.
- Database integration tests: 21 passed on both source and restored databases.
- Webpack production builds: public, admin, and portal passed.
- Turbopack production builds: public, admin, and portal passed.
- Dependency audit: no known vulnerabilities.
- Migration generation check: passed.
- Failed-migration rollback: no schema, table, or journal residue.
- Source/restore fixture SHA-256:
  `b091129fc9c4110bda29e8b7d2bebeaf2e90bb0f4d5d502ebcdac41c16c0abb4`.
- Disposable Neon source and restore branches: deleted.

## Additional authentication correction

The lifecycle initially stopped on the existing replacement-session TOTP test.
Precondition evidence proved the row, user, revocation state, and expiry were
valid, while the pooled runtime interpreted the application-supplied expiry
comparison differently. Session validity now uses PostgreSQL `now()`. The
application timestamp remains the recorded verification time and can no longer
decide whether an expired session is valid. The complete database lifecycle
then passed.

## Remaining staging gates

1. Protected pull-request checks must reproduce these results.
2. Persistent staging needs an expiring rollback branch before `0016`.
3. One staging-only private Blob store and exact branch-scoped store ID must be
   provisioned; production remains untouched.
4. A real authenticated upload and cleanup exercise must pass on
   `admin-staging.shapewebs.com`.
5. The separate public store and private-to-public publish/delete lifecycle
   remain future work.

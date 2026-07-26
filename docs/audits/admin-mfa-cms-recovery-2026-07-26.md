# Administrative MFA and CMS recovery assurance — 26 July 2026

## Scope

This record covers a fixed-staging TOTP step-up failure and the database-level
assurance for administrative session rotation, CMS unpublish and CMS rollback.
It does not authorize or describe a production deployment.

## Staging finding

The owner submitted a valid TOTP code on
`admin-staging.shapewebs.com`. The one-time counter was accepted, failed
attempts were cleared and the current session's step-up timestamp was advanced,
but the browser remained on the MFA page.

Correlated Vercel and Neon evidence showed that the subsequent session-token
rotation transaction failed. Drizzle had qualified target columns in the
PostgreSQL `UPDATE ... SET` list and then in the audit-event `INSERT` target
list. PostgreSQL rejects both forms. The accepted one-time counter was not
reusable, and the token rotation and its audit event were rolled back together.

The correction:

- uses unqualified target-column identifiers in raw PostgreSQL mutation lists;
- normalizes Better Auth's timezone-free session timestamps through explicit
  UTC ISO values;
- preserves the existing absolute session expiry during token rotation;
- requires the matching, unrevoked step-up record;
- writes `auth.session_rotated` in the same transaction; and
- adds a real PostgreSQL integration regression test.

The diagnostic Neon branch
`br-bold-silence-asap97v1` was deleted after the correction was verified.

## CMS recovery controls

Administrative unpublish and rollback commands now:

- reauthorize the owner/editor role in the Server Action;
- require a TOTP step-up from the preceding five minutes;
- validate UUIDs, locale, expected version and an explicit confirmation;
- use stable command IDs and transaction-scoped advisory locks;
- reject stale versions and cross-locale revision selection;
- preserve immutable history by appending an archived unpublish marker or a
  new published rollback revision;
- update only the selected locale publication pointer;
- preserve another locale's publication;
- append an immutable audit event;
- revalidate both prior and current public paths when needed; and
- return a visible operational warning when public cache revalidation cannot
  be confirmed.

The editor's draft, review and publish buttons now explicitly submit their
form. The shared design-system button intentionally defaults to
`type="button"`, so relying on the browser default had made those controls
no-ops.

## Disposable Neon evidence

The local canonical Neon lifecycle created a fresh source branch and an
independent restore branch. Both branches applied every migration and passed:

- 15 real-database integration tests;
- absolute-lifetime-preserving session-token rotation and audit insertion;
- unpublish, replay, stale-version and cross-locale negative cases;
- rollback to an exact historic revision as a new immutable publication;
- forced-RLS and least-privilege role verification;
- failed-migration rollback;
- deterministic synthetic export and restore; and
- post-restore repository and security verification.

The successful source and restore branches,
`br-floral-hill-asyrq2t1` and `br-divine-fire-askqlw1w`, were automatically
deleted. The final deterministic fixture hash was
`5d6bb329a4109f8d6e5a03d851e6a4f7728c6f74f96c036ab9aa905a62f2973c`.

Fixed-staging browser verification remains required after this correction
passes protected GitHub and Vercel checks and is deployed to the staging
aliases.

## Private-preview transfer finding

The first authenticated fixed-staging draft save succeeded and created
document `0f924f64-e69f-4274-8a82-273c18a6b649` with immutable revision `1`.
The subsequent private-preview handoff was correctly prepared by the admin
application but blocked by the browser because the nonce-based admin CSP
limited `form-action` to `'self'`. The private-preview design intentionally
uses a POST from the admin origin to the separate public origin, so that
restriction prevented the single-use grant from reaching the public
application.

The correction keeps the policy fail-closed while allowing the required trust
boundary:

- the admin proxy derives only the origin from the validated public-site URL;
- `form-action` receives that one exact origin in addition to `'self'`;
- duplicate origins are removed;
- wildcard, credential-bearing, path-bearing and non-HTTPS production values
  are rejected;
- HTTP remains available only for loopback development; and
- an absent configured public origin preserves the original `'self'`-only
  behavior.

Fixed-staging proof still requires a successful one-time preview transfer,
private/no-store rendering, preview exit and replay denial after the correction
passes the protected pull-request and deployment gates.

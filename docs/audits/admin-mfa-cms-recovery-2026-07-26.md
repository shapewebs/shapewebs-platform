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

The fixed-staging browser verification was completed after the correction
passed protected GitHub and Vercel checks and reached both staging aliases.

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

The fixed-staging proof below includes the successful one-time preview
transfer, private/no-store rendering, preview exit and replay denial.

## Fixed-staging browser evidence

Pull requests `#28` and `#29` passed the protected quality, security, Vercel
and disposable-Neon gates and were merged into `staging`. The owner then
completed a fresh Google session and local TOTP step-up on the fixed admin
origin. The authenticated browser proof used only the persistent synthetic
staging database and document
`0f924f64-e69f-4274-8a82-273c18a6b649`, locale `en`, slug
`staging-assurance-20260726`.

The complete lifecycle passed:

- revision 1 was saved as a draft;
- the POST-only preview handoff rendered the exact private revision on
  `staging.shapewebs.com` with the private/no-store controls;
- explicit preview exit returned to the public home page;
- replaying the consumed preview route returned `404`;
- revision 2 was published and the exact public slug rendered it;
- revision 3 unpublished the locale and the exact public slug returned a real
  `404`;
- revision 4 restored revision 1 as a new immutable publication and the exact
  public slug rendered it; and
- revision 5 unpublished the locale again, leaving the synthetic document
  archived and the public slug at `404`.

The first browser tab had become stale while the staging deployment changed.
It correctly failed closed when its primary session could no longer be
resolved. A normal reload followed by a fresh TOTP code reached the dashboard;
no bypass, replayed code or session repair was needed.

## Protected revalidation finding and correction

Every database mutation and exact public read above succeeded, but the editor
reported `*-revalidation-pending`. Both fixed staging applications lacked the
same branch-scoped `REVALIDATION_WEBHOOK_SECRET`, and Vercel Authentication
also protected the public revalidation endpoint from the admin application's
server-to-server POST.

The staging correction is deliberately two-layered:

- one new sensitive 256-bit application secret is stored only in the
  `staging` branch's Preview environment for `shapewebs-admin` and
  `shapewebs-web`;
- Vercel Trusted Sources permits only `shapewebs-admin` Preview tokens to
  access `shapewebs-web` Preview deployments;
- the admin forwards the incoming short-lived Vercel workload token as
  `x-vercel-trusted-oidc-idp-token` without persisting or logging it;
- the public route still requires the independent application secret using
  its constant-time comparison; and
- exact-origin parsing, bounded headers, strict payload validation, a
  five-second timeout and redirect refusal keep failures closed and visible.

Unit tests prove successful token/secret forwarding, duplicate-path collapse,
local unprotected operation, invalid origin and payload rejection, header
injection rejection, provider denial and transport failure.

Pull request `#30` passed Quality, Security, CodeQL, both Vercel deployments
and the path-gated Neon check before merging into protected `staging` at
`ea97ea4`. Post-merge run
[`30203830963`](https://github.com/shapewebs/shapewebs-platform/actions/runs/30203830963)
waited for both fixed deployments, then passed its exact-target k6 thresholds
and passive ZAP baseline.

The owner completed a fresh TOTP step-up and the final runtime proof then
passed without any operational warning:

- revision 6 published with change note
  `Post-merge protected revalidation proof`;
- the editor redirected with exact status `published`, not
  `published-revalidation-pending`;
- the exact public slug rendered revision 6 from Neon;
- revision 7 unpublished the locale;
- the editor redirected with exact status `unpublished`, not
  `unpublished-revalidation-pending`; and
- the exact public slug rendered the real `404` page afterward.

The final synthetic state is archived at version 7. No staging publication or
unresolved revalidation warning remains. This proves the protected
Preview-to-Preview OIDC path and the independent application-secret check
together, while production remained unchanged.

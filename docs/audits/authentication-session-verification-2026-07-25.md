# Authentication and session verification — 25 July 2026

## Scope

This audit covers the `codex/asvs-auth-session-review` branch, including the
session-management work following commit `f3903a9`. It verifies the Google
identity-token boundary, administrative TOTP step-up, replay and lockout
persistence, session-token rotation, owner-controlled session termination,
session-policy documentation, deterministic ASVS evidence, and both supported
admin production build modes.

No production deployment, production environment variable, persistent staging
database branch or production domain was modified.

## Implemented controls

- Google ID Tokens are verified with a fixed Google JWKS endpoint, an exact
  issuer allowlist, `RS256` only, exact client audience, issuance and expiry
  checks, stable subject, and verified email.
- Email/password and unused factor-management paths remain disabled.
- Enrollment generates no recovery codes while identity-proofed recovery is
  unavailable.
- TOTP accepts only the exact six-digit code in the current 30-second period.
- An atomic per-user Neon counter rejects the same or an older TOTP across all
  active sessions.
- Ten consecutive failed TOTP checks create a 15-minute account lock; recovery
  after lock expiry resets the failure state.
- A successful counter consumption and the exact session step-up timestamp
  commit in one SQL statement.
- Initial and reauthenticated sessions use 256 random bits encoded as 43
  base64url characters by a Shapewebs-owned generator.
- Every successful non-enrollment TOTP step-up replaces the backend reference
  token and signed browser cookie while preserving the original creation time
  and absolute expiry.
- Better Auth's token-returning session-list and token-based revocation
  endpoints are disabled.
- The owner settings view receives only token-free, organization-scoped session
  summaries. It omits tokens and IP addresses and sanitizes bounded user-agent
  summaries.
- Revoking another administrative session requires an owner role and a TOTP
  step-up from the preceding five minutes. The current session cannot be
  selected through this path and remains terminable through visible logout.
- Token rotation and owner revocation write append-only audit events in the
  same database statement as the corresponding credential change.
- Accepted and authenticated failed step-up attempts write safe, append-only
  audit events without recording the submitted code.
- The replay/lockout table is inaccessible to public and web runtime roles.
- The supported pathway, federation behavior, concurrent-session policy,
  timeouts, recovery limits and launch gates are documented in
  `docs/security/authentication-session-contract.md`.
- ASVS evidence generation is a canonical, Prettier-clean transformation from
  the pinned catalog and reviewed decisions.

## Disposable Neon lifecycle

The final lifecycle used the authenticated non-production
`shapewebs-platform` Neon project in `aws-eu-central-1`. It created isolated
source and restore branches, applied migrations `0000` through `0010`, and
deleted both branches after verification.

The lifecycle proved:

- fresh migration application;
- deterministic fixture hash
  `47a271ca7a76c2b45d6cc167dae7221e6caaabe6d09b4184bfa38309ac65f908`;
- expired, revoked, inactive, anonymous and wrong-role session denial;
- one-time TOTP acceptance across sessions;
- older-counter and concurrent replay denial;
- account lock after ten failures;
- valid-code denial during lockout and safe recovery after expiry;
- exact-event session-token rotation, old-token invalidation and preservation
  of the original absolute lifetime;
- stale step-up proof denial for a second rotation;
- token-free same-organization owner/editor session listing with customer,
  cross-organization, expired and revoked session exclusion;
- current-session and cross-organization revocation denial;
- successful same-organization non-current session revocation with exactly one
  audit event;
- forced RLS and privilege denial for the replay guard;
- tenant-isolated CMS and organization-setting access;
- transaction rollback;
- logical export and restore.

The first disposable run exposed an ambiguous Postgres parameter type in the
lock timestamp expression. The timestamp is now explicitly cast to
`timestamptz`. The next run exposed that the raw Neon driver represents
Postgres `bigint` as a string; the assertion now normalizes that value. The
final lifecycle completed successfully, and a post-run branch listing found no
remaining `codex-lifecycle-*` branch.

## Verification results

- Focused session/TOTP/authentication tests: 17 passed.
- Canonical `pnpm verify`: passed.
- Full unit suite: 92 passed across 14 files.
- Coverage:
  - statements: 96.56%;
  - branches: 95.48%;
  - functions: 92.10%;
  - lines: 96.55%.
- Formatting, zero-warning ESLint, Markdown lint, all package type checks,
  Checkly compilation, worker runtime tests, application boundaries, Knip,
  dependency cycles, generated schemas and Drizzle consistency: passed.
- `pnpm audit`: zero known vulnerabilities.
- The branch-time ASVS register contained 253 Level 1/Level 2 requirements,
  with 160 reviewed and 93 explicitly unreviewed. The later complete review in
  `docs/audits/asvs-level-2-review-2026-07-25.md` dispositions all 253.
- Admin Next.js 16.2.11 Turbopack production build: passed.
- Admin Next.js 16.2.11 webpack production build: passed.
- Deterministic artifact cleanup: passed; eight known generated artifact paths
  were removed without touching environment, provider-link or unknown files.

## Fixed-staging completion

The fixed staging Google OAuth client and exact callback origin were
provisioned after the original branch audit. The first live TOTP attempts
correctly reached the protected step-up route but exposed invalid PostgreSQL
target-column qualification in both counter mutations. Pull request `#25`
repaired the SQL, added a disposable-database integration test and passed the
complete migration, forced-RLS, rollback, export, restore and cleanup
lifecycle.

After deployment `dpl_HS4jvEAUmfnqVcnYNWN6n6V9DeNU` reached the fixed
`admin-staging.shapewebs.com` alias, the owner:

1. authenticated with the exact allowlisted `admin@shapewebs.com` Google
   identity;
2. completed local TOTP enrollment;
3. submitted a fresh code directly in the protected browser; and
4. reached `/dashboard`.

The authoritative runtime evidence recorded:

- `POST /api/admin/step-up` returned `200`;
- `shapewebs.auth.totp_step_up` recorded `result: success` with a pseudonymous
  actor and trace ID;
- `/dashboard` returned `200`; and
- protected `/audit`, `/content`, `/media`, `/settings` and `/submissions`
  requests returned `200`.

No TOTP seed or one-time code was stored in the repository, audit record or
operational log.

## Remaining launch gates

The branch does not claim complete ASVS Level 2 verification. The following
remain explicit launch gates:

- define and rehearse identity-proofed TOTP recovery and factor replacement;
- verify underlying Google Workspace MFA and recovery configuration;
- inspect the deployed `__Host-` cookie after the next staging hardening
  release; and
- retain full exact-ID ASVS evidence and accepted-risk expiry review.

These operational items remain production gates even though every exact ASVS
requirement now has an evidence-backed disposition.

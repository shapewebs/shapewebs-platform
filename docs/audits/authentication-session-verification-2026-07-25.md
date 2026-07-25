# Authentication and session verification — 25 July 2026

## Scope

This audit covers the `codex/asvs-auth-session-review` branch based on commit
`98a8e8a`. It verifies the Google identity-token boundary, administrative TOTP
step-up, replay and lockout persistence, session-policy documentation,
deterministic ASVS evidence, and both supported admin production build modes.

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

- Focused authentication tests: 14 passed.
- Canonical `pnpm verify`: passed.
- Full unit suite: 89 passed across 13 files.
- Coverage:
  - statements: 96.56%;
  - branches: 95.48%;
  - functions: 92.10%;
  - lines: 96.55%.
- Formatting, zero-warning ESLint, Markdown lint, all package type checks,
  Checkly compilation, worker runtime tests, application boundaries, Knip,
  dependency cycles, generated schemas and Drizzle consistency: passed.
- `pnpm audit`: zero known vulnerabilities.
- ASVS register: 253 Level 1/Level 2 requirements, 156 reviewed and 97
  explicitly unreviewed.
- Admin Next.js 16.2.11 Turbopack production build: passed.
- Admin Next.js 16.2.11 webpack production build: passed.
- Deterministic artifact cleanup: passed; eight known generated artifact paths
  were removed without touching environment, provider-link or unknown files.

## Deliberate launch gates

The branch does not claim complete ASVS Level 2 verification. The following
remain explicit launch gates:

- configure the fixed staging Google OAuth client and exact callback origins;
- complete the deployed Google-to-TOTP journey and inspect production-style
  cookie attributes;
- rotate the Better Auth session token after every successful
  reauthentication;
- add owner-visible and administrator-controlled active-session termination;
- define and rehearse identity-proofed TOTP recovery and factor replacement;
- verify underlying Google Workspace MFA and recovery configuration;
- review every remaining exact-ID ASVS requirement.

These gaps remain `unreviewed` or partial in the checked-in assurance evidence
and therefore continue to fail the production ASVS launch gate.

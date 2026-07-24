# Assurance implementation evidence — 24 July 2026

## Scope

This record covers the short-term security, reliability, observability,
authentication, lead-delivery, and worktree-hygiene controls added to draft
pull request `shapewebs/shapewebs-platform#7`.

Application production was not changed. Provider credentials were not
committed or copied into source. Exact Git-branch-scoped Preview credentials
were added for Neon, Turnstile, retention and restricted Resend staging; no new
production database, authentication or email credential was added.

## Implemented controls

- GitHub ruleset, secret scanning/push protection, dependency review,
  CODEOWNERS, security policy, SHA-pinned Actions, CodeQL, OSV, and periodic
  Scorecard.
- Canonical `verify`, `verify:release`, generated-output, and allowlisted
  artifact-cleanup commands.
- Threat model, grouped ASVS register, processor/retention register, SLOs,
  incident response, and staging security/load runbooks.
- Typed redacted logs, OpenTelemetry instrumentation, liveness/readiness,
  Vercel Speed Insights, and Checkly monitoring definitions.
- Admin-only Better Auth with Google allowlisting, exact origins, fixed
  sessions, inactivity/revocation, secure cookies, TOTP step-up, per-entry
  authorization, and append-only audit events.
- Bounded and validated public forms, server-side Turnstile, atomic Neon
  lead/outbox persistence, idempotent delivery, bounded retries, signed
  deduplicated Resend webhooks, and minimal notification content.
- Forced RLS and negative database cases for role capability, tenant access,
  public reads, web writes, admin expiry/revocation/inactivity/role/step-up,
  replay, webhook ordering, and audit immutability.

## Local verification

The final local evidence is recorded after the canonical commands run:

| Command/evidence                              | Result                                                     |
| --------------------------------------------- | ---------------------------------------------------------- |
| `corepack pnpm verify`                        | Passed: 58 tests; 100% statements/lines, 96.62% branches   |
| webpack builds for both applications          | Passed                                                     |
| Turbopack builds for both applications        | Passed                                                     |
| Playwright Chromium critical/security/a11y    | 9/9 passed                                                 |
| Lighthouse CI, three-run assertions           | Passed                                                     |
| `corepack pnpm clean:artifacts`               | Seven known paths removed; no tracked generated drift      |
| Disposable Neon lifecycle on current worktree | Passed locally: migrate/RLS/rollback/restore/cleanup       |
| k6 against exact protected staging            | Passed in GitHub run `30103670868`                         |
| ZAP against exact protected staging           | 63 pass, 3 reviewed info, 0 warn/fail in run `30103670868` |

During verification, the Turborepo parent remained alive after both Next.js
builds had reported success. The canonical root `build` command now invokes
both app-level Turbopack builds sequentially; it completed with exit code zero.
Turborepo remains in use for the workspace type-check graph and Vercel
coordination.

The first clean-runner database attempts exposed a transient Neon operation
lock, a fixture column mapped to the wrong table, and an RLS test that requested
an unnecessary outbox `RETURNING` privilege. The lifecycle runner now retries
only Neon's explicit lock condition, the fixture matches migration `0005`, and
the replay path proves deduplication without granting the web runtime outbox
read access. A complete local rerun passed and deleted both disposable branches;
the pull-request run remains the independent confirmation.

The repository and protected-staging assurance gates are green. The production
release remains blocked on the account-specific provider and recovery
configuration below.

## External configuration gates

- Google OAuth owner identity, client, secret, and exact fixed origins.
- Checkly account/API credentials, alert channel, and controlled-failure test.
- Checkly account/API credentials, alert channel, and controlled-failure test.
- Production Turnstile keys and exact expected hostname.
- Reachable Resend notification recipient, webhook signing
  secret/registration, and signed delivery/bounce evidence.
- Minute-level protected outbox scheduling. The checked-in Hobby Cron schedule
  is daily and cannot meet the 15-minute SLO.
- Paid production Neon/Vercel topology, production recovery rehearsal, WAF
  limits, provider DPA records, and approved retention automation.

## Residual scope

Supabase CMS/public-content components remain transitional and are removed only
after each Neon-backed slice passes authorization, parity, rollback, and
release tests. Upload validation, full content revision/publish/rollback,
production recovery, and the future customer portal remain later milestones.

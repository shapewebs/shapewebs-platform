# Project status

## Current milestone

- Date: 24 July 2026
- Branch: `codex/foundation`
- Pull request: draft `shapewebs/shapewebs-platform#7`
- Status: short-term assurance foundation implemented; staging/provider
  configuration and production launch remain gated
- Production baseline: commit `33affde`

Production remains on the known-good baseline. This branch has not been merged,
connected to production data, or promoted to the production domains.

## Implemented on this branch

### Repository and assurance

- `main` is protected by GitHub ruleset `19675880`; pull requests, linear
  history, resolved conversations, required CI/Neon/Vercel checks, deletion
  protection, and force-push protection are active.
- Secret scanning, push protection, dependency review, OSV, CodeQL, Dependabot,
  SHA-pinned Actions, CODEOWNERS, and a private vulnerability-reporting process
  are configured.
- The threat model, ASVS matrix, data/processor register, SLOs, incident
  runbook, staging-assurance runbook, and deterministic code-hygiene contract
  are version controlled.
- `pnpm verify` is the canonical local/CI gate. `pnpm verify:release` adds dual
  builds, Playwright, Lighthouse, k6, and ZAP. Release-only network tests refuse
  targets outside an exact staging allowlist.
- `pnpm clean:artifacts` removes only known generated artifacts and never
  removes environment files, provider links, dependencies, or unknown paths.

### Applications and runtime controls

- `apps/web` and `apps/admin` remain independently deployable Next.js
  applications.
- The public site remains static-first and within its Lighthouse and transfer
  budgets. Speed Insights is loaded only on Vercel. Turnstile is loaded only
  with the contact interface.
- The admin app has nonce-based dynamic CSP, fail-closed readiness, structured
  logs, OpenTelemetry instrumentation, and request/trace correlation.
- Typed structured logging rejects or redacts cookies, authorization values,
  tokens, secrets, database URLs, and form content. Durable audit events are
  append-only.
- Public and admin health endpoints separate liveness from readiness and return
  stable, sanitized payloads.
- Checkly monitoring-as-code defines two-minute public home/readiness checks and
  an optional ten-minute synthetic staging lead journey.

### Authentication and authorization

- Better Auth is mounted only in `apps/admin` at `/api/auth/[...all]`.
- Authentication uses Google OAuth and an explicit owner email allowlist.
  Public signup and email/password authentication are disabled.
- Production configuration requires an exact HTTPS base origin, exact trusted
  origins, Google credentials, a strong secret, and an organization UUID.
  Wildcard preview origins fail configuration validation.
- Production cookies are host-only, Secure, HttpOnly, and SameSite=Lax.
- Admin sessions have an eight-hour fixed lifetime and a 30-minute inactivity
  limit. Revoked, expired, inactive, anonymous, and customer-role sessions fail
  closed.
- Google authentication is followed by a custom TOTP step-up. Publishing and
  other sensitive mutations require a fresh step-up.
- Every migrated admin page, Route Handler, and Server Action re-authorizes
  against server-owned session and membership context. Authentication,
  step-up, revocation, and authorization-denial events are audited.

### Neon lead and email path

- `packages/database` contains six reviewed Drizzle migrations, forced RLS,
  least-privilege runtime roles, transaction-local authorization context, and
  negative authorization tests.
- Both application Development database URLs use pooled Neon endpoints.
  Owner/migrator operations remain direct and outside Vercel runtimes.
- Contact and project-inquiry handlers enforce JSON content type, a 16 KiB
  streamed-body limit, Zod validation, UUID command IDs, bounded local rate
  limiting, and server-side Turnstile verification.
- A lead and its durable outbox event commit in one transaction. Acknowledged
  leads therefore do not depend on Resend availability.
- Outbox delivery uses bounded claiming, application and provider idempotency,
  safe retry/backoff, a terminal/manual-review state, and protection against
  replay after the provider idempotency window.
- Resend webhooks use raw-body signature verification, event-ID deduplication,
  bounded input, and monotonic handling of out-of-order delivery events.
- Notification emails contain only the form type, submission ID, contact
  identity, and a protected admin link. The message and project details remain
  in Neon.
- The admin submissions view now reads minimal DTOs through the Neon repository
  layer. The remaining Supabase CMS paths are still transitional.

## Verified evidence

The existing foundation and database evidence is recorded in:

- `docs/audits/foundation-verification-2026-07-23.md`;
- `docs/audits/database-foundation-verification-2026-07-24.md`.

The current pull request must rerun all CI checks, including the disposable
Neon migration/security/restore lifecycle, after migrations `0004` and `0005`
are pushed. Final evidence for this implementation belongs in
`docs/audits/assurance-implementation-2026-07-24.md`.

## External launch gates

These are intentionally not guessed or provisioned:

- first-owner email, Google OAuth client ID/secret, and exact fixed staging and
  production OAuth origins;
- a protected fixed staging deployment and repository variables for Checkly,
  k6, and ZAP;
- Checkly account/API credentials and an alert channel;
- Turnstile site/secret keys and exact staging/production hostnames;
- Resend API key, webhook signing secret, sending/recipient addresses, and
  webhook registration;
- Vercel Pro or another trigger capable of meeting the 15-minute email
  objective. Hobby Cron is configured only once daily and cannot satisfy that
  SLO;
- a separate paid production Neon project, restore/rollback rehearsal, and
  production-only least-privilege credentials;
- WAF/distributed rate limits, production monitoring alerts, provider DPAs,
  approved legal retention, and an incident/restore exercise.

Preview and Production database/auth/email variables remain intentionally
unconfigured for the new path. Existing transitional Supabase production
variables are not removed until the corresponding CMS and public-content paths
have verified Neon parity.

## Next implementation slices

1. Obtain a clean pull-request run, especially the new disposable Neon
   lifecycle and database authorization scenarios.
2. Configure fixed staging and the account-specific Google, Turnstile, Resend,
   Checkly, and Vercel settings listed above.
3. Exercise the controlled-failure alert, authenticated staging journey,
   outbox delivery, signed webhook, ZAP, and k6 gates.
4. Replace the Supabase CMS paths one vertical slice at a time, then remove
   Supabase only after parity and rollback evidence.
5. Build the CMS lifecycle, storage controls, final public studio design, and
   production recovery gates in the milestone order documented in
   `docs/plans/roadmap-2026-07-24.md`.

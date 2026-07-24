# Project status

## Current milestone

- Date: 24 July 2026
- Branch: `codex/foundation`
- Pull request: draft `shapewebs/shapewebs-platform#7`
- Status: short-term assurance foundation implemented; isolated staging
  control plane provisioned; staging runtime verification and production launch
  remain gated
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
- The official stable ASVS 5.0.0 flat catalog is pinned by release asset and
  SHA-256. A generated exact-ID register covers all 253 Level 1/Level 2
  requirements. Encoding, validation, browser-security, API and transport
  review has 57 path-validated dispositions and 196 explicitly unreviewed
  requirements; structural
  verification is canonical, and the production gate remains fail-closed until
  every requirement is reviewed.
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
- Checkly monitoring-as-code defines two-minute public home/readiness checks,
  optional protected staging admin readiness, a ten-minute synthetic lead
  journey and daily marker-restricted cleanup. Web and admin monitoring use
  distinct encrypted Vercel bypass credentials.
- The protected GitHub `staging` branch is mapped to fixed
  `staging.shapewebs.com` and `admin-staging.shapewebs.com` Vercel Preview
  domains. Branch-specific variables cannot leak into general previews.
- A persistent synthetic-only Neon `staging` branch contains migrations `0000`
  through `0006`, including marker-restricted synthetic lead retention. The
  runtime roles passed the complete RLS and authorization suite. Neon Free
  cannot protect the persistent branch, so a protected paid production branch
  remains a launch gate.
- Cloudflare Wrangler uses least-privilege OAuth from the macOS Keychain. The
  `shapewebs-leads-staging` Turnstile widget is restricted to the public staging
  hostname, and its secret exists only in the matching Vercel branch scope.

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

### Neon lead, retention and email path

- `packages/database` contains seven reviewed Drizzle migrations, forced RLS,
  least-privilege runtime roles, transaction-local authorization context, and
  negative authorization tests.
- Both application Development database URLs use pooled Neon endpoints.
  Owner/migrator operations remain direct and outside Vercel runtimes.
- Contact and project-inquiry handlers enforce JSON content type, a 16 KiB
  streamed-body limit, Zod validation, UUID command IDs, bounded local rate
  limiting, and server-side Turnstile verification.
- A lead and its durable outbox event commit in one transaction. Acknowledged
  leads therefore do not depend on Resend availability.
- The real fixed-staging contact journey passed Cloudflare Turnstile, returned
  the deployed success state, and produced one joined Neon lead/outbox pair.
  The notification remains correctly pending until Resend is configured.
- Outbox delivery uses bounded claiming, application and provider idempotency,
  safe retry/backoff, a terminal/manual-review state, and protection against
  replay after the provider idempotency window.
- Resend webhooks use raw-body signature verification, event-ID deduplication,
  bounded input, and monotonic handling of out-of-order delivery events.
- Notification emails contain only the form type, submission ID, contact
  identity, and a protected admin link. The message and project details remain
  in Neon.
- Staging synthetic leads have a dedicated, POST-only retention route, a
  branch-scoped bearer secret, a strict owner-only RLS policy, and a daily
  Checkly definition. Only the exact checked-in synthetic identity can be
  deleted after six days; fresh, ordinary and cross-tenant leads fail closed.
- The admin submissions view now reads minimal DTOs through the Neon repository
  layer. The remaining Supabase CMS paths are still transitional.

## Verified evidence

The existing foundation and database evidence is recorded in:

- `docs/audits/foundation-verification-2026-07-23.md`;
- `docs/audits/database-foundation-verification-2026-07-24.md`.

At commit `219dc2e`, the current pull request passed all required Quality,
Security, CodeQL, dependency-review, Vercel and disposable Neon
migration/security/restore checks. Fixed staging public and admin liveness and
readiness returned sanitized `200` responses with `no-store` and the expected
security headers. Staging provisioning and runtime evidence is recorded in:

- `docs/audits/staging-provisioning-2026-07-24.md`;
- `docs/audits/staging-runtime-verification-2026-07-24.md`.

## External launch gates

These are intentionally not guessed or provisioned:

- first-owner Google email and Google OAuth client ID/secret;
- Checkly account/API credentials and an alert channel;
- a complete green protected-staging ZAP run;
- production Turnstile site/secret keys and the exact production hostname;
- Resend API key, webhook signing secret, sending/recipient addresses, and
  webhook registration;
- Vercel Pro or another trigger capable of meeting the 15-minute email
  objective. Hobby Cron is configured only once daily and cannot satisfy that
  SLO;
- a separate paid production Neon project, restore/rollback rehearsal, and
  production-only least-privilege credentials;
- WAF/distributed rate limits, production monitoring alerts, provider DPAs,
  approved legal retention, and an incident/restore exercise.
- requirement-level review and evidence disposition for all 253 target ASVS
  5.0.0 controls.

The `staging` Preview branch now has isolated Neon, URL, application-secret,
Turnstile and synthetic-retention variables. The GitHub staging-assurance
credential is valid, and run `30097779661` passed the k6 staging thresholds.
ZAP then failed before scanning because its non-root container could not access
the two ephemeral bind mounts; the narrowly scoped permission fix is pending
approval. Google OAuth, Resend and Checkly remain unconfigured. Production
database/auth/email variables remain intentionally unconfigured for the new
path. Existing transitional Supabase production variables are not removed
until the corresponding CMS and public-content paths have verified Neon
parity.

## Next implementation slices

1. Obtain approval for the focused ZAP bind-mount fix and obtain a green
   protected-staging ZAP run.
2. Complete the real Turnstile lead/outbox journey from an attached in-app
   staging browser tab.
3. Configure the account-specific Google, Resend, Checkly, and Vercel settings
   listed above.
4. Exercise the controlled-failure alert, authenticated staging journey,
   outbox delivery and signed webhook gates.
5. Replace the Supabase CMS paths one vertical slice at a time, then remove
   Supabase only after parity and rollback evidence.
6. Build the CMS lifecycle, storage controls, final public studio design, and
   production recovery gates in the milestone order documented in
   `docs/plans/roadmap-2026-07-24.md`.

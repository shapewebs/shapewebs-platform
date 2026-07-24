# Project status

## Current milestone

- Date: 24 July 2026
- Branch: protected `staging`; current evidence branch
  `codex/staging-scheduler-evidence`
- Pull requests: draft staging evidence
  `shapewebs/shapewebs-platform#15`; draft foundation promotion
  `shapewebs/shapewebs-platform#7`
- Status: short-term assurance foundation implemented; isolated staging
  control plane and active staging monitoring provisioned; production launch
  remains gated
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
  review has 73 path-validated dispositions and 180 explicitly unreviewed
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
  protected staging admin readiness, a ten-minute synthetic lead journey and
  daily marker-restricted cleanup, plus a five-minute outbox heartbeat with a
  six-minute grace window. Web and admin monitoring use
  distinct encrypted Vercel bypass credentials. All six checks notify the
  confirmed Gmail inbox. The four staging schedules are active; public checks
  remain inactive until the foundation release passes their launch assertions.
- Fixed non-secret staging origins are checked-in defaults, so a local Checkly
  deployment always instantiates all six resources and missing shell variables
  cannot delete the staging checks.
- The protected GitHub `staging` branch is mapped to fixed
  `staging.shapewebs.com` and `admin-staging.shapewebs.com` Vercel Preview
  domains. Branch-specific variables cannot leak into general previews.
- A persistent synthetic-only Neon `staging` branch contains migrations `0000`
  through `0006`, including marker-restricted synthetic lead retention. The
  runtime roles passed the complete RLS and authorization suite. Neon Free
  cannot protect the persistent branch, so a protected paid production branch
  remains a launch gate.
- Cloudflare Wrangler uses least-privilege OAuth from the macOS Keychain. The
  `shapewebs-leads-staging` Turnstile widget remains restricted to the public
  staging hostname. Automated staging uses Cloudflare's official test pair in
  the matching Vercel branch scope; preview-only code rejects that mode in
  Vercel production.

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
- A restricted, domain-scoped Resend staging key is stored only in the admin
  Preview environment for Git branch `staging`. The registered staging webhook
  listens for seven delivery-lifecycle events and its signing secret is a
  sensitive branch-scoped variable. A dedicated, revocable staging-only Vercel
  bypass lets Resend reach the otherwise SSO-protected endpoint.
- A full synthetic staging journey committed one lead/outbox pair, delivered
  through Resend's safe `delivered@resend.dev` facility, and persisted signed
  `email.sent` and `email.delivered` events. Resend observed `200` with
  `{"status":"accepted"}` on the first attempt, while missing and invalid
  signatures returned application `400`. The exact synthetic lead, outbox and
  webhook rows were removed afterward, and no test recipient remains
  configured.
- A second synthetic journey used Resend's safe bounce address. The worker
  processed one event once, signed `email.sent` and `email.bounced` events
  reached Neon, and the final monotonic delivery state was `email.bounced`.
  Resend replayed the successful bounce webhook; attempt two received
  `{"status":"duplicate"}` while Neon retained one bounce event. The exact
  fixture and temporary recipient were then removed.
- Outbox delivery uses bounded claiming, application and provider idempotency,
  safe retry/backoff, a terminal/manual-review state, and protection against
  replay after the provider idempotency window.
- Resend webhooks use raw-body signature verification, event-ID deduplication,
  bounded input, and monotonic handling of out-of-order delivery events.
- Notification emails contain only the form type, submission ID, contact
  identity, and a protected admin link. The message and project details remain
  in Neon.
- Google Workspace Business Starter trial is active for the one licensed
  `admin@shapewebs.com` account. The domain is verified; Google MX, apex SPF,
  and 2048-bit DKIM signing are active; DMARC remains at quarantine; and
  Resend's DKIM and `send` subdomain SPF/MX records remain isolated and intact.
- `info@`, `sales@`, `support@`, `lukasthomsen@`, `security@`, `privacy@`, and
  `billing@` are aliases into the `admin@shapewebs.com` inbox.
  `shapewebs@gmail.com` is the independent recovery address. There is no
  catch-all, and `noreply@shapewebs.com` remains a Resend-only sender rather
  than a human mailbox.
- Exact inbox-preserving filters apply `Shapewebs/Admin`, `Info`, `Sales`,
  `Support`, `Security`, `Privacy`, `Billing`, or `Personal` labels to matching
  inbound addresses. Existing conversations were backfilled without
  archiving, forwarding, deleting or marking them read.
- `admin@shapewebs.com` remains the default Workspace sender. The additional
  `Shapewebs <info@shapewebs.com>` identity sent a controlled message whose
  authenticated From address arrived correctly at `shapewebs@gmail.com`. The
  stale `smtp.simply.com` `info@` send-as entry was then removed from the
  personal Gmail account without deleting mail.
- Branch-scoped staging configuration now uses `admin@shapewebs.com` as the
  Better Auth owner, `sales@shapewebs.com` as the lead recipient, and
  `Shapewebs <noreply@shapewebs.com>` as the transactional sender. No
  production application environment was changed.
- A staging-only Cloudflare Worker invokes the protected outbox route every
  five minutes with independent encrypted Vercel-bypass and bearer
  credentials. Consecutive live invocations passed, and an approved controlled
  missed-heartbeat exercise proved Checkly failure and recovery alerts
  end-to-end. The exact Cron Trigger was restored without a manual heartbeat;
  the next real invocation completed successfully. A final Neon read found 21
  of 21 synthetic outbox events suppressed, zero unresolved events and zero
  provider message IDs.
- Staging synthetic leads have a dedicated, POST-only retention route, a
  branch-scoped bearer secret, a strict owner-only RLS policy, and a daily
  Checkly definition. Only the exact checked-in synthetic identity can be
  deleted after six days; fresh, ordinary and cross-tenant leads fail closed.
- The admin submissions view now reads minimal DTOs through the Neon repository
  layer. Better Auth session resolution no longer initializes Supabase.
  Transitional Supabase access is server-only and limited by an automated
  allowlist to the remaining CMS and settings paths.

## Verified evidence

The existing foundation and database evidence is recorded in:

- `docs/audits/foundation-verification-2026-07-23.md`;
- `docs/audits/database-foundation-verification-2026-07-24.md`.

The current pull request passed all required Quality, Security, CodeQL,
dependency-review, Vercel and disposable Neon migration/security/restore
checks. At commit `bb07f7c`, protected-staging run
[`30103670868`](https://github.com/shapewebs/shapewebs-platform/actions/runs/30103670868)
passed k6 and ZAP: 63 passive rules passed, three reviewed findings remained
visible as information, and no warning or failure remained. The 30 KiB
artifact contained only three ZAP reports and the k6 summary, with no
credential or internal ZAP log. Fixed staging public and admin liveness and
readiness returned sanitized `200` responses with `no-store` and the expected
security headers when accessed through Vercel's rotated automation bypass.
Staging provisioning and runtime evidence is recorded in:

- `docs/audits/staging-provisioning-2026-07-24.md`;
- `docs/audits/staging-runtime-verification-2026-07-24.md`;
- `docs/audits/checkly-monitoring-2026-07-24.md`;
- `docs/audits/staging-outbox-scheduler-2026-07-24.md`; and
- `docs/audits/workspace-mail-verification-2026-07-24.md`.

## External launch gates

These are intentionally not guessed or provisioned:

- Google Cloud OAuth client ID/secret and completion of the Google-to-TOTP
  staging journey;
- Workspace mailbox MFA plus the remaining alias send-as and controlled
  outbound identity evidence. External MX delivery, all inbox filters and the
  `info@` identity are complete;
- production Turnstile site/secret keys and the exact production hostname;
- production Resend key/webhook configuration; the staging recipient is now
  `sales@shapewebs.com`, and staging delivery, bounce, and provider replay
  evidence is complete;
- a production trigger capable of meeting the 15-minute email objective.
  Cloudflare now provides the staging trigger; Vercel Hobby Cron remains a
  once-daily fallback and cannot satisfy the production SLO;
- a separate paid production Neon project, restore/rollback rehearsal, and
  production-only least-privilege credentials;
- WAF/distributed rate limits, production monitoring alerts, provider DPAs,
  approved legal retention, and an incident/restore exercise.
- non-interactive Checkly automation credentials if monitoring deployment is
  later moved from the encrypted local CLI session into CI;
- requirement-level review and evidence disposition for all 253 target ASVS
  5.0.0 controls.

The `staging` Preview branch now has isolated Neon, URL, application-secret,
Turnstile, Resend-sender/webhook and synthetic-retention variables. The GitHub
staging-assurance credential was rotated after evidence review found that ZAP
internal logs echo replacer values; the affected artifact was deleted, all
public-project bypass tokens were revoked, and a clean rerun proved that only
redacted reports remain. A first Resend webhook bypass exposed by dashboard
inspection was revoked before activation and replaced. The provider replay
later displayed the active endpoint again, so Resend was moved to another
seven-event replacement before revocation. Neon CLI then echoed the staging
migrator connection string despite a requested JSON format; that non-production
role password was reset immediately and the replacement connection was
verified. No temporary local Keychain copy remains. Google OAuth remains
unconfigured because the new Workspace identity still receives an
account-specific Google Cloud Console availability page while Google's public
status is healthy. Checkly is authenticated locally, its Gmail alert channel
delivered the controlled failure and recovery, and the three protected staging
schedules are active. One operator deploy briefly recreated those three check
objects after their then-optional origin variables were absent; commit
`1b6924e` makes the fixed staging resources unconditional and a subsequent
three-check session passed. The staging-only Cloudflare Worker now runs on the
exact five-minute trigger with encrypted credentials. The weak legacy cron
secret was replaced atomically in Vercel and Cloudflare. Protected staging PRs
`#11` through `#14`, their disposable Neon lifecycles, Vercel builds and
post-merge k6/ZAP runs passed. The Worker needed both Cloudflare's public-fetch
flag and a per-invocation, correctly bound runtime `fetch`. Its Checkly ping
token was rotated after the heartbeat resource ID was mistakenly used as the
private ping token. Two consecutive live executions then completed, Checkly
recorded both heartbeats, Neon contained only suppressed synthetic outbox
events and Resend had no new email. The owner-approved missed-heartbeat
exercise then delivered both failure and recovery notifications, restored the
exact five-minute Cron Trigger and recovered only after a real Worker success.
An external Resend MX test also delivered to `admin@shapewebs.com`, all six
role aliases and `lukasthomsen@shapewebs.com`; all eight arrived in the central
Workspace inbox. Production database/auth/email variables remain
intentionally unconfigured for the new path. Existing transitional Supabase
production variables are not removed until the corresponding CMS and
public-content paths have verified Neon parity.

## Next implementation slices

1. Complete mailbox MFA, recovery-address verification and the remaining
   alias send-as/outbound identity verification.
2. Configure the Workspace-owned Google OAuth client when the new account can
   access Google Cloud, then complete the Google-to-TOTP fail-closed staging
   journey.
3. Replace the Supabase CMS paths one vertical slice at a time, then remove
   Supabase only after parity and rollback evidence.
4. Build the CMS lifecycle, storage controls, final public studio design, and
   production recovery gates in the milestone order documented in
   `docs/plans/roadmap-2026-07-24.md`.

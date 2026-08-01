# Project status

## Current milestone

- Date: 1 August 2026
- Branch: protected `staging` at
  `eea5f3abe12daf05f4ceddd82a7022ad9db630fc`; the visual-system reset is
  isolated on `codex/visual-foundation`
- Pull requests: foundation and migration pull requests `#15` through `#45`
  are merged; the Sanity publishing foundation and its deployment corrections
  `#46` through `#51`, unpublish lifecycle repair `#52`, and public-route/ZAP
  robustness repair `#53`, foundation evidence reconciliation `#54`, and the
  superseded first homepage implementation `#55` are also merged into
  protected `staging`
- Status: protected staging remains complete for employee authentication, Neon
  operations, Sanity public content/media, private Vercel Blob, lead/email
  reliability, monitoring, and release assurance. The active branch now
  consolidates customer and employee accounts into `apps/admin`; migration
  `0019` has passed its disposable lifecycle, while persistent staging,
  provider configuration and the complete release gate remain pending
- Production baseline: commit
  `33affde883340d9db1d53d89ffd0c49d73fb531f`

Production remains on the known-good baseline. Pull requests `#15` through
`#55` are merged into protected `staging`. Migrations `0000` through `0018`
are applied to the persistent synthetic staging database; the journal contains
19 entries and its live six-identity security verification passes. Google
OAuth, password login, shared TOTP step-up and protected employee navigation
have passed on the fixed staging origin.

The real Sanity journey has passed create, normalized image upload, save,
one-time exact-revision preview, fresh-TOTP publish, exact public read,
supported provider unpublish, signed webhook acceptance, durable receipt,
public cache revalidation to `404`, ambiguous-command reconciliation, and
reference-safe final cleanup. Post-evidence staging run
[`30521601429`](https://github.com/shapewebs/shapewebs-platform/actions/runs/30521601429)
required the exact `8b62a0d` deployments, then passed k6 and ZAP. No content
slice has been connected to production data or promoted to the production
domains.

Sanity project `42f6331k` has one public `staging` dataset, separate Viewer and
Editor robot tokens, exact localhost Studio CORS, and no production dataset.
Sanity owns structured public website content and public website images. Neon
remains the source of truth for identities, authorization, audit, idempotency,
preview grants and company/customer operations; private Vercel Blob remains
the boundary for confidential files. The checked-in Studio is a
provider-recovery surface, not the employee CMS.

## Active visual-foundation branch

The unmerged `codex/visual-foundation` branch deliberately supersedes the
first homepage composition from pull request `#55`. The public application is
now a controlled design canvas:

- `/` has an empty body and retains only a rebuilt header and footer.
- Every other public marketing page is removed. Private CMS preview and
  integration Route Handlers remain isolated infrastructure.
- Crawling remains enabled and the sitemap contains only the canonical
  homepage, preserving the SEO release budget while public body content is
  intentionally absent.
- Shared semantic tokens define separate dark `showcase` and light `studio`
  themes. Header, footer and both application shells consume shared brand,
  button and layout primitives.
- The admin login, dashboard, navigation, content lists and editors, media,
  submissions, settings, security and audit surfaces share one composition
  model. The same application now also contains invitation-gated customer
  onboarding, a customer workspace, and shared account security without
  weakening employee TOTP or customer RLS.
- `pnpm visual:foundation:check` protects the exact route reset, theme
  selection, required tokens, component use, application token boundary and
  all 404 globally unique application/shared CSS Module class contracts across
  105 CSS Modules.

The consolidated branch now passes `pnpm verify`, both Next.js build engines,
the Worker and Sanity Studio builds, runtime-artifact checks, all 32 Playwright
security/accessibility/interaction scenarios, three Lighthouse runs and the
253-control ASVS launch gate. Drizzle regeneration leaves the worktree
unchanged. The disposable migration rehearsal is also green. Protected GitHub,
Neon and Vercel checks, the migrated fixed-staging provider journeys, and
post-deployment k6/ZAP remain mandatory before merge or promotion.

## Implemented on protected staging

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
  requirements. All 253 have evidence-backed dispositions; zero remain
  unreviewed and the deterministic ASVS launch gate passes. Time-limited
  accepted risks remain explicit, owned and expiry-bound. The communication,
  cryptographic-key-management, data-protection, availability and logging
  inventories are version controlled.
- `pnpm verify` is the canonical local/CI gate. It includes a deterministic
  compatibility and resource-bound check for the tracked `brace-expansion`
  5.0.8 security patch. `pnpm verify:release` adds dual builds, Playwright,
  Lighthouse, k6, and ZAP. Release-only network tests refuse targets outside an
  exact staging allowlist.
- `pnpm clean:artifacts` removes only known generated artifacts and never
  removes environment files, provider links, dependencies, or unknown paths.

### Applications and runtime controls

- `apps/web` remains the unauthenticated static-first application;
  `apps/admin` is the only authenticated application for customers and
  employees. The former `apps/portal` package, duplicate Better Auth instance,
  duplicate build target and `PORTAL_*` application environment are removed on
  the active branch.
- The authenticated app uses one exact origin, one host-only cookie namespace,
  one Google callback, one canonical `auth` schema and shared recovery. Customer
  repositories still use a separate least-privilege connection and forced RLS;
  employee-studio access still requires active staff membership and TOTP.
- Authenticated responses use nonce CSP, private/no-store and noindex controls.
  Both Next.js build engines and Playwright cover the unified application.
- The boundary gate now rejects direct source imports between applications and
  rejects any authentication-library import in the public application.
- The public site remains static-first and within its Lighthouse and transfer
  budgets. Speed Insights is loaded only on Vercel. Turnstile is loaded only
  with the contact interface.
- CMS drafts render only within a dynamic, private/no-store and non-indexable
  `/preview` namespace. Public marketing layouts do not read request cookies,
  preserving shared CDN caching. Preview sessions are bound to the exact
  tenant, document, revision, locale, and resolved route.
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
  through `0018`, including marker-restricted synthetic lead retention,
  owner-only organization settings, complete content/workflow enums,
  administrative TOTP replay/lockout, separate customer identity and
  membership, secure private media, provider-command assurance, and the
  preview-session transition. The runtime roles passed the complete RLS and
  authorization suite. Neon Free cannot protect the persistent branch, so a
  protected paid production branch remains a launch gate.
- Cloudflare Wrangler uses least-privilege OAuth from the macOS Keychain. The
  `shapewebs-leads-staging` Turnstile widget remains restricted to the public
  staging hostname. Automated staging uses Cloudflare's official test pair in
  the matching Vercel branch scope; preview-only code rejects that mode in
  Vercel production.

### Sanity public-content boundary

- `packages/content-schema` owns strict blog, author, category, image and
  Portable Text contracts. Arbitrary HTML and editor-provided scripts are not
  accepted.
- `packages/content-platform` owns least-privilege published, draft, write and
  webhook clients. Public marketing routes use the published CDN perspective;
  authenticated employee routes use token-protected drafts; write credentials
  remain server-only in the admin app.
- The employee portal has a structured Portable Text blog editor, a shared
  public-image library, verified image normalization, optimistic Sanity
  revisions, fresh-TOTP publish/unpublish, exact cache revalidation and
  append-only Neon audit evidence.
- Migration `0017_content-provider-assurance` adds tenant-isolated,
  forced-RLS command reservations and one-time Sanity preview grants. A command
  is reserved before Sanity is called and completed with its audit event in one
  Neon transaction. Ambiguous outcomes are held for reconciliation instead of
  being replayed blindly.
- Private previews use a one-time activation token and a separate host-only,
  HttpOnly session token. The public app renders only the exact saved Sanity
  revision, locale, slug and route named by the grant; a later edit or publish
  invalidates that preview. Migration `0018_preview-session-transition` binds
  activation to the exact server-generated session hash inside one transaction,
  clears the transition context before the bounded read and leaves the consumed
  activation token unable to read either the grant or its draft.
- The signed webhook endpoint checks the exact project/dataset headers,
  verifies the raw-body signature, deduplicates the at-least-once delivery in
  Neon, and retries safe public revalidation on duplicate provider delivery.
- The provider project and local recovery Studio are provisioned. Migrations
  `0017` and `0018`, the separate staging Viewer and Editor tokens, the exact
  web draft-reader secret, and the signed fixed-staging webhook are active.
  The real employee create/upload/save/preview/publish/unpublish/`404`/cleanup
  journey passed. The initially ambiguous unpublish command was reconciled to
  `uncertain`; pull request `#52` repaired the provider action and audit
  transition, and the successful retry produced a `200` webhook plus a durable
  `blogPost.delete` receipt.

### Authentication and authorization

- The public application contains no authentication runtime. `apps/admin` is
  the one authenticated application for employees and customers, with one
  Better Auth instance, canonical `auth` schema, exact origin, host-only cookie
  namespace, Google callback and recovery surface.
- Authentication establishes one account identity only. Every protected entry
  point then derives either a staff or customer authorization context from
  trusted memberships; a customer membership never grants studio access, and
  staff status never grants access to an unrelated customer project.
- Protected staging gives every allowlisted owner/editor one administrative
  account with Google, a verified password, or both attached as login methods.
  Open signup, implicit email merging and privileged unlinking remain disabled.
- Google-first employees may add a password through a verified single-use
  mailbox link. Password-first employees may connect Google only after current
  password verification and a fresh TOTP step-up. The link grant is signed,
  action-specific, short-lived and bound to the active user/session.
- Production configuration requires an exact HTTPS base origin, exact trusted
  origins, Google credentials, a strong secret, and an organization UUID.
  Wildcard preview origins fail configuration validation.
- Production cookies are `__Host-` prefixed, host-only, Secure, HttpOnly and
  SameSite=Lax. Successful logout also clears browser cache, cookies and
  storage for the admin origin.
- Admin sessions have an eight-hour fixed lifetime and a 30-minute inactivity
  limit. Revoked, expired, inactive, anonymous, and customer-role sessions fail
  closed.
- Initial and reauthenticated sessions use Shapewebs-owned 256-bit random
  tokens. Every successful TOTP reauthentication rotates the token without
  extending the original eight-hour expiry.
- Better Auth's token-returning session-list and token-based revocation
  endpoints are disabled. The owner settings view exposes only token-free
  organization-scoped session summaries, and a TOTP step-up from the preceding
  five minutes is required to revoke another administrative session.
- Google or password authentication is followed by the same custom TOTP
  step-up. Publishing and other sensitive mutations require a fresh step-up.
- The fixed staging login now recognizes the configured Shapewebs cookie
  prefix. Protected staging passes Better Auth's runtime key configuration
  into TOTP decryption, including versioned secret envelopes, and replaces
  error-prone manual-only enrollment with a locally rendered QR code plus a
  clearly labeled manual fallback. The QR is generated in the admin bundle and
  makes no third-party browser request.
- Google ID Tokens are cryptographically verified against Google's fixed JWKS
  endpoint with exact issuer and audience checks, `RS256` only, required
  identity/lifetime claims and verified email.
- Administrative TOTP accepts only the exact 30-second period, consumes a
  per-user counter once across all sessions, and applies a 15-minute lock after
  ten failed attempts. Recovery codes and public factor-management paths remain
  disabled until identity-proofed recovery is implemented.
- Every migrated admin page, Route Handler, and Server Action re-authorizes
  against server-owned session and membership context. Authentication,
  step-up, revocation, and authorization-denial events are audited.
- The active branch implements ADR 0006: one `auth.user` can hold staff,
  customer, or both memberships and can sign in with Google, password, or both.
  Project-bound invitation acceptance, Google-first or password-first
  onboarding, generic recovery, explicit method linking, shared account
  security, Turnstile and the durable encrypted Resend worker now live in
  `apps/admin`.
- Migration `0019` performs conflict-aborting legacy identity reconciliation,
  moves non-conflicting provider accounts and terminal outbox evidence, repoints
  customer memberships, revokes old customer sessions, and installs a narrow
  customer-session authorization function. Its disposable success, explicit
  conflict-abort, rollback, full security and byte-identical restore paths are
  green and recorded in
  `docs/audits/unified-account-identity-verification-2026-08-01.md`. It is not
  yet applied to persistent staging or production.
- The protected administrative slice adds allowlisted password activation,
  generic recovery, durable encrypted auth-email delivery, method discovery,
  explicit Google linking, password addition and a shared security page.
  Migration `0015` is applied to synthetic staging. The owner account has
  passed Google-first and password-form first-factor journeys, the shared TOTP
  step-up, protected navigation, and the final security-page proof that Google
  and password are both connected to one identity.

### Neon lead, retention and email path

- Protected staging contains and has applied 19 version-controlled Drizzle
  migrations (`0000`–`0018`). Forced RLS, least-privilege runtime roles,
  transaction-local authorization context, and negative authorization tests
  remain canonical release gates.
- Both application Development database URLs use pooled Neon endpoints.
  Owner/migrator operations remain direct and outside Vercel runtimes.
- Migration `0013` originally established separate staff/customer membership
  tables and a transitional `customer_auth` identity realm. Active migration
  `0019` reconciles that realm into canonical `auth` while preserving separate
  membership and repository authorization boundaries. The physical
  `shapewebs_portal_runtime` PostgreSQL role name is temporarily retained as a
  migration detail, but application configuration calls it the customer
  runtime. It has no `neon_superuser`, ownership, role-creation,
  database-creation, replication, or RLS-bypass capability.
- Historical disposable source/restore evidence through `0013` verified the
  original split identities, active and suspended customer behavior,
  wrong-role and cross-tenant denial, rollback, deterministic export, and
  byte-identical restore. Migration `0019` has now repeated and extended those
  guarantees for the unified identity model on disposable branches. The
  earlier evidence remains in
  `docs/audits/customer-identity-boundary-verification-2026-07-26.md`.
- Pull request `#33` reproduced that lifecycle through the protected GitHub
  environment and merged at `b8f9750`. An expiring point-in-time branch
  preserves the pre-`0013` staging state through 28 July 2026. The dedicated
  migrator applied `0013`; the live journal contains 14 migrations, all three
  membership tables have forced RLS, and the complete six-identity security
  suite passed. Both fixed Vercel staging deployments and post-merge k6/ZAP
  run `30206702702` are green.
- Migration `0014` adds customer invitations, exact invitation-project
  assignments, session-inactivity state, and durable authentication-email
  state. A complete disposable source/restore run applies `0000` through
  `0014`, passes 18 repository and real Better Auth runtime scenarios, verifies
  rollback, and restores the byte-identical fixture SHA-256
  `b091129fc9c4110bda29e8b7d2bebeaf2e90bb0f4d5d502ebcdac41c16c0abb4`.
  Both branches were deleted. Pull request `#35` passed all protected checks
  and merged at `8e7a437`. An expiring rollback branch captured the exact
  pre-migration state before the direct migrator applied `0014`; the persistent
  journal now contains 15 migrations. The complete live six-identity security
  suite passed, both branch-scoped runtime credentials were rotated and stored
  only in Vercel Sensitive scope plus macOS Keychain, and both fixed staging
  deployments returned to `READY` without changing development or production.
- Pull request `#37` then added the customer-facing invitation, activation,
  login, recovery and security routes without provisioning provider resources.
  Protected run
  [`30218909081`](https://github.com/shapewebs/shapewebs-platform/actions/runs/30218909081)
  passed fresh migrations, the real Better Auth runtime, exact-tenant and
  wrong-tenant session authorization, the complete forced-RLS suite, rollback,
  byte-identical restore and disposable-branch cleanup before the pull request
  merged at `ee46f64`.

### Secure media foundation

- Migration `0016_secure-media-foundation` adds an explicit media lifecycle,
  normalized image metadata, provider state, localized alt text/captions, and
  forced tenant-aware RLS. Draft/private files remain invisible to the web,
  customer-runtime, and public-reader roles. The web role can read only same-tenant,
  public-ready rows and a reviewed column projection.
- The admin upload route authorizes owner/editor sessions before reading the
  body, enforces an exact-origin multipart request, bounds the complete request
  and source file, rejects unknown or duplicate fields, and accepts only
  matching JPEG, PNG, or WebP extension/MIME/decoded formats.
- Sharp decodes within a 32-megapixel and 8192-pixel source boundary,
  auto-orients, resizes within 3840 pixels, converts to sRGB metadata-free WebP,
  and records a SHA-256 digest plus source/normalized sizes.
- Private Vercel Blob access uses an explicit opaque store ID and Vercel OIDC.
  Provider URLs and storage identifiers are never returned to the browser.
  Publishing remains a separate future copy/sanitization operation into a
  distinct public store.
- Lead-style transaction semantics are extended to uploads: database
  reservation precedes storage, success is returned only after the ready-state
  commit, and ambiguous provider/database outcomes remain pending or
  cleanup-required for bounded reconciliation. The worker never deletes an
  object when the database commit result is uncertain.
- The complete disposable Neon source/restore lifecycle applied migrations
  `0000`–`0016`, passed 21 integration tests twice, passed the expanded
  six-identity forced-RLS suite, verified rollback, and restored the exact
  fixture SHA-256
  `b091129fc9c4110bda29e8b7d2bebeaf2e90bb0f4d5d502ebcdac41c16c0abb4`.
  Both temporary branches were deleted.
- The lifecycle also exposed and corrected an administrative step-up
  reliability defect: session validity now uses PostgreSQL's trusted clock,
  while the application timestamp is used only as the recorded verification
  time. This matches the earlier symptom where a completed TOTP step appeared
  stalled until reload.
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
- Google Workspace Business Starter trial is active with two licensed
  accounts: the dedicated administrative identity `admin@shapewebs.com` and
  the everyday employee identity `lukasthomsen@shapewebs.com`. The domain is
  verified; Google MX, apex SPF, and 2048-bit DKIM signing are active; DMARC
  remains at quarantine; and Resend's DKIM and `send` subdomain SPF/MX records
  remain isolated and intact.
- `info@`, `sales@`, `support@`, `security@`, `privacy@`, and `billing@` are
  role aliases into the `admin@shapewebs.com` inbox.
  `shapewebs@gmail.com` is the independent recovery address. There is no
  catch-all, and `noreply@shapewebs.com` remains a Resend-only sender rather
  than a human mailbox.
- Exact inbox-preserving filters apply `Shapewebs/Admin`, `Info`, `Sales`,
  `Support`, `Security`, `Privacy`, or `Billing` labels to matching
  inbound addresses. Existing conversations were backfilled without
  archiving, forwarding, deleting or marking them read. Replies use the same
  role address that received the message, while `admin@shapewebs.com` remains
  the default identity for new mail.
- `admin@shapewebs.com` remains the default Workspace sender. The additional
  billing, info, privacy, sales, security and support role identities are
  configured in Gmail. The `Shapewebs <info@shapewebs.com>` identity sent a
  controlled message whose authenticated From address arrived correctly at
  `shapewebs@gmail.com`. The stale `smtp.simply.com` `info@` send-as entry was
  then removed from the personal Gmail account without deleting mail.
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
- The admin submissions and owner-only Settings views now read minimal,
  validated DTOs through the Neon repository layer. Organization settings are
  provisioned with deterministic defaults, isolated by forced RLS, and covered
  by restore evidence. Better Auth session resolution and every application
  data path are free of Supabase.
- The CMS list and page-editor slices now use bounded, validated Neon DTOs.
  Owner/editor reads and mutations use transaction-local authorization
  context, forced RLS, immutable revisions, stable command identifiers,
  optimistic concurrency and append-only audit events. Locale-specific exact
  publication pointers preserve live English and Danish revisions
  independently when newer drafts exist. The last admin Supabase import and
  its transitional boundary allowlist are removed.
- The public app now reads exact locale-specific published revision pointers
  through the tenant-scoped Neon web role. It no longer imports or depends on
  the transitional Supabase repository. Detail lookups are single-record
  queries and content lists are bounded at 200 records.
- The public catch-all validates locale prefixes and resolves localized
  collection routes explicitly, so Danish preview URLs cannot silently fall
  back to English content. Ambiguous nested routes fail closed.
- CMS preview grants store only SHA-256 token hashes, activate once within five
  minutes, expire after 30 minutes, bind one tenant/document/revision/locale
  and redirect only to a server-derived internal path. Activation transfers the
  one-time token in a bounded POST body and exchanges it for a distinct
  `__Host-` session cookie, so URL history or access logs never contain the
  credential. The browser can explicitly exit through a POST-only route.
- The revalidation endpoint uses constant-time secret comparison, exact JSON
  content type, a streamed 2 KiB body limit, a strict DTO and normalized
  internal paths. The current correction adds exact-origin sender validation,
  short-lived Vercel workload OIDC through a Preview-to-Preview trusted-source
  rule, and a separate application secret shared only by the two exact staging
  branch environments.

## Verified evidence

The existing foundation and database evidence is recorded in:

- `docs/audits/foundation-verification-2026-07-23.md`;
- `docs/audits/database-foundation-verification-2026-07-24.md`.

Merged staging pull request `#15` passed all required Quality, Security,
CodeQL, dependency-review, Vercel and disposable Neon
migration/security/restore checks. At commit `bb07f7c`, protected-staging run
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
- `docs/audits/staging-outbox-scheduler-2026-07-24.md`;
- `docs/audits/staging-assurance-sequencing-2026-07-25.md`;
- `docs/audits/admin-mfa-cms-recovery-2026-07-26.md`;
- `docs/audits/workspace-mail-verification-2026-07-24.md`;
- and `docs/audits/google-oauth-staging-provisioning-2026-07-25.md`.

The organization-settings slice passed local formatting, zero-warning lint,
TypeScript, its 77-test unit suite, application-boundary checks, Drizzle
consistency and a complete disposable Neon lifecycle. Its evidence is recorded
in:

- `docs/audits/neon-organization-settings-verification-2026-07-24.md`.

Persistent staging now has nine journaled migrations and a one-to-one
organization/settings backfill. A provider-owner read and pooled admin-runtime
check proved forced RLS, one owner-visible row, zero editor-visible rows, no
web/public SELECT privilege and zero residual migrator backfill policies.

The current content-list slice has 81 passing unit tests and passed the complete
fresh-migration, real-repository, forced-RLS, rollback, export and restore
lifecycle with fixture hash
`47a271ca7a76c2b45d6cc167dae7221e6caaabe6d09b4184bfa38309ac65f908`.
The complete canonical verification gate and both admin production builds
(Turbopack and webpack) pass. A frozen offline pnpm 10.17.1 install accepts the
lockfile, and deterministic artifact cleanup leaves only intended changes. The
disposable source and restore branches were deleted. Evidence is recorded in:

- `docs/audits/neon-content-list-verification-2026-07-25.md`.

The authentication/session slice has 92 passing unit tests, 96.56% statement
coverage, and passed the canonical verification gate plus both admin production
builds. A complete disposable Neon migration, security, rollback, export and
restore lifecycle proved one-time TOTP counters, cross-session replay denial,
lockout and lock expiry recovery, 256-bit absolute-lifetime-preserving token
rotation, token-free organization session listing, and owner-controlled
cross-session revocation. The source and restore branches were deleted.
Evidence is recorded in:

- `docs/audits/authentication-session-verification-2026-07-25.md`.

Pull request `#17` then passed every required quality, security, disposable
Neon and Vercel check and was squash-merged into protected `staging` at
`a56a771`. Both fixed staging aliases received `READY` Preview deployments, and
the post-merge k6/ZAP job passed. The persistent synthetic database advanced
from nine to eleven journaled migrations and direct checks verified the new
enum values plus the TOTP table's admin-only privileges.

The post-merge runtime probe also found that missing Google OAuth
configuration produced bounded `503` responses for protected pages but
unhandled `500` responses from the step-up and session-revocation APIs, while
admin readiness incorrectly returned `200`. The isolated
`codex/staging-auth-readiness` correction makes required auth configuration a
readiness dependency, returns explicit `503` API results, and omits undefined
optional fields from structured logs. Its production-mode six-test security
suite and both application builds passed before pull request `#18` was
squash-merged into protected `staging` at `41d9556`. After a fixed-staging
redeployment, `/api/health/ready` returned a sanitized `200
{"status":"ready"}`, proving the complete auth environment and database
dependency are usable. Evidence is recorded in:

- `docs/audits/staging-auth-readiness-regression-2026-07-25.md`.

The stacked Neon CMS editor slice has 93 passing unit tests, 96.13% statement
coverage, and passed the canonical verification gate, Worker dry build, both
public/admin webpack and Turbopack production builds, and all 11 Chromium
Playwright journeys. A complete disposable Neon source/restore lifecycle
applied migrations `0000` through `0011`, passed eight real repository
scenarios plus the complete security and rollback suites, proved
locale-specific publication pointers and restricted public metadata, and
produced byte-identical exports with fixture hash
`5d6bb329a4109f8d6e5a03d851e6a4f7728c6f74f96c036ab9aa905a62f2973c`.
Both disposable branches were deleted. Evidence is recorded in:

- `docs/audits/neon-cms-editor-verification-2026-07-25.md`.

Pull request `#19` then passed all required checks, including its protected
disposable Neon lifecycle, and was squash-merged into `staging` at `732c563`.
An automatically expiring pre-migration branch preserves the staging state
through 27 July 2026. The dedicated migrator applied migration `0011`; the live
journal contains 12 migrations, the expected localization/version/command
schema is present, and the complete persistent-staging RLS/security suite
passed using every least-privilege runtime identity. Both Vercel deployments,
the k6 smoke test and ZAP baseline are green.

The stacked public-content slice has 103 passing unit tests and passed the
canonical verification gate plus both public/admin Turbopack production
builds. Its complete disposable Neon source/restore lifecycle applied
migrations `0000` through `0012`, passed ten real repository scenarios and the
expanded forced-RLS misuse suite, proved exact published reads, cross-tenant
preview denial and one-time preview consumption, and produced byte-identical
exports with fixture hash
`5d6bb329a4109f8d6e5a03d851e6a4f7728c6f74f96c036ab9aa905a62f2973c`.
Both disposable branches were deleted. Evidence is recorded in:

- `docs/audits/neon-public-content-verification-2026-07-25.md`.

Pull request `#20` passed every required check, advanced protected staging to
`b1791f3`, and applied migration `0012` to the persistent synthetic database.
Pull request `#21` corrected the runtime-rendered login path at `92cd373`.
Live Google OAuth then created the allowlisted owner, Google account, session,
membership, and administrative session records, exposing that middleware was
still searching for Better Auth's default cookie prefix. Pull request `#22`
added the exact `shapewebs` prefix to proxy resolution with a regression test,
passed the complete disposable Neon lifecycle, and merged at `c07a9ce`. Both
Vercel deployments and protected-staging k6/ZAP run
[`30166696641`](https://github.com/shapewebs/shapewebs-platform/actions/runs/30166696641)
are green.

Pull request `#23` corrected Better Auth runtime-key handling and TOTP
enrollment. Pull request `#24` added safe diagnostic evidence. The next live
attempt exposed invalid PostgreSQL target-column qualification in both counter
mutations; pull request `#25` repaired the SQL and added a real disposable
database integration test. After deployment, the full Google-to-TOTP journey
returned a successful audited step-up and the dashboard plus every protected
CMS route returned `200`.

The repository also remediates the newly published high-severity
`brace-expansion` denial-of-service advisory with upstream 5.0.8, a tracked
legacy CommonJS compatibility patch, and a canonical verifier. ESLint, Knip,
Checkly compilation, Lighthouse CLI loading, the compatibility probe, and
`pnpm audit` all pass; the audit reports zero known vulnerabilities.

The complete foundation branch currently passes the canonical gate with 113
unit tests, 96.15% statement coverage, all 253 ASVS Level 1/Level 2 evidence
records reviewed, deterministic schemas, and zero known audited
vulnerabilities. Both Next.js production applications build successfully. The
eight-test production HTTP security suite proves shared caching for the public
homepage, private/no-store and noindex preview behavior, preview-session exit,
security headers, and administrative fail-closed behavior.

Pull request `#26` passed Quality, Security, both Vercel deployments, and the
complete protected disposable Neon lifecycle before merging. After both fixed
staging deployments reached success, manually dispatched staging-assurance run
[`30177841421`](https://github.com/shapewebs/shapewebs-platform/actions/runs/30177841421)
passed its k6 smoke thresholds and passive ZAP baseline against merge commit
`52680c4`.

Pull request `#27` added the deployment-status wait guard and merged at
`d22ca30`. Its push-triggered staging-assurance run
[`30178108239`](https://github.com/shapewebs/shapewebs-platform/actions/runs/30178108239)
waited until the exact public and admin Vercel contexts succeeded, then passed
k6 and ZAP. The sequence and timestamps are recorded in
`docs/audits/staging-assurance-sequencing-2026-07-25.md`.

Pull request `#28` repaired administrative session rotation and added audited,
immutable CMS unpublish and rollback controls. Pull request `#29` added the one
exact public origin to the admin's nonce CSP for POST-only private preview.
After both merged, a fresh Google/TOTP browser session completed the entire
synthetic content lifecycle. Revisions 1 through 5 proved one-time preview,
preview exit and replay denial, publication, exact public reads, real public
`404` after unpublish, rollback as a new immutable publication and final
archival cleanup. The exact evidence and the cache-revalidation finding are
recorded in `docs/audits/admin-mfa-cms-recovery-2026-07-26.md`.

Pull request `#30` passed every required Quality, Security, CodeQL, Vercel and
path-gated Neon check before merging at `ea97ea4`. Post-merge staging run
[`30203830963`](https://github.com/shapewebs/shapewebs-platform/actions/runs/30203830963)
waited for both fixed deployments, then passed k6 and ZAP. A fresh owner TOTP
step-up published revision 6 with exact `published` status, rendered the exact
public slug, unpublished it as revision 7 with exact `unpublished` status and
returned that public slug to a real `404`. The final synthetic document is
archived, and neither mutation produced a revalidation-pending warning.

Pull requests `#46` through `#51` established the separate Sanity
public-content boundary and corrected its protected Vercel deployment
configuration. Pull request `#52` repaired the supported unpublish action,
webhook-header parsing, and fail-closed ambiguous-command reconciliation.
Pull request `#53` made malformed public slugs return secured `404` responses
and retained ZAP enforcement for all application-controlled responses while
scoping one documented Vercel image-optimizer disposition. All required
quality, security, CodeQL, dependency-review, Vercel, and path-gated Neon
checks passed before protected staging advanced to `0499de5`.

Post-merge run
[`30518895512`](https://github.com/shapewebs/shapewebs-platform/actions/runs/30518895512)
then passed k6 and ZAP. A fresh Google/TOTP employee session completed the real
Sanity unpublish at provider transaction
`385f73fa-8811-47ea-b5c6-8fbd43659502`. Sanity retained the draft, removed the
published document, delivered a signed `blogPost.delete` webhook with `200`,
and Neon stored the successful command, immutable audit event, and durable
receipt. The exact public route returned a secured revalidated `404`. The
synthetic draft was then deleted, its exact asset reference count was verified
as zero, and only then was the 46,586-byte test asset removed. Final raw Sanity
queries returned no matching document, draft, or asset, the public route
remained a cached `404`, and the authenticated employee blog list was empty.
Evidence is recorded in:

- `docs/audits/sanity-content-lifecycle-verification-2026-07-30.md`;
- `docs/audits/foundation-design-readiness-2026-07-30.md`.

Pull request `#54` reconciled that evidence and the current roadmap, passed
every required protected check, and merged into staging at `8b62a0d`. Both
Vercel applications reached `READY` for that exact verified commit.
Post-merge run
[`30521601429`](https://github.com/shapewebs/shapewebs-platform/actions/runs/30521601429)
then required those exact fixed deployments and passed k6, the passive ZAP
baseline, and redacted artifact upload. Production `main` remained unchanged
at `33affde8`.

The first Milestone 6 public-design implementation now lives on
`codex/public-frontface-foundation`. It introduces a static, server-rendered
Shapewebs homepage and dark marketing shell with no new client state,
third-party browser request, image payload, or marketing script. The design
uses CSS-only artwork and preserves Next.js navigation while disabling
unnecessary eager route prefetch. Three production Lighthouse runs score
99/100/100/100 for performance/accessibility/best-practices/SEO, with zero
layout shift, zero third-party requests, 137,102 script bytes and 178,070 total
transfer bytes. Desktop, contact, and opened-mobile-navigation Axe journeys
all pass.

## External launch gates

These are intentionally not guessed or provisioned:

- Workspace mailbox MFA/recovery verification and controlled outbound evidence
  for the additional configured role aliases. External MX delivery, inbox
  filters and the `info@` identity are complete;
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
- a Vercel plan appropriate for commercial production. The Hobby team reached
  its rolling 100-deployment daily allowance while publishing pull request
  `#16`; the exact staging retry was refused before build creation, and no
  production deployment was attempted.

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
configured for the fixed staging admin origin through a temporary
personal-account project; the new Workspace identity still receives an
account-specific Google Cloud Console availability page during Google's
initial organization-provisioning window. Checkly is authenticated locally,
its Gmail alert channel
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
The temporary compatibility Worker was then replaced by the tracked POST-only
implementation. When a later CLI inspection rendered the private heartbeat
token, it was treated as compromised and rotated immediately in both Checkly
and the encrypted Worker binding. The current secret-only Worker deployment
`a428805a-81e2-417c-8cff-359c8f09df3c` serves version
`ed4d707f-9f62-4545-abcb-3e2fd1ccb953` at 100%; a real scheduled success
updated the healthy Checkly monitor at `2026-07-25T22:55:52.701Z` without a
manual ping.
An external Resend MX test also delivered to `admin@shapewebs.com`, all six
role aliases and `lukasthomsen@shapewebs.com`; all eight arrived in the central
Workspace inbox. Production database/auth/email variables remain intentionally
unconfigured for the new path. Pull request `#45` removed the Supabase
prototype and all application references from protected staging; the untouched
production baseline is handled only through the separate production-promotion
plan.

## Next implementation slices

1. Publish the active branch for protected GitHub, Neon and Vercel review.
   Apply migration `0019` to persistent synthetic staging only after its
   pre-migration snapshot and protected disposable lifecycle are green.
2. Configure `admin-staging.shapewebs.com` as the single pre-production account
   surface with canonical staging database URLs, Turnstile hostname/action,
   one Google callback, the Resend worker, cookie behavior and monitoring.
   Rerun the real customer/employee journeys plus k6 and ZAP. Keep
   `admin.shapewebs.com` and all production data untouched until that evidence
   is green.
3. Inventory real project evidence, screenshots, outcomes, testimonials,
   service details, commercial positioning, and approved studio biography.
   Never invent client work to fill the design.
4. Extend the approved public visual system through Work, Case Study, Services,
   Process, About, Contact, Journal, and legal surfaces while keeping published
   website content and public media in Sanity.
5. Keep the retained pre-`0017` Neon rollback branch only until its recorded
   expiry/rollback decision; do not treat it as a production backup.
6. Rehearse accepted-risk expiry checks and the remaining production provider,
   recovery, WAF, alerting, legal, retention, and commercial-plan gates before
   any production promotion.

# Administrative multi-method staging verification — 26 July 2026

## Scope

This evidence covers the protected pull request, disposable Neon lifecycle,
persistent synthetic-staging migration and post-migration operational checks
for one administrative account with Google and verified email/password as
attachable authentication methods. It does not change production or enable
public employee signup.

## Protected pull request

Pull request
[`#38`](https://github.com/shapewebs/shapewebs-platform/pull/38) passed:

- deterministic formatting, linting, strict TypeScript, unit/coverage,
  boundary, dependency, cycle, generated-artifact and vulnerability checks;
- webpack and Turbopack production builds for all three Next.js applications;
- Playwright security/accessibility journeys and the Lighthouse budgets;
- dependency review, OSV and CodeQL;
- both required Vercel previews; and
- the disposable Neon migration, forced-RLS, rollback, byte-identical restore
  and cleanup lifecycle.

The exact GitHub Actions evidence is:

- Quality:
  [`30219176972`](https://github.com/shapewebs/shapewebs-platform/actions/runs/30219176972);
- Security:
  [`30219176930`](https://github.com/shapewebs/shapewebs-platform/actions/runs/30219176930);
  and
- Neon lifecycle:
  [`30219176934`](https://github.com/shapewebs/shapewebs-platform/actions/runs/30219176934).

The pull request squash-merged into protected `staging` at `159d8b9`.
Production remains at the separately controlled baseline.

## Persistent staging migration

Before changing persistent staging, Neon branch
`codex-staging-pre-0015-20260726` (`br-tiny-moon-asz362k2`) captured the exact
pre-migration state. It has no compute and expires automatically on
29 July 2026.

The dedicated direct `shapewebs_migrator` identity then applied migration
`0015_admin-multimethod-auth`. Read-only verification reported:

- 16 entries in `drizzle.__shapewebs_migrations`;
- `auth.auth_email_outbox` present;
- RLS enabled and forced on the new table; and
- only the organization-scoped admin-runtime management policy.

The complete live database-security verifier passed through the distinct
provider-owner, migrator, admin-runtime, portal-runtime, web-runtime and public
reader identities. It covered role flags, mutually isolated administrative and
customer identities, cross-tenant denial, session lifetime/revocation,
single-use TOTP counters, durable administrative auth email, CMS authorization,
public reads, preview grants, lead/outbox behavior, retention, ordered
webhooks, audit immutability and synthetic-fixture cleanup.

## Secret and deployment containment

An independent high-entropy `ADMIN_AUTH_EMAIL_ENCRYPTION_SECRET` is stored only
in:

- macOS Keychain under the staging administrative auth-email service; and
- Vercel Sensitive scope for `shapewebs-admin`, Preview environment, exact Git
  branch `staging`.

It is absent from source, general previews and Production. The first post-merge
deployment correctly remained unavailable because it predated the new secret.
Exact Preview redeployment `dpl_CrUrcGTDtcgm4YF3ASN18Cw4D7t1` then reached
`READY`, retained `admin-staging.shapewebs.com`, and returned the sanitized
response `200 {"status":"ready"}`.

## Post-migration operations

Manual staging-assurance run
[`30219669085`](https://github.com/shapewebs/shapewebs-platform/actions/runs/30219669085)
passed:

- all k6 smoke thresholds;
- the passive ZAP baseline; and
- retention of redacted reports only.

Checkly then reported:

- active, non-muted and non-degraded admin readiness with a fresh successful
  result after the redeployment;
- active, non-muted and non-degraded five-minute outbox heartbeat with a fresh
  scheduled success;
- the staging lead journey currently without errors or failures; and
- no pending or processing lead outbox event.

Both administrative and customer auth-email outboxes were empty before the
manual account-method journey, so there was no inherited failed or stuck work.

## Manual same-account proof still required

The starting administrative identity is exactly:

- verified `admin@shapewebs.com`;
- one Google method;
- no password method;
- one verified local TOTP record; and
- one active owner membership.

The remaining browser evidence must:

1. sign in with Google and complete the existing local TOTP;
2. request password addition from `/account/security`;
3. follow the single-use mailbox link and choose a new user-owned password;
4. confirm the database now has Google and credential methods on the same user;
5. sign out and sign in with that password;
6. prove password login still requires the same local TOTP before access; and
7. sign out and reconfirm Google login still reaches the same owner account.

This proof remains pending because the newly installed ChatGPT Chrome plugin
does not yet have the required ChatGPT Chrome Extension in any Chrome profile.
No weaker or synthetic browser evidence is substituted for the real
same-account journey.

## Production boundary

No production deployment, domain, database, provider secret, mail flow or
customer route changed. Production promotion still requires a separate
explicit decision and the production launch gates in the roadmap.

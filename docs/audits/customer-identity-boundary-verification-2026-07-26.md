# Customer identity boundary verification — 26 July 2026

## Scope

This evidence covers migration `0013_customer-identity-boundary`, its protected
pull-request lifecycle, persistent synthetic-staging application, and the
non-production SQL role required by the isolated customer portal architecture.
It does not enable customer registration, authentication routes, a portal
deployment, production data, or a production credential.

## Implemented boundary

- Administrative Better Auth records remain in `auth`.
- Customer Better Auth records use the separate `customer_auth` schema.
- `staff_memberships` references only `auth.user`.
- `customer_memberships` and `customer_project_memberships` reference only
  `customer_auth.user`.
- `shapewebs_admin_runtime` has no access to `customer_auth`.
- `shapewebs_portal_runtime` has no access to administrative auth, staff
  memberships, CMS drafts, or audit records.
- Customer project reads require an active current-organization membership and
  an exact project assignment. Only customer-visible updates are readable.

The migration refuses to run if it finds a legacy customer membership or
project assignment in the administrative identity model. Shapewebs has never
launched customer identity, and read-only preflight queries found zero such
rows on both non-production `main` and persistent `staging`.

## Role provisioning

[Neon documents](https://neon.com/docs/reference/compatibility) that roles
created through its Console, CLI, or API receive `neon_superuser`, so
`shapewebs_portal_runtime` was created through SQL with a high-entropy
password. Both non-production branches report:

- `NOSUPERUSER`;
- `NOCREATEROLE`;
- `NOCREATEDB`;
- `NOINHERIT`;
- `NOREPLICATION`;
- `NOBYPASSRLS`; and
- no membership in `neon_superuser`.

The credential is stored only in the macOS Keychain and the protected GitHub
`neon-nonproduction` environment. CI derives each disposable branch hostname
from a control-plane-managed non-owner connection and injects the independent
SQL-role credential; it never promotes the portal role through Neon’s control
plane.

## Disposable lifecycle evidence

The complete lifecycle created fresh source and restore branches and databases,
then:

1. applied migrations `0000` through `0013`;
2. loaded deterministic synthetic staff and customer identities;
3. passed 15 real repository/content scenarios;
4. verified all five runtime/migration roles are non-superuser and do not
   bypass RLS;
5. proved the admin role cannot simulate customer access;
6. proved the portal role cannot simulate owner/editor access;
7. proved own-tenant assignment and visible-update reads;
8. denied unassigned, hidden, wrong-tenant, staff-auth, CMS, and mutation
   access;
9. proved membership suspension immediately removes project access;
10. verified failed-migration rollback left no object or journal residue; and
11. exported and restored byte-identical fixture data.

The fixture SHA-256 was
`b091129fc9c4110bda29e8b7d2bebeaf2e90bb0f4d5d502ebcdac41c16c0abb4`.
Both lifecycle branches and the diagnostic branch were deleted after the run.

## Protected and persistent staging evidence

Pull request
[`#33`](https://github.com/shapewebs/shapewebs-platform/pull/33) reproduced the
complete disposable lifecycle in GitHub Actions run
[`30206445840`](https://github.com/shapewebs/shapewebs-platform/actions/runs/30206445840)
through the protected `neon-nonproduction` environment. Quality, dependency
review, OSV, CodeQL, both Vercel previews, the disposable lifecycle, and its
required gate all passed before the pull request was squash-merged into
protected `staging` at `b8f9750`.

Before changing persistent synthetic staging, Neon branch
`codex-staging-pre-0013-20260726` (`br-noisy-shape-as6lw1xi`) captured the exact
pre-migration state and was given an automatic 28 July 2026 expiry. The
dedicated direct migrator then applied migration `0013`. Read-only verification
reported:

- 14 entries in `drizzle.__shapewebs_migrations`;
- `customer_auth.user`, `app.staff_memberships`,
  `app.customer_memberships`, and `app.customer_project_memberships` present;
- RLS enabled and forced on all three membership tables; and
- the complete security suite passing through the distinct owner, migrator,
  admin, portal, web, and public identities.

Both fixed staging deployments reached `READY`. Post-merge staging reliability
run
[`30206702702`](https://github.com/shapewebs/shapewebs-platform/actions/runs/30206702702)
passed its k6 smoke thresholds and passive ZAP baseline.

## Remaining gates

- Customer-facing routes remain unavailable until invitation, verification,
  password, Google linking, durable auth email, abuse controls, and recovery
  tests pass.
- Production remains untouched.

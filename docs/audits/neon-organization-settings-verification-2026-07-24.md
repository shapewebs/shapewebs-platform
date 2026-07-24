# Neon organization settings verification — 24 July 2026

## Scope

This record covers the first self-contained replacement of a transitional
Supabase-backed admin settings path. It does not authorize production
promotion, remove the remaining CMS Supabase paths, or apply the new migration
to a production database.

## Implemented boundary

- Migration `0007_organization-settings` creates one typed settings aggregate
  per organization. Follow-up migration `0008_organization-settings-backfill`
  handles existing organizations through transaction-scoped source SELECT,
  destination SELECT, and destination INSERT migrator policies that are
  dropped before commit. Destination SELECT is required by PostgreSQL's
  idempotent `ON CONFLICT` path.
- Existing non-production organizations receive deterministic defaults during
  migration; newly provisioned owner sessions create the same defaults
  idempotently. The authorization suite repeats the exact temporary-policy
  backfill pattern and proves the policy does not survive its transaction.
- All settings JSON is parsed through a strict shared schema before the admin
  page receives it. The schema bounds collection and field sizes, accepts only
  supported locales and normalized keys, requires exactly one default locale,
  rejects duplicate identifiers, and requires every region profile to
  reference an existing consent rule set.
- The repository accepts a server-created `AdminAuthorizationContext`, rejects
  non-owner roles before querying, sets organization, actor and membership role
  transaction-locally, and returns only the five settings collections.
- The Settings Server Component re-authorizes for the owner role and fails
  closed when database or authorization context is absent outside explicit
  local setup mode.
- Row-level security is enabled and forced. Only
  `shapewebs_admin_runtime` receives table privileges; public and web roles
  receive none.
- The transitional Supabase allowlist now contains only the remaining CMS
  paths.

## Verification

Local verification passed:

- package and admin TypeScript checks;
- all 77 unit tests, including malformed settings, duplicate-key, dangling
  consent-reference and default-locale cases;
- zero-warning ESLint;
- application client/server boundary checks; and
- Drizzle schema and migration consistency; and
- Next.js 16.2.11 admin production builds with both Turbopack and webpack.

The complete disposable Neon lifecycle passed against the authenticated
Frankfurt non-production project:

1. Created an expiring source branch and fresh database.
2. Applied migrations `0000` through `0008`.
3. Seeded and verified deterministic lifecycle fixture version 2.
4. Proved forced-RLS coverage and positive owner access.
5. Proved editor, customer, cross-organization, public and web denial.
6. Proved a failed migration transaction left no schema, table or journal
   residue.
7. Exported the synthetic fixture, restored it into a second fresh database,
   and reran the complete authorization suite.
8. Compared source and restored exports byte-for-byte.
9. Deleted both disposable branches.

The source and restored fixture hash was:

`0ff6f8cb3fba6c66d6b760ebf08e5db858ee50863398789fbfe58ef815d7eaa6`

## Persistent staging verification

Migration `0007` was applied first with the dedicated direct migrator. The
post-migration check correctly used the RLS-bypassing provider owner to inspect
backfill completeness and found that the forced-RLS migrator could not see
pre-existing organizations. Rollback-only probes then proved that PostgreSQL's
`ON CONFLICT` path also requires destination SELECT visibility.

Migration `0008` was added instead of rewriting the already applied migration.
It performs the idempotent backfill with three transaction-scoped policies:
source SELECT, destination SELECT, and destination INSERT. The authorization
suite repeats this exact pattern and proves all three policies are removed.

After the corrected disposable lifecycle passed, `0008` was applied to the
persistent non-production `staging` branch. Independent verification proved:

- nine migration journal entries;
- forced RLS on `app.organization_settings`;
- one organization and one matching settings row;
- one owner-visible row and zero editor-visible rows through the pooled admin
  runtime;
- no SELECT privilege for web or public roles; and
- zero residual temporary backfill policies.

## Remaining gate

The updated commit must pass the protected GitHub, disposable Neon and Vercel
checks before merge and deployed-route acceptance. Production remains
untouched.

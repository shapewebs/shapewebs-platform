# Neon organization settings verification — 24 July 2026

## Scope

This record covers the first self-contained replacement of a transitional
Supabase-backed admin settings path. It does not authorize production
promotion, remove the remaining CMS Supabase paths, or apply the new migration
to a production database.

## Implemented boundary

- Migration `0007_organization-settings` creates one typed settings aggregate
  per organization.
- Existing non-production organizations receive deterministic defaults during
  migration; newly provisioned owner sessions create the same defaults
  idempotently.
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
2. Applied migrations `0000` through `0007`.
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

## Remaining staging gate

The branch must pass the protected GitHub, disposable Neon and Vercel checks.
After review, migration `0007` must be applied with the dedicated migrator to
the persistent staging database before the deployed owner-only Settings route
is accepted. Production remains untouched.

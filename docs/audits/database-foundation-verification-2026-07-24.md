# Database foundation verification — 24 July 2026

## Scope

This verification covers the clean Better Auth, Neon, and Drizzle foundation
on `codex/foundation`. It does not authorize a production deployment or remove
the transitional Supabase implementation.

## Provider state

- GitHub CLI is authenticated as `lukasthomsen` with `repo`, `workflow`, and
  `read:org` access. The account has admin permission on
  `shapewebs/shapewebs-platform`.
- Neon CLI 2.36.0 is authenticated. The Shapewebs organization contains the
  Frankfurt `shapewebs-platform` project, currently classified as
  non-production.
- Vercel CLI 56.5.0 is authenticated to the Shapewebs team.
- `apps/web` is linked to `shapewebs-web`.
- `apps/admin` is linked to `shapewebs-admin`.

## Database state

The clean `main` branch of the non-production Neon project contains:

- four journaled Drizzle migrations;
- six Better Auth tables in `auth`;
- nine application tables in `app`;
- one append-only event table in `audit`;
- a Drizzle migration journal in `drizzle`.

Every application, auth, and audit table is owned by
`shapewebs_migrator`. Runtime roles own no schema objects.

The SQL-created roles are:

| Role                      | Login | Create DB | Create role | Bypass RLS | `neon_superuser` |
| ------------------------- | ----: | --------: | ----------: | ---------: | ---------------: |
| `shapewebs_migrator`      |   yes |        no |          no |         no |               no |
| `shapewebs_admin_runtime` |   yes |        no |          no |         no |               no |
| `shapewebs_web_runtime`   |   yes |        no |          no |         no |               no |
| `shapewebs_public_reader` |   yes |        no |          no |         no |               no |

The provider-managed `shapewebs_owner` remains the break-glass role and is not
stored in either Vercel project.

## Authorization evidence

`db:verify-security` creates uniquely named synthetic rows, executes positive
and negative checks through the real role credentials, and removes only those
rows in a `finally` cleanup.

The passing test proves:

- RLS is enabled and forced on all `app` and `audit` tables;
- runtime and migration roles do not inherit provider admin privileges;
- owner/editor reads cannot cross the configured organization;
- customers see only assigned projects and customer-visible updates;
- customers cannot read CMS drafts or other membership records;
- public and web roles read only published content;
- the web role can insert a lead only for its transaction-scoped organization;
- public auth-schema reads and public lead writes are denied;
- the web role cannot read submitted leads;
- audit events can be inserted and read by an owner context but cannot be
  updated.

Both Vercel Development connection probes report `row_security=on` and the
expected `shapewebs_admin_runtime` or `shapewebs_web_runtime` identity.

## Repository gates

The following passed after a frozen pnpm 10.17.1 install:

- Prettier;
- zero-warning ESLint;
- markdownlint;
- TypeScript across the workspace;
- 15 unit tests with the configured coverage thresholds;
- client/server boundary checks;
- Knip dependency ownership and cycle checks;
- Drizzle migration consistency;
- deterministic Better Auth schema regeneration;
- `pnpm audit` with no known vulnerabilities;
- webpack production builds for both applications;
- Turbopack production builds for both applications;
- nine Playwright browser, accessibility, and security tests;
- the three-run Lighthouse CI budget.

The latest Lighthouse median was:

| Metric         |  Result |
| -------------- | ------: |
| Performance    |      97 |
| Accessibility  |     100 |
| Best Practices |     100 |
| SEO            |     100 |
| LCP            | 2336 ms |
| TBT            |   76 ms |
| CLS            |       0 |

## Environment boundary

Development contains only:

- admin runtime `DATABASE_URL` in `shapewebs-admin`;
- web runtime `DATABASE_URL` in `shapewebs-web`;
- a development Better Auth secret and localhost origin in
  `shapewebs-admin`.

Preview and Production do not contain the new Neon or Better Auth variables.
The migration and owner credentials are absent from both Vercel projects.

## Remaining release gates

- create and test an ephemeral non-production Neon preview branch;
- prove backup and restore with synthetic data;
- mount Better Auth in `apps/admin`;
- configure the Google OAuth client and fixed callback URLs;
- implement the explicit admin allowlist/bootstrap and OAuth-to-TOTP step-up;
- provision the separate production Neon project only after the above passes;
- remove Supabase only after the replacement is verified end to end.

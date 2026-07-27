# Supabase retirement verification — 27 July 2026

## Scope

This evidence covers removal of the unused Supabase prototype after every
verified runtime path moved to the reviewed Neon/Drizzle repositories. It does
not alter any provider account, database, staging deployment, or production
resource by itself.

## Preconditions

A repository-wide consumer audit found:

- no application, worker, test runtime, or current package imports
  `@shapewebs/db`;
- no application or worker imports a Supabase SDK;
- public reads, lead submission, outbox delivery, organization settings,
  administrative and customer authentication, CMS reads/mutations,
  preview/publish/rollback, and private media all use
  `@shapewebs/database`;
- migrations `0000` through `0016` and the complete forced-RLS suite have
  passed disposable and persistent Neon verification; and
- Git history remains the recoverable archive of the prototype.

## Removed surface

- the complete unused `packages/db` workspace;
- the historical local `supabase/` stack, migrations, seeds, and smoke test;
- root Supabase CLI commands;
- `@supabase/ssr`, `@supabase/supabase-js`, and their transitive dependency
  graph from the lockfile; and
- obsolete client-boundary exceptions for the transitional package.

The boundary checker now directly rejects every
`@shapewebs/database` import from a client graph. `AGENTS.md`, the README, and
the active platform architecture document name `packages/database` and
`drizzle/` as the only current database implementation and migration sources.

## Verification

- Frozen `pnpm` installation: passed with the reduced lockfile.
- Canonical `pnpm verify`: passed.
- Unit tests: 199 passed.
- Coverage: 95.71% statements, 93.58% branches, 92.06% functions, and
  95.66% lines.
- Client/server boundary checks: passed for all 12 client entries.
- Knip dependency and cycle checks: passed.
- Drizzle generation and schema checks: passed.
- Dependency audit: zero known vulnerabilities.
- Turbopack production builds: public, admin, and portal passed.
- Webpack production builds: public, admin, and portal passed.
- Native Sharp/libvips deployment-artifact check: passed.
- Current source/dependency scan: no Supabase SDK, package, command, or runtime
  reference remains. Historical audit and plan documents retain their
  contemporaneous references.

The removal is version controlled and can be recovered from Git history. No
credential or environment file was removed.

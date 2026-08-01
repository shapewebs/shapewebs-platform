# Unified account identity verification — 1 August 2026

## Scope

This evidence covers migration `0019_unified-account-identity` and its
disposable Neon rehearsal. It verifies the database transition from separate
staff and customer Better Auth stores to one canonical account identity in
`auth`, while retaining separate staff/customer authorization contexts and
least-privilege runtime roles. Persistent staging and production were not
changed.

## Successful migration path

The lifecycle created a fresh disposable branch and database, applied
migrations `0000` through `0018`, and seeded representative synthetic records:

- an existing canonical account with a credential method;
- a matching verified legacy customer identity with Google;
- a customer-only credential account;
- organization and project memberships;
- an invitation and project assignment;
- active legacy sessions; and
- terminal legacy authentication-email evidence.

Migration `0019` then:

1. merged provider methods into the canonical identity;
2. preserved customer-only identities;
3. remapped memberships, invitations, and project assignments;
4. copied terminal email evidence into the canonical outbox;
5. revoked legacy sessions instead of attempting unsafe session conversion;
6. established the canonical customer-session security table; and
7. left the legacy schema available only as a transitional rollback/parity
   source.

The complete database security suite passed after the migration. It proved one
canonical identity store, mutually isolated admin/customer runtimes, forced
RLS, exact customer project authorization, cross-tenant denial, staff role and
TOTP enforcement, durable account email, CMS/media isolation, preview-token
controls, idempotent lead/outbox behavior, webhook ordering, and audit
immutability.

## Fail-closed conflict path

A second disposable database was prepared through migration `0018` with a
verified canonical user and an unverified legacy customer user sharing the
same normalized email. The `0019` preflight rejected the migration with its
explicit `unverified cross-realm email collision` guard before schema changes.

Independent post-failure checks proved:

- `0019` was not recorded in the Drizzle journal;
- no canonical identity-map or customer-session table was created;
- enum values remained on the pre-unification definition;
- both conflicting source identities remained unchanged; and
- the transaction left no partial migration state.

## Full lifecycle and cleanup

The ordinary fresh-schema path then passed deterministic synthetic fixtures,
22 database integration tests, the full authorization suite, failed-migration
rollback, logical export, fresh restore, and byte-identical re-export. The
fixture SHA-256 was
`629193a9f68dc04c7232d9962a967ddad41ee2be457a3af191271c6cb3284b32`.

All four disposable branches—identity success, identity conflict, lifecycle
source, and lifecycle restore—were deleted after the successful run.

## Repository and browser assurance

After the account applications were consolidated, the current branch passed:

- canonical `pnpm verify`, including 229 unit tests, 95.23% function coverage,
  lint, strict TypeScript, dependency/cycle analysis, audit, client/server
  boundary enforcement and deterministic Better Auth/Drizzle generation;
- the 404 globally unique class-name contracts across 105 CSS Modules and the
  visual-foundation contract;
- both Next.js 16 Turbopack and webpack production builds for the public and
  unified authenticated applications;
- the Cloudflare Worker dry-run, Sanity Studio production build and Linux media
  runtime-artifact verification;
- all 32 Playwright interaction, fail-closed security, responsive-layout and
  automated WCAG A/AA scenarios; and
- three Lighthouse runs against the production build plus the 253-control ASVS
  launch gate.

The exact staging-only k6 and ZAP checks remain pending until the reviewed
commit has deployed to the allowlisted fixed staging origins. Their credentials
are intentionally unavailable to an ordinary local shell.

## Remaining gates

- Run the same lifecycle in protected GitHub Actions with the renamed customer
  runtime secret.
- Apply `0019` to persistent synthetic staging only after a reviewed pull
  request and a pre-migration snapshot.
- Verify the fixed `admin-staging.shapewebs.com` deployment against the shared
  Google callback, customer database, Turnstile, and recovery flow before the
  canonical production origin moves to `admin.shapewebs.com`.
- Keep production unchanged until staging migration, rollback, monitoring, and
  full release verification are green.

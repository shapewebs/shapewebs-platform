# ADR 0001: preserve the monorepo, rebuild the weak layers

- Status: accepted
- Date: 23 July 2026
- Decision owners: Shapewebs

## Context

Vercel shows that production deploys from
`shapewebs/shapewebs-platform`, not `shapewebs/shapewebs`. The live repository
already has the correct split between `apps/web` and `apps/admin`, shared
packages, strict TypeScript, and working default production builds.

It is not production-ready: there are no tests or CI, lint fails, the lockfile
has high-severity findings, the homepage is empty, public routes render
dynamically, the CSP is weak, privileged secrets are duplicated across
projects, and the unverified Supabase grant model has an anonymous
`SECURITY DEFINER` risk.

## Decision

Keep `shapewebs/shapewebs-platform` and its two-application monorepo as the
foundation. Do not start a third implementation and do not merge the legacy
prototype into it.

On a new `codex/foundation` branch:

1. repair and install quality/security gates;
2. upgrade to verified patched exact dependencies;
3. remove unused scaffolded UI and placeholder routes;
4. replace Supabase with Neon, Drizzle, and self-hosted Better Auth;
5. enforce Google login plus server-side TOTP step-up for admin access;
6. restore static, cacheable public rendering;
7. design the public pages from a blank composition while preserving reviewed
   brand assets and a small set of proven primitives.

Continue to use the existing Vercel projects:

- `shapewebs-web` → `apps/web` → `shapewebs.com`;
- `shapewebs-admin` → `apps/admin` → `admin.shapewebs.com`.

The internal Vercel/admin naming can be revisited when the customer portal
ships. A rename does not improve Phase 0 security or performance.

## Why this boundary

A complete repository rewrite would discard useful structure and repeat work.
An in-place Supabase-to-Neon substitution would preserve untested repositories,
fallback behavior, excess UI, and unsafe boundaries. The selected approach
keeps only the parts already aligned with the desired architecture.

## Consequences

Benefits:

- no risky Vercel root/domain cutover is needed;
- production can stay on commit `33affde` until the branch is ready;
- the public/admin isolation is retained;
- auth and database behavior can be reintroduced behind tests;
- the new visual work begins without inherited page composition.

Costs:

- the database/auth layer is intentionally rewritten;
- the existing CMS placeholder screens may temporarily shrink before they grow;
- secrets and OAuth configuration require a controlled rotation;
- the large UI package must be reviewed and pruned.

## Rollback

Do not mutate the current production deployment while Phase 0 is under
construction. Record the two current deployment IDs and keep Vercel Instant
Rollback available. Database migration is additive until the Better Auth/Neon
path is verified; production Supabase credentials are removed only after the
new deployment no longer reads them.

## Revisit conditions

Revisit the two-app boundary only if measured operating cost outweighs its
security/performance value. Revisit self-hosted Better Auth only if a managed
alternative can preserve custom OAuth step-up, database ownership, and tested
authorization.

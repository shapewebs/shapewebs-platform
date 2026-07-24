# Shapewebs current-state audit

- Audit date: 23 July 2026
- Production: `shapewebs.com` and `admin.shapewebs.com`
- Live repository: `shapewebs/shapewebs-platform`
- Legacy repository: `shapewebs/shapewebs`
- Decision supported: preserve the live monorepo structure; rebuild the public
  page design and replace the auth/data layer cleanly

## The most important finding

The production website is not deployed from the repository originally
identified as current.

Vercel proves that both live applications deploy from
`shapewebs/shapewebs-platform` at commit
`33affde883340d9db1d53d89ffd0c49d73fb531f`:

- `shapewebs-web` uses root `apps/web` and serves `shapewebs.com`;
- `shapewebs-admin` uses root `apps/admin` and serves
  `admin.shapewebs.com`.

The separate Vercel project named `shapewebs.com` is connected to
`shapewebs/shapewebs` and has no production deployment. No Vercel project named
`shapewebs-accounts` exists in the Shapewebs team.

Implementation should therefore continue in `shapewebs/shapewebs-platform`.
The legacy repository should remain untouched until its purpose is confirmed,
then be archived rather than merged into the live codebase.

## What is worth preserving

The live repository is materially better than the legacy prototype. It already
has:

- a pnpm/Turborepo monorepo with one lockfile;
- separate `apps/web` and `apps/admin` applications;
- shared packages for config, content schemas, data, i18n, observability, UI,
  and validation;
- exact Next.js and React versions;
- strict TypeScript;
- Server Components by default, with only eight explicit client components;
- centralized security headers;
- structured CMS content types and database migrations;
- Vercel roots already mapped correctly;
- valid production domains and protected preview deployments.

Both applications pass strict TypeScript and their default Next.js/Turbopack
production builds. The web app also builds with webpack. This structure should
not be thrown away.

## What must be corrected before feature work

| Signal                    | Observed state                                         |
| ------------------------- | ------------------------------------------------------ |
| Tracked files             | 335                                                    |
| App/package source        | about 15,000 TypeScript/TSX/CSS lines                  |
| Tests                     | 0                                                      |
| GitHub Actions workflows  | 0                                                      |
| ESLint                    | 35 errors                                              |
| Known dependency findings | 15 high, 11 moderate, 3 low                            |
| Public homepage           | HTTP 200 with an empty `<main>`                        |
| Public rendering          | homepage and most content routes are dynamic           |
| Database test file        | comments describing future tests, not executable tests |
| Generic UI inventory      | mostly scaffolded, unstyled, and unused                |

### Code and delivery risks

- There are no automated unit, browser, accessibility, database, security, or
  performance gates.
- There are no GitHub Actions workflows or Vercel Deployment Checks.
- The lockfile pins Next.js 16.2.2 and other currently vulnerable transitive
  versions. Dependabot preview branches exist, but none is merged.
- ESLint reports one React performance error and 34 explicit-`any` errors in
  the database layer.
- The admin app's webpack build pulls `node:crypto` into a client import path
  through the `@shapewebs/db` barrel. Turbopack happens to build it, but the
  server/client boundary is not robust.
- The public homepage returns `null` when no CMS homepage is available. This is
  the current empty production homepage.
- Public content reads call `cookies()` and `draftMode()` on the normal
  published path, which makes the marketing routes dynamic and prevents the
  intended static/CDN-first architecture.
- Production fallback/setup modes fail open at the presentation layer when
  environment configuration is absent. Non-development deployments should fail
  closed.
- The CSP allows `unsafe-inline`, `unsafe-eval`, and all HTTPS image origins.
- The component registry marks most of its large UI inventory as merely
  `scaffolded`. Keeping unused component source works against the requested
  clean tree.

### Database and authorization risks

The current Supabase migration has not been executed and verified against a
real environment according to `PROJECT_STATUS.md`.

More importantly, it grants all routines in the exposed `cms` and `ops`
schemas to `anon`. `ops.append_audit_log` is a `SECURITY DEFINER` function with
no explicit authorization check, so the current grant model can allow anonymous
audit-log injection. The existing “RLS smoke test” is only a list of notes and
does not detect this.

The public and admin Vercel projects both contain a
`SUPABASE_SERVICE_ROLE_KEY`. Vercel flags it and the preview/revalidation
secrets as “Needs Attention” because they were not saved as Sensitive values.
Secret values were not read during this audit.

These findings support replacing the unverified Supabase layer with the agreed
Better Auth + Neon + Drizzle design rather than porting the current repository
methods line by line.

## Vercel inventory

### `shapewebs-web`

- Project ID: `prj_Q3SWdJbOHdFMD2XVilRimbey35A1`
- Git: `shapewebs/shapewebs-platform`, production branch `main`
- Root: `apps/web`
- Framework: Next.js, no command/output overrides
- Node: 24.x
- Domains:
  - `shapewebs.com` — production
  - `www.shapewebs.com` — valid 307 redirect to apex
- Production deployment:
  - status Ready
  - created 8 April 2026
  - commit `33affde`
- Function region: `iad1` (Washington, D.C.)
- Fluid Compute: enabled
- Preview protection: Vercel Authentication, Standard Protection
- Skip unaffected deployments: disabled
- Web Analytics and Speed Insights: not enabled in the project checklist
- Last known-good deployment ID: `5SeEqJg8ZpX6p2E1THZHaPjzdfvf`

### `shapewebs-admin`

- Project ID: `prj_WhzBzZorQbDCKHUqlMEGAutOPqbh`
- Git: `shapewebs/shapewebs-platform`, production branch `main`
- Root: `apps/admin`
- Framework: Next.js, no command/output overrides
- Node: 24.x
- Domain: `admin.shapewebs.com` — valid production configuration
- Production deployment:
  - status Ready
  - created 8 April 2026
  - commit `33affde`
- Function region: `iad1` (Washington, D.C.)
- Fluid Compute: enabled
- Preview protection: Vercel Authentication, Standard Protection
- Skip unaffected deployments: disabled
- Web Analytics and Speed Insights: not enabled in the project checklist
- Last known-good deployment ID: `121m91hxgDGQeeqELJt5JMpd8sQV`

The Shapewebs team is currently on Vercel Hobby. Standard Protection is
available and already active, but paid-plan-only controls must not be treated as
Phase 0 prerequisites without an explicit cost decision.

### Current variable names

Both projects contain the same environment-variable set:

- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_ADMIN_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `PREVIEW_TOKEN_SECRET`
- `REVALIDATION_WEBHOOK_SECRET`

There are separate Production and Preview rows for the Supabase variables.
The public project should not inherit privileged admin/database secrets by
default. Phase 0 replaces this with project-specific, least-privilege variables
and rotates every superseded secret.

## Design decision

The current production “design” is only a polished header/footer shell around an
empty homepage. Its navigation and footer read like a broad software product,
not a focused web-design studio.

Preserve after review:

- the Shapewebs name, logo mark, wordmark, favicon set, and OG source;
- the light/dark visual concept;
- the positioning line “Beautiful, fast websites built with intention”;
- useful low-level styled primitives such as buttons, links, and the spinner;
- the two-application monorepo boundary.

Redesign or replace:

- homepage and all public page composition;
- product-style navigation/footer taxonomy;
- Supabase clients, repositories, auth pages, migrations, and fallback modes;
- unused/scaffolded UI inventory;
- CMS pages that exist only as placeholders;
- public dynamic content access that prevents durable caching.

The result is not a total repository rewrite. It is a controlled foundation
refactor plus a fresh public-site design.

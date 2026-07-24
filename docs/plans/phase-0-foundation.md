# Phase 0: harden and migrate the live foundation

- Status: in progress; local foundation and non-production database verified
- Repository: `shapewebs/shapewebs-platform`
- Branch: `codex/foundation`
- Production baseline: commit `33affde`
- Goal: produce a secure, testable Better Auth + Neon foundation without
  changing production

## Outcome

At Phase 0 exit:

- the existing `apps/web` and `apps/admin` applications still deploy
  independently;
- the public app is static-first and renders a real minimal homepage;
- every strict correctness, dependency, authorization, accessibility,
  performance, and production-build gate passes;
- Google login and a required admin TOTP step-up protect the admin app;
- Neon runtime and migration roles are separated and tested;
- previews use isolated, non-production data;
- the two current Vercel production deployments remain available as rollback.

## Pull request 1 — repair the baseline

Create `codex/foundation` from `shapewebs-platform/main`.

Do first:

1. upgrade Next.js and all affected transitive packages to verified patched
   exact versions;
2. make `pnpm install --frozen-lockfile` deterministic in local and CI
   environments;
3. fix all 35 ESLint errors;
4. separate client-safe and server-only exports so no `node:*` module can enter
   a client graph;
5. keep both default Next.js production builds and add a webpack build as a
   boundary check where useful;
6. fail non-development deployments closed when required configuration is
   missing;
7. remove `/readme` and other placeholder/public product routes or return a
   real 404/redirect;
8. render a semantic, static maintenance-quality homepage instead of returning
   `null`.

Do not add features in this pull request.

Exit evidence:

- frozen install succeeds;
- lint and strict typecheck have zero errors;
- both apps build;
- the public homepage contains an H1 and primary call to action;
- the production dependency audit has no unaccepted high or critical finding.

## Pull request 2 — add gates before migration

Add root tasks and configuration:

- `format:check`: Prettier;
- `lint`: ESLint flat config with Next.js, TypeScript, accessibility, and
  security rules;
- `typecheck`: strict TypeScript;
- `test`: Vitest;
- `test:e2e`: Playwright;
- `test:a11y`: axe assertions in Playwright;
- `test:headers`: CSP and security-header assertions;
- `test:db`: disposable-database authorization tests;
- `check:deps`: Knip and dependency-boundary/cycle checks;
- `audit`: OSV-Scanner with a reviewed allow-list mechanism;
- `build`: both affected application builds.

Add GitHub Actions:

- frozen install, format, lint, type, unit, database, and build checks on every
  pull request;
- CodeQL and OSV scanning;
- Playwright critical paths against protected previews using a dedicated
  Protection Bypass for Automation secret;
- three Lighthouse CI runs with the median enforced;
- scheduled ZAP Baseline and k6 tests against controlled staging only;
- full-SHA-pinned third-party actions plus `zizmor` workflow scanning.

Add branch protection for `main` and require these checks. Connect the required
checks to Vercel promotion when the current plan supports Deployment Checks.

Initial public budgets:

- Lighthouse performance at least 95;
- accessibility, best practices, and SEO at 100;
- LCP at most 2.5 s, TBT at most 150 ms, CLS at most 0.05;
- homepage script transfer at most 165,000 bytes, calibrated and governed by
  ADR 0002;
- homepage total transfer at most 210,000 bytes;
- no new third-party origin without an ADR.

Exit evidence: the intentionally small baseline is green in a real pull
request. Thresholds are not reduced to make a failure pass.

## Pull request 3 — prune and clarify the tree

Keep the current top-level structure:

```text
apps/
  web/
  admin/
packages/
  auth/
  config/
  content-schema/
  database/
  design-tokens/
  observability/
  ui/
  validation/
tests/
  e2e/
  load/
  security/
docs/
drizzle/
.github/workflows/
```

Actions:

1. rename/refactor `packages/db` into an explicit server-first database package;
2. add a separate `packages/auth`;
3. create the committed Drizzle schema/migration location, but retain the
   Supabase path until the replacement is verified;
4. keep locale support only if Danish is a near-term business requirement;
5. keep styled, used UI primitives; delete scaffolded components with no
   concrete consumer;
6. remove absolute paths and stale/contradictory setup documentation;
7. enforce package boundaries and circular-dependency checks;
8. add `server-only` guards to privileged modules and narrow barrel exports.

Git history is the archive. Do not create a runtime `legacy/` directory.

Exit evidence: Knip and boundary checks pass, and every remaining package has a
documented consumer.

## Pull request 4 — establish Neon and Drizzle

1. Provision one Neon project in an EU region near the selected Vercel region.
2. Connect Neon to both Vercel projects only where needed and enable isolated
   preview branches.
3. Create separate credentials:
   - `DATABASE_URL`: non-owner runtime role without `BYPASSRLS`;
   - `DATABASE_MIGRATION_URL`: protected migrator, available only to migration
     jobs.
4. Define version-controlled Drizzle schemas for:
   - Better Auth identity/session data;
   - structured public content and immutable revisions;
   - leads/contact submissions;
   - audit events;
   - future organizations, memberships, projects, updates, and files.
5. Apply generated, reviewed SQL migrations through a controlled migration
   job, never application startup.
6. Add deterministic synthetic seed data.
7. Test positive and negative access for anonymous, owner, editor, and customer
   personas.
8. Prove backup and restore on non-production data.

Do not port the current Supabase `grant all` model. No generic PostgREST/Data API
is exposed. Public content uses a narrowly granted read path, and privileged
application queries use a non-owner role.

Exit evidence: a preview branch can be created, migrated, tested, and removed
without touching production.

## Pull request 5 — implement the smallest secure Better Auth slice

Inside `apps/admin` and `packages/auth`:

1. mount Better Auth at `/api/auth/[...all]`;
2. use the Drizzle adapter and Neon runtime connection;
3. add Google OAuth with exact production and fixed-staging callback URLs;
4. keep public customer sign-up disabled until portal onboarding exists;
5. bootstrap the owner through an explicit allow-list/out-of-band migration;
6. configure TOTP for the passwordless Google account and add a custom
   server-side step-up gate for Google sessions;
7. redirect owner/editor to `/dashboard`; deny unassigned users;
8. authorize again inside every Route Handler and Server Action;
9. add rate limits, secure host-only cookies, trusted-origin checks, session
   rotation/revocation, and append-only audit events;
10. remove all Supabase clients, keys, fallback modes, migrations, and
    dependencies after the new path is verified.

Better Auth does not apply its default 2FA gate to social sign-in. The custom
Google-to-TOTP step-up is therefore a release-blocking requirement, not a later
enhancement.

Required negative tests:

- anonymous users cannot read admin data;
- unassigned Google users cannot grant themselves a role;
- a Google owner session without TOTP step-up cannot enter or mutate admin;
- step-up expires and is revoked with the session;
- editor cannot change owner/security settings;
- cross-tenant customer access fails in application and database layers.

Exit evidence: Google login reaches a minimal protected dashboard only after
the required second factor.

## Pull request 6 — restore static public delivery

Separate published reads from preview/session reads:

- published routes never call `cookies()` or `draftMode()`;
- stable marketing pages are static or tag-revalidated;
- draft preview uses a separate authenticated path;
- no Better Auth client or session cookie reaches `apps/web`;
- public assets use `next/image`, local fonts, explicit sizes, and minimal
  origins;
- a publish action performs authorized, idempotent revalidation.

Tighten the site CSP. Remove `unsafe-eval`; avoid a broad `https:` image source;
document any temporary inline-script exception. Test every security header.

Exit evidence: the homepage and initial marketing shell are cached/static,
preview content never enters public caches, and the Lighthouse/bundle budgets
pass.

## Vercel changes after the code is ready

The existing project roots and domains are already correct, so do not create
replacement projects.

For both `shapewebs-web` and `shapewebs-admin`:

1. enable skip-unaffected-project deployments;
2. retain Standard Protection for preview deployments;
3. keep Node 24.x;
4. move functions from `iad1` to the measured nearest EU region, aligned with
   Neon;
5. replace duplicated environment variables with project-specific variables;
6. save every secret as a Vercel Sensitive value;
7. rotate and remove all superseded Supabase, preview, and revalidation
   secrets;
8. connect Speed Insights and Web Analytics after privacy/consent validation;
9. enable protected sourcemaps if client sourcemaps are deployed;
10. record the two current deployment IDs and test Instant Rollback.

Do not expose the public web project to the migration credential, Better Auth
secret, Google client secret, or private Blob store.

## Public visual work after Phase 0

Start public page composition from a blank canvas, not from the current empty
CMS renderer. Preserve the logo/wordmark and evaluate the existing header,
footer, button, link, and spinner as references.

Before visual implementation, decide:

- ideal client and minimum project size;
- English, Danish, or bilingual launch;
- personal studio voice (“I”) or agency voice (“we”);
- real case studies, testimonials, and measured outcomes;
- exact launch services.

Create three comparable visual directions only after the technical baseline is
green. The selected direction then becomes Phase 1.

## Phase 0 completion checklist

- [ ] Work occurs in `shapewebs/shapewebs-platform` on `codex/foundation`.
- [ ] Legacy `shapewebs/shapewebs` is not merged into the live repository.
- [ ] Frozen install, lint, strict typecheck, and both builds pass.
- [ ] No unaccepted high or critical dependency finding remains.
- [ ] GitHub CI and branch protection enforce the quality gates.
- [ ] Unused/scaffolded UI and placeholder routes are removed.
- [ ] Public routes render real content and are static/cacheable by default.
- [ ] Neon runtime and migration roles are separated.
- [ ] Preview databases cannot access production data.
- [ ] Google login works in the admin application only.
- [ ] Owner/admin access requires server-enforced TOTP step-up.
- [ ] Negative authorization tests pass.
- [ ] Vercel preview projects remain protected and deploy only affected apps.
- [ ] Secrets are project-scoped, Sensitive, rotated, and least privilege.
- [ ] Production still serves a known deployment and rollback is documented.

Only after this checklist is complete should the full public visual build begin.

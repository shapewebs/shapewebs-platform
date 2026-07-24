# Project status

## Current milestone

- Date: 24 July 2026
- Branch: `codex/foundation`
- Status: hardened foundation and non-production database verified; not
  deployed
- Production baseline: commit `33affde`
- Repository: `shapewebs/shapewebs-platform`

Production remains on the known-good baseline. The foundation branch has not
been merged, connected to production data, or promoted in Vercel.

## What is complete

- `apps/web` and `apps/admin` remain independently deployable Next.js
  applications.
- The public homepage is semantic, responsive, static, cacheable, and contains
  no page or global-shell Client Components.
- The global header uses native HTML for its mobile interaction and follows
  system color and reduced-motion preferences without client JavaScript.
- Placeholder `/readme` content is removed and returns a real 404.
- Production headers remove `X-Powered-By` and `unsafe-eval`.
- Admin routes return 503 with no-store/noindex headers when authentication is
  unconfigured; development alone retains an explicit setup mode.
- Contact endpoints reject malformed payloads and return 503 when production
  captcha or persistence controls are unavailable.
- The in-memory fallback rate limiter has bounded memory and is unit tested; it
  is not the final distributed production control.
- Direct dependencies are current, the lockfile is deterministic, and both
  pnpm audit and OSV-Scanner report no known issues.
- The Shapewebs Neon organization contains the Frankfurt
  `shapewebs-platform` project, currently treated as non-production.
- `packages/database` contains the Drizzle schema, four reviewed migrations,
  least-privilege role contracts, and a repeatable negative authorization
  test.
- `packages/auth` contains the Better Auth server factory, Drizzle adapter,
  database rate limiting, Google-provider configuration, and TOTP plugin
  foundation.
- Application and migration roles are SQL-created roles without
  `neon_superuser`, `BYPASSRLS`, database creation, or role creation
  privileges. The provider-managed owner remains break-glass only.
- RLS is enabled and forced on every `app` and `audit` table. Synthetic tests
  verify tenant isolation, customer project assignment, published-only public
  reads, constrained lead writes, auth-schema denial, and immutable audit
  events.
- Both local app directories are linked to their existing Vercel projects.
  Development alone has least-privilege database URLs; Preview and Production
  remain untouched.
- Resend reports `shapewebs.com` verified in `eu-west-1`, with sending enabled,
  receiving disabled, and open/click tracking disabled. A domain-restricted
  Development sending key exists at the provider but is not stored in either
  application or Vercel. The server-only email package, transactional outbox,
  webhook, and Production key do not exist yet, so the current hard-coded
  raw-API notification path is not release-ready.

## Automated gates

The repository now contains:

- Prettier formatting checks;
- zero-warning ESLint with framework, TypeScript, and security rules;
- markdownlint documentation checks;
- strict TypeScript checks;
- Vitest unit tests with 90% global coverage thresholds;
- a TypeScript-AST client/server dependency boundary check;
- Knip direct-dependency and cycle checks;
- default Turbopack and separate webpack production builds;
- Playwright critical-path, security-header, failure-mode, responsive, and axe
  accessibility tests;
- three-run Lighthouse CI median budgets;
- GitHub Actions with immutable action SHAs;
- OSV dependency scanning, conditional CodeQL, and weekly Dependabot updates.

The exact local evidence is recorded in
`docs/audits/foundation-verification-2026-07-23.md` and
`docs/audits/database-foundation-verification-2026-07-24.md`.

## Accepted target architecture

The replacement stack is:

- self-hosted Better Auth in `apps/admin`;
- Google OAuth plus a server-enforced TOTP step-up for owner/editor sessions;
- Neon Postgres;
- Drizzle schemas and reviewed SQL migrations;
- least-privilege runtime roles, with migration credentials kept out of Vercel
  application runtimes;
- isolated synthetic preview data;
- Vercel Blob with separate public and private storage boundaries;
- Resend behind a server-only email package, with a Neon transactional outbox,
  idempotent delivery, and signed webhook processing.

Better Auth, Neon, and Drizzle are installed, and the initial clean migrations
and negative database authorization tests pass against non-production Neon.
The Better Auth route and Google login UI are not mounted yet. Production
credentials will not be created until preview isolation and restore tests pass.

## Transitional code

The Supabase adapter, schema, and CMS prototype remain in the branch as
temporary migration inputs. They are not considered verified production
authorization. They will be removed—not retained in a `legacy` directory—after
the Better Auth/Neon path passes its release gates.

## Next implementation slices

The authoritative execution order is in
`docs/plans/roadmap-2026-07-24.md`. The immediate slice is to normalize and
publish the current foundation as a reviewable draft pull request, then prove
the disposable Neon branch lifecycle before mounting Better Auth or Resend.

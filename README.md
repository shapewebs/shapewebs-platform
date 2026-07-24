# Shapewebs Platform

The Shapewebs monorepo contains two independently deployable Next.js
applications:

- `apps/web` — the static-first studio website for `shapewebs.com`
- `apps/admin` — the private CMS and future customer platform for
  `admin.shapewebs.com`

Shared code lives in `packages/*`. The public site and authenticated platform
remain separate so identity and CMS dependencies cannot enter the marketing
bundle.

## Foundation status

The hardened foundation and clean non-production Neon database are complete on
`codex/foundation`; production has not been changed. The repository is being
migrated in small, reviewable pull requests from its existing Supabase
prototype to:

- Better Auth for Google login, database sessions, and admin TOTP step-up
- Neon Postgres with isolated preview branches
- Drizzle schemas and reviewed SQL migrations
- Vercel Blob for public and private media

Supabase remains transitional code only until the complete replacement passes
authentication, preview-isolation, restore, and release tests. Better Auth is
mounted only in the admin app with Google allowlisting and explicit TOTP
step-up. Public leads now use an atomic Neon lead/outbox transaction, while
provider credentials and the fixed staging journey remain launch gates.
Production authentication and form persistence fail closed when required
configuration is missing.

See the [foundation architecture](docs/foundation/architecture.md), the
[current-state audit](docs/audits/current-state-2026-07-23.md), and the
[database verification](docs/audits/database-foundation-verification-2026-07-24.md),
the [Phase 0 implementation plan](docs/plans/phase-0-foundation.md), and the
[current execution roadmap](docs/plans/roadmap-2026-07-24.md).

## Current stack

- Next.js 16.2.11 and React 19.2.8
- Better Auth 1.6.25
- Neon Postgres with `@neondatabase/serverless`
- Drizzle ORM and reviewed SQL migrations
- Resend for transactional notifications; `shapewebs.com` is provider-verified,
  while staging/Production credentials remain pending
- OpenTelemetry, Vercel Observability/Speed Insights, and Checkly
  monitoring-as-code
- strict TypeScript
- pnpm 10.17.1 through Corepack
- Turborepo
- CSS custom-property tokens and component-scoped CSS Modules
- ESLint Security, Prettier, Knip, and a client/server boundary checker
- Vitest, Playwright with axe, and Lighthouse CI
- GitHub Actions, OSV-Scanner, CodeQL when licensed, and Dependabot

## Workspace

```text
apps/
  web/
  admin/
packages/
  auth/
  config/
  content-schema/
  database/
  db/
  i18n/
  observability/
  ui/
  validation/
docs/
drizzle/
tests/
supabase/  # transitional implementation removed after the migration
tooling/
.github/
```

The `db` package and `supabase/` directory remain transitional until the
verified `database` and `auth` paths fully replace them. Git history is the
archive; obsolete runtime code is removed instead of moved into a `legacy`
directory.

## Local commands

Use the package-manager version declared in `package.json`:

```bash
corepack pnpm install --frozen-lockfile
corepack pnpm dev:web
corepack pnpm dev:admin
corepack pnpm verify
corepack pnpm verify:release
corepack pnpm clean:artifacts
```

Install Chromium once with
`corepack pnpm exec playwright install chromium`, then run
`corepack pnpm test:e2e`. Run `corepack pnpm test:performance` only after a
production build; it performs three Lighthouse runs and enforces the median
budget.

Read [AGENTS.md](AGENTS.md) before changing code and [PROJECT_STATUS.md](PROJECT_STATUS.md)
before changing the platform architecture.

## Deployment boundaries

The existing Vercel projects remain the deployment targets:

- `shapewebs-web`, rooted at `apps/web`
- `shapewebs-admin`, rooted at `apps/admin`

Do not expose authentication secrets, migration credentials, private storage
credentials, or admin-only database access to `apps/web`. Preview environments
must use isolated non-production data before database-backed previews are
enabled.

## Product direction

The public website is code-led: its page structure, conversion copy, metadata,
navigation, and visual system are reviewed as product code. The custom admin
platform owns content that naturally changes over time, such as enquiries,
clients, projects, case studies, posts, media, and operational notes.

The future customer portal belongs in the authenticated platform. Its
organization, membership, project, update, and file models are planned now so
customer access can be added without moving identity or project data later.

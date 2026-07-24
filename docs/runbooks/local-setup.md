# Local setup

## Prerequisites

- Node.js 24
- Corepack
- Git
- Chromium installed by Playwright for browser tests

Use the pnpm version pinned in the root `package.json`; do not install a
different global pnpm version.

## Install

```bash
corepack enable
corepack install
corepack pnpm install --frozen-lockfile
```

The static marketing homepage and automated fail-closed checks need no secrets.
The local Vercel links can pull the approved Development variables for
database-backed work:

```bash
vercel env pull .env.local --environment development --yes --cwd apps/web
vercel env pull .env.local --environment development --yes --cwd apps/admin
```

Never pull Production credentials into the workspace.

## Run the applications

Use separate terminals:

```bash
corepack pnpm dev:web
corepack pnpm dev:admin
```

- public site: `http://localhost:3000`
- admin platform: `http://localhost:3001`

Missing authentication configuration creates an explicit local setup state.
The same missing configuration returns 503 in a production build.

## Fast development checks

```bash
corepack pnpm format:check
corepack pnpm lint
corepack pnpm lint:docs
corepack pnpm typecheck
corepack pnpm test:coverage
corepack pnpm check:boundaries
corepack pnpm check:deps
corepack pnpm check:cycles
corepack pnpm --filter @shapewebs/database db:check
corepack pnpm audit
```

Use `corepack pnpm format` to normalize supported source and documentation
files.

## Production and browser checks

```bash
corepack pnpm build:webpack
corepack pnpm build
corepack pnpm exec playwright install chromium
corepack pnpm test:e2e
corepack pnpm test:performance
```

Run the default build after the webpack compatibility build so Playwright and
Lighthouse exercise the same Turbopack output expected from the normal
production command.

Generated reports are ignored by Git:

- `coverage/`
- `playwright-report/`
- `test-results/`
- `.lighthouseci/`

## Environment files

Local `.env*` files are ignored. Do not copy production credentials into local
files or commit secrets.

The current Supabase variables belong to the transitional prototype. Do not
provision new Supabase infrastructure for this branch.

The Development Vercel environments contain only least-privilege runtime
database URLs, plus the admin app's development Better Auth secret and
localhost origin. `DATABASE_MIGRATION_URL` and the provider-managed owner URL
must never be stored in a Vercel application project.

The database authorization test is intentionally operator-only until its
disposable-branch CI workflow is added. It requires ephemeral values for:

- `DATABASE_OWNER_URL`;
- `DATABASE_MIGRATION_URL`;
- `DATABASE_ADMIN_URL`;
- `DATABASE_WEB_URL`;
- `DATABASE_PUBLIC_URL`.

It seeds synthetic rows, verifies positive and negative access, and deletes
only those rows in a `finally` cleanup:

```bash
corepack pnpm --filter @shapewebs/database db:verify-security
```

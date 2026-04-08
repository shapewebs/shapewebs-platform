# Shapewebs Platform

Shapewebs is now structured as the foundation of a custom CMS-powered website platform:

- `apps/web` is the public site for `shapewebs.com`
- `apps/admin` is the private CMS surface for `admin.shapewebs.com`
- `packages/*` contains shared platform code
- `supabase/` contains migrations, seeds, and database security foundations

## Stack

- Next.js 16.2.2 with the App Router
- React 19.2.4
- TypeScript
- pnpm workspaces + Turborepo
- Supabase-oriented architecture for Auth, Postgres, Storage, and RLS
- Global foundation CSS plus component-scoped CSS Modules

## Workspace Layout

```text
apps/
  web/
  admin/
packages/
  config/
  content-schema/
  db/
  i18n/
  observability/
  ui/
  validation/
supabase/
docs/
```

## Commands

```bash
pnpm install
pnpm dev:web
pnpm dev:admin
pnpm build
pnpm lint
pnpm typecheck
```

## Setup Notes

- Copy `.env.example` values into `apps/web/.env.local` and `apps/admin/.env.local`.
- Read [docs/runbooks/github-repository-setup.md](/Users/lukasthomsen/Desktop/shapewebs_1.1/docs/runbooks/github-repository-setup.md) before creating the GitHub repository and importing the monorepo into Vercel.
- Read [docs/runbooks/platform-setup.md](/Users/lukasthomsen/Desktop/shapewebs_1.1/docs/runbooks/platform-setup.md) for the recommended hosted setup flow.
- Read [supabase/seed/bootstrap_owner.sql.example](/Users/lukasthomsen/Desktop/shapewebs_1.1/supabase/seed/bootstrap_owner.sql.example) after creating your first Supabase auth user.
- Read `PROJECT_STATUS.md` before making large changes.
- Read `AGENTS.md` for project-specific coding-agent guidance.

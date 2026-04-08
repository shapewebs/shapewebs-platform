# Platform Foundation

This repository now uses the Phase 0 monorepo architecture:

- `apps/web` for the public site
- `apps/admin` for the CMS/admin surface
- `packages/*` for shared contracts and implementation building blocks
- `supabase/` for database migrations, seeds, and RLS foundations

## What is implemented now

- Workspace tooling with `pnpm` + `turbo`
- Shared config, i18n, validation, content schema, UI, observability, and DB packages
- Public site moved into `apps/web`
- Admin shell added in `apps/admin`
- Supabase migration scaffolding for content, legal, consent, media, submissions, and audit logging

## What is intentionally not finished yet

- Live Supabase auth wiring
- Content CRUD screens
- Media upload flows
- Draft preview tokens
- On-demand revalidation endpoints
- Form handlers

Those land in the next implementation passes on top of this foundation.

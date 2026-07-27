# Platform Foundation

This repository uses the Shapewebs monorepo architecture:

- `apps/web` for the public site
- `apps/admin` for the CMS/admin surface
- `apps/portal` for the isolated, fail-closed future customer portal
- `packages/*` for shared contracts and implementation building blocks
- `drizzle/` for reviewed Neon migrations and forced-RLS foundations

## What is implemented now

- Workspace tooling with `pnpm` + `turbo`
- Shared config, i18n, validation, content schema, UI, observability, auth,
  email, media, and database packages
- Public site moved into `apps/web`
- Secure admin authentication, CMS content workflow, lead operations, private
  media foundation, audit views, and organization settings in `apps/admin`
- Neon/Drizzle migrations, disposable lifecycle verification, least-privilege
  roles, and forced RLS for authentication, content, submissions, outbox,
  settings, audit, customer isolation, and media
- Static-first published reads in `apps/web`
- A code-owned implementation gate keeps `apps/portal` unavailable until its
  isolated providers are provisioned

## What is intentionally not finished yet

- Public asset publishing and private/public media deletion lifecycle
- Dedicated customer-portal provider resources and fixed staging domain
- Final public studio content and visual design
- Production-only Neon, OAuth, Resend, Blob, Turnstile, monitoring, recovery,
  and commercial Vercel launch resources

Production remains separately gated and is not changed by staging work.

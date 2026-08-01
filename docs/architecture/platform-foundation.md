# Platform Foundation

This repository uses the Shapewebs monorepo architecture:

- `apps/web` for the public site
- `apps/admin` for the unified customer account and employee CMS surface
- `packages/*` for shared contracts and implementation building blocks
- `drizzle/` for reviewed Neon migrations and forced-RLS foundations

## What is implemented now

- Workspace tooling with `pnpm` + `turbo`
- Shared config, i18n, validation, content schema, UI, observability, auth,
  email, media, and database packages
- Public site moved into `apps/web`
- Canonical Google/password authentication, invitation-only customer
  onboarding, customer workspace authorization, employee TOTP, CMS content
  workflow, lead operations, private media, audit views, and organization
  settings in `apps/admin`
- Neon/Drizzle migrations, disposable lifecycle verification, least-privilege
  roles, and forced RLS for authentication, content, submissions, outbox,
  settings, audit, customer isolation, and media
- Static-first published reads in `apps/web`
- The public application has no authentication runtime; customer repositories
  use a separate least-privilege runtime connection and forced RLS inside the
  authenticated application

## What is intentionally not finished yet

- Public asset publishing and private/public media deletion lifecycle
- Persistent-staging application of the already rehearsed unified-account
  migration `0019`, fixed-staging journey verification, and retirement of
  obsolete provider variables
- Final public studio content and visual design
- Production-only Neon, OAuth, Resend, Blob, Turnstile, monitoring, recovery,
  and commercial Vercel launch resources

Production remains separately gated and is not changed by staging work.

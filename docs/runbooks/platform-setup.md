# Shapewebs Platform Setup

This is the recommended setup for the first real hosted version of Shapewebs.

## Target setup

- One Vercel team
- Two Vercel projects
  - `shapewebs-web`
  - `shapewebs-admin`
- One Supabase organization
- Two Supabase projects
  - `shapewebs-staging`
  - `shapewebs-prod`
- One public domain
  - `shapewebs.com`
- One admin subdomain
  - `admin.shapewebs.com`

## What staging and production mean

### Staging

Staging is the safe practice environment.

Use staging to:

- test migrations
- test auth and redirects
- test content changes before they reach the live site
- verify env vars and deployments

Mistakes in staging are acceptable. It should be close to production, but it is not the real live system.

### Production

Production is the real live system that visitors and clients use.

Use production for:

- the real public website
- the real admin CMS
- real content
- real domains
- real form submissions

Mistakes in production affect the live business site, so production changes should only be made after they work in staging.

## Why this setup

- Two Vercel projects fit the repo as it exists today: [apps/web](/Users/lukasthomsen/Desktop/shapewebs_1.1/apps/web) and [apps/admin](/Users/lukasthomsen/Desktop/shapewebs_1.1/apps/admin).
- Two Supabase projects give you a safe staging and production split without changing application architecture later.
- The repository remains the source of truth for schema, migrations, generated types, and app code.

## Before you start

You need:

- a Supabase account
- a Vercel account/team
- access to the DNS for `shapewebs.com`
- Docker Desktop or OrbStack for local Supabase
- Node, pnpm, and the repo installed locally

## 1. Create the Supabase organization and projects

Create the organization directly in Supabase, not through the Vercel marketplace.

Create:

- `shapewebs-staging`
- `shapewebs-prod`

Use the same region for both projects.

Recommended:

- `shapewebs-staging`: lower-cost compute
- `shapewebs-prod`: Pro plan with PITR enabled

For each project, save:

- project ref
- project URL
- publishable key
- secret key
- database password

## 2. Configure hosted Supabase auth

In each Supabase project, go to `Authentication -> URL Configuration`.

### Production project

Set:

- Site URL: `https://admin.shapewebs.com`

Add redirect URLs:

- `https://admin.shapewebs.com/**`
- `https://shapewebs.com/**`
- `https://www.shapewebs.com/**`
- `http://localhost:3001/**`
- `http://localhost:3000/**`

### Staging project

If you do not have staging domains yet, set:

- Site URL: `http://localhost:3001`

Add redirect URLs:

- `http://localhost:3001/**`
- `http://localhost:3000/**`

Later, add your Vercel preview domains when they exist.

Important:

- for now, staging can use `http://localhost:3001` as the Site URL because you are still testing locally
- later, when you have a real staging admin URL, update the staging Site URL and redirect URLs to that hosted staging domain

Also set:

- disable open signup
- keep email/password enabled
- set up custom SMTP before going live

## 2.5. Configure hosted Supabase Data API schemas

The Shapewebs apps query more than the default `public` schema. The hosted project must expose the CMS schemas through the Supabase Data API.

Current Supabase dashboard UI can move this setting between pages. If you see a `Data API` page in the sidebar, that is the place to check. If you do not see the exposed schema control there, do not block on the UI.

This repository now includes a migration that configures the Data API and grants schema usage automatically:

- [20260408184500_configure_data_api_custom_schemas.sql](/Users/lukasthomsen/Desktop/shapewebs_1.1/supabase/migrations/20260408184500_configure_data_api_custom_schemas.sql)

That migration:

- exposes `public,storage,graphql_public,cms,ops` to PostgREST
- sets the extra search path to `public,extensions,cms,ops`
- grants the required schema/table/routine/sequence privileges
- reloads the Data API config and schema cache

If `cms` and `ops` are not exposed, login can appear to work but the admin app will immediately bounce back to the login screen because it cannot read the admin profile and role tables.

## 3. Create the Vercel projects

Create two Vercel projects from the same Git repository.

### Project 1

- Name: `shapewebs-web`
- Root directory: `apps/web`

### Project 2

- Name: `shapewebs-admin`
- Root directory: `apps/admin`

Keep both projects in the same Vercel team.

## 4. Add production domains in Vercel

### Public site

Add both:

- `shapewebs.com`
- `www.shapewebs.com`

Recommended setup:

- choose one public primary domain
- redirect the other to it

If you want the simplest brand URL, use `shapewebs.com` as primary.
If you want the most conventional DNS setup, use `www.shapewebs.com` as primary and redirect the apex.

### Admin site

Add:

- `admin.shapewebs.com`

This domain must point to the `shapewebs-admin` project only.

## 5. Add local env files

Create:

- `apps/web/.env.local`
- `apps/admin/.env.local`

Use [.env.example](/Users/lukasthomsen/Desktop/shapewebs_1.1/.env.example) as the value reference.

For local Supabase, `pnpm supabase:status` will give you the local URL and keys.

Generate these secrets yourself:

```bash
openssl rand -hex 32
openssl rand -hex 32
```

Use them for:

- `PREVIEW_TOKEN_SECRET`
- `REVALIDATION_WEBHOOK_SECRET`

## 6. Run local Supabase

Start local Supabase:

```bash
pnpm supabase:start
pnpm supabase:reset
pnpm supabase:status
```

This repo is configured to seed from [supabase/seed/seed.sql](/Users/lukasthomsen/Desktop/shapewebs_1.1/supabase/seed/seed.sql) through [supabase/config.toml](/Users/lukasthomsen/Desktop/shapewebs_1.1/supabase/config.toml).

Local auth is configured to use the admin app as the primary auth site:

- Site URL: `http://localhost:3001`
- Redirect URLs:
  - `http://localhost:3001/**`
  - `http://localhost:3000/**`

## 7. Link the CLI to staging

Always link the CLI to staging by default, not production.

```bash
pnpm dlx supabase@2.88.1 login
pnpm dlx supabase@2.88.1 link --project-ref <staging-project-ref>
pnpm dlx supabase@2.88.1 db push
pnpm dlx supabase@2.88.1 gen types typescript --linked --schema public,cms,ops > packages/db/src/generated/database.types.ts
```

After staging is verified, repeat deliberately for production.

## 8. Set Vercel environment variables

Set these on both Vercel projects as needed.

### `shapewebs-web`

- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_ADMIN_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `PREVIEW_TOKEN_SECRET`
- `REVALIDATION_WEBHOOK_SECRET`
- `TURNSTILE_SITE_KEY`
- `TURNSTILE_SECRET_KEY`
- `RESEND_API_KEY`
- `SENTRY_DSN`

### `shapewebs-admin`

- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_ADMIN_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `PREVIEW_TOKEN_SECRET`
- `REVALIDATION_WEBHOOK_SECRET`
- `TURNSTILE_SECRET_KEY`
- `RESEND_API_KEY`
- `SENTRY_DSN`

### Value mapping

For production:

- `NEXT_PUBLIC_SITE_URL=https://shapewebs.com`
- `NEXT_PUBLIC_ADMIN_URL=https://admin.shapewebs.com`
- `NEXT_PUBLIC_SUPABASE_URL=<production project URL>`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY=<production publishable key>`
- `SUPABASE_SERVICE_ROLE_KEY=<production secret key>`

For preview or staging:

- use the staging Supabase project values

## 9. Bootstrap the first admin user

After the hosted migration is applied, create your auth user in Supabase and then assign the CMS owner role.

Use [supabase/seed/bootstrap_owner.sql.example](/Users/lukasthomsen/Desktop/shapewebs_1.1/supabase/seed/bootstrap_owner.sql.example) as the template.

Without this step, login may succeed but the CMS will still deny access because the admin profile and role mapping do not exist yet.

## 10. First deploy order

Deploy in this order:

1. local Supabase works
2. local `web` and `admin` work
3. staging Supabase migrated
4. staging Vercel env vars added
5. staging deploy succeeds
6. first admin user created
7. production Supabase migrated
8. production Vercel env vars added
9. production domains connected
10. production deploy succeeds

## 11. Update later before go-live

These are intentionally allowed to be temporary during setup, but they must be revisited before launch.

- replace staging `Site URL` from `http://localhost:3001` to the real staging admin domain if you create one
- replace staging redirect URLs from localhost-only values to include the real staging web and admin URLs
- add Vercel preview redirect URL patterns in Supabase once preview deployments exist
- replace placeholder or empty SMTP settings with your real production mail provider
- add real Turnstile production keys
- add real Resend production key
- confirm `NEXT_PUBLIC_SITE_URL` is the final production public URL
- confirm `NEXT_PUBLIC_ADMIN_URL` is the final production admin URL
- verify production Supabase uses production keys only, never staging keys
- enable PITR on the production Supabase project

## 11. First smoke test

Check these routes:

### Public

- `/`
- `/blog`
- `/projects`
- `/contact`

### Admin

- `/login`
- `/dashboard`
- `/content`
- `/settings`

Then test:

- login
- MFA enrollment
- content listing
- draft save
- publish
- preview
- form submission

## 12. Recommended next setup tasks after first deploy

- set up custom SMTP for Supabase auth email
- add Turnstile production keys
- add Resend production key
- enable production PITR
- add Sentry to both projects
- add Vercel deployment protection to preview environments
- create a staging-only owner/admin account

## Notes

- The repository currently uses the legacy variable name `NEXT_PUBLIC_SUPABASE_ANON_KEY`, but the value should be the current Supabase publishable key.
- Do not use the Vercel marketplace integration as the primary project-creation path for this platform.
- If you later add the Vercel or GitHub Supabase integrations, treat them as convenience layers, not the source of truth for schema or access control.

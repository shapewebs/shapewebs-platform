# Project Status

## Current Milestone

- Date: 2026-04-08
- Status: Phase 1 core CMS loop and public content flow implemented
- Current repo shape: monorepo with separate public and admin apps

## What Changed In This Pass

- Added shared Supabase client helpers in `packages/db` for browser, server, and service-role access.
- Added shared repository methods for:
  - document lists
  - editor state
  - draft/review/publish writes
  - preview token creation/consumption
  - published-content reads
  - settings snapshots
  - contact submission storage
- Wired the admin app to the first real CMS loop:
  - real `/login` client auth flow
  - MFA screen on `/login/mfa`
  - session-aware dashboard layout
  - real `/content` list page
  - first `/content/pages/new` and `/content/pages/[documentId]` editor flow
  - submissions and settings pages backed by repository reads
- Wired the public app to repository-backed content:
  - homepage
  - blog index/detail
  - project index/detail
  - work index/detail
  - service detail
  - legal detail
  - generic page catch-all lookup
- Added:
  - content block renderer
  - preview endpoint
  - revalidation endpoint
  - contact and project inquiry API handlers
  - public contact/project inquiry page UI
  - health endpoints for both apps

## Workspace Structure

- `apps/web`: public marketing site and future public content rendering surface
- `apps/admin`: private CMS and operations portal
- `packages/ui`: shared design system and global foundation CSS
- `packages/config`: site metadata, shared content enums, security headers, workspace package list
- `packages/i18n`: locale and region-profile definitions
- `packages/content-schema`: typed block/document schemas
- `packages/validation`: env and form validation schemas
- `packages/db`: database contracts, cache-tag helpers, shared DB types
- `packages/observability`: structured logging helpers
- `supabase/`: local Supabase config, migrations, seeds, and DB test notes

## Verified Working

- `pnpm install`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm build`
- `http://localhost:3000/` returns `200 OK`
- `http://localhost:3000/blog/building-a-design-cms` returns `200 OK`
- `http://localhost:3000/projects/northline-studio` returns `200 OK`
- `http://localhost:3000/contact` returns `200 OK`
- `http://localhost:3001/login` returns `200 OK`
- `http://localhost:3001/content` returns `200 OK`
- `POST http://localhost:3000/api/forms/contact` returns `200` with success JSON

## Public App Status

- Existing public shell/header/footer work was preserved and migrated into `apps/web`.
- The public site now renders repository-backed or fallback CMS content on:
  - `/`
  - `/blog`
  - `/blog/[slug]`
  - `/projects`
  - `/projects/[slug]`
  - `/work`
  - `/work/[slug]`
  - `/services/[slug]`
  - `/legal/[slug]`
  - generic catch-all page lookups
- `/contact` now contains working contact and project inquiry forms.
- Preview and revalidation endpoints now exist at:
  - `/api/preview`
  - `/api/revalidate`
- Health endpoint exists at `/api/health`.
- Shared global styles now come from `@shapewebs/ui/styles/*`.

## Admin App Status

- `apps/admin` now exists and builds independently.
- Added and wired:
  - `/login`
  - `/login/mfa`
  - `/dashboard`
  - `/content`
  - `/content/pages/new`
  - `/content/pages/[documentId]`
  - `/media`
  - `/submissions`
  - `/settings`
  - `/audit`
- Admin route protection now uses a real Supabase session refresh path in `src/proxy.ts`.
- The admin app supports secure auth wiring when Supabase is configured, and a local setup mode when it is not.
- Health endpoint exists at `/api/health`.

## Supabase Status

- Initial schema scaffolding covers:
  - admin users, roles, permissions
  - locales and region profiles
  - documents, localizations, revisions, SEO metadata
  - media assets
  - site settings and feature flags
  - consent rules and cookie policy versions
  - audit logs
  - contact submissions
  - preview tokens
- RLS scaffolding and storage bucket policies were added.
- The migration still needs real execution against a local or cloud Supabase instance to validate operational details.
- Local Supabase startup is still blocked in this environment because Docker is not installed.

## Important Assumptions

- English remains the default locale.
- The second pilot locale is `da-DK`.
- Public rendering remains static-first until CMS-backed reads replace the placeholder content.
- Supabase Auth is for admin users only in v1.

## Next Recommended Steps

1. Execute the Supabase migration locally or in staging and validate the SQL, RLS, and storage behavior against a real project.
2. Seed a real admin user/profile/role assignment so the secure auth path can be exercised end to end.
3. Finish the first true write loop against a live Supabase instance from `/content/pages/new`.
4. Add the media upload pipeline and wire image blocks to real storage assets.
5. Add audit-log list views and settings mutation screens, not just snapshots.
6. Wire Turnstile site keys and Resend credentials so anti-spam and notifications are active in non-fallback mode.

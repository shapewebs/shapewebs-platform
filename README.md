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

## Product Direction

The public Shapewebs website is now treated as a **code-first marketing site**, while the admin app is treated as an **internal Shapewebs operating portal**.

That means:

- Core public pages should be authored in code.
- Each public route should own its own metadata in code.
- SEO, sitemap, structured data, canonical tags, favicons, and social sharing assets should be part of the web app implementation.
- The admin portal should not become a generic page builder for the main site.

## What Stays In Code

These things should live in the public app and be reviewed as product/design code:

- Homepage structure and copy
- Services page structure and copy
- Core legal route behavior and metadata
- Route-level `title`, `description`, Open Graph metadata, and canonical handling
- JSON-LD structured data
- Sitemap generation
- `robots.txt`
- Header, footer, navigation, and brand presentation
- Favicons, app icons, social images, and other brand assets

For the main public site, the rule is:

**If it affects brand quality, SEO, route architecture, or conversion messaging, prefer code over CMS.**

## What The Admin Portal Should Be

The admin app should evolve into a practical internal system for a web design studio rather than a raw page editor.

Recommended first-use purpose:

- internal workspace for Shapewebs employees
- lead and inquiry handling
- client registry
- active project tracking
- blog and case study management
- asset and brand-library management
- notes, tasks, and audit trail for delivery work

This gives the admin portal a real reason to exist even before a full content-management system is finished.

## Recommended Admin Modules

### Phase 1: Useful Internal Portal

- Dashboard
- Leads / inquiries inbox
- Clients
- Projects
- Blog posts
- Case studies
- Media library
- Team notes / activity log
- Settings

### Phase 2: Agency Operations

- Client contacts
- Project milestones
- Deliverables tracker
- Proposal / scope records
- Internal checklist templates
- Launch readiness tracker
- Maintenance plans
- Change request log

### Phase 3: Optional CMS Expansion

- Structured blog publishing
- Structured case study publishing
- Reusable testimonial records
- Reusable FAQ records
- Reusable service highlights
- Optional legal-document versioning

## Current Decision

We are **not** using the admin app as the primary source of truth for the main website's page-by-page metadata and layout.

Instead:

- the website remains code-led
- the admin app becomes an internal business tool with selective publishing capabilities
- editorial data in admin should focus on things that naturally change over time

Examples of good admin-owned content:

- blog posts
- client records
- project data
- inquiries
- case studies
- asset metadata
- internal notes

Examples of code-owned content:

- homepage SEO
- services page SEO
- route metadata
- primary conversion copy
- favicon setup
- app icons
- structured data strategy

## Component Inventory

The UI foundation already contains a large reusable component system in `packages/ui/src`.

### Existing Foundation Component Groups

- Buttons
- Collections
- Colors
- Controls
- Data display
- Date and time
- Feedback
- Forms
- Layout
- Media
- Navigation
- Overlays
- Pickers
- Typography
- Utilities

These are already scaffolded and should be reused before creating one-off app components.

## App Components To Build Next

This is the practical build order for the product surface.

### Web App Components

- Site metadata and SEO helpers
- Favicon and app-icon asset set
- Hero sections
- Service feature sections
- Case study cards
- Blog post cards
- Contact and inquiry blocks
- Trust and proof sections
- CTA sections
- Legal page layouts
- Open Graph image system

### Admin App Components

- App shell navigation
- Dashboard stat cards
- Activity feed
- Leads table
- Lead detail drawer
- Client table
- Client profile panel
- Project board
- Project detail page
- Blog post editor
- Case study editor
- Media asset grid
- Upload dialog
- Internal notes composer
- Status badges
- Filter toolbar
- Search bar
- Empty states
- Confirmation dialogs

## Recommended Build Order

We should build the system in this order:

1. Public site metadata and brand asset system
2. Public site page components
3. Admin dashboard shell refinement
4. Leads and clients module
5. Projects module
6. Blog posts module
7. Case studies module
8. Media library
9. Internal notes and audit improvements

## Brand Assets Needed Later

When brand asset implementation starts, prepare these files:

- Master logo in SVG
- Simplified mark/icon in SVG
- Black logo variant
- White logo variant
- Transparent PNG exports
- Favicon source at high resolution
- Apple touch icon source
- Social sharing image source
- Optional monochrome app icon source

Suggested raster exports:

- `16x16`
- `32x32`
- `48x48`
- `180x180`
- `192x192`
- `256x256`
- `512x512`
- `1200x630` for Open Graph

## Working Principle

The main website should feel intentionally designed and tightly controlled.

The admin portal should feel useful to the business.

That split is the direction for the next phase of work.

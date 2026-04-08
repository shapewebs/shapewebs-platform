<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Shapewebs Platform Rules

- Read `PROJECT_STATUS.md` before making large changes.
- The platform is a custom CMS-powered portfolio, publishing, and lead-generation system for Shapewebs.
- Do not position the product as a self-serve website builder.
- Follow the latest documentation excerpts provided by the user when they override older defaults.
- Preserve the current split architecture:
  - `apps/web` for the public site
  - `apps/admin` for the CMS/admin portal
  - `packages/*` for shared logic
  - `supabase/` for migrations and database security
- Keep public and admin concerns separated; do not casually move admin features into the public app.
- Prefer the existing global-CSS-first architecture unless the user explicitly asks for a utility-first approach.
- For the component system, prefer shared global foundation CSS for tokens/theme/reset and CSS Modules for component-scoped styling.
- Keep routing concerns inside each app’s `src/app`.
- Use `next/link` for internal navigation between pages.
- Prefer server components for public content reads, server actions for admin mutations, and route handlers for webhook/form/integration endpoints.
- Keep the design system in `packages/ui`.
- Keep shared content schemas in `packages/content-schema`.
- Keep validation logic in `packages/validation`.
- Keep shared configuration and security header builders in `packages/config`.
- Keep shared locale/region logic in `packages/i18n`.
- Keep DB contracts and repository helpers in `packages/db`.
- Treat Supabase SQL migrations as the source of truth; avoid dashboard-only schema changes.
- Maintain RLS-aware design. Public content should only ever read published records.
- Use `packages/ui/src/system/registry.ts` to check whether a design-system component is fully styled or only scaffolded.

## CSS Class Convention

- Format every custom class as `sw-[scope]-[role]-[token6]`.
- The last segment must be a unique six-character lowercase alphanumeric token.
- Example: `sw-home-card-z6p1h3`

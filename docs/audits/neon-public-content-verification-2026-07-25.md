# Neon public content and preview verification

- Date: 25 July 2026
- Branch: `codex/neon-public-content`
- Base slice: pull request `#19`, merged into protected `staging` at `732c563`
- Environment: local builds and disposable synthetic Neon branches
- Production changed: no

## Scope

This stacked slice moves public published-content reads and private CMS preview
from the transitional Supabase repository to Neon/Drizzle. Its reviewed base
slice is merged and migration `0011` is verified on persistent staging. This
slice does not apply migration `0012` to persistent staging or change any
production application, database, alias, domain, credential or deployment.

## Implemented controls

- Public queries set a transaction-local organization context and join an exact
  localization publication pointer to its immutable revision.
- Detail reads use bounded single-record queries and list reads are capped at
  200 records so a growing CMS cannot create an unbounded public query.
- The web role can read only published pointers for its configured tenant.
  Current localization metadata and unrelated draft revisions remain denied.
- Public setup content remains deterministic when both database values are
  absent locally. A partial Vercel configuration and any missing production
  configuration fail closed.
- Preview grants:
  - store SHA-256 hashes rather than bearer tokens;
  - exchange the one-time URL activation token for a distinct browser-session
    token, so a later access-log or history disclosure cannot reopen or read
    the preview;
  - bind one organization, document, revision and locale;
  - derive the redirect path from the authorized immutable revision;
  - permit activation only once and within five minutes;
  - expire no later than 30 minutes;
  - use a host-only, HttpOnly, SameSite=Lax browser cookie; and
  - expose a POST-only Draft Mode exit route.
- The public preview route no longer accepts a browser-supplied path, document
  ID, revision ID, locale or separate signature.
- Localized catch-all routes validate the leading locale through the shared
  i18n package, resolve only explicit collection shapes and reject ambiguous
  nested paths. Danish preview paths therefore cannot fall back to English.
- The revalidation route uses constant-time secret comparison, exact JSON
  content type, a streamed 2 KiB body limit, strict schema validation and
  normalized internal paths.
- `apps/web` no longer imports or depends on `@shapewebs/db`; the old public
  Supabase client helper is removed.

## Local verification

The canonical `pnpm verify` gate passed:

- Prettier, zero-warning ESLint and Markdown lint;
- strict workspace TypeScript;
- compiled Checkly monitoring definitions;
- 253-record ASVS evidence validation;
- dependency-patch verification;
- Worker runtime tests;
- 103 unit tests with all configured coverage thresholds;
- server/client boundaries;
- dependency and cycle analysis;
- deterministic generated schema checks; and
- `pnpm audit` with no known vulnerability.

Both Next.js 16.2.11 Turbopack production builds passed. The public build
generated 23 routes, including the new preview-exit route and all deterministic
fallback static parameters. The admin build generated 16 routes.

## Disposable Neon evidence

The authenticated lifecycle runner created isolated source and restore
branches in non-production project `shapewebs-platform`. On both branches it:

1. created a fresh database;
2. applied migrations `0000` through `0012`;
3. seeded and verified the deterministic recovery fixture;
4. passed ten real content repository scenarios;
5. passed the complete forced-RLS and authorization suite;
6. proved transactional rollback;
7. exported and restored the logical fixture; and
8. produced byte-identical exports with SHA-256
   `5d6bb329a4109f8d6e5a03d851e6a4f7728c6f74f96c036ab9aa905a62f2973c`.

The new scenarios proved:

- a newer draft cannot replace the exact live revision;
- English and Danish publication pointers remain independent;
- the web role cannot cross tenant boundaries;
- a wrong preview token sees nothing;
- a valid preview grant is consumed exactly once;
- replay cannot reactivate it;
- the active preview reads only its bound revision;
- public and web roles cannot create grants; and
- an administrator cannot create a cross-tenant grant.

The first lifecycle run correctly failed because the newly tenant-aware policy
required `content_localizations.organization_id` while migration `0011` had
granted the web role only the other pointer columns. Migration `0012` was
corrected with one additional column-level `SELECT` grant; broad table access
was not added. The full source/restore lifecycle then passed. Every disposable
branch was deleted.

## Remaining staging gates

- Rebase this branch onto protected `staging`, open its pull request and pass
  all required repository, Vercel and disposable-Neon checks.
- Apply migration `0012` to persistent staging only after that reviewed merge.
- The fixed staging applications must then prove:
  - authenticated authoring and revision creation;
  - publishing and bounded revalidation;
  - exact public rendering;
  - one-time preview activation and replay denial; and
  - preview exit and expiry.

No production promotion is authorized by this evidence.

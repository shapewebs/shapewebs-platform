# Neon CMS editor verification

Date: 25 July 2026

Branch: `codex/neon-cms-editor`

## Scope

This stacked slice moves the authenticated CMS page editor and its mutations
from the transitional Supabase path to the Neon/Drizzle repository boundary.
Draft pull request `#19` is based on the unmerged admin-readiness correction in
pull request `#18`. It does not change the public content repository, enable
preview, apply the new migration to persistent staging, or promote a
production deployment.

The implementation:

- re-authorizes every editor page and Server Action for owner or editor access;
- requires a TOTP step-up completed within ten minutes for publishing;
- creates database authorization context only from the server-owned Better
  Auth session;
- validates strict bounded editor fields and the structured content document;
- generates server-owned UUID command identifiers;
- applies optimistic document-version checks;
- creates immutable localized revisions and append-only audit events;
- commits document, revision, localization, publication and audit changes in a
  single database transaction;
- returns safe conflict, slug-conflict and idempotent-replay results;
- maintains separate exact publication pointers for each locale;
- preserves a published revision when a newer draft is saved;
- limits public and web database roles to pointer-safe metadata and the exact
  immutable revisions selected for publication;
- bounds revision history to 100 entries;
- triggers bounded public revalidation after publishing and exposes a safe
  operational notice when revalidation cannot be confirmed; and
- removes the last admin Supabase import and its temporary boundary allowlist.

Preview remains visibly disabled until the public Neon read path replaces the
unsigned transitional Supabase preview path.

## Migration

Migration `0011_neon-cms-authoring.sql`:

- adds validated default-locale, page-kind and optimistic-version fields;
- introduces a forced-RLS `content_localizations` table;
- adds stable command identifiers and immutable workflow/slug/page-kind/change
  snapshots to revisions;
- backfills existing revisions and localized metadata safely before applying
  non-null constraints;
- maintains locale-specific publication revision and timestamp pairs;
- validates that a publication pointer belongs to the same document and
  locale;
- exposes only published localization pointers to public roles;
- exposes only the exact current published revision for each locale;
- denies public access to current draft localization and document metadata;
- preserves admin-only mutation privileges; and
- retains reversible, version-controlled migration evidence.

The checked-in Drizzle snapshot was regenerated from the final schema, and
`drizzle-kit check` passed.

## Repository and security verification

The complete disposable Neon lifecycle ran against a fresh source database and
a separately migrated restore database. On both databases it:

1. applied migrations `0000` through `0011`;
2. seeded and verified lifecycle fixture version 4;
3. executed eight real CMS repository scenarios through the pooled
   `shapewebs_admin_runtime` role;
4. proved draft creation and exact command replay;
5. proved stale-version rejection without a new revision;
6. proved exact publication followed by a private newer draft;
7. proved default-locale selection when another locale has a newer revision;
8. proved English and Danish publication pointers remain independent;
9. proved locale/type slug collisions fail atomically;
10. denied customer, cross-tenant and immutable-revision mutations;
11. denied mismatched document/kind and publication-pointer writes;
12. exposed only pointer-safe public metadata and exact published revisions;
13. passed the complete database security suite;
14. passed the failed-migration rollback probe;
15. produced byte-identical logical exports after restore; and
16. deleted both disposable Neon branches.

The source and restored fixture hash was:

`5d6bb329a4109f8d6e5a03d851e6a4f7728c6f74f96c036ab9aa905a62f2973c`

## Application and hygiene verification

The canonical `pnpm verify` gate passed with:

- Prettier and Markdown formatting;
- zero-warning ESLint;
- strict TypeScript across all applications and packages;
- 93 passing unit tests and 96.13% statement coverage;
- Checkly resource compilation;
- ASVS evidence and dependency-patch verification;
- Worker runtime tests;
- server/client boundary enforcement;
- dependency and cycle analysis;
- deterministic Better Auth and Drizzle generation; and
- zero known vulnerabilities from `pnpm audit`.

The Cloudflare Worker dry build, both public/admin webpack production builds,
and both public/admin Turbopack production builds passed. Eleven Chromium
Playwright journeys passed, including accessibility, browser security,
fail-closed admin readiness and malformed form handling.

`pnpm clean:artifacts` removed only the known generated outputs. `git diff
--check` passed and no environment file, provider link, credential, unknown
file or persistent database state was removed.

## Residual gates

- Pull request `#18` remains draft, unmerged and undeployed.
- Migration `0011` exists only in source control and disposable databases; the
  persistent staging branch remains on migrations `0000` through `0010`.
- Public content reads and preview remain transitional Supabase paths.
- Rollback and unpublish commands are not part of this slice.
- No production database, application, domain or environment variable changed.
- A protected staging deployment and authenticated browser journey require
  reviewed pull requests, the persistent migration, and the Google OAuth
  provider configuration.

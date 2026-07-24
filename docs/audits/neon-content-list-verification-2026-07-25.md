# Neon content-list verification

Date: 25 July 2026

Branch: `codex/neon-content-list`

## Scope

This slice moves the authenticated CMS document-list read path from the
transitional Supabase repository to the Neon/Drizzle repository boundary. It
does not migrate the document editor, mutations, previews, publishing, or
public content reads.

The implementation:

- re-authorizes the page for owner or editor access before reading content;
- creates database authorization context only from the server-owned Better
  Auth session;
- sets organization, actor, and role through transaction-local database
  settings;
- relies on forced RLS for tenant isolation;
- selects one latest revision for each document and locale with
  `DISTINCT ON`;
- returns at most 250 minimal DTOs, ordered by the document update time;
- validates every returned DTO at the database boundary;
- validates content type, locale, workflow state, slug, title, summary, and
  timestamps;
- fails closed outside explicit local setup mode; and
- removes the CMS list page from the transitional Supabase import allowlist.

Migration `0009_content-workflow-enums.sql` aligns the Neon enums with the
checked-in CMS contracts by adding:

- content kind `method`;
- workflow state `review`; and
- workflow state `scheduled`.

## Verification

The canonical unit suite contains 81 passing tests. The new tests cover:

- bounded CMS list DTO validation;
- deterministic local setup data and filter behavior;
- rejection of invalid filters before database access; and
- rejection of non-editor/non-owner authorization before database access.

The complete `pnpm verify` gate passed after the implementation and
supply-chain remediation. Both Next.js 16.2.11 admin production builds also
passed independently with Turbopack and webpack. The `/content` route remained
dynamically server-rendered in both outputs.

The complete disposable Neon lifecycle ran against a fresh source database and
a separately migrated restore database. On both databases it:

1. applied migrations `0000` through `0009`;
2. seeded lifecycle fixture version 3;
3. executed the real `listContentDocuments` repository through the pooled
   `shapewebs_admin_runtime` role;
4. proved workflow and locale filters;
5. proved owner/editor tenant isolation and customer denial;
6. proved latest-revision selection;
7. proved public readers could not read draft or review revisions;
8. passed the complete database security suite;
9. passed the failed-migration rollback probe;
10. produced byte-identical logical exports after restore; and
11. deleted both disposable Neon branches.

The source and restored fixture hash was:

`47a271ca7a76c2b45d6cc167dae7221e6caaabe6d09b4184bfa38309ac65f908`

## Supply-chain remediation

The final repository gate detected
[CVE-2026-14257](https://github.com/advisories/GHSA-mh99-v99m-4gvg), a
high-severity denial-of-service issue affecting every `brace-expansion`
release through 5.0.7. The affected Shapewebs paths were development tooling
through ESLint, Checkly, Lighthouse CI, and their transitive `minimatch`
versions.

The repository now:

- overrides all affected releases with the upstream fixed 5.0.8 release;
- tracks a minimal CommonJS compatibility patch so legacy and current
  `minimatch` consumers can share the fixed release;
- runs a deterministic compatibility and output-bound check during
  `pnpm verify`; and
- explicitly excludes only 5.0.8 from the minimum-release-age delay because it
  is the reviewed security release.

The compatibility verifier, ESLint, Knip, Checkly resource compilation,
Lighthouse CLI loading, and `pnpm audit` all passed. The audit reports no known
vulnerabilities.

`pnpm clean:artifacts` then removed only the eight known generated artifact
paths. A frozen offline pnpm 10.17.1 install accepted the resulting lockfile,
`git diff --check` passed, and the worktree retained only the intended source,
migration, test, documentation, lockfile, and compatibility-patch changes.

## Residual gates

- Migration `0009` has not been applied to the persistent staging branch.
- The branch has not been merged or deployed.
- The fixed staging applications remain on the previous known-good deployment
  because the Vercel Hobby team reached its rolling 100-deployment daily
  allowance.
- `pageKind` remains `null` in the Neon list DTO until the structured
  localization/editor schema is migrated.
- Document editor reads and writes, preview tokens, publishing, and all public
  content reads remain transitional Supabase paths.
- No production database, application, domain, or environment variable was
  changed.

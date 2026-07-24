# Foundation verification — 23 July 2026

- Branch: `codex/foundation`
- Production baseline: `33affde`
- Runtime tested: Node.js 24, pnpm 10.17.1, Next.js 16.2.11
- Target: local production builds, not the live Shapewebs deployment

## Correctness and build gates

The following commands pass:

```bash
corepack pnpm install --frozen-lockfile
corepack pnpm format:check
corepack pnpm lint
corepack pnpm lint:docs
corepack pnpm typecheck
corepack pnpm test:coverage
corepack pnpm check:boundaries
corepack pnpm check:deps
corepack pnpm check:cycles
corepack pnpm audit
corepack pnpm build:webpack
corepack pnpm build
corepack pnpm test:e2e
corepack pnpm test:performance
```

Both applications pass the default Turbopack production build. Webpack also
passes as a separate client/server boundary check. The public `/` route is
prerendered; protected admin routes are request-rendered.

The complete pnpm audit and an independent OSV-Scanner 2.4.0 scan of
`pnpm-lock.yaml` report no known vulnerabilities. The baseline reported 29
findings, including 15 high-severity findings.

Vitest runs 15 unit cases. Coverage is 100% for statements, functions, and
lines, and 96.87% for branches across the redirect, security-header, and
rate-limit units currently in scope. Knip reports no unused file, export, or
direct dependency and no production dependency cycle. The TypeScript-AST
boundary checker validates all four current Client Component entry graphs.

## HTTP and failure-mode checks

Checks against local production servers confirmed:

- `/` returns `200`, a Next.js prerender cache hit, and
  `Cache-Control: s-maxage=31536000`;
- `/readme` returns a real `404`;
- `X-Powered-By` is absent;
- production CSP no longer includes `unsafe-eval`;
- `/dashboard` returns `503` with `Cache-Control: no-store` when admin auth
  configuration is missing;
- the contact endpoint returns `503` rather than a success response when
  production captcha or persistence configuration is missing;
- all admin routes, including `/audit` and `/submissions`, are covered by the
  authentication proxy.

Local development retains an explicit setup mode. Non-development
environments fail closed.

Playwright runs nine Chromium tests. They cover the semantic homepage,
third-party requests, mobile navigation, WCAG A/AA checks on `/`, `/contact`,
and the open navigation, response headers, the removed placeholder route,
unconfigured admin access, and malformed/unavailable form behavior. All nine
pass. Axe reports no automatically detectable WCAG A/AA violation in the three
tested states.

## Lighthouse

Lighthouse 12.6.1 (through Lighthouse CI 0.15.1) ran three times against a local production server using
mobile emulation. The median is reported, following the planned CI method.

| Measure                  |    Median |
| ------------------------ | --------: |
| Performance              |        96 |
| Accessibility            |       100 |
| Best practices           |       100 |
| SEO                      |       100 |
| First Contentful Paint   |    0.93 s |
| Largest Contentful Paint |    2.35 s |
| Total Blocking Time      |    137 ms |
| Cumulative Layout Shift  |         0 |
| Speed Index              |    0.93 s |
| Total transfer           | 188.0 KiB |
| JavaScript transfer      | 154.2 KiB |

The three performance scores were 96, 96, and 98. Accessibility, best
practices, and SEO scored 100 in all three runs.

The homepage and global marketing shell contain no Client Components. The
route-specific shell chunk transfers approximately 3.8 KiB; the remaining
JavaScript is the Next.js App Router runtime. The enforced total-script ceiling
is 165,000 bytes, leaving roughly 7 KiB above the measured 157,906-byte
framework-plus-route baseline. The total-transfer ceiling is 210,000 bytes.
This calibration replaces the unmeasurable 130 KiB draft target explicitly in
[ADR 0002](../decisions/0002-public-performance-budget.md).

## Visual and semantic checks

The homepage was inspected at desktop and 390-by-844 mobile viewports:

- exactly one `main` and one `h1` are present;
- the primary call to action is a normal link to `/contact`;
- the document has no horizontal overflow at 390 px;
- heading levels and landmarks are ordered;
- the closed native mobile menu is absent from the accessibility tree;
- the open mobile menu exposes a labelled navigation landmark;
- dark presentation follows `prefers-color-scheme` without client JavaScript;
- reduced-motion preferences disable the remaining decorative transitions.

## CI and supply-chain checks

`quality.yml` reproduces the full local gate on pull requests and `main`.
`security.yml` runs OSV on pull requests, `main`, and weekly. CodeQL runs for a
public repository or when the `ENABLE_CODEQL` repository variable is enabled
for a private repository with the required GitHub license.

Every external GitHub Action and reusable workflow is pinned to a full commit
SHA. Dependabot checks npm and GitHub Actions weekly. actionlint 1.7.12 reports
no workflow error.

## Deferred security work

This repair pull request does not claim the final security architecture. The
following remain explicit release work:

- replace Supabase with Better Auth, Neon, and Drizzle only after negative
  authorization and migration tests exist;
- remove broad Supabase and image origins from the public CSP;
- replace the remaining `unsafe-inline` CSP allowance with a tested nonce or
  hash strategy;
- replace the in-memory form rate limiter with a distributed production
  control;
- add disposable Neon database authorization tests with the migration;
- add controlled-staging ZAP and load tests after staging exists.

See [Phase 0](../plans/phase-0-foundation.md) for the sequenced migration.

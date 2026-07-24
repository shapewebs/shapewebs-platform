# OWASP ASVS 5.0 control matrix

- Target: Level 2 for authenticated/stateful flows; Level 1 for static public
  pages
- Status values: `implemented`, `partial`, `planned`, `not applicable`,
  `accepted risk`
- Review cadence: quarterly and at each release gate

This matrix groups related ASVS requirements for engineering orientation. The
exact, version-qualified requirement register and pinned official catalog index
are maintained in `assurance/asvs`. The structural check runs in `pnpm verify`;
the stricter production launch gate fails while any target requirement remains
unreviewed.

| Control area                                 | Target | Status      | Implementation/evidence                                                                                               | Owner        |
| -------------------------------------------- | ------ | ----------- | --------------------------------------------------------------------------------------------------------------------- | ------------ |
| Architecture and trust boundaries            | L2     | Implemented | `docs/security/threat-model.md`, split applications and packages                                                      | Owner        |
| Secure development lifecycle                 | L2     | Implemented | Required CI, roadmap, ADRs, PR template, repository ruleset                                                           | Owner        |
| Authentication library                       | L2     | Implemented | Admin-only Better Auth route, Drizzle adapter, Google-only UI, fail-closed environment validation                     | Owner        |
| OAuth state, PKCE and exact callback origins | L2     | Partial     | Better Auth protocol handling and exact-origin validation; fixed staging Google client still requires setup           | Owner        |
| Public registration disabled                 | L2     | Implemented | Email/password paths disabled; only allowlisted Google users can create users/sessions                                | Owner        |
| MFA and administrative step-up               | L2     | Partial     | TOTP enrollment and server-enforced OAuth step-up implemented; fixed-staging journey still requires provider          | Owner        |
| Session cookie attributes                    | L2     | Partial     | Host-only Secure/HttpOnly/SameSite policy implemented; deployed cookie inspection remains a launch gate               | Owner        |
| Session expiry and revocation                | L2     | Implemented | Fixed 8-hour expiry, 30-minute inactivity, revocation, database negative scenarios, configuration unit tests          | Owner        |
| Per-entry-point authorization                | L2     | Partial     | Migrated admin/lead paths re-authorize; transitional Supabase CMS paths still require replacement                     | Owner        |
| Tenant isolation                             | L2     | Implemented | Forced RLS, transaction-local context, role and cross-tenant negative Neon suite                                      | Owner        |
| Minimal DTO/data exposure                    | L2     | Partial     | Lead repository returns explicit DTOs and worker fields; remaining CMS repositories are pending                       | Owner        |
| Input validation and size limits             | L2     | Partial     | Bounded JSON/webhook bodies, Zod forms, exact UUIDs and provider validation; uploads remain pending                   | Owner        |
| Output encoding and content safety           | L2     | Partial     | React encoding and escaped minimal emails; structured CMS enforcement remains pending                                 | Owner        |
| CSRF protection                              | L2     | Partial     | Exact Better Auth origins, SameSite cookies and step-up Origin validation; provider E2E remains pending               | Owner        |
| File upload safety                           | L2     | Planned     | Blob boundary and type/signature/size/dimension validation contract pending                                           | Owner        |
| Cryptography and secrets                     | L2     | Partial     | Provider primitives, encrypted OAuth tokens, push protection and staging bypass rotation; provider drills pending     | Owner        |
| Security headers and CSP                     | L2/L1  | Implemented | Nonce admin CSP, constrained public CSP and browser tests; public `unsafe-inline` tracked below                       | Owner        |
| Logging and audit                            | L2     | Implemented | Typed redacted logs, redaction tests, correlated traces and append-only authentication/audit events                   | Owner        |
| Error handling                               | L2     | Partial     | Fail-closed routes and provider/transaction failure tests; controlled staging alert exercise pending                  | Owner        |
| Data protection and retention                | L2     | Partial     | Retention/processor register, data-minimized email and strict staging synthetic cleanup; production schedules pending | Owner        |
| Communication security                       | L2     | Implemented | HTTPS/HSTS, exact provider origins, secure production cookies                                                         | Vercel/Owner |
| Malicious automation protection              | L2     | Partial     | Server Turnstile and bounded local limits; Vercel WAF/distributed limits pending                                      | Owner        |
| Supply-chain security                        | L2     | Implemented | Lockfile, OSV, CodeQL, dependency review, SHA pins and periodic Scorecard                                             | Owner        |
| Backup, restore and rollback                 | L2     | Partial     | Disposable migration/restore verified; paid production project and recovery drill pending                             | Owner        |

## Accepted risk: static public CSP

- Risk: production public `script-src` currently permits `unsafe-inline`.
- Reason: nonce CSP forces dynamic rendering and removes the static/CDN
  performance model. Experimental webpack-only SRI would weaken the dual
  Turbopack/webpack release gate.
- Compensating controls: no arbitrary HTML, no third-party marketing scripts,
  structured content, output encoding, restrictive remaining CSP directives,
  dependency controls and browser tests.
- Owner: Shapewebs owner.
- Expiry/review: 24 October 2026, every Next.js minor upgrade, and before
  production launch.

An accepted risk is invalid without an owner, compensating controls, an expiry
or review date, and evidence that the release gate reviewed it.

## Completion rule

This grouped matrix is the live engineering summary, not a claim of
certification. The official stable ASVS 5.0.0 machine-readable catalog is
pinned by release asset and SHA-256. Before production, every target requirement
in `assurance/asvs/evidence.json` must link to one of:

- implementation and automated evidence;
- a named manual verification with a dated result;
- a documented accepted risk with owner and expiry; or
- a justified not-applicable decision.

No applicable requirement may remain unmapped at the launch gate.

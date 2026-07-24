# OWASP ASVS 5.0 control matrix

- Target: Level 2 for authenticated/stateful flows; Level 1 for static public
  pages
- Status values: `implemented`, `partial`, `planned`, `not applicable`,
  `accepted risk`
- Review cadence: quarterly and at each release gate

This matrix groups related ASVS requirements. The exact ASVS requirement IDs
must be added when the official machine-readable 5.0 requirement catalog is
checked into the assurance process.

| Control area                                 | Target | Status      | Implementation/evidence                                                           | Owner        |
| -------------------------------------------- | ------ | ----------- | --------------------------------------------------------------------------------- | ------------ |
| Architecture and trust boundaries            | L2     | Implemented | `docs/security/threat-model.md`, split applications and packages                  | Owner        |
| Secure development lifecycle                 | L2     | Implemented | Required CI, roadmap, ADRs, review template                                       | Owner        |
| Authentication library                       | L2     | Partial     | Better Auth package exists; admin route/UI pending                                | Owner        |
| OAuth state, PKCE and exact callback origins | L2     | Partial     | Better Auth handles protocol; exact environment configuration pending             | Owner        |
| Public registration disabled                 | L2     | Partial     | Email/password disabled in factory; mounted route tests pending                   | Owner        |
| MFA and administrative step-up               | L2     | Planned     | Better Auth TOTP foundation; server-enforced social-login step-up pending         | Owner        |
| Session cookie attributes                    | L2     | Partial     | Secure/HttpOnly/SameSite factory config; deployed header tests pending            | Owner        |
| Session expiry and revocation                | L2     | Partial     | Eight-hour database sessions; inactivity/revocation tests pending                 | Owner        |
| Per-entry-point authorization                | L2     | Partial     | Next.js boundary rule adopted; Supabase actions remain transitional               | Owner        |
| Tenant isolation                             | L2     | Implemented | Forced RLS and negative Neon authorization suite                                  | Owner        |
| Minimal DTO/data exposure                    | L2     | Planned     | Repository contracts required before CMS migration                                | Owner        |
| Input validation and size limits             | L2     | Partial     | Zod form validation; explicit byte/content-type limits pending                    | Owner        |
| Output encoding and content safety           | L2     | Partial     | React encoding and no scripts; structured CMS enforcement pending                 | Owner        |
| CSRF protection                              | L2     | Partial     | Next.js and Better Auth origin checks; browser tests pending                      | Owner        |
| File upload safety                           | L2     | Planned     | Blob boundary and validation contract pending                                     | Owner        |
| Cryptography and secrets                     | L2     | Partial     | Provider primitives, environment secrets, push protection; rotation drill pending | Owner        |
| Security headers and CSP                     | L2/L1  | Implemented | Header builders and browser tests; public `unsafe-inline` is tracked below        | Owner        |
| Logging and audit                            | L2     | Partial     | Typed redacted logger; durable audit/event integration pending                    | Owner        |
| Error handling                               | L2     | Partial     | Fail-closed routes; global error UI and provider failure coverage pending         | Owner        |
| Data protection and retention                | L2     | Partial     | Retention register exists; deletion jobs pending                                  | Owner        |
| Communication security                       | L2     | Implemented | HTTPS/HSTS and secure production cookies                                          | Vercel/Owner |
| Malicious automation protection              | L2     | Partial     | Turnstile and bounded local limiter; WAF/distributed limits pending               | Owner        |
| Supply-chain security                        | L2     | Implemented | Lockfile, OSV, CodeQL, dependency review, SHA pins, Scorecard                     | Owner        |
| Backup, restore and rollback                 | L2     | Partial     | Synthetic restore verified; production drill pending                              | Owner        |

## Accepted risk: static public CSP

- Risk: production public `script-src` currently permits `unsafe-inline`.
- Reason: nonce CSP forces dynamic rendering and removes the static/CDN
  performance model. Experimental webpack-only SRI would weaken the dual
  Turbopack/webpack release gate.
- Compensating controls: no arbitrary HTML, no third-party marketing scripts,
  structured content, output encoding, restrictive remaining CSP directives,
  dependency controls and browser tests.
- Owner: Shapewebs owner.
- Expiry/review: every Next.js minor upgrade and before production launch.

An accepted risk is invalid without an owner, compensating controls, an expiry
or review date, and evidence that the release gate reviewed it.

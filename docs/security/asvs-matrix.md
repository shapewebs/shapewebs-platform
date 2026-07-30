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
unreviewed. The current exact register contains 253 Level 1/Level 2
requirements: all 253 are reviewed and zero remain unreviewed.

| Control area                                 | Target | Status      | Implementation/evidence                                                                                                                                    | Owner        |
| -------------------------------------------- | ------ | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| Architecture and trust boundaries            | L2     | Implemented | `docs/security/threat-model.md`, split applications and packages                                                                                           | Owner        |
| Secure development lifecycle                 | L2     | Implemented | Required CI, roadmap, ADRs, PR template, repository ruleset                                                                                                | Owner        |
| Authentication library                       | L2     | Implemented | Isolated admin/portal Better Auth instances, Drizzle adapters, multi-method UI and fail-closed environment validation                                      | Owner        |
| Authentication/session documentation         | L2     | Implemented | Versioned pathway, attack-resistance, timeout, federation, concurrency, step-up and recovery contract                                                      | Owner        |
| OAuth state, PKCE and exact callback origins | L2     | Implemented | Better Auth protocol handling, exact-origin validation and fixed-staging Google client verification                                                        | Owner        |
| Public registration disabled                 | L2     | Implemented | Employee allowlist and customer invitation wrappers gate creation; raw signup, implicit linking and browser set-password paths are disabled                | Owner        |
| Employee multi-method authentication         | L2     | Partial     | Allowlisted Google/password methods, durable verified email, explicit session-bound linking and mandatory TOTP are implemented; staging proof is pending   | Owner        |
| Customer invitation and credentials          | L2     | Partial     | One-time invitation, mailbox-owned password activation, Google grant, throttles and session limits pass disposable tests; routes/providers remain disabled | Owner        |
| MFA and administrative step-up               | L2     | Implemented | Exact-step TOTP, global one-time counters, lockout and full fixed-staging Google-to-TOTP journey proven                                                    | Owner        |
| Session cookie attributes                    | L2     | Implemented | `__Host-`, Secure, HttpOnly, SameSite=Lax and host-only policies with automated evidence                                                                   | Owner        |
| Session expiry and revocation                | L2     | Implemented | Fixed 8-hour expiry, 30-minute inactivity, 256-bit reauth rotation and owner-controlled session termination proven                                         | Owner        |
| Per-entry-point authorization                | L2     | Implemented | Admin, content, media, lead, preview and webhook entry points re-authorize or authenticate independently; provider commands bind the trusted actor/session | Owner        |
| Tenant isolation                             | L2     | Implemented | Forced RLS, transaction-local context, command/preview policies and cross-tenant negative Neon suite                                                       | Owner        |
| Minimal DTO/data exposure                    | L2     | Implemented | Repository boundaries return explicit DTOs; Sanity projections and webhook payloads are allowlisted                                                        | Owner        |
| Input validation and size limits             | L2     | Implemented | Bounded JSON/raw bodies, strict schemas, decoded-image limits, exact provider scope and safe public resource identifiers                                   | Owner        |
| Output encoding and content safety           | L2     | Implemented | React/email escaping, owned Portable Text rendering, prohibited arbitrary HTML/scripts and internal-link protocol validation                               | Owner        |
| CSRF protection                              | L2     | Partial     | Exact Better Auth origins, SameSite cookies and step-up Origin validation; provider E2E remains pending                                                    | Owner        |
| File upload safety                           | L2     | Partial     | Public Sanity images are decoded and checked for type/size/dimensions; private Blob upload and delivery remains a customer-portal launch gate              | Owner        |
| Cryptography and secrets                     | L2     | Partial     | Provider primitives, encrypted OAuth tokens, push protection and staging bypass rotation; provider drills pending                                          | Owner        |
| Security headers and CSP                     | L2/L1  | Implemented | Nonce admin CSP, constrained public CSP and browser tests; public `unsafe-inline` tracked below                                                            | Owner        |
| Logging and audit                            | L2     | Implemented | Typed redacted logs, redaction tests, correlated traces and append-only authentication/audit events                                                        | Owner        |
| Error handling                               | L2     | Partial     | Fail-closed routes and provider/transaction failure tests; controlled staging alert exercise pending                                                       | Owner        |
| Data protection and retention                | L2     | Partial     | Retention/processor register, data-minimized email and strict staging synthetic cleanup; production schedules pending                                      | Owner        |
| Communication security                       | L2     | Implemented | HTTPS/HSTS, exact provider origins, secure production cookies                                                                                              | Vercel/Owner |
| Malicious automation protection              | L2     | Partial     | Server Turnstile and bounded local limits; Vercel WAF/distributed limits pending                                                                           | Owner        |
| Supply-chain security                        | L2     | Implemented | Lockfile, OSV, CodeQL, dependency review, SHA pins and periodic Scorecard                                                                                  | Owner        |
| Backup, restore and rollback                 | L2     | Partial     | Disposable migration/restore verified; paid production project and recovery drill pending                                                                  | Owner        |

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

## Reviewed ZAP passive-baseline dispositions

Rule-wide findings remain visible as `INFO` in every ZAP report. They are not
ignored. The one endpoint-specific disposition below excludes only the exact
provider-owned optimizer URL while preserving that scan rule everywhere else.
The checked-in dispositions expire unless they are reviewed by the dates and
triggers below.

| ZAP alert                                           | Disposition                      | Rationale and compensating controls                                                                                                                                                                                                                                                                                                                                                          | Owner           | Expiry/review                                                                      |
| --------------------------------------------------- | -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- | ---------------------------------------------------------------------------------- |
| `10055` CSP: `script-src unsafe-inline`             | Accepted risk                    | Same static-public-CSP tradeoff documented above. No arbitrary HTML or marketing scripts; structured React rendering, output encoding, dependency controls and browser tests remain mandatory.                                                                                                                                                                                               | Shapewebs owner | 24 October 2026, every Next.js minor upgrade, and before production launch         |
| `10098` Cross-Domain Misconfiguration               | Accepted risk                    | Vercel adds `Access-Control-Allow-Origin: *` to the scanned public static pages and assets. They contain no authenticated, tenant-specific or secret data; admin remains on a separate origin with server-enforced authorization. Reassess before any credentialed or sensitive public response is introduced.                                                                               | Shapewebs owner | 24 October 2026 and before authenticated or sensitive public reads                 |
| `90004` Cross-Origin-Embedder-Policy missing        | Not applicable to current design | The public site does not use cross-origin-isolated browser capabilities. Enabling `require-corp` would risk blocking the explicitly allowlisted Turnstile integration; CSP, COOP, CORP, Permissions Policy and exact provider origins remain in force. Reassess before adding cross-origin-isolated APIs or changing third-party embeds.                                                     | Shapewebs owner | 24 October 2026 and before cross-origin-isolated APIs or third-party embed changes |
| `10021` on the exact Vercel `/_next/image` endpoint | URL-scoped false positive        | Vercel's managed optimizer strips application-configured `X-Content-Type-Options`, but returns an explicit image MIME type, forced attachment disposition, and `script-src 'none'; frame-src 'none'; sandbox` CSP. The checked-in `OUTOFSCOPE` regex matches only that endpoint on the fixed staging host; alert `10021` remains a release failure for all application-controlled responses. | Shapewebs owner | Every Next.js or Vercel optimizer change, 24 October 2026, and before production   |

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

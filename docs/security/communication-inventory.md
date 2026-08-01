# Communication and service-identity inventory

- Owner: Shapewebs owner
- Review cadence: quarterly, before a new integration, and after an origin,
  credential or provider change
- Rule: every connection is encrypted, uses an exact destination, refuses
  unintended redirects, and carries only the minimum credential and data
  required by the receiver

## Approved communication paths

| Caller                  | Receiver             | Purpose and data                                                                     | Authentication                                                                                                  | Transport and destination control                                                               |
| ----------------------- | -------------------- | ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Public browser          | `shapewebs-web`      | Public pages and bounded lead forms                                                  | None; Turnstile protects lead acceptance                                                                        | HTTPS on the fixed site origin; HSTS in production                                              |
| Account browser         | `shapewebs-admin`    | Customer/employee sign-in, customer workspace, TOTP and CMS operations               | Secure host-only Better Auth reference cookie; membership authorization; fresh TOTP for sensitive staff actions | HTTPS on the fixed admin origin; exact trusted origins and nonce CSP                            |
| `shapewebs-web`         | Neon                 | Published-content reads, preview activation and atomic lead/outbox writes            | Least-privilege web runtime role                                                                                | Provider TLS endpoint; pooled runtime connection; no redirect-capable HTTP hop                  |
| `shapewebs-admin`       | Neon                 | Canonical authentication, staff authorization, CMS, audit, settings and outbox work  | Least-privilege admin runtime role                                                                              | Provider TLS endpoint; pooled runtime connection; transaction-local authorization context       |
| `shapewebs-admin`       | Neon                 | Customer memberships, assigned projects and customer session-security state          | Separate least-privilege customer runtime role with forced RLS                                                  | Provider TLS endpoint; pooled runtime connection; server-created customer authorization context |
| `shapewebs-web`         | Sanity               | Published public content; one exact draft revision during an active private preview  | No credential for published reads; scoped server-only Viewer token for preview                                  | Exact Sanity API/CDN origins over TLS; fixed project and `staging` dataset                      |
| `shapewebs-admin`       | Sanity               | Structured drafts, publishing and normalized public website media                    | Scoped server-only Editor robot token; fresh TOTP for publish/unpublish                                         | Exact Sanity API origin over TLS; fixed project and `staging` dataset                           |
| Sanity                  | `shapewebs-admin`    | Bounded public-content change event for cache invalidation and audit                 | Raw-body signature, exact project/dataset headers and durable event deduplication                               | Exact fixed HTTPS webhook route through a dedicated staging bypass                              |
| `shapewebs-admin`       | `shapewebs-web`      | CMS publish, unpublish and rollback cache revalidation                               | Short-lived Vercel workload OIDC plus an independent application secret                                         | Exact configured public origin; POST; redirects rejected; five-second timeout                   |
| GitHub Actions/migrator | Neon                 | Disposable migrations, security verification, export and restore                     | Dedicated owner/migrator credential in protected stores                                                         | Direct provider TLS endpoint; no production credential in previews                              |
| Account browser/server  | Google               | Canonical authorization-code OAuth and verified ID-token claims                      | One exact OAuth client/callback, state/PKCE/nonce handling and server-held client secret                        | Exact Google endpoints and callback origin over publicly trusted TLS                            |
| `shapewebs-web`         | Cloudflare Turnstile | Single-use lead challenge, expected action/hostname and pseudonymous client address  | Widget secret scoped to the approved hostname                                                                   | Exact Siteverify HTTPS endpoint; five-second timeout; redirects rejected                        |
| `shapewebs-admin`       | Cloudflare Turnstile | Single-use account challenge for invitation, recovery and abuse-sensitive operations | Distinct widget secret scoped to the exact admin hostname and expected action                                   | Exact Siteverify HTTPS endpoint; five-second timeout; redirects rejected                        |
| Cloudflare Worker       | `shapewebs-admin`    | Bounded outbox trigger                                                               | Dedicated route bearer plus staging-only Vercel bypass                                                          | Exact fixed HTTPS route; POST; manual redirect policy; 25-second timeout                        |
| `shapewebs-admin`       | Resend               | Data-minimized lead and authentication email                                         | Domain- and environment-restricted API key                                                                      | Exact provider HTTPS SDK endpoint; bounded timeout and durable application idempotency          |
| Resend                  | `shapewebs-admin`    | Raw signed delivery events                                                           | Webhook signature, timestamp and event-ID deduplication                                                         | Exact fixed HTTPS webhook route through a dedicated staging bypass                              |
| Cloudflare Worker       | Checkly              | Outbox completion heartbeat                                                          | Unpredictable heartbeat URL stored as a Worker secret                                                           | Exact `https://ping.checklyhq.com` origin; POST; manual redirects; five-second timeout          |
| Checkly                 | Public/admin staging | Synthetic availability and lead journeys                                             | Dedicated monitor credentials and distinct Vercel bypass values                                                 | Exact allowlisted staging origins over HTTPS                                                    |
| GitHub                  | Vercel               | Reviewed deployments                                                                 | Vercel Git integration and protected branch policy                                                              | Provider-managed authenticated TLS path                                                         |

No deployed Shapewebs runtime executes operating-system commands, follows an
untrusted redirect, accepts a caller-supplied outbound origin, or uses a
default provider credential.

## Unified customer paths pending fixed-staging evidence

The active branch moves the customer paths into `shapewebs-admin` at the one
canonical account origin. They remain launch-gated until migration `0019`, the
fixed-staging providers and browser evidence pass. No separate portal origin,
cookie, OAuth client, Better Auth instance or deployment is permitted.

| Caller/server     | Receiver             | Purpose and minimized data                                          | Required authentication and destination control                                        |
| ----------------- | -------------------- | ------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Customer browser  | `shapewebs-admin`    | Invitation exchange, Google/password login and protected project UI | Exact admin HTTPS origin; canonical host-only account cookie; Turnstile where required |
| `shapewebs-admin` | HIBP Pwned Passwords | Five-character SHA-1 range prefix only                              | Fixed HTTPS range endpoint, three-second timeout and bounded padded response           |
| Auth-email worker | Resend               | Minimal invitation, verification, reset and security notices        | Restricted environment key, durable idempotency and exact provider endpoint            |

## Service-identity rules

- Database identities are separated into owner/migrator, admin runtime,
  customer runtime, web runtime and public-read roles. One authenticated app
  selects the appropriate repository; forced RLS and transaction-local context
  provide the second authorization boundary.
- Provider keys are distinct by provider, purpose and environment. Sanity
  draft-read and content-write capabilities use separate robot identities. Staging
  credentials cannot authorize production resources.
- The public staging project trusts only admin Preview workload tokens for
  Preview access. It does not trust admin Preview tokens for production, and
  the receiving route independently verifies its application secret.
- External destinations are constants or validated exact origins. User input
  may select a bounded internal path but never an outbound host.
- Long-lived scheduler route credentials are a temporary accepted risk.
  Compensating controls are independent 32-character-or-longer secrets, exact
  route and method, TLS, encrypted stores, rotation, bounded responses and
  heartbeat monitoring. Replace them with short-lived workload identity,
  provider-native OIDC or mutually authenticated service identity when the
  selected plans support it.
- Publicly trusted certificates are used for public and provider endpoints.
  Shapewebs currently operates no private CA, self-signed service certificate
  or client-certificate authentication path.
- Secrets are stored only in Vercel, Cloudflare, GitHub, Neon, Google, Sanity,
  Resend, Checkly or the approved local keychain. No secret belongs in source,
  build output, logs, URLs or browser-readable environment variables.

## Transport verification

The fixed staging origins were manually checked on 25 July 2026:

- TLS 1.0 and 1.1 handshakes were rejected;
- TLS 1.2 and 1.3 handshakes succeeded with authenticated AEAD suites;
- HTTP `TRACE` returned `405`; and
- HSTS and HTTP-to-HTTPS redirection were active.

Vercel owns the public edge, certificate chain, HTTP parser and cipher
configuration. Shapewebs still verifies the application controls behind that
edge, rejects untrusted redirects in every server-to-server fetch, keeps
secrets out of URLs and treats provider configuration changes as an assurance
review trigger.

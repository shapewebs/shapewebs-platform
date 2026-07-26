# Communication and service-identity inventory

- Owner: Shapewebs owner
- Review cadence: quarterly, before a new integration, and after an origin,
  credential or provider change
- Rule: every connection is encrypted, uses an exact destination, refuses
  unintended redirects, and carries only the minimum credential and data
  required by the receiver

## Approved communication paths

| Caller                  | Receiver             | Purpose and data                                                                     | Authentication                                                                  | Transport and destination control                                                         |
| ----------------------- | -------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Public browser          | `shapewebs-web`      | Public pages and bounded lead forms                                                  | None; Turnstile protects lead acceptance                                        | HTTPS on the fixed site origin; HSTS in production                                        |
| Admin browser           | `shapewebs-admin`    | Google sign-in, TOTP, CMS reads and mutations                                        | Secure host-only Better Auth reference cookie; fresh TOTP for sensitive actions | HTTPS on the fixed admin origin; exact trusted origins and nonce CSP                      |
| `shapewebs-web`         | Neon                 | Published-content reads, preview activation and atomic lead/outbox writes            | Least-privilege web runtime role                                                | Provider TLS endpoint; pooled runtime connection; no redirect-capable HTTP hop            |
| `shapewebs-admin`       | Neon                 | Authentication, authorization, CMS, audit, settings and outbox work                  | Separate least-privilege admin runtime role                                     | Provider TLS endpoint; pooled runtime connection; transaction-local authorization context |
| `shapewebs-admin`       | `shapewebs-web`      | CMS publish, unpublish and rollback cache revalidation                               | Short-lived Vercel workload OIDC plus an independent application secret         | Exact configured public origin; POST; redirects rejected; five-second timeout             |
| GitHub Actions/migrator | Neon                 | Disposable migrations, security verification, export and restore                     | Dedicated owner/migrator credential in protected stores                         | Direct provider TLS endpoint; no production credential in previews                        |
| Admin browser/server    | Google               | Authorization-code OAuth and verified ID-token claims                                | Exact OAuth client, state/PKCE/nonce handling and server-held client secret     | Exact Google endpoints and callback origin over publicly trusted TLS                      |
| `shapewebs-web`         | Cloudflare Turnstile | Single-use challenge token, expected action/hostname and pseudonymous client address | Widget secret scoped to the approved hostname                                   | Exact Siteverify HTTPS endpoint; five-second timeout; redirects rejected                  |
| Cloudflare Worker       | `shapewebs-admin`    | Bounded outbox trigger                                                               | Dedicated route bearer plus staging-only Vercel bypass                          | Exact fixed HTTPS route; POST; manual redirect policy; 25-second timeout                  |
| `shapewebs-admin`       | Resend               | Data-minimized lead notification                                                     | Domain- and environment-restricted API key                                      | Exact provider HTTPS SDK endpoint; bounded timeout and durable application idempotency    |
| Resend                  | `shapewebs-admin`    | Raw signed delivery events                                                           | Webhook signature, timestamp and event-ID deduplication                         | Exact fixed HTTPS webhook route through a dedicated staging bypass                        |
| Cloudflare Worker       | Checkly              | Outbox completion heartbeat                                                          | Unpredictable heartbeat URL stored as a Worker secret                           | Exact `https://ping.checklyhq.com` origin; POST; manual redirects; five-second timeout    |
| Checkly                 | Public/admin staging | Synthetic availability and lead journeys                                             | Dedicated monitor credentials and distinct Vercel bypass values                 | Exact allowlisted staging origins over HTTPS                                              |
| GitHub                  | Vercel               | Reviewed deployments                                                                 | Vercel Git integration and protected branch policy                              | Provider-managed authenticated TLS path                                                   |

No deployed Shapewebs runtime executes operating-system commands, follows an
untrusted redirect, accepts a caller-supplied outbound origin, or uses a
default provider credential.

## Service-identity rules

- Database identities are separated into owner/migrator, admin runtime, web
  runtime and public-read roles. Forced RLS and transaction-local context
  provide the second authorization boundary.
- Provider keys are distinct by provider, purpose and environment. Staging
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
- Secrets are stored only in Vercel, Cloudflare, GitHub, Neon, Google, Resend,
  Checkly or the approved local keychain. No secret belongs in source, build
  output, logs, URLs or browser-readable environment variables.

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

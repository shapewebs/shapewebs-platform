# OWASP ASVS 5.0 Level 2 review — 25 July 2026

## Scope and method

This review dispositions every Level 1 and Level 2 requirement in the pinned
OWASP ASVS 5.0.0 catalog. Evidence combines source inspection, automated unit,
integration and browser tests, disposable Neon verification, provider
configuration, fixed-staging probes and explicit accepted-risk records.

The review does not claim third-party certification. Production remains gated
by the commercial infrastructure, recovery and operational items in
`PROJECT_STATUS.md` and the roadmap.

## Hardening completed by the review

- Administrative production cookies use the `__Host-` prefix, `Secure`,
  `HttpOnly`, `SameSite=Lax`, path `/` and no `Domain` attribute.
- Successful administrative logout invalidates the reference session and
  clears browser cache, cookies and storage for the admin origin.
- Lead, admin, CMS and content DTO schemas reject unknown fields instead of
  silently accepting them.
- Private preview activation moved from a query-string `GET` to a bounded
  `POST` body containing exactly one one-time token.
- Preview sessions no longer depend on the framework draft cookie. They use a
  dedicated `__Host-sw-preview-token` cookie and an explicit POST exit.
- The outbox worker invokes a POST-only mutation route.
- Server-to-server HTTP calls use exact destinations, bounded timeouts and
  explicit redirect rejection.
- Communication, service identity, data classification, caching, retention and
  resource-demand controls are version controlled.

## Dated manual evidence

### Authentication

The full fixed-staging Google OAuth, local TOTP enrollment, successful step-up
and protected-dashboard journey passed. The runtime returned `200` for the
step-up and protected CMS routes and emitted a redacted successful audit event.
See `docs/audits/authentication-session-verification-2026-07-25.md`.

### Transport and edge behavior

Manual probes of the fixed staging origins established:

- TLS 1.0 and TLS 1.1 were rejected;
- TLS 1.2 and TLS 1.3 were accepted with authenticated AEAD suites;
- HTTP `TRACE` returned `405`;
- HSTS and HTTP-to-HTTPS redirection were active; and
- no source-control metadata, documentation console or detailed dependency
  health payload was exposed through an application route.

Vercel owns the public HTTP parser, certificate chain and edge protocol
configuration. Conflicting request-framing probes against protected staging
were intercepted at the provider protection layer and therefore do not prove
application-parser behavior; request-smuggling protection remains
provider-managed evidence, not a custom parser claim.

### Supply chain and deployment

The reviewed branch uses a frozen lockfile, pinned GitHub Actions, dependency
review, OSV, CodeQL, secret scanning, push protection, package-boundary checks,
cycle checks and deterministic generation. Current branch audit and OSV checks
are clean. The old default branch alert inventory is not treated as current
staging dependency evidence and must be reevaluated when the foundation is
promoted.

## Time-limited accepted risks

### API HTTP-to-HTTPS redirect at the managed edge

Vercel redirects both pages and API requests arriving over HTTP. ASVS prefers
API callers to fail rather than transparently redirect. Shapewebs cannot
configure that distinction on the current managed edge plan. Compensating
controls are HSTS, hardcoded HTTPS endpoints, redirect refusal in every backend
client, Secure `__Host-` cookies, POST-only sensitive routes and no secrets in
URLs. Owner: Shapewebs owner. Expiry: 25 October 2026 or before production,
whichever comes first.

### Scheduler service authentication

The staging Cloudflare Worker uses two independently rotatable long-lived
secrets to reach one exact Vercel route. ASVS prefers short-lived individual
service credentials. Compensating controls are encrypted provider stores,
staging-only scope, exact HTTPS origin/path/method, 32-character-or-longer
values, manual redirect policy, bounded response parsing, heartbeat monitoring
and rotation procedures. Replace with workload OIDC, mTLS or provider-native
short-lived identity when supported. Owner: Shapewebs owner. Expiry:
25 October 2026 or before production.

### Log separation and export

Operational logs currently remain in independent Vercel, Cloudflare, Checkly,
Google, GitHub, Neon and Resend control planes while security audit events are
append-only in Neon. A paid immutable or logically separate centralized log
export with the required retention is a commercial production gate.
Compensating controls are structured redaction, separate provider access,
append-only durable audit events, external alerting and monthly review. Owner:
Shapewebs owner. Expiry: 25 October 2026 or before production.

The existing static-public-CSP accepted risk remains separately recorded in
`docs/security/asvs-matrix.md`.

## Revalidation triggers

Repeat this review before production; after changing the identity provider,
session library, database provider, deployment edge, worker authentication,
preview mechanism or log destination; after a Next.js security upgrade; or
when an accepted risk expires.

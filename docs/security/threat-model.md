# Shapewebs threat model

- Owner: Shapewebs owner
- Review cadence: quarterly and before every new trust boundary
- Assurance target: OWASP ASVS 5.0 Level 2 for stateful flows; Level 1 for
  static public pages

## System and trust boundaries

```mermaid
flowchart LR
  Visitor["Untrusted visitor browser"] --> Web["Public Next.js app"]
  Administrator["Administrator browser"] --> Admin["Admin Next.js app"]
  Web --> Turnstile["Cloudflare Turnstile"]
  Web --> NeonWeb["Neon web runtime role"]
  Admin --> BetterAuth["Better Auth"]
  BetterAuth --> Google["Google OAuth"]
  Admin --> NeonAdmin["Neon admin runtime role"]
  Admin --> Blob["Vercel Blob"]
  Admin --> Resend["Resend"]
  Resend --> Webhook["Signed webhook handler"]
  GitHub["GitHub and Actions"] --> Vercel["Vercel deployments"]
  GitHub --> NeonControl["Protected Neon lifecycle"]
  NeonWeb --> Database["Neon Postgres with forced RLS"]
  NeonAdmin --> Database
```

The browser, provider callbacks, form input, headers, cookies, webhooks, file
metadata, CMS content, CI input, and deployment previews are untrusted. Better
Auth sessions are identity evidence, not authorization evidence. Memberships,
roles, tenant assignment, resource ownership, and step-up freshness are
re-read from trusted server-side sources.

## Protected assets

- Domain, GitHub, Vercel, Neon, Google and Resend operator accounts.
- OAuth, database, storage, webhook, Turnstile and deployment secrets.
- Admin sessions, TOTP secrets, backup codes and recovery procedures.
- Lead/customer personal data and private customer files.
- Published content integrity, audit history and email-delivery state.
- Availability of the public site, lead path and administrative recovery.

## Threat scenarios and required controls

| Scenario                     | Boundary                 | Required prevention/detection                                                                       | Verification                                         |
| ---------------------------- | ------------------------ | --------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| Authorization or IDOR bypass | Browser → admin/data     | Server-owned authorization context, per-action checks, forced RLS, minimal DTOs                     | Anonymous, role and cross-tenant negative tests      |
| OAuth account takeover       | Google → Better Auth     | Exact origins/callbacks, allowlisted owner, state/PKCE, short admin session, mandatory TOTP step-up | OAuth-state and non-allowlisted-user tests           |
| Session theft/replay         | Browser → admin          | Secure HttpOnly host-only cookies, database sessions, revocation, inactivity and absolute expiry    | Expired/revoked/replayed-session tests               |
| CSRF                         | Browser → mutation       | Better Auth origin validation, Next.js Origin/Host checks, exact trusted origins, SameSite cookies  | Cross-origin POST tests                              |
| Stored content injection     | CMS → public site        | Structured content, no arbitrary scripts/HTML, output encoding, CSP                                 | Malicious-content and CSP tests                      |
| Malicious file               | Browser → Blob           | Server-owned key, type/signature/size/dimension validation, private/public separation               | Polyglot, oversize and type-mismatch tests           |
| Lead abuse                   | Browser → form           | Byte/content validation, Turnstile server verification, application and WAF rate limits             | Missing/reused token, flood and oversized-body tests |
| Lead loss                    | Web → Neon/Resend        | Atomic lead/outbox transaction; email is never the record of truth                                  | Database/provider/worker failure tests               |
| Webhook forgery/replay       | Resend → admin           | Signature verification, event-ID uniqueness, idempotent monotonic state handling                    | Invalid signature, duplicate and out-of-order tests  |
| Secret leakage               | Code/log/CI              | Push protection, secret scanning, typed redacted logging, least-privilege Actions                   | Seeded-secret and redaction tests                    |
| Supply-chain compromise      | Registry/Actions → build | Lockfile, SHA-pinned Actions, dependency review, OSV, CodeQL, Scorecard                             | Clean-runner CI                                      |
| Preview reaches real data    | Vercel → Neon            | Separate non-production project, disposable branches, no production secrets in previews             | Environment inventory and lifecycle test             |
| Destructive migration        | CI → Neon                | Protected environment, dedicated migrator, disposable migration/rollback/restore                    | Neon lifecycle gate                                  |
| Provider outage              | Vercel/Neon/Resend       | Timeouts, durable retries, degraded readiness, monitoring and rollback                              | Fault-injection tests                                |

## Abuse-case invariants

- Browser-supplied user, organization, role or step-up values are ignored.
- A UI-hidden action remains unauthorized when called directly.
- Validation confirms shape only; ownership is always resolved server-side.
- Successful lead acknowledgement means a durable lead and outbox row exist.
- Retried commands and webhook deliveries do not duplicate side effects.
- Public content reads never return drafts.
- A compromised web runtime cannot read auth, audit, private or cross-tenant
  data.
- A failed dependency does not cause a fail-open authorization decision.

## Change procedure

Every pull request that changes authentication, authorization, persistence,
uploads, forms, email, webhooks, deployment permissions or a provider must:

1. identify the changed trust boundary;
2. update this model and the ASVS matrix if the threat changes;
3. add a negative or failure-mode test;
4. state privacy, performance and rollback impact;
5. link the evidence in the pull request.

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

## Accepted future customer identity boundary

ADR 0004 defines a third, separately deployed customer portal. Its fail-closed
repository, CSP, environment, telemetry, health and CI boundaries are now
implemented. The separate customer identity schema, membership foreign keys,
portal SQL role, and forced-RLS tenant policies are implemented and verified
on disposable Neon branches. Customer-facing authentication, invitation,
credential, account-linking, and portal routes remain disabled and are not yet
counted as live staging evidence.

```mermaid
flowchart LR
  Customer["Untrusted customer browser"] --> Portal["Customer portal Next.js app"]
  Portal --> CustomerAuth["Customer Better Auth instance"]
  CustomerAuth --> GoogleCustomer["Dedicated customer Google OAuth client"]
  CustomerAuth --> CustomerAuthDb["customer_auth schema"]
  Portal --> PortalRuntime["Least-privilege portal runtime role"]
  PortalRuntime --> CustomerData["Customer memberships and project access with forced RLS"]
  Portal --> TurnstileCustomer["Cloudflare Turnstile"]
  Portal --> AuthOutbox["Durable authentication-email outbox"]
  AuthOutbox --> ResendCustomer["Resend"]
```

The portal has a distinct origin, cookie namespace, Better Auth secret, OAuth
client, schema, and runtime role. No customer session is accepted by the admin
application, and no provider account, matching email, browser role, or
customer membership grants administrative access.

Planned customer-specific threats and controls are:

| Scenario                              | Required prevention/detection                                                                 | Verification                                                      |
| ------------------------------------- | --------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Duplicate or implicit account linking | Disable implicit linking; require a signed-in, recently reauthenticated explicit link         | Same/different-email, provider-subject and concurrent-link tests  |
| Credential stuffing/password spraying | Uniform responses, database/account/IP throttles, firewall controls, conditional Turnstile    | Distributed spray, shared-IP and lockout-denial tests             |
| Email or account enumeration          | Verified-email signup without automatic session, indistinguishable responses and bounded time | Existing/non-existing signup and reset timing tests               |
| Invitation theft/replay               | Opaque single-use expiry, verified matching email, tenant-bound acceptance and audit          | Forwarded, expired, reused, mismatched and raced invitation tests |
| Last-method removal/account lockout   | Recent reauthentication and refusal to unlink the final verified usable method                | Google-only, credential-only and dual-method unlink tests         |
| Customer-to-admin privilege crossing  | Separate app, cookies, auth config/schema/runtime role; independent staff authorization       | Copied-cookie, same-email and customer-role admin denial tests    |
| Cross-customer IDOR                   | Server-owned membership/project context, minimal DTOs and forced RLS                          | Wrong-tenant/project and direct-object misuse tests               |
| Auth-email loss or duplication        | Durable outbox, stable command IDs, retries, webhook deduplication and backlog alerts         | Provider timeout, worker crash, replay and delayed-delivery tests |

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

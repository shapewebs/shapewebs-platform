# Shapewebs service-level objectives

- Measurement window: calendar month
- Review cadence: monthly and after every severity-one incident
- Source of truth: external synthetic checks plus server-side accepted-event
  counters

## Objectives

| Capability         | Service-level indicator                             | Initial objective       |
| ------------------ | --------------------------------------------------- | ----------------------- |
| Public site        | Successful non-bot home/readiness checks            | 99.9%                   |
| Lead acceptance    | Valid requests durably committed within 5 seconds   | 99.5%                   |
| Admin core         | Authenticated dashboard/readiness success           | 99.5%                   |
| Lead notification  | Committed outbox item sent or terminally classified | 99% within 15 minutes   |
| Public performance | p75 LCP/INP/CLS                                     | ≤2.5 s / ≤200 ms / ≤0.1 |

Planned maintenance announced at least 48 hours in advance may be reported
separately, but it is not silently removed from customer-facing reliability
reporting.

## Error-budget policy

- At 50% consumed by mid-month: pause high-risk feature releases and assign a
  reliability owner.
- At 75%: require explicit owner approval for every release.
- At 100%: release only security, recovery and reliability changes until the
  rolling trend is healthy.
- Never use error budget to excuse data loss, confidentiality failure or an
  unaccepted critical/high vulnerability.

## Recovery objectives

| Stage                  |      RPO |     RTO |
| ---------------------- | -------: | ------: |
| CMS/lead launch        | 24 hours | 4 hours |
| Customer portal launch |   1 hour | 2 hours |

Restore evidence must prove data integrity and authorization policies, not only
that PostgreSQL starts. Every production release must retain a known-good
Vercel rollback target and a reversible or explicitly forward-only migration
procedure.

## Alert routing

- Public/readiness failure: two consecutive two-minute failures.
- Lead acceptance: any sustained five-minute failure or acknowledged-data-loss
  signal.
- Outbox: oldest pending item over 10 minutes or terminal failure.
- Authentication: unusual denial/rate-limit spike or owner-session revocation.
- Performance: field p75 target missed for seven days or laboratory gate fails.

Alerts must contain only service, environment, deployment, event code,
request/trace ID, safe reason code and runbook link.

## Resource-demanding functions and availability controls

| Function                   | Enforced bound                                                                 | Failure behavior and consumer protection                                        |
| -------------------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------- |
| Contact/project submission | 16 KiB streamed body, strict schema and local/provider abuse controls          | Reject before persistence; acknowledge only after lead and outbox commit        |
| Turnstile verification     | 2,048-character token and five-second provider timeout                         | Reject fail-closed; never follow a provider redirect                            |
| Admin TOTP step-up         | 1 KiB JSON, exact six digits, database rate/lock state                         | Ten failures lock for 15 minutes; anonymous callers cannot reach the counter    |
| CMS content revision       | 65,536-character JSON plus strict typed content blocks                         | Reject unknown/oversized fields before repository mutation                      |
| Preview activation         | 512-byte form body, exactly one 43-character token, five-minute one-time grant | POST only; invalid, duplicate or expired grants return no session               |
| Resend webhook             | Bounded raw body, signature timestamp and event-ID deduplication               | Reject forged/oversized input; out-of-order delivery remains monotonic          |
| Outbox worker              | Ten items, 20-second work budget, 30-second function maximum                   | Durable claim/retry state; heartbeat only after a valid completed response      |
| Worker response            | 2 KiB JSON maximum and 25-second request timeout                               | No heartbeat on malformed, oversized, redirected or failed output               |
| Synthetic retention        | Exact marker identity, six-day minimum age and tenant-scoped deletion          | POST only; ordinary, fresh and cross-tenant leads are never selected            |
| Database lists             | Explicit select lists, tenant scope and bounded limits                         | Minimal DTOs; unavailable dependencies fail closed                              |
| Release scans              | Exact staging allowlist and CI time limits                                     | ZAP/k6 refuse production or arbitrary targets; threshold failure blocks release |

The capacity table is reviewed before raising any size, duration, batch or
concurrency limit. Load, spike and soak testing must demonstrate that increased
limits do not consume the error budget or starve authentication and lead
acceptance.

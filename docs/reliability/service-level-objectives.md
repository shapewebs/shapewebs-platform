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

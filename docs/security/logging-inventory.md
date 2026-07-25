# Security logging inventory

- Owner: Shapewebs owner
- Applies to: application, worker, database, CI/CD, monitoring and provider
  security logs
- Review cadence: monthly operational review and quarterly assurance review
- Time format: UTC ISO 8601 with an explicit `Z` offset

## Logging contract

Every Shapewebs application event uses a stable event code and structured JSON.
When applicable it records:

- timestamp;
- severity;
- service, environment and deployment;
- request and trace identifiers;
- pseudonymous actor identifier;
- action or operation;
- result;
- bounded safe duration; and
- allowlisted, non-sensitive metadata.

Secrets, cookies, authorization headers, session tokens, OAuth values, TOTP
seeds/codes, database URLs, raw form bodies and arbitrary personal data are
prohibited. `packages/observability` performs key- and value-based redaction,
bounds depth and collection size, removes control characters and emits one JSON
record per line. Tests seed representative secrets and prove they do not reach
the serialized record.

Durable security audit events are separate from operational logs. They contain
actor, action, target, result, timestamp, request/trace correlation and safe
metadata. Database policies and triggers make them append-only.

## Inventory

| Layer                            | Events and format                                                                                             | Storage/processor                            | Access                                          | Target retention and disposal                                                                             |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------- | -------------------------------------------- | ----------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `shapewebs-web`                  | readiness, lead acceptance/denial and bounded failures; structured JSON                                       | Vercel runtime logs and traces               | Shapewebs owner through Vercel team             | operational target 30 days; provider-plan configuration is a production gate                              |
| `shapewebs-admin`                | readiness, authorization denials, TOTP, session revocation, webhook and job outcomes; structured JSON         | Vercel runtime logs and traces               | Shapewebs owner through Vercel team             | operational target 30 days; provider-plan configuration is a production gate                              |
| `shapewebs-worker`               | scheduled invocation, provider call, outbox counts, heartbeat and bounded error outcomes; structured JSON     | Cloudflare Worker logs and Vercel admin logs | Shapewebs owner through Cloudflare/Vercel teams | operational target 30 days; export/retention capability reviewed before production                        |
| Durable audit trail              | login, step-up, denial, session, CMS mutation, preview and publish security events; append-only database rows | Neon `audit.audit_events`                    | least-privilege owner/admin repository paths    | 365 days; legal/contractual approval required before automated production disposal                        |
| Database control evidence        | migration, forced-RLS, role, rollback, export and restore results; synthetic data only                        | GitHub Actions artifacts                     | repository maintainers                          | seven days for Quality diagnostics, fourteen days for staging reports, thirty days for security artifacts |
| CI/CD security                   | workflow identity, commit, job, approval and deployment status                                                | GitHub Actions and Vercel deployment history | repository/team administrators                  | provider retention; monthly access review                                                                 |
| Synthetic availability           | HTTP assertions, timings, heartbeat failures and recovery                                                     | Checkly                                      | Shapewebs owner                                 | monitor-plan retention; no form message or customer content                                               |
| Transactional email              | send ID and delivery-state metadata, not lead message content                                                 | Resend and Neon delivery tables              | Shapewebs owner/admin worker                    | provider contract plus application retention register                                                     |
| Abuse validation                 | Turnstile validation result and bounded application reason code                                               | Cloudflare plus redacted application event   | Shapewebs owner                                 | no token retention in Shapewebs; provider policy applies                                                  |
| Identity and mailbox             | sign-in, OAuth-client and administrative audit activity                                                       | Google Cloud/Workspace                       | Workspace and Cloud administrators              | provider policy; review during quarterly access audit                                                     |
| Database/provider administration | branch, role, connection and console audit activity where plan supports it                                    | Neon                                         | Shapewebs owner                                 | paid production log export/retention remains a launch gate                                                |

Development command output is local diagnostic output, not an approved
production log destination. It must not receive production secrets or personal
data.

## Required security events

The following events must be recorded by the application or authoritative
provider:

- successful and failed Google authentication;
- TOTP enrollment, successful/failed step-up, replay and lockout;
- logout, expiry, revocation and role or credential changes;
- authorization and tenant-isolation denial;
- malformed, oversized, forged, replayed or rate-limited requests;
- CMS create, revise, publish, unpublish, rollback and destructive operations;
- preview grant creation, activation, expiry and denial;
- lead acceptance and transaction failure without raw lead content;
- outbox claim, send, retry, terminal classification and worker failure;
- webhook signature failure, duplicate, out-of-order event and accepted state;
- readiness dependency failure and recovery;
- secret/credential rotation and provider configuration change; and
- unexpected exceptions or security-control failures.

Normal static public page views are not security events and are not duplicated
into a custom application log.

## Protection and transport

- Runtime records go to the hosting provider over the platform's internal
  encrypted logging path.
- Durable audit events commit to Neon over TLS and are append-only.
- GitHub, Vercel, Cloudflare, Neon, Checkly, Resend and Google access is limited
  to named owner/team identities with MFA requirements.
- Logs must not be exposed through a public application route.
- Health endpoints return only stable sanitized status, never dependency
  details or versions.
- New log destinations require an inventory update, DPA/processor review,
  access owner, retention rule and a redaction test before use.

Provider-side immutable or logically separate security-log export is required
before commercial production when the selected plans do not already provide
adequate separation and retention. Until that launch gate is met, durable Neon
audit events and the independent provider control planes are compensating
controls, not a claim of complete centralized SIEM coverage.

## Detection and review

Immediate alerts are required for:

- public/readiness outage;
- missed outbox heartbeat;
- repeated authentication or TOTP failure/lockout;
- sustained authorization denial;
- webhook signature failures or terminal outbox growth;
- critical/high dependency or secret-scanning findings; and
- backup/restore or migration failure.

Monthly review covers failed jobs, terminal outbox events, security alerts,
provider access and retention. Quarterly review reconciles this inventory with
the source tree, provider dashboards, the data-retention register and the ASVS
evidence register.

Incident export must preserve UTC timestamps, event codes, request/trace IDs
and hashes while excluding credentials and unrelated personal data. Follow
`docs/runbooks/security-incident.md` for access control, preservation,
notification and disposal.

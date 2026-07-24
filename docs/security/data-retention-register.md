# Data, retention and processor register

- Controller: Shapewebs
- Review cadence: quarterly and before collecting a new category
- Principle: collect the minimum data needed for the documented purpose

## Retention schedule

| Data                                     | Purpose                                   | Location/processors                | Default retention                        | Disposal                                   |
| ---------------------------------------- | ----------------------------------------- | ---------------------------------- | ---------------------------------------- | ------------------------------------------ |
| Operational application logs             | Reliability and debugging                 | Vercel/selected telemetry backend  | 30 days                                  | Automated deletion                         |
| Security and administrative audit events | Incident investigation and accountability | Neon/Vercel                        | 365 days                                 | Automated deletion or anonymization        |
| Unconverted leads                        | Respond to inquiries and sales follow-up  | Neon, Resend notification metadata | 12 months after last meaningful contact  | Delete or irreversibly anonymize           |
| Active customer/project records          | Contract delivery and customer portal     | Neon, Vercel Blob                  | Contract term plus approved legal period | Controlled export and deletion             |
| Accounting records                       | Legal/accounting obligation               | Approved accounting systems        | Legally required period                  | Do not automate until schedule is approved |
| OAuth profile                            | Admin identity and allowlisting           | Google, Better Auth, Neon          | Account lifetime plus 30 days            | Revoke sessions, delete account/profile    |
| TOTP secrets and backup codes            | Administrative MFA                        | Better Auth/Neon                   | Account lifetime                         | Revoke and securely delete                 |
| Email delivery events                    | Delivery operations and abuse response    | Neon, Resend                       | 90 days unless linked to an incident     | Automated deletion                         |
| Synthetic test data                      | Verification                              | Non-production Neon, CI artifacts  | 7 days maximum                           | Lifecycle cleanup/artifact expiry          |

Deletion jobs must be idempotent, auditable, tenant-scoped and tested against a
synthetic database before production scheduling.

Lead notification content is deliberately minimized: Resend receives the
contact identity, form type, submission ID, protected admin link, and delivery
metadata. The message and project details remain in Neon. Turnstile is loaded
only with a public form; Vercel Speed Insights is loaded only on Vercel
deployments. Both uses require an accurate public privacy notice before launch.

## Processor inventory

| Provider   | Processing                                           | Required control/evidence                                                     |
| ---------- | ---------------------------------------------------- | ----------------------------------------------------------------------------- |
| Vercel     | Hosting, deployment, WAF, logs, analytics if enabled | DPA, EU configuration where available, access review, retention settings      |
| Neon       | PostgreSQL storage, backups and branches             | EU region, DPA, protected production, least-privilege roles, restore evidence |
| Google     | OAuth identity                                       | Exact redirect origins, minimal scopes, owner access review                   |
| Resend     | Transactional email and delivery metadata            | EU sending region, DPA, tracking disabled, restricted keys, signed webhooks   |
| Cloudflare | Turnstile abuse verification                         | Privacy disclosure, server verification, no token retention                   |
| GitHub     | Source, CI metadata and security alerts              | Organization MFA, rulesets, minimal apps/tokens, private reports              |

Before production, record the executed DPA link/date, subprocessor review date,
data region, owner and deletion mechanism for each provider.

## Prohibited logging

Do not log:

- raw lead/customer form content;
- email addresses or names;
- cookies, authorization headers or tokens;
- OAuth codes, access/refresh/ID tokens;
- database connection URLs or query parameters;
- TOTP secrets, codes or backup codes;
- private file URLs or webhook secrets.

Use request/trace IDs, stable event codes, reason codes and keyed/pseudonymous
actor hashes instead.

# Data, retention and processor register

- Controller: Shapewebs
- Review cadence: quarterly and before collecting a new category
- Principle: collect the minimum data needed for the documented purpose

## Protection levels

| Level        | Examples                                                                                                    | Required controls                                                                                                                                                                                                        |
| ------------ | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Public       | Published pages, public company details, non-secret client IDs and site keys                                | Integrity-controlled source, reviewed publishing, HTTPS delivery and no accidental draft exposure                                                                                                                        |
| Internal     | Deployment identifiers, aggregate availability metrics, non-sensitive operational metadata                  | Authenticated provider access, bounded retention, redacted logs and no public application route                                                                                                                          |
| Confidential | Lead identity, unpublished CMS content, email delivery metadata, OAuth profile and customer/project records | Least-privilege authorization, forced tenant isolation where stored, TLS, encrypted provider storage, no URL placement, minimal DTOs and documented deletion                                                             |
| Restricted   | Session tokens, TOTP seeds/codes, OAuth tokens, database URLs, API keys, webhook and bearer secrets         | Server-only access, encrypted secret store or authenticated encryption, independent rotation, never logged/cached/in URLs, no browser storage except host-only HttpOnly session cookies, and immediate incident rotation |

Every new data element must be assigned a level before collection. The highest
level present controls the complete payload, cache, log entry, export and
backup. Restricted values are prohibited from application telemetry and
support conversations.

## Retention schedule

| Data                                          | Level                                                               | Purpose                                    | Location/processors                                                  | Default retention                                   | Disposal                                        |
| --------------------------------------------- | ------------------------------------------------------------------- | ------------------------------------------ | -------------------------------------------------------------------- | --------------------------------------------------- | ----------------------------------------------- |
| Published content                             | Public                                                              | Portfolio and company communication        | Neon, Vercel                                                         | While published plus revision policy                | Unpublish, then revision-controlled deletion    |
| Operational application logs                  | Internal; Confidential if a safe pseudonymous actor hash is present | Reliability and debugging                  | Vercel/selected telemetry backend                                    | 30 days                                             | Automated deletion                              |
| Security and administrative audit events      | Confidential                                                        | Incident investigation and accountability  | Neon/Vercel                                                          | 365 days                                            | Automated deletion or anonymization             |
| Unconverted leads                             | Confidential                                                        | Respond to inquiries and sales follow-up   | Neon, Resend notification metadata                                   | 12 months after last meaningful contact             | Delete or irreversibly anonymize                |
| Unpublished CMS content                       | Confidential                                                        | Review and publishing workflow             | Neon                                                                 | While actively edited plus approved revision period | Controlled revision deletion                    |
| Active customer/project records               | Confidential                                                        | Contract delivery and customer portal      | Neon, Vercel Blob                                                    | Contract term plus approved legal period            | Controlled export and deletion                  |
| Customer invitations and provisional accounts | Confidential                                                        | Invitation-only onboarding                 | Neon, Resend delivery metadata                                       | Expiry plus 30 days                                 | Idempotent cleanup after no active membership   |
| Accounting records                            | Confidential                                                        | Legal/accounting obligation                | Approved accounting systems                                          | Legally required period                             | Do not automate until schedule is approved      |
| OAuth profile                                 | Confidential                                                        | Admin identity and allowlisting            | Google, Better Auth, Neon                                            | Account lifetime plus 30 days                       | Revoke sessions, delete account/profile         |
| Session, OAuth and TOTP secrets               | Restricted                                                          | Administrative and customer authentication | Browser HttpOnly cookie, Better Auth/Neon, encrypted provider stores | Session/account/credential lifetime                 | Revoke, expire and securely delete              |
| Customer auth-email tokens                    | Restricted                                                          | Invitation, verification and recovery      | SHA-256 lookup hash and authenticated encrypted envelope in Neon     | Token expiry plus delivery/retry window             | Consume, then remove through bounded cleanup    |
| Email delivery events                         | Confidential                                                        | Delivery operations and abuse response     | Neon, Resend                                                         | 90 days unless linked to an incident                | Automated deletion                              |
| Synthetic test data                           | Confidential synthetic data only                                    | Verification                               | Non-production Neon, CI artifacts                                    | 7 days maximum                                      | Daily marker-restricted cleanup/artifact expiry |

Deletion jobs must be idempotent, auditable, tenant-scoped and tested against a
synthetic database before production scheduling.

The customer portal is not live. Its 30-day expired-invitation/provisional
account cleanup and consumed auth-email cleanup are launch gates; the schema
does not make a not-yet-scheduled deletion claim.

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

Sensitive responses and authenticated pages use `private, no-store` or
`no-store`. Shapewebs does not place credentials or personal data in URL query
parameters and does not persist sensitive data in `localStorage` or
`sessionStorage`. Successful administrative logout clears browser cache,
cookies and storage for the admin origin.

# Staging authentication-readiness regression evidence

- Date: 25 July 2026
- Environment: persistent synthetic staging
- Protected-staging merge: `a56a771`
- Fix branch: `codex/staging-auth-readiness`
- Production changed: no

## Promotion and database evidence

Pull request
[`shapewebs/shapewebs-platform#17`](https://github.com/shapewebs/shapewebs-platform/pull/17)
was marked ready only after every required quality, security, disposable Neon
and Vercel check passed. Its exact reviewed head `3296eaf` was squash-merged
into protected `staging` as `a56a771`.

Vercel created `READY` Preview deployments for both applications and assigned
the fixed aliases:

- `https://staging.shapewebs.com`;
- `https://admin-staging.shapewebs.com`.

The protected-staging k6/ZAP job passed. No production deployment, alias,
environment variable or database changed.

The dedicated direct `shapewebs_migrator` credential targeted only Neon project
`shapewebs-platform`, branch `staging`, database `shapewebs`. The preflight
found nine journaled migrations. Migrations `0009` and `0010` applied
successfully, after which the journal contained eleven entries. Direct
verification proved:

- content kind `method`;
- workflow states `review` and `scheduled`;
- relation `auth.admin_totp_security`;
- `SELECT`, `INSERT` and `UPDATE` for `shapewebs_admin_runtime`; and
- no `SELECT` privilege for `shapewebs_web_runtime` or
  `shapewebs_public_reader`.

## Credential-containment incident

Neon CLI `2.36.0` again ignored `--output json` for `connection-string`. A
temporary verifier attempted to parse the plain URL as JSON, and Node included
the non-production staging migrator URL in its parse error. This occurred
before any migration ran.

The URL was treated as compromised immediately. Neon role-password rotation
completed through the authenticated API, and only the replacement credential
performed the successful migration and post-migration queries. The temporary
verifier was removed, no connection string was written to the repository, and
the old password is invalid.

Future persistent migrations must treat `connection-string` output as opaque
plain text, capture child output, redact both the complete URL and decoded
password, and never pass secret-bearing text to a parser that can include its
input in an exception.

## Post-merge runtime evidence

Vercel's authenticated CLI transport reached both exact merge deployments.
Public and admin liveness/readiness initially returned sanitized `200` payloads.
Protected admin pages returned the expected bounded
`503 Admin authentication is unavailable.` response because Google OAuth
credentials are intentionally absent.

Trusted-origin probes then exposed a reliability defect:

| Probe                                            | Observed |
| ------------------------------------------------ | -------: |
| Admin readiness with OAuth configuration missing |    `200` |
| TOTP step-up with no configured auth/session     |    `500` |
| Owner session revocation with no configured auth |    `500` |

The two APIs called the secure database-backed authorization layer, but its
missing-configuration branch threw rather than returning a typed denial.
Proxy correctly protected page requests, but it does not run for API routes and
cannot replace Route Handler authorization.

## Isolated correction

The unmerged `codex/staging-auth-readiness` branch:

- represents authentication availability explicitly in the server-owned admin
  runtime state;
- makes missing authentication configuration a typed `503` API result;
- keeps `401` for absent sessions and `403` for role or step-up denials;
- includes authentication configuration in admin readiness;
- retains exact trusted-origin, content-type and bounded-body checks;
- keeps Proxy as an optimistic page gate rather than the only authorization
  layer; and
- omits absent actor/request identifiers instead of logging the string
  `"undefined"`.

Verification on the correction branch:

- Prettier and zero-warning targeted ESLint: passed;
- admin and observability TypeScript checks: passed;
- 92 unit tests: passed;
- public and admin Next.js 16.2.11 Turbopack builds: passed;
- production-mode Playwright security suite: six of six passed;
- missing-auth readiness: bounded `503 {"status":"unavailable"}`;
- missing-auth step-up: bounded
  `503 {"error":"authentication_unavailable"}`; and
- missing-auth session revocation: bounded
  `503 {"error":"authentication_unavailable"}`.

Pull request `#18` passed its required checks and was squash-merged into
protected `staging` as `41d9556` on 25 July 2026. After the restricted Google
OAuth variables were added and the fixed staging branch was redeployed at
`732c563`, a protected runtime probe returned the sanitized response `200
{"status":"ready"}` from `/api/health/ready`. This proves the complete
authentication environment and database dependency are usable without
disclosing provider details. The interactive Google-to-TOTP, step-up-expiry
and session-revocation journeys remain required.

# Staging runtime verification evidence

- Date: 24 July 2026
- Fixed public origin: `https://staging.shapewebs.com`
- Fixed admin origin: `https://admin-staging.shapewebs.com`
- Candidate commit: `219dc2e`
- Production changed: no

## Pull-request evidence

Draft pull request
[`shapewebs/shapewebs-platform#7`](https://github.com/shapewebs/shapewebs-platform/pull/7)
passed the following checks for candidate commit `219dc2e`:

- canonical Quality verification, both application builds, Playwright and
  Lighthouse budgets;
- OSV, dependency review and CodeQL;
- both Vercel application deployments;
- disposable Neon migration, forced-RLS security, rollback, logical restore
  and cleanup.

The disposable Neon workflow applied migrations `0000` through `0006`, proved
the marker-restricted synthetic-retention policy against editor, owner, web and
cross-tenant personas, and removed its source and restore branches.

## Fixed-host runtime evidence

Vercel's authenticated protected-deployment transport requested each fixed
staging endpoint:

| Application | Endpoint            | Result | Body                 |
| ----------- | ------------------- | ------ | -------------------- |
| Public      | `/api/health/live`  | `200`  | `{"status":"ok"}`    |
| Public      | `/api/health/ready` | `200`  | `{"status":"ready"}` |
| Admin       | `/api/health/live`  | `200`  | `{"status":"ok"}`    |
| Admin       | `/api/health/ready` | `200`  | `{"status":"ready"}` |

All four responses used `Cache-Control: no-store`, `X-Robots-Tag:
noindex, nofollow`, HSTS, `X-Content-Type-Options: nosniff`, `X-Frame-Options:
DENY`, a restrictive Permissions Policy and a strict referrer policy. Their
payloads did not identify a database, provider, version, hostname, connection
detail or secret.

## Deployed input-boundary evidence

Protected public staging rejected non-persisting contact requests at the
expected boundary:

| Case                                          | Result |
| --------------------------------------------- | ------ |
| Missing or malformed idempotency key          | `400`  |
| Valid idempotency key with a non-JSON body    | `415`  |
| Valid idempotency key with an invalid payload | `400`  |
| Valid payload without a Turnstile token       | `400`  |

Each response used `no-store`, returned a generic bounded JSON error and
retained the public security headers. These requests stop before the
persistence path; the valid-payload case proved that deployed Turnstile
enforcement does not fail open.

## Protection-bypass rotation

The obsolete dedicated `GitHub staging assurance` bypass was revoked and
replaced without printing or persisting its value. The repository secret was
updated through standard input. Workflow run
[`30095394126`](https://github.com/shapewebs/shapewebs-platform/actions/runs/30095394126)
then passed protected-target and credential validation and entered k6.

The temporary bypass created for an attempted interactive browser check was
revoked after the in-app browser failed to attach a controllable tab. No form
was submitted and no CAPTCHA was reached.

Raw requests carrying an intentionally invalid bypass value returned `302`
with `Cache-Control: no-store, max-age=0` to Vercel authentication for both
fixed health endpoints. They did not reach either application. Authenticated
Vercel transport returned the application `200` responses recorded above.

## Real Turnstile and atomic persistence evidence

An in-app browser subsequently reached the fixed public staging contact page
through the owner's existing protected-deployment access. The general contact
form was filled with the exact marker-restricted `.invalid` synthetic fixture.
The deployed Cloudflare Turnstile widget produced a non-empty token without
browser errors, and the form returned the visible success state:
`Thanks, your message has been received.`

A read-only Neon query then found lead
`b1c112a5-6313-49c9-8321-29bb93c72117`, created at
`2026-07-24 13:50:35.141334+00`, joined to exactly one
`lead.notification.requested` outbox event. Its state was `pending` with zero
attempts, which is expected while Resend remains unconfigured. This proves the
deployed acknowledgement followed the atomic lead/outbox commit.

Migration `0006` was then applied through the dedicated direct migrator
credential to the non-production Neon `staging` branch. Post-migration
verification returned seven migration records, one exact
`owners delete expired synthetic leads` policy, and the fresh synthetic
lead/outbox pair still intact. No production database or credential changed.

## Explicitly incomplete evidence

The staging release gate is not green:

- GitHub run `30097779661` passed the k6 smoke thresholds after replacing the
  unsupported browser `URL` constructor with a strict k6-compatible origin
  parser;
- ZAP then failed before scanning because its non-root container could neither
  write the ephemeral report bind mount nor read the ephemeral secret-config
  bind mount. The credential was not printed, and the temporary secret was
  removed in `finally`;
- Google OAuth, Resend, Checkly alerts and the controlled-failure exercise
  remain account-specific gates;
- no production resource, domain, database or deployment was changed.

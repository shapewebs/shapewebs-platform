# Staging runtime verification evidence

- Date: 24 July 2026
- Fixed public origin: `https://staging.shapewebs.com`
- Fixed admin origin: `https://admin-staging.shapewebs.com`
- Initial runtime candidate: `219dc2e`
- Final assurance candidate: `bb07f7c`
- Application production changed: no
- Domain mail DNS changed: yes, with explicit owner authorization

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
`lead.notification.requested` outbox event. It was initially `pending` with
zero attempts, proving the deployed acknowledgement followed the atomic
lead/outbox commit.

Migration `0006` was then applied through the dedicated direct migrator
credential to the non-production Neon `staging` branch. Post-migration
verification returned seven migration records, one exact
`owners delete expired synthetic leads` policy, and the fresh synthetic
lead/outbox pair still intact. No production database or credential changed.

## Resend and mail-DNS evidence

A restricted `Shapewebs Staging` Resend key was created with sending-only
permission and restricted to `shapewebs.com`. Its value exists only as a
sensitive `shapewebs-admin` Preview variable for Git branch `staging`. The
sender is `Shapewebs <website@shapewebs.com>`.

The protected outbox route claimed the persisted event exactly once. Resend
accepted the API request and returned provider message ID
`133339a1-72eb-4bea-960f-31a6ddacc0c8`; Neon recorded one attempt and a `sent`
provider state. Resend subsequently classified the message as bounced because
`lukas@shapewebs.com` had no receiving mailbox. Because the signed webhook is
not registered, the application delivery state correctly remains without the
provider's later bounce classification. `LEAD_NOTIFICATION_TO_EMAIL` was
removed from staging to prevent further attempts to an unrouteable address.

With explicit owner approval that inbound forwarding is not required,
ImprovMX's two MX records and apex SPF include were removed. Vercel's
authoritative nameservers and public resolvers then returned:

- apex null MX `0 .`;
- apex SPF `v=spf1 -all`;
- DMARC `p=quarantine; sp=quarantine; adkim=s; aspf=r; pct=100`.

Resend's `resend._domainkey` DKIM and `send.shapewebs.com` SPF/MX records were
preserved. This intentionally prevents inbound delivery while retaining
outbound transactional authentication.

## Protected-staging assurance and credential containment

Run
[`30103000972`](https://github.com/shapewebs/shapewebs-platform/actions/runs/30103000972)
was the first complete green k6/ZAP execution. Evidence review found that
ZAP's internal `zap.out` and `zap.log` echoed the Vercel replacer value. The
exact artifact `8600434159` was deleted immediately. Every existing public-web
automation bypass was revoked, one fresh token was generated as Vercel's
deployment environment bypass, and the GitHub Actions secret was updated
through standard input.

Commit `bb07f7c` excludes internal ZAP logs, places ZAP runtime state in an
ephemeral directory, and fails closed while removing any retained report that
contains the exact credential. Clean run
[`30103670868`](https://github.com/shapewebs/shapewebs-platform/actions/runs/30103670868)
then completed successfully:

- k6: nine of nine checks, zero HTTP failures;
- ZAP: 42 URLs, 63 passing passive rules, three reviewed informational
  dispositions, zero ignored, zero warnings and zero failures;
- artifact: 30,165 bytes containing only `report.json`, `report.md`,
  `report.html`, and `summary.json`;
- artifact inspection: no replacer configuration, bypass header,
  authorization value, cookie or bearer value.

No-header and invalid-bypass requests to both fixed staging health endpoints
return Vercel SSO `302`; the rotated credential reaches the sanitized
application `200` response. The fixed branch-scoped hosts therefore remain
protected in observed runtime behavior.

## Explicitly incomplete evidence

- Google OAuth, the owner-to-TOTP journey, Checkly alerts and the
  controlled-failure exercise remain account-specific gates;
- Resend still requires a reachable recipient, a signed webhook registration
  and an end-to-end delivery/bounce exercise;
- minute-level scheduling and paid production Neon/Vercel topology remain
  launch gates;
- no production application deployment or database was changed; the only
  live-domain change was the explicitly authorized mail-DNS hardening above.

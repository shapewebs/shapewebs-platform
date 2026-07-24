# Checkly monitoring verification

## Scope

- Date: 24 July 2026
- Source branch: `codex/foundation`
- Verified source commit: `7d611e8`
- Checkly account: `lukasthomsen@shapewebs.com`
- Checkly plan during verification: Trial
- Alert recipient: `shapewebs@gmail.com`
- Production promotion: not performed

This record covers provider authentication, credential isolation, monitoring
deployment, alert delivery, controlled failure/recovery, staging journey
verification, and schedule activation.

## Credential isolation

The public and admin Vercel projects each have a dedicated Checkly automation
bypass. Neither value is reused by GitHub Actions, Resend, or Vercel's required
system environment bypass. The admin synthetic-retention bearer is a separate
write-only Checkly variable whose matching value exists only in the admin
`staging` Preview branch.

During a protection-state inspection, terminal output disclosed existing
public GitHub and admin automation/webhook bypass values. Both disclosed
values were treated as compromised. The GitHub Actions secret and Resend
webhook endpoint were moved to replacements before revocation. Vercel's
required system bypasses were atomically regenerated, and all disclosed and
unused extra bypasses were revoked. No disclosed bypass remains active.

The three temporary macOS Keychain copies used for the controlled exercise were
deleted after Checkly stored the values as write-only secrets.

## Managed resources

Checkly project `Shapewebs platform` manages:

- email alert channel `314193`, subscribed to all five checks;
- public home check `62c28a3b-527c-48b4-b476-3975a379aebd`;
- public readiness check `97e0ff23-6acf-4344-8abb-c4b4520a5311`;
- staging admin readiness check
  `ce4c74b6-383c-475d-b756-3c98c57eb603`;
- staging lead browser check `25373197-423a-4e68-9b95-7b4dda51e666`;
- staging synthetic-retention check
  `ec3d6dbe-86e3-4d3a-b982-7808fba2a346`.

The unusable zero-subscription channel targeting
`lukasthomsen@shapewebs.com` was removed after the Gmail channel delivered
both controlled notifications.

Activation is fail-closed and explicit:

- `disabled` activates no schedules;
- `alert-test` activates only staging admin readiness;
- `staging` activates the three protected staging checks;
- `enabled` activates all five checks after production verification.

## Controlled failure and recovery

The staging admin bypass stored in Checkly was temporarily replaced with an
invalid value while only the admin-readiness schedule was active.

- Failure result: `019f94e2-fe8a-4815-839f-80d6ef7812f8`
- Failure started: `2026-07-24T16:08:52.156Z`
- Checkly attempts: 2
- Failure email accepted by the alert channel:
  `2026-07-24T16:09:15.002Z`

The valid Checkly-only bypass was then restored.

- Recovery result: `019f94e4-c614-40b6-b281-700f0634dc5e`
- Recovery started: `2026-07-24T16:10:48.760Z`
- Recovery response time: 630 ms
- Recovery email accepted by the alert channel:
  `2026-07-24T16:10:51.321Z`

Both notification-log entries report `SUCCESS` and
`Email is sent successfully`.

## Staging journey gate

The first all-check pre-enable session correctly prevented a broad rollout:

- production was still serving the pre-foundation release, so its JSON
  readiness route and strict cold-response budget were not yet valid;
- the old admin staging source snapshot lacked the retention route;
- the real Turnstile widget challenged the automated browser.

Production remained unchanged. The staging deployments were rebuilt from
verified source. Automated staging now uses Cloudflare's official always-pass
test pair in branch-scoped Vercel variables. Application code accepts the
documented test response only when `TURNSTILE_TEST_MODE=true`, the exact
official pair is present, and `VERCEL_ENV` is not `production`. Production
continues to require the exact hostname and `lead_submission` action.

Recorded session `019f94f4-afa1-4488-8270-4c57ac18ca19` then passed all three
staging checks from `eu-west-1`:

- admin readiness: 908 ms;
- synthetic retention: 938 ms;
- complete browser lead journey: 10 seconds.

## Final schedule state

The protected staging schedules are active:

- admin readiness every two minutes;
- lead acceptance journey every ten minutes;
- synthetic retention every 24 hours.

The first scheduled post-enable cycle passed:

- admin readiness: 464 ms at `2026-07-24T16:30:48.859Z`;
- lead browser journey: 5.391 seconds at `2026-07-24T16:28:35.844Z`;
- synthetic retention: 524 ms at `2026-07-24T16:28:35.577Z`.

No new failure notification was generated after staging activation.

The public home and public readiness resources remain deployed but inactive
until the foundation release reaches `shapewebs.com` and passes their
performance and JSON-readiness assertions. This is an intentional launch gate,
not an accepted monitoring gap.

The Resend webhook remains enabled at its rotated staging endpoint and is
subscribed to the seven documented delivery-lifecycle events: sent, delivered,
delivery delayed, bounced, complained, failed, and suppressed.

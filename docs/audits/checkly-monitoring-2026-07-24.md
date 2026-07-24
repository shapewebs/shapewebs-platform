# Checkly monitoring verification

## Scope

- Date: 24 July 2026
- Source branch: `codex/foundation`
- Verified source commit: `1b6924e`
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

During the later provider-replay verification, the Resend dashboard necessarily
displayed the webhook endpoint containing its dedicated Vercel bypass. That
bypass was replaced in Resend, subscribed to all seven events, and revoked in
Vercel. A post-rotation Checkly admin-readiness run passed with the separate
Checkly-only bypass. The temporary outbox-worker secret copy was also removed
from the macOS Keychain.

## Managed resources

Checkly project `Shapewebs platform` manages:

- email alert channel `314193`, subscribed to all six checks;
- public home check `62c28a3b-527c-48b4-b476-3975a379aebd`;
- public readiness check `97e0ff23-6acf-4344-8abb-c4b4520a5311`;
- staging admin readiness check
  `5b16d724-9871-4f60-b0c8-e59473b6c0fa`;
- staging lead browser check `e3334c29-1ffe-43ec-81cd-6842ad68fe6c`;
- staging outbox heartbeat
  `7a5abb44-5b4a-47e3-bea9-813f9751bb2a`; and
- staging synthetic-retention check
  `a8e5b310-7657-4f2b-b4c6-fbba3dc13aee`.

The unusable zero-subscription channel targeting
`lukasthomsen@shapewebs.com` was removed after the Gmail channel delivered
both controlled notifications.

Activation is fail-closed and explicit:

- `disabled` activates no schedules;
- `alert-test` activates only staging admin readiness;
- `staging` activates the three active checks and, only when
  `CHECKLY_OUTBOX_HEARTBEAT_READY=true`, the outbox heartbeat;
- `enabled` activates the five non-heartbeat checks after production
  verification and the sixth only with the same explicit heartbeat-ready
  flag.

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
- outbox heartbeat every five minutes with a six-minute grace window; and
- synthetic retention every 24 hours.

The first scheduled post-enable cycle passed:

- admin readiness: 464 ms at `2026-07-24T16:30:48.859Z`;
- lead browser journey: 5.391 seconds at `2026-07-24T16:28:35.844Z`;
- synthetic retention: 524 ms at `2026-07-24T16:28:35.577Z`.

No new failure notification was generated after staging activation.

## Outbox heartbeat activation

The Cloudflare scheduler evidence is recorded separately in
`docs/audits/staging-outbox-scheduler-2026-07-24.md`. After the protected
runtime fixes and a private ping-token rotation, two consecutive scheduled
Worker invocations completed at `2026-07-24T19:35:55Z` and
`2026-07-24T19:40:55Z`. Checkly recorded both heartbeat events at 100%
availability.

Neon contained 17 suppressed synthetic events, zero unresolved events and zero
provider message IDs. Resend recorded no new email. The heartbeat remained
active.

The owner then approved a controlled missed-heartbeat and recovery exercise.
Only the staging Worker's Cron Trigger was removed; its code, bindings,
encrypted secrets, Checkly monitor and production systems were unchanged. One
already queued invocation still produced a seventh successful heartbeat at
`2026-07-24T20:05:56Z`. After the following expected period and grace window
elapsed, Checkly recorded a `FAILING` event and sent the operational failure
email at `2026-07-24T20:17:03Z`.

The exact `*/5 * * * *` trigger was restored at
`2026-07-24T20:17:44Z`. No manual heartbeat was sent. The next real Worker
invocation completed at `2026-07-24T20:20:57Z` in 3.885 seconds, processed one
synthetic event and reported zero retryable and permanent failures. Checkly
recorded recovery and sent the recovery email at
`2026-07-24T20:21:00Z`. Both notifications arrived in the confirmed
`shapewebs@gmail.com` operational inbox.

The monitor is healthy after the exercise. Its last-24-hour availability is
intentionally 88.89% because the controlled failure remains visible as one of
nine events. A final Neon read found 21 outbox events: all 21 were `sent` with
`suppressed_synthetic`, zero were unresolved and zero had provider message
IDs. Resend sent no outbox notification during recovery.

## Safe bounce, replay and monitor-resource recovery

Recorded session `019f950e-9d0e-4342-ac46-16d2b888dc41`
created exactly one synthetic lead/outbox pair while the recurring lead
schedule was paused. The protected worker processed one event in one attempt
through Resend's documented safe bounce address. Resend message
`c9bf7a75-f6cf-4b1f-b86d-b3dfabfae40c` reached `bounced`, while Neon stored
one signed `email.sent` event, one signed `email.bounced` event and final
delivery state `email.bounced`.

The successful bounce webhook was then replayed from Resend. Its dashboard
showed two attempts for the same event ID and the second application response
was `{"status":"duplicate"}`. Neon still contained two lifecycle rows total,
including only one bounce row, and the outbox remained sent with one provider
attempt. Cleanup then removed two webhook rows, one outbox row and one lead
row. The temporary bounce recipient was removed from Vercel, staging was
redeployed, readiness remained `200`, and the worker returned fail-closed
`service_unavailable` without a notification recipient.

While pausing schedules, one CLI deploy was invoked without the two local
non-secret staging-origin variables. The then-optional definitions caused
Checkly to remove and recreate the three staging check objects. Public checks,
the alert channel, provider secrets and application data were unaffected, but
the recreated check objects received the IDs recorded above and their
object-level history restarted. Previously recorded test-session evidence and
this audit record remain available.

Commit `1b6924e` removes that failure mode: the fixed staging origins are safe
checked-in defaults, and all staging resources are always instantiated.
Preview and live deployments without local origin variables both reported
only update/unchanged resources. Post-hardening session
`019f951a-437c-4c44-8ce7-bacb28f029c6` passed admin readiness in 405 ms, the
lead journey in eight seconds and synthetic retention in 427 ms. The exact two
synthetic rows created by the explicit and scheduled lead runs were removed
after evidence collection.

## Final provider and schedule state

The public home and public readiness resources remain deployed but inactive
until the foundation release reaches `shapewebs.com` and passes their
performance and JSON-readiness assertions. This is an intentional launch gate,
not an accepted monitoring gap.

The Resend webhook remains enabled at its rotated staging endpoint and is
subscribed to the seven documented delivery-lifecycle events: sent, delivered,
delivery delayed, bounced, complained, failed, and suppressed.

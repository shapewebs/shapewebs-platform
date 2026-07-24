# Staging outbox scheduler evidence — 24 July 2026

## Scope

This record covers the staging-only minute-level trigger for the durable email
outbox. Production scheduling and production credentials are out of scope.

## Implemented controls

- A Cloudflare Worker has one scheduled handler and one fixed staging target.
- The handler accepts only `*/5 * * * *` and the exact staging environment.
- The admin call has a 25-second timeout, manual redirect handling, a dedicated
  Vercel protection bypass, a bearer secret, and a request ID.
- The response must be JSON, remain within 2 KiB, and contain only three
  nonnegative counters whose sum does not exceed the route batch size.
- The Worker enables `global_fetch_strictly_public` so the same-zone
  `admin-staging.shapewebs.com` subrequest follows the public Cloudflare path
  and its security controls instead of an internal same-zone origin path.
- Checkly receives a heartbeat only after the outbox call succeeds and returns
  a valid result.
- Transport, status, response, heartbeat, configuration, and schedule failures
  use bounded reason codes. Provider error text and credentials never enter
  logs.
- A Cloudflare-runtime Vitest verifies the APIs used by the Worker in addition
  to the deterministic Node unit suite.

## Provider state

- The Checkly heartbeat is active with a five-minute period, a six-minute
  grace window and the existing operational email channel.
- The Worker was initially deployed without a cron trigger and with all three
  values stored as encrypted Cloudflare secrets.
- The existing 11-character staging `CRON_SECRET` failed the Worker's
  32-character minimum. It was replaced with a one-way Vercel Sensitive value
  generated once in memory and written directly to both Vercel and Cloudflare.
- Staging PR
  [`#11`](https://github.com/shapewebs/shapewebs-platform/pull/11) passed the
  complete protected pull-request gate and was squash-merged into `staging`.
  The resulting fixed Vercel deployment is ready. Staging assurance run
  [`30116773588`](https://github.com/shapewebs/shapewebs-platform/actions/runs/30116773588)
  passed k6 and the passive ZAP baseline.
- A read-only Neon query found nine due outbox events. All nine are the exact
  Checkly fixture with the `CHECKLY_SYNTHETIC_DO_NOT_CONTACT` marker; no
  ordinary or provider-test lead is pending.
- The outbox repository now classifies only that full fixture. The admin worker
  marks the claimed event as `sent` with delivery status
  `suppressed_synthetic`, records a safe structured event, and does not call
  Resend. This suppression change must pass the protected staging deployment
  gate before the cron is activated.
- Protected staging PR
  [`#12`](https://github.com/shapewebs/shapewebs-platform/pull/12), including
  the disposable Neon lifecycle, passed and was squash-merged. Post-merge k6
  and ZAP run
  [`30118348398`](https://github.com/shapewebs/shapewebs-platform/actions/runs/30118348398)
  also passed.
- The first live cron invocation failed closed as `outbox_unreachable` before
  any database or email-provider change. The target is on the Worker's own
  Cloudflare zone, so the public-fetch compatibility flag is being added
  through the protected staging gate before another activation attempt.
- Protected staging PR
  [`#13`](https://github.com/shapewebs/shapewebs-platform/pull/13) added
  `global_fetch_strictly_public`, passed every protected check and was
  squash-merged. Post-merge k6 and ZAP run
  [`30119433938`](https://github.com/shapewebs/shapewebs-platform/actions/runs/30119433938)
  passed.
- The public path alone did not resolve the zero-millisecond failure. The
  runtime `fetch` method had been stored at module scope and later called
  through the dependency object, losing Cloudflare's request-bound receiver.
  Runtime dependencies are now created per invocation, `fetch` is bound to the
  Workers global context, and a Workers-runtime regression test asserts that
  receiver.
- Protected staging PR
  [`#14`](https://github.com/shapewebs/shapewebs-platform/pull/14) delivered
  that receiver fix, passed every protected check and was squash-merged.
  Post-merge k6 and ZAP run
  [`30120169125`](https://github.com/shapewebs/shapewebs-platform/actions/runs/30120169125)
  passed.
- The first receiver-fixed invocation reached the protected admin route and
  processed ten exact synthetic events, proving the Vercel and database path.
  It then failed closed as `heartbeat_rejected`. No provider message ID or
  Resend email was created.
- Checkly uses a distinct private ping token rather than the heartbeat
  resource ID. The mistakenly configured ID was replaced with a newly rotated
  ping token generated in memory and written directly to Checkly and the
  encrypted Cloudflare secret. The private URL was not retained in the
  repository or audit output.
- Checkly rejects pings while the heartbeat is inactive. The monitor was
  activated through the checked-in monitoring-as-code profile only after the
  rotated Worker secret was deployed. Checkly documents that the first
  accepted ping starts the timer.
- No production Vercel, Cloudflare, Checkly, Neon, or Resend value was created
  or changed.

## Verification

The following passed locally:

- Cloudflare-runtime Worker test;
- generated Wrangler binding check and TypeScript check;
- Wrangler dry-run bundle; and
- Checkly monitoring TypeScript validation.

The protected staging branch, disposable Neon lifecycle, Vercel builds,
post-merge k6 and ZAP assurance, Node tests and Workers-runtime tests all
passed before live activation.

Live evidence:

- The exact `*/5 * * * *` trigger is deployed on
  `shapewebs-outbox-scheduler-staging`.
- The active secret-only Worker version completed at
  `2026-07-24T19:35:55Z` in 2.351 seconds, processing two events with zero
  retryable or permanent failures.
- The same version completed again at `2026-07-24T19:40:55Z` in 2.243 seconds,
  processing zero events with zero retryable or permanent failures.
- Checkly reported two heartbeat events and 100% availability after those
  invocations.
- A final read-only Neon query found 17 outbox events: all 17 were `sent` with
  `suppressed_synthetic`, zero were unresolved and zero had a provider message
  ID.
- A final Resend read found no new provider email. The newest email remained
  the earlier controlled provider test from `2026-07-24T16:57:40Z`.
- Automated and deployed route controls continue to reject unauthenticated,
  malformed and stale-credential requests.

One deliberately external side effect remains: a controlled missed-heartbeat
and recovery exercise. It will intentionally send failure and recovery
notifications to the operational inbox, so it is deferred until the owner
gives action-time approval.

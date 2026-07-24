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

- The Checkly heartbeat exists but remains inactive until the live schedule is
  proven.
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
- No production Vercel, Cloudflare, Checkly, Neon, or Resend value was created
  or changed.

## Verification

The following passed locally:

- Cloudflare-runtime Worker test;
- generated Wrangler binding check and TypeScript check;
- Wrangler dry-run bundle; and
- Checkly monitoring TypeScript validation.

Final evidence still required:

1. the synthetic-suppression change passes the protected staging branch;
2. one authenticated run suppresses the nine fixtures without a Resend send;
3. unauthenticated and stale-credential requests remain denied;
4. the exact Cloudflare cron trigger is deployed and propagated;
5. at least two scheduled invocations complete;
6. the Checkly heartbeat records those invocations; and
7. a controlled missed heartbeat produces and recovers an alert.

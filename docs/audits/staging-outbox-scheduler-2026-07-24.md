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
  32-character minimum and was rotated to a 64-character random value in the
  Vercel branch-scoped Preview environment.
- The fixed admin staging deployment must be rebuilt from the protected
  `staging` Git branch before the new credential is accepted. Until that
  deployment passes, the Worker schedule and heartbeat remain inactive.
- No production Vercel, Cloudflare, Checkly, Neon, or Resend value was created
  or changed.

## Verification

The following passed locally:

- Cloudflare-runtime Worker test;
- generated Wrangler binding check and TypeScript check;
- Wrangler dry-run bundle; and
- Checkly monitoring TypeScript validation.

Final evidence still required:

1. protected `staging` deployment accepts the synchronized credential;
2. unauthenticated and stale-credential requests remain denied;
3. the exact Cloudflare cron trigger is deployed and propagated;
4. at least two scheduled invocations complete;
5. the Checkly heartbeat records those invocations; and
6. a controlled missed heartbeat produces and recovers an alert.

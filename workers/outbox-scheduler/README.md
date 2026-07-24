# Shapewebs outbox scheduler

This package is a staging-only Cloudflare Worker that invokes the protected
admin outbox route every five minutes. It sends a Checkly heartbeat only after
the outbox route returns a valid successful result.

## Boundaries

- The target is fixed to
  `https://admin-staging.shapewebs.com/api/jobs/outbox`.
- The only accepted schedule is `*/5 * * * *`.
- Production targets and unexpected cron expressions fail closed.
- Secrets are never stored in source, `.dev.vars`, or Wrangler configuration.
- The Worker sends only a request ID and authentication headers. It never
  receives lead content unless the admin route violates its response contract.
- Responses are limited to 2 KiB and three nonnegative batch counters.
- Logs contain stable result/reason codes and never contain credentials or the
  Checkly ping URL.

## Encrypted bindings

The staging Worker requires:

- `OUTBOX_CRON_SECRET`, identical to the admin Vercel Preview value restricted
  to Git branch `staging`;
- `VERCEL_AUTOMATION_BYPASS`, a dedicated Vercel deployment-protection bypass;
  and
- `CHECKLY_HEARTBEAT_URL`, the private URL for the managed staging heartbeat.

Use a temporary `--secrets-file` only when the Worker does not yet exist. After
initial creation, use `wrangler secret put`. Never print or retain the values.

## Verification

- `pnpm test:workers` runs the test inside the Cloudflare Workers runtime.
- `pnpm --filter @shapewebs/outbox-scheduler typecheck` verifies generated
  Wrangler bindings and TypeScript.
- `pnpm --filter @shapewebs/outbox-scheduler build` performs a dry-run bundle.
- `pnpm verify` includes the Worker runtime test and scheduler unit coverage.

Activate the Checkly heartbeat only after the fixed staging deployment accepts
the synchronized cron credential and the Cloudflare trigger has propagated.
Cron changes may take up to 15 minutes to reach Cloudflare's network.

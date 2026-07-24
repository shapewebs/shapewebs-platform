# Monitoring as code

Shapewebs synthetic checks are defined in `monitoring/checks` and inherit
two-minute `eu-west-1` defaults from `checkly.config.ts`.

## Safety

- `CHECKLY_WEB_BASE_URL` must be an HTTPS origin without credentials.
- The default target is `https://shapewebs.com`.
- The staging resources are always defined. Their checked-in non-secret
  defaults are `https://staging.shapewebs.com` and
  `https://admin-staging.shapewebs.com`; exact HTTPS environment overrides are
  accepted when a deliberate staging move is required. Missing local origin
  variables can never remove the managed staging checks.
- The lead journey targets only protected staging, uses synthetic `.invalid`
  contact data, and must be paired with staging Turnstile test keys and
  automatic cleanup within seven days.
- `SHAPEWEBS_STAGING_WEB_BYPASS_SECRET` and
  `SHAPEWEBS_STAGING_ADMIN_BYPASS_SECRET` must be distinct Checkly-only global
  secrets registered only on their matching Vercel projects. Checks read them
  only at runtime and send them as Vercel protection-bypass headers. Never
  reuse the GitHub Actions bypass or one application's key for the other.
- `SHAPEWEBS_STAGING_RETENTION_SECRET` must be a second encrypted global
  secret whose value matches the admin staging
  `SYNTHETIC_RETENTION_SECRET`. It can invoke only the strict synthetic
  retention route and is never shared with the outbox worker.
- The staging outbox heartbeat expects a successful ping every five minutes
  and allows six additional minutes before alerting. It remains inactive
  unless `CHECKLY_OUTBOX_HEARTBEAT_READY=true` is present at deployment time.
  Activate it only after the Cloudflare Worker, exact cron trigger, Vercel
  bypass, and synchronized admin cron secret have been verified.
- `CHECKLY_ACTIVATION_PROFILE` controls scheduling and defaults to
  `disabled`. Use `alert-test` only for the controlled
  `staging-admin-readiness` failure/recovery exercise. Use `staging` while
  production remains on the pre-foundation release. Use `enabled` only after
  both production checks and all staging checks have been verified.
- Secrets belong in Checkly encrypted environment variables, never in this
  repository.
- Failure, recovery, and certificate-expiry alerts are managed as code and
  delivered to the confirmed operational inbox, `shapewebs@gmail.com`.

## Commands

- `pnpm monitoring:checkly:validate` type-checks the monitoring project without
  requiring provider credentials.
- `pnpm monitoring:checkly:list` parses and lists the checks without executing
  or recording them; it requires a connected Checkly account.
- `pnpm exec checkly test --no-record` executes the checks without retaining a
  Checkly test session.
- `CHECKLY_ACTIVATION_PROFILE=disabled pnpm exec checkly deploy` deploys
  resources without enabling their schedules.
- `CHECKLY_ACTIVATION_PROFILE=staging pnpm exec checkly deploy` enables only
  the protected staging checks.
- `CHECKLY_ACTIVATION_PROFILE=staging CHECKLY_OUTBOX_HEARTBEAT_READY=true
pnpm exec checkly deploy` also activates the verified outbox heartbeat.
- `CHECKLY_ACTIVATION_PROFILE=staging pnpm exec checkly deploy --preview
--output` previews a staging deployment without changing provider state.
- `CHECKLY_ACTIVATION_PROFILE=enabled pnpm exec checkly deploy` enables the
  verified schedules.
- Local deployment uses the authenticated Checkly CLI session. Non-interactive
  automation will require separately approved Checkly credentials.

The controlled failure/recovery evidence and active schedules must be recorded
before these checks satisfy the production launch gate.

# Monitoring as code

Shapewebs synthetic checks are defined in `monitoring/checks` and inherit
two-minute Frankfurt-region defaults from `checkly.config.ts`.

## Safety

- `CHECKLY_WEB_BASE_URL` must be an HTTPS origin without credentials.
- The default target is `https://shapewebs.com`.
- `CHECKLY_STAGING_WEB_BASE_URL`, when present, must be one exact HTTPS origin.
- The lead journey targets only protected staging, uses synthetic `.invalid`
  contact data, and must be paired with staging Turnstile test keys and
  automatic cleanup within seven days.
- `SHAPEWEBS_STAGING_BYPASS_SECRET` must be a dedicated Checkly-only global
  secret. The browser script reads it only at runtime and sends it as Vercel's
  protection-bypass header before navigation. Never reuse the GitHub Actions
  bypass.
- Secrets belong in Checkly encrypted environment variables, never in this
  repository.

## Commands

- `pnpm monitoring:checkly:validate` type-checks the monitoring project without
  requiring provider credentials.
- `pnpm monitoring:checkly:list` parses and lists the checks without executing
  or recording them; it requires a connected Checkly account.
- `pnpm exec checkly test --no-record` executes the checks without retaining a
  Checkly test session.
- `pnpm exec checkly deploy` updates the connected Checkly project. Deployment
  requires `CHECKLY_ACCOUNT_ID` and `CHECKLY_API_KEY`.

Alert channels, escalation policy, and a controlled-failure exercise must be
configured and recorded before these checks satisfy the production launch
gate.

# Staging security and load testing

The release gate uses passive OWASP ZAP and a deliberately small k6 smoke
scenario. Both runners refuse to operate unless their exact HTTPS hostname is
listed in `SHAPEWEBS_STAGING_HOSTS`. This prevents an accidental scan or load
test against production or an unrelated host.

## Required environment

```text
SHAPEWEBS_STAGING_HOSTS=staging.example.com
K6_TARGET_URL=https://staging.example.com/
ZAP_TARGET_URL=https://staging.example.com/
VERCEL_AUTOMATION_BYPASS_SECRET=<protected-staging-secret>
CHECKLY_STAGING_WEB_BASE_URL=https://staging.example.com
```

Use comma-separated exact hostnames when more than one protected staging
deployment is in scope. Credentials, URL queries, and URL fragments are
rejected. Store the automation bypass as a secret, never as a repository
variable. k6 sends it only in the `x-vercel-protection-bypass` request header.
ZAP receives it through a mode-`0600` temporary configuration file that is
mounted read-only and removed when the container exits; it never appears in
the container command line or uploaded report directory.

The GitHub workflow runs after protected `staging` updates and on its regular
schedule. It reads `SHAPEWEBS_STAGING_HOSTS`, `K6_TARGET_URL`, and
`ZAP_TARGET_URL` from repository variables, and
`VERCEL_AUTOMATION_BYPASS_SECRET` from an Actions secret. If any value is
absent, the workflow refuses to scan. Rotate or revoke the bypass immediately
if it appears in logs or reports. Checkly reads its separate exact origin only
when the synthetic lead check is deliberately enabled.

## Toolchain

- CI and maintainer workstations use the same reviewed k6 version. Record each
  version bump in the pull request and verify its published checksum before
  installing the binary.
- ZAP runs from the digest-pinned `zaproxy/zap-stable` multi-platform image in
  `tooling/scripts/run-zap-baseline.mjs`.
- Generated JSON, Markdown, HTML, and k6 summary output stays under
  `test-results` and is removed by `pnpm clean:artifacts`.

## Commands

```text
pnpm test:load:smoke
pnpm test:zap:baseline
```

The k6 thresholds fail the process when checks fall below 99%, HTTP failures
reach 1%, or p95 request duration reaches 1.5 seconds. ZAP warning or failure
exit codes also fail the release gate; any accepted finding must be documented
with an owner and expiry before a narrowly scoped rule is added.

Only the passive baseline scan belongs on pull-request previews. Authenticated
active scanning, average load, spikes, and soak tests require a dedicated or
disposable staging environment with synthetic data and explicit operator
approval.

The Checkly lead journey must use Cloudflare's published test keys or a
staging-only Turnstile configuration, a synthetic `.invalid` contact identity,
and the daily `staging-synthetic-retention` check. The retention route has a
separate encrypted bearer secret and database policy that matches only the
checked-in synthetic fixture after six days, leaving one day of scheduling
headroom before the seven-day maximum. Never aim either journey at production.

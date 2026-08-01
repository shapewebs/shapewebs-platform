# Staging security and load testing

The release gate uses passive OWASP ZAP and a deliberately small k6 smoke
scenario. Both runners refuse to operate unless their exact HTTPS hostname is
listed in `SHAPEWEBS_STAGING_HOSTS`. This prevents an accidental scan or load
test against production or an unrelated host.

## Required environment

```text
SHAPEWEBS_STAGING_HOSTS=staging.example.com,admin-staging.example.com
SHAPEWEBS_STAGING_URL=https://staging.example.com
SHAPEWEBS_ADMIN_STAGING_URL=https://admin-staging.example.com
K6_TARGET_URL=https://staging.example.com/
ZAP_TARGET_URL=https://staging.example.com/
VERCEL_AUTOMATION_BYPASS_SECRET=<public-project-staging-secret>
VERCEL_ADMIN_AUTOMATION_BYPASS_SECRET=<admin-project-staging-secret>
CHECKLY_STAGING_WEB_BASE_URL=https://staging.example.com
```

Use comma-separated exact hostnames for the public and authenticated staging
deployments. Credentials, URL queries, and URL fragments are rejected. Store
each project's distinct automation bypass as an Actions secret, never as a
repository variable and never share a credential between the public and admin
projects. Each k6 and ZAP step receives only the credential for its exact
target. k6 sends it only in the `x-vercel-protection-bypass` request header. ZAP
receives it through a randomly named, traversal-only temporary directory. The
configuration file is mounted read-only and removed when the container exits;
it never appears in the container command line or uploaded report directory.

The GitHub workflow runs after protected `staging` updates and on its regular
schedule. It reads `SHAPEWEBS_STAGING_HOSTS`, `SHAPEWEBS_STAGING_URL`, and
`SHAPEWEBS_ADMIN_STAGING_URL` from repository variables, and
`VERCEL_AUTOMATION_BYPASS_SECRET` and
`VERCEL_ADMIN_AUTOMATION_BYPASS_SECRET` from Actions secrets. It runs k6 and
ZAP independently against both fixed origins. If any value is absent, the
workflow refuses to scan. Rotate or revoke a bypass immediately if it appears
in logs or reports. Checkly reads its separate exact origin only when the
synthetic lead check is deliberately enabled.

For push-triggered runs, the workflow first polls the current commit's exact
`Vercel – shapewebs-web` and `Vercel – shapewebs-admin` status contexts. Both
must report their newest state as successful before k6 or ZAP can reach the
fixed staging aliases. A terminal deployment failure stops the workflow, and a
ten-minute bound prevents an absent provider status from waiting forever.
Scheduled and manually dispatched scans test the already-settled fixed aliases
without this commit-status wait.

## Toolchain

- CI and maintainer workstations use the same reviewed k6 version. Record each
  version bump in the pull request and verify its published checksum before
  installing the binary.
- ZAP runs from the digest-pinned `zaproxy/zap-stable` multi-platform image in
  `tooling/scripts/run-zap-baseline.mjs`.
- Reviewed passive-rule dispositions live in `tooling/zap/baseline.conf`.
  Rule-wide findings may be reduced only to `INFO`, never hidden with `IGNORE`,
  and must link to an owner, compensating controls and an expiry or review
  trigger in `docs/security/asvs-matrix.md`. A provider-owned endpoint may use
  ZAP's rule-and-URL-specific `OUTOFSCOPE` syntax only when the exact response
  and compensating controls have been verified and documented; the same rule
  must remain enforced for every application-controlled URL.
- Generated JSON, Markdown, HTML, and k6 summary output stays under
  `test-results/{k6,zap}/<exact-hostname>` so evidence from one origin cannot
  overwrite the other. It is removed by `pnpm clean:artifacts`.

## Commands

```text
pnpm test:load:smoke
pnpm test:zap:baseline
```

The k6 thresholds fail the process when checks fall below 99%, HTTP failures
reach 1%, or p95 request duration reaches 1.5 seconds. ZAP warning or failure
exit codes also fail the release gate; any accepted finding must be documented
with an owner and expiry before a narrowly scoped `INFO` rule is added. ZAP's
internal home and diagnostic logs are ephemeral and excluded from artifacts,
preventing configuration values, caches and runtime state from entering the
uploaded report. The runner also fails closed and removes a report if it
contains the exact bypass credential.

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

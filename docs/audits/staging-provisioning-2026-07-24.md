# Staging provisioning evidence

- Date: 24 July 2026
- Environment: synthetic non-production staging
- Status: control plane, protected-host assurance, Turnstile persistence and
  outbound-provider acceptance verified; account-specific journeys pending

## GitHub and Vercel

- GitHub branch `staging` was created from the reviewed foundation candidate.
- Repository ruleset `19675880` protects both the default branch and `staging`
  with pull requests, linear history, resolved conversations, required checks,
  deletion protection, and force-push protection.
- `staging.shapewebs.com` is verified on `shapewebs-web` and assigned only to
  Git branch `staging`.
- `admin-staging.shapewebs.com` is verified on `shapewebs-admin` and assigned
  only to Git branch `staging`.
- Database, application-secret, URL, organization, and Turnstile values use
  Vercel Preview variables scoped specifically to Git branch `staging`.

## Neon

- Project: `shapewebs-platform`
- Region: `aws-eu-central-1`
- Branch: `staging`
- Branch ID: `br-long-shape-askqaw2d`
- Database: `shapewebs`
- Data classification: synthetic non-production only

Migrations `0000` through `0006` were applied with
`shapewebs_migrator`. The complete database security verifier passed role-flag,
forced-RLS, tenant-isolation, session-assurance, idempotent lead/outbox,
webhook-ordering, and immutable-audit scenarios using the separate
least-privilege runtime roles.

Neon Free rejected branch protection because the plan has no protected-branch
capacity. This exception is acceptable only for synthetic staging. A separate
paid production project with a protected branch remains a launch gate.

## Cloudflare Turnstile

- Wrangler `4.114.0` is authenticated with `account:read`, `user:read`, and
  `challenge-widgets.write` only.
- OAuth credentials are encrypted with a key stored in the macOS Keychain.
- Widget: `shapewebs-leads-staging`
- Mode: managed
- Allowed hostname: `staging.shapewebs.com`

The public sitekey and private secret are branch-scoped Vercel variables. The
secret was neither printed nor written to the repository.

## Resend and mail DNS

- A sending-only `Shapewebs Staging` Resend key is restricted to
  `shapewebs.com` and stored only in the admin Preview scope for Git branch
  `staging`.
- The verified sender is `Shapewebs <website@shapewebs.com>`.
- Provider acceptance passed; the original `shapewebs.com` recipient bounced
  because inbound mail is intentionally unavailable, so the recipient variable
  was removed.
- ImprovMX was removed. Apex null MX, SPF `-all`, and DMARC quarantine now
  prevent inbound delivery and spoofing while Resend's outbound DKIM and
  `send` subdomain records remain.

## Runtime evidence

Both fixed hostnames resolve to their protected Git branch `staging`
deployments. Without a valid bypass they redirect to Vercel SSO. With the
rotated credential, public and admin liveness/readiness returned sanitized
`200` responses with `no-store` and the expected security headers. GitHub run
`30103670868` passed k6 and ZAP with a reviewed, credential-free artifact.
Detailed evidence and explicit limitations are recorded in
`docs/audits/staging-runtime-verification-2026-07-24.md`.

## Pending provider evidence

- Configure an authenticated scheduler for the POST-only retention route and
  record its first successful deletion after the six-day threshold.
- Configure Google OAuth and Checkly.
- Add a reachable Resend recipient, register the signed webhook and record
  delivery/bounce state before claiming the complete staging launch gate.

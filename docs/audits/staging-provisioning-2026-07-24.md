# Staging provisioning evidence

- Date: 24 July 2026
- Environment: synthetic non-production staging
- Status: control plane provisioned; runtime deployment verification pending

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

Migrations `0000` through `0005` were applied with
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

## Pending runtime evidence

- Produce fresh Vercel deployments from Git branch `staging`.
- Confirm both fixed hostnames resolve to those branch deployments.
- Verify sanitized liveness and readiness behavior.
- Submit a synthetic lead through real Turnstile and confirm the atomic lead
  and outbox records.
- Configure Google OAuth, Resend, Checkly, and protected staging access before
  claiming the complete staging launch gate.

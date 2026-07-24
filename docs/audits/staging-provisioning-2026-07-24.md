# Staging provisioning evidence

- Date: 24 July 2026
- Environment: synthetic non-production staging
- Status: control plane, protected-host assurance, Turnstile persistence,
  outbound-provider acceptance, bounce, replay, Workspace inbound mail and
  scheduler recovery verified; Google OAuth and production account
  configuration remain pending

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
- The application sender is
  `Shapewebs <noreply@shapewebs.com>`. The address is transactional and
  outbound-only; it is not a human mailbox.
- The branch-scoped notification recipient is `sales@shapewebs.com`.
- The staging webhook is enabled for seven delivery-lifecycle events. Its
  signing secret is a sensitive, branch-scoped admin variable, and a dedicated
  staging-only Vercel bypass lets Resend reach the otherwise protected route.
- A safe synthetic send produced signed `email.sent` and `email.delivered`
  events. Resend received `200` on the first attempt, Neon reached
  `email.delivered`, and the exact synthetic rows and temporary test recipient
  were removed afterward.
- A separate safe `bounced@resend.dev` journey produced signed `email.sent` and
  `email.bounced` events. Replaying the successful bounce event produced
  `{"status":"duplicate"}` on attempt two while Neon retained one bounce event
  and the monotonic `email.bounced` state. The exact fixture and recipient were
  removed afterward.
- ImprovMX was removed. Google Workspace MX, apex SPF, 2048-bit Google DKIM and
  DMARC quarantine now protect inbound and human outbound mail. Resend's DKIM
  and `send` subdomain SPF/MX remain isolated for transactional delivery.
- An external Resend MX exercise delivered successfully to
  `admin@shapewebs.com`, the six role aliases, and the personal
  `lukasthomsen@shapewebs.com` alias. All eight messages arrived in the
  `admin@shapewebs.com` inbox.

## Runtime evidence

Both fixed hostnames resolve to their protected Git branch `staging`
deployments. Without a valid bypass they redirect to Vercel SSO. With the
rotated credential, public and admin liveness/readiness returned sanitized
`200` responses with `no-store` and the expected security headers. GitHub run
`30103670868` passed k6 and ZAP with a reviewed, credential-free artifact.
Detailed evidence and explicit limitations are recorded in
`docs/audits/staging-runtime-verification-2026-07-24.md`.

## Pending provider evidence

- Record the active authenticated retention schedule's first successful
  deletion after the six-day threshold.
- Configure Google OAuth and complete the owner-to-TOTP journey.
- Complete Workspace MFA plus alias send-as and filter configuration.

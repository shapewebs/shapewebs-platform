# Google Workspace provisioning evidence — 24 July 2026

## Scope

This record covers the initial Google Workspace identity and mail cutover for
`shapewebs.com`. It records provider-visible state without copying passwords,
verification tokens, DKIM keys, cookies, or recovery material.

## Provider evidence

- A Google Workspace Business Starter trial is active.
- The single licensed user is `admin@shapewebs.com`, display name
  `Lukas Thomsen`.
- Google confirmed ownership of `shapewebs.com`.
- Gmail showed the `admin@shapewebs.com` inbox and received Google's welcome
  messages.
- Google confirmed Gmail activation after public MX and SPF resolution.
- Google accepted the published 2048-bit DKIM record and activated signing.
- Vercel remains the authoritative DNS provider.
- Existing Resend domain-authentication records were preserved.
- Existing DMARC quarantine policy was preserved.

## Address model

The following aliases deliver to the single `admin@shapewebs.com` inbox:

- `info@shapewebs.com`;
- `sales@shapewebs.com`;
- `support@shapewebs.com`;
- `lukasthomsen@shapewebs.com`;
- `security@shapewebs.com`;
- `privacy@shapewebs.com`; and
- `billing@shapewebs.com`.

`shapewebs@gmail.com` is recorded as the independent contact/recovery address.
`noreply@shapewebs.com` is not a Workspace identity and remains an outbound-only
Resend sender. No catch-all was enabled.

## Application staging configuration

The admin Vercel Preview environment for Git branch `staging` now contains:

- `ADMIN_OWNER_EMAILS=admin@shapewebs.com`;
- `LEAD_NOTIFICATION_TO_EMAIL=sales@shapewebs.com`; and
- `LEAD_NOTIFICATION_FROM_EMAIL=Shapewebs <noreply@shapewebs.com>`.

The values are restricted to the fixed staging branch. No production
application variable was changed.

## Deliberately deferred

- The Google account still needs phishing-resistant multi-factor
  authentication and recovery verification.
- Alias-specific Gmail labels, filters, and send-as identities are not yet
  configured.
- Controlled inbound and authenticated outbound tests still need explicit
  authorization because they send real messages.
- The dedicated Workspace-owned Google Cloud project and OAuth client remain
  pending after Google Cloud Console temporarily failed to load for the newly
  created account.
- Workspace trial expiration, billing ownership, and renewal notifications
  still need a billing review before the trial ends.

No payment method was entered, no paid upgrade was accepted, and no production
deployment was promoted during this work.

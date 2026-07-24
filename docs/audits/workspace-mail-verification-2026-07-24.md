# Workspace mail verification

- Date: 24 July 2026
- Environment: Google Workspace trial and Resend staging
- Primary mailbox: `admin@shapewebs.com`
- Status: inbound routing and transactional MX delivery verified; MFA,
  send-as identities, filters and outbound identity verification remain open

## Address contract

The single licensed Workspace mailbox is `admin@shapewebs.com`. These aliases
route to that mailbox:

- `info@shapewebs.com`;
- `sales@shapewebs.com`;
- `support@shapewebs.com`;
- `security@shapewebs.com`;
- `privacy@shapewebs.com`;
- `billing@shapewebs.com`; and
- `lukasthomsen@shapewebs.com`.

There is no catch-all. `noreply@shapewebs.com` is a Resend-only transactional
sender and is intentionally not an inbox. `shapewebs@gmail.com` remains the
independent operational and recovery account.

## Provider and DNS controls

Google Workspace is the inbound provider. Google MX, apex SPF, 2048-bit Google
DKIM and DMARC quarantine are active. Resend uses its separate verified DKIM
and `send` subdomain SPF/MX records. Removing ImprovMX did not remove Resend's
transactional records or create forwarding.

## External MX evidence

An authorized external test sent one uniquely identified Resend message from
`Shapewebs Mail Test <noreply@shapewebs.com>` to each primary or alias address.
Resend reported all eight messages as delivered. Gmail showed all eight in the
`admin@shapewebs.com` inbox at `2026-07-24T20:08Z`.

This proves that each published inbound address terminates in the central
Workspace mailbox and that `noreply@shapewebs.com` can reach the human mailbox
through the same external path used by the transactional provider.

## Personal Gmail finding

`shapewebs@gmail.com` still has a legacy `info@shapewebs.com` send-as identity.
The first Gmail-origin test therefore did not provide independent MX evidence:
Google treated the `info@` message as an internal self-message, while the other
seven attempts returned send-as misconfiguration notices. No domain routing
failure was inferred from those attempts; the external Resend exercise passed
for every address.

The legacy personal send-as identity must be removed after the equivalent
Workspace sender is verified. Human domain mail should originate from the
Workspace account; the personal Gmail account should remain recovery and
operational contact only.

## Remaining controls

1. Enable two-step verification on `admin@shapewebs.com` and verify the
   `shapewebs@gmail.com` recovery address.
2. Add Workspace send-as identities for the role and personal aliases, keeping
   each as an alias of the central account.
3. Add inbox-preserving labels and filters for every alias.
4. Send a controlled outbound message from each configured Workspace identity
   to `shapewebs@gmail.com` and verify the authenticated From address.
5. Do not add `noreply@shapewebs.com` as a Gmail sender or mailbox.

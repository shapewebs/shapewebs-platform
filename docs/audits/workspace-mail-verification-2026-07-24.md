# Workspace mail verification

- Date: 24 July 2026
- Environment: Google Workspace trial and Resend staging
- Primary mailbox: `admin@shapewebs.com`
- Status: historical 24 July routing evidence retained; current two-user
  follow-up recorded below

## Historical address contract — 24 July 2026

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

## Inbox organization

One `Shapewebs` parent label and these eight child labels are active:

- `Shapewebs/Admin`;
- `Shapewebs/Info`;
- `Shapewebs/Sales`;
- `Shapewebs/Support`;
- `Shapewebs/Security`;
- `Shapewebs/Privacy`;
- `Shapewebs/Billing`; and
- `Shapewebs/Personal`.

Each address has an exact `to:` filter that applies only its matching label.
The filters preserve the inbox and unread state: they do not archive, forward,
delete or mark mail as read. Existing conversations were backfilled. The
external MX fixtures visibly carry their matching labels. Gmail is configured
to reply from the same address that received a message, so replies to role
inboxes preserve the customer-facing identity; `admin@shapewebs.com` remains
the default for new messages.

## Outbound identity evidence

`admin@shapewebs.com` remains the default Workspace sender.
`Shapewebs <info@shapewebs.com>` is an additional alias identity. An authorized
message sent from that identity reached `shapewebs@gmail.com` at
`2026-07-24T20:46:58Z`, and Gmail reported the authenticated From address as
`info@shapewebs.com`.

## Personal Gmail finding

`shapewebs@gmail.com` had a legacy `info@shapewebs.com` send-as identity that
used `smtp.simply.com` and was still the default. The first Gmail-origin test
therefore did not provide independent MX evidence: Google treated the `info@`
message as an internal self-message, while the other seven attempts returned
send-as misconfiguration notices. No domain routing failure was inferred from
those attempts; the external Resend exercise passed for every address.

After the Workspace `info@` identity passed its outbound test, the stale
personal send-as entry was removed. `shapewebs@gmail.com` is again its own
default and only sender. No mail was deleted. Human domain mail now originates
from the Workspace account; the personal Gmail account remains recovery and
operational contact only.

## Follow-up — 25 July 2026

`lukasthomsen@shapewebs.com` was converted from an alias into a separately
licensed, named everyday user. The historical eight-address MX test above
remains valid evidence for the routing configuration that existed on 24 July;
new mail to `lukasthomsen@shapewebs.com` now terminates in that user's own
mailbox rather than the administrative inbox.

The `admin@shapewebs.com` Gmail settings now show billing, info, privacy, sales,
security and support as additional sender identities. They remain role aliases,
not paid users or independent inboxes.

Remaining controls:

1. Verify two-step authentication and recovery for the privileged
   `admin@shapewebs.com` account and appropriate MFA for the named account.
2. Send a controlled outbound message from each role identity not already
   evidenced to `shapewebs@gmail.com` and verify the authenticated From address.
3. Do not add `noreply@shapewebs.com` as a Gmail sender or mailbox.

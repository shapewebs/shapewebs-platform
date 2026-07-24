# ADR 0003: central administration, role aliases, and automated senders

- Status: accepted
- Date: 24 July 2026
- Decision owners: Shapewebs

## Context

Shapewebs needs professional domain email for customer communication, provider
ownership, Google OAuth administration, security notifications, and automated
application messages.

The domain uses Vercel's authoritative nameservers. Google Workspace now
receives human mail for `shapewebs.com`; Resend authenticates application
messages through separate DKIM and `send.shapewebs.com` records. DMARC remains
at quarantine while both sending systems are observed.

Cloudflare Email Routing would require moving the authoritative DNS zone.
Forwarding-only services also would not provide a complete, DMARC-aligned human
send-and-reply experience. Neither is justified now that Workspace is active.

Shapewebs currently has one operator. The user selected a central
`admin@shapewebs.com` Workspace account for the first licensed identity instead
of an employee address. This is acceptable only while its credentials are not
shared. Before a second maintainer joins, each person must receive an
individually licensed account and routine actions must move to those named
accounts.

## Decision

Use Google Workspace for the human mailbox and identity boundary, while keeping
Resend for application-generated mail:

- The one licensed Workspace user and Google administration identity is
  `admin@shapewebs.com`, with display name `Lukas Thomsen`.
- Keep `shapewebs@gmail.com` as the independently protected recovery address.
- The following aliases deliver to the `admin@shapewebs.com` inbox:
  - `info@shapewebs.com`;
  - `sales@shapewebs.com`;
  - `support@shapewebs.com`;
  - `lukasthomsen@shapewebs.com`;
  - `security@shapewebs.com`;
  - `privacy@shapewebs.com`;
  - `billing@shapewebs.com`.
- Reserve `noreply@shapewebs.com` for automated Resend messages. It is not a
  Workspace mailbox, alias, or login. Application messages must set a useful
  role address or customer address as `Reply-To`.
- Do not enable a catch-all address. Unknown recipients should fail clearly
  instead of creating an unbounded spam and typo surface.
- Use Google Workspace's required `postmaster` handling. Add `abuse` as a
  Google Group or routing address if Workspace does not reserve it for the
  primary domain.

Aliases are appropriate while one person owns all functions. Convert a role
address to a Google Group, delegated mailbox, or ticketing-system address when
more than one person needs independent access and auditability.

## Provider identity map

| Purpose                                   | Address                      |
| ----------------------------------------- | ---------------------------- |
| Workspace and Google Cloud administration | `admin@shapewebs.com`        |
| Named owner correspondence                | `lukasthomsen@shapewebs.com` |
| Independent account recovery              | `shapewebs@gmail.com`        |
| Provider operational notices              | `admin@shapewebs.com`        |
| Security alerts and vulnerability reports | `security@shapewebs.com`     |
| Invoices, renewals, and spend alerts      | `billing@shapewebs.com`      |
| General customer enquiries                | `info@shapewebs.com`         |
| New projects, quotations, and leads       | `sales@shapewebs.com`        |
| Existing-customer help                    | `support@shapewebs.com`      |
| Data-subject and privacy requests         | `privacy@shapewebs.com`      |
| Transactional application sender          | `noreply@shapewebs.com`      |

GitHub remains attached to Lukas Thomsen's personal GitHub account, with
Shapewebs resources owned by the GitHub organization. Provider teams and
organizations remain the authorization boundary; changing their notification
email must not replace named membership or personal MFA.

## Google administration and OAuth

The first Better Auth owner allowlist uses `admin@shapewebs.com`. It is the
actual Google Account, unlike the Workspace aliases, which cannot sign in to
Google services.

The central account may administer the one-person Workspace and Google Cloud
organization with phishing-resistant MFA. Its credentials must never be
shared. Before a second maintainer or commercial customer portal launches:

1. create individually licensed, named users for every maintainer;
2. remove routine super-administrator use from `admin@shapewebs.com`;
3. keep `admin@shapewebs.com` as a controlled administrative or break-glass
   identity; and
4. store its recovery material offline and test recovery.

The Google OAuth client belongs to a dedicated Shapewebs Google Cloud project.
Its consent screen, support contact, developer contact, JavaScript origins, and
redirect URIs use exact production or fixed staging values; wildcard preview
origins are prohibited.

## DNS and deliverability contract

The Workspace cutover completed in this order:

1. Google verified domain ownership;
2. the licensed user was created;
3. the null MX was replaced with Google's Workspace MX;
4. apex SPF was changed from `-all` to authorize Google;
5. Resend's DKIM and `send.shapewebs.com` SPF/MX records were preserved;
6. a 2048-bit Google DKIM key was published and signing was activated; and
7. DMARC quarantine was preserved.

The remaining deliverability work is to test inbound and authenticated outbound
mail for the primary account and every human-facing alias, then review aggregate
DMARC evidence before considering `reject`. The Resend-only `noreply@` path is
tested independently and must remain inbound-disabled.

DNS changes are made through Vercel, which remains authoritative. A Cloudflare
nameserver migration is a separate architecture decision.

## Gmail organization

Create Gmail filters and labels for the original recipient:

- `Shapewebs/Sales`;
- `Shapewebs/Support`;
- `Shapewebs/Admin`;
- `Shapewebs/Security`;
- `Shapewebs/Billing`;
- `Shapewebs/Privacy`.

Configure each human-facing alias as a Gmail `From` address and reply from the
address that received the message. Do not send customer correspondence from
`admin@`, `security@`, or `noreply@`.

## Implementation status

As of 24 July 2026:

- the Workspace Business Starter trial is active;
- `shapewebs.com` is verified;
- Gmail, Google SPF, and 2048-bit Google DKIM are active;
- the licensed account, aliases, and recovery address above are configured;
- `admin@shapewebs.com` is the branch-scoped Better Auth owner;
- staging lead notifications target `sales@shapewebs.com`;
- staging transactional mail sends as
  `Shapewebs <noreply@shapewebs.com>`;
- no catch-all or additional paid user was created; and
- mailbox MFA, alias send-as/filter setup, end-to-end mail-flow testing, and
  the Google Cloud OAuth client remain to be completed.

No payment method, plan upgrade, or production application environment was
changed during this cutover.

## Consequences

Benefits:

- one paid mailbox supports the current solo business;
- public role addresses can become groups or delegated mailboxes without
  changing customer-facing addresses;
- Google OAuth and Google Cloud ownership use the verified company identity;
- Resend remains isolated to transactional application delivery; and
- Vercel DNS and website routing remain unchanged.

Costs and risks:

- Google Workspace becomes a paid subscription after the trial unless
  cancelled;
- a central administrative login provides weaker person-level attribution than
  named employee accounts and must not be shared;
- Gmail filters and send-as identities require one-time configuration; and
- provider account email changes must avoid recovery gaps.

## Rollback

Export the exact active mail-related DNS records before any future mail
migration. If Workspace must be abandoned, restore null MX and apex SPF `-all`
only after confirming no human mail still depends on Workspace. This returns
the domain to fail-closed inbound behavior without affecting web traffic or
Resend's isolated outbound subdomain. Do not restore an unreviewed forwarding
provider as an implicit fallback.

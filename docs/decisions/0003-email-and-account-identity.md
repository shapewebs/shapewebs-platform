# ADR 0003: separate named identities, role addresses, and automated senders

- Status: accepted
- Date: 24 July 2026
- Decision owners: Shapewebs

## Context

Shapewebs needs professional domain email for customer communication, provider
ownership, Google OAuth administration, security notifications, and automated
application messages.

The domain currently uses Vercel's authoritative nameservers. Apex null MX and
SPF `-all` intentionally reject inbound email, while Resend authenticates
transactional outbound mail through isolated DKIM and `send.shapewebs.com`
records.

Cloudflare Email Routing cannot be added without moving the entire authoritative
DNS zone to Cloudflare. A DNS-host migration is not justified merely to obtain
mail forwarding. Forwarding-only services also do not provide a complete,
DMARC-aligned human send-and-reply experience.

Generic role addresses such as `admin@shapewebs.com` are unsuitable as shared
human identities. They obscure which person performed an action and become
difficult to revoke safely when the team grows.

## Decision

Use Google Workspace for the human mailbox and identity boundary, while keeping
Resend for application-generated mail:

- Create one licensed, named Workspace user:
  `lukasthomsen@shapewebs.com`.
- Keep `shapewebs@gmail.com` as the independently protected recovery address.
- Add these aliases to the named Workspace user:
  - `info@shapewebs.com`;
  - `sales@shapewebs.com`;
  - `admin@shapewebs.com`;
  - `support@shapewebs.com`;
  - `security@shapewebs.com`;
  - `privacy@shapewebs.com`;
  - `billing@shapewebs.com`.
- Reserve `noreply@shapewebs.com` for automated Resend messages. It is not a
  mailbox or login, and application messages must set a useful role address or
  customer address as `Reply-To`.
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
| Named owner and routine provider login    | `lukasthomsen@shapewebs.com` |
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

The first Better Auth owner allowlist uses
`lukasthomsen@shapewebs.com`, not an alias. Workspace aliases are not Google
Accounts and cannot sign in to Google services.

Initially the named account may administer the one-person Workspace and Google
Cloud organization with phishing-resistant MFA. Before a second maintainer or a
commercial customer portal launches, add a non-routine break-glass
administrator identity, store its recovery material offline, and remove daily
super-administrator use from the named account.

The Google OAuth client belongs to a dedicated Shapewebs Google Cloud project.
Its consent screen, support contact, developer contact, JavaScript origins, and
redirect URIs use exact production or fixed staging values; wildcard preview
origins are prohibited.

## DNS and deliverability contract

The Workspace cutover must:

1. verify domain ownership before changing mail delivery;
2. create the named user and aliases before publishing Google's MX record;
3. replace the null MX with Google's current Workspace MX value;
4. replace apex SPF `-all` with one SPF record authorizing Google;
5. preserve Resend's DKIM and `send.shapewebs.com` SPF/MX records;
6. generate a 2048-bit Google DKIM key, publish it, and enable signing;
7. retain DMARC quarantine during verification and review aggregate reports
   before considering `reject`;
8. test inbound and authenticated outbound mail for the primary identity and
   every human-facing alias;
9. keep `noreply@shapewebs.com` inbound-disabled and test its Resend path
   separately.

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

## Consequences

Benefits:

- one paid mailbox supports the current solo business without shared
  credentials;
- every provider action remains attributable to a named person;
- aliases can become groups or delegated mailboxes without changing public
  addresses;
- Google OAuth and Google Cloud ownership use the same verified company
  identity;
- Resend remains isolated to transactional application delivery;
- Vercel DNS and the existing website routing remain unchanged.

Costs:

- Google Workspace is a paid subscription;
- Workspace setup and DKIM activation require console steps and may take time
  to propagate;
- Gmail filters and send-as identities require one-time configuration;
- provider account email changes must be performed carefully to avoid account
  recovery gaps.

## Rollback

Before MX replacement, export the exact existing mail-related DNS records.
During initial cutover, keep a short DNS TTL and do not delete Resend records.

If Workspace activation fails, restore null MX and apex SPF `-all`; this returns
the domain to the known fail-closed inbound state without affecting web traffic
or Resend's isolated outbound subdomain. Do not restore an unreviewed
forwarding provider as an implicit fallback.

# ADR 0006: unified account portal and identity

- Status: accepted
- Date: 30 July 2026
- Decision owners: Shapewebs
- Supersedes: ADR 0004 and ADR 0005

## Context

Shapewebs needs one account portal for customers and employees. A person must
not have to remember whether an account was created with Google or with a
password, and a person who is both a customer and an employee must not receive
two unrelated Shapewebs identities.

The earlier implementation deliberately separated the customer and employee
applications, identity schemas, cookies, OAuth clients and database roles. That
was a defensible blast-radius boundary, but it conflicts with the now-confirmed
product requirement for one portal and one account at
`https://admin.shapewebs.com`.

The public website remains a separate, static-first application at
`https://shapewebs.com`. It must not receive authenticated portal cookies or
load an authentication runtime.

## Decision

`apps/admin` becomes the only authenticated Next.js application. It serves
customers and employees from `https://admin.shapewebs.com`. The temporary
`apps/portal` application and `portal.shapewebs.com` deployment are retired
after route, data, provider and test parity has been verified.

The authenticated application uses one Better Auth instance, one host-only
cookie namespace, one OAuth callback and the `auth` schema as the canonical
identity store:

```text
person
└── auth.user (stable Shapewebs identity)
    ├── auth.account(provider = "google")
    ├── auth.account(provider = "credential")
    └── auth.passkey (one or more WebAuthn credentials)
```

Authentication methods are attached to the same user. They do not define the
user's role. A Google-first user may add a password through verified recovery;
a password-first user may explicitly connect Google after recent
reauthentication. Matching email alone never silently joins two unverified
identities.

## Authorization model

Authorization remains server- and database-owned:

```text
auth.user
├── staff_memberships
│   └── role: owner | editor
└── customer_memberships
    └── customer_project_memberships
```

A user may hold either membership or both. Each protected page, Server Action
and Route Handler re-reads the session, membership, organization, role and
resource relationship. Browser input cannot select or override a role,
organization or project assignment.

The portal presents workspaces rather than account types:

- a customer-only user enters the customer workspace;
- a staff-only user enters the studio after Google/password plus TOTP or after
  a user-verified passkey sign-in;
- a dual-member user may enter the customer workspace immediately and may
  enter the studio after the same employee assurance; and
- a signed-in user with no active membership receives a fail-closed access
  state.

Strong authentication is an assurance requirement for the employee workspace,
not a second identity realm. Google/password sessions establish it through
local TOTP. A signed passkey assertion with authenticator user verification
establishes it directly on the new session and must not trigger a second TOTP
prompt. CMS access, publishing, destructive changes, exports and security
administration continue to require the applicable freshness.
The initial read-focused customer workspace does not require employee TOTP.

## Routes

The canonical route contract is:

| Route family                                                 | Purpose                                             |
| ------------------------------------------------------------ | --------------------------------------------------- |
| `/login`, `/activate`, `/forgot-password`, `/reset-password` | Shared account authentication and recovery          |
| `/dashboard`                                                 | Server-resolved landing page or workspace choice    |
| `/customer/*`                                                | Customer project workspace                          |
| `/studio/*`                                                  | Employee CMS and operational workspace              |
| `/account/security`                                          | Shared methods, sessions and account security       |
| `/api/auth/*`                                                | The single Better Auth instance and Google callback |

Legacy employee route paths may redirect to `/studio/*` during migration.
Legacy customer portal URLs may redirect to the matching
`admin.shapewebs.com/customer/*` route only after the canonical deployment is
ready. Redirect parameters remain allowlisted relative paths.

## Signup and method-linking policy

There is no open self-service signup.

- Customer creation starts from an owner-created, opaque, single-use,
  expiring invitation bound to the email, organization and projects.
- Employee activation starts from the owner-controlled staff allowlist until a
  reviewed staff-invitation flow replaces it.
- Google and password are alternative first methods for the same account.
- Google-created accounts may add a password through a single-use verified
  mailbox flow.
- Password-created accounts may connect Google only from an authenticated
  security page after recent reauthentication.
- Different-email linking, removing the final usable method and browser-driven
  role assignment remain prohibited.
- Passkeys attach to the same canonical user only from an authenticated account
  security page. Employee enrollment and removal require fresh local
  strong-auth assurance; initial enrollment is bootstrapped with TOTP, while a
  freshly passkey-authenticated session already satisfies that requirement.
  Removal is denied when it would leave no usable sign-in method.

## Session and database boundaries

The browser receives one Secure, HttpOnly, host-only `__Host-` cookie. Session
state is stored only in `auth.session`.

One application does not mean one unrestricted database connection. Customer
repositories continue to execute through the least-privilege customer runtime
role and forced RLS; employee repositories continue through the
least-privilege staff runtime role. The authenticated application may hold
both runtime connection strings, but each repository accepts an explicit
server-created authorization context and uses only its assigned role.

Customer and employee authorization contexts remain distinct types. A generic
session object is never accepted as authorization for customer data or studio
mutations.

## Identity migration

The transition to `auth.user` is fail-closed and rehearsed on a disposable Neon
branch before staging:

1. Create a deterministic mapping from every `customer_auth.user` to one
   `auth.user`.
2. Preserve the customer user ID when its normalized email does not already
   exist in `auth.user`.
3. Merge into an existing `auth.user` only when both records have a verified,
   identical normalized email and provider-account checks are conflict-free.
4. Abort the migration on an unverified email collision, conflicting Google
   subject or second credential account. These cases require explicit owner
   resolution; the migration never guesses.
5. Copy non-conflicting provider accounts and terminal auth-email delivery
   evidence to the canonical schema. Drain or explicitly reissue active email
   commands before migration; the migration aborts while any are in flight.
6. Repoint customer memberships, invitation claims and project assignments to
   the mapped canonical user.
7. Revoke old customer sessions instead of copying them. Customers sign in
   again through the canonical portal.
8. Verify row counts, memberships, assignments, provider accounts, outbox
   commands and RLS denial cases.
9. Retain rollback evidence until staging verification is complete, then
   remove the duplicate Better Auth tables and obsolete portal runtime
   deployment.

Production execution is blocked if the preflight finds a conflict or if the
backup and restore rehearsal is not current.

## Performance and reliability

- The public application remains static-first and unauthenticated.
- The portal is Server Component-first; authentication and authorization are
  memoized within a render pass.
- Protected responses are private and non-cacheable.
- A normal portal request performs one session read and only the membership
  query required by the requested workspace.
- Login does not query both complete workspace data sets.
- Auth email commands remain durable and idempotent.
- The former portal package is retired; its invitation, verification, reset,
  recovery and customer-project contracts now belong to the unified
  application and remain mandatory staging/release journeys.

## Required verification

The release gate includes:

- Google-first, password-first, passkey-first-after-enrollment, and mixed-method
  login to the same user;
- a Google-first account adding a password and a password-first account
  explicitly connecting Google;
- invitation expiry, replay, forwarding, email mismatch and concurrent
  acceptance;
- customer-only, staff-only, dual-member, suspended, wrong-tenant,
  wrong-project and no-membership authorization;
- mandatory TOTP after Google/password employee sign-in, direct studio entry
  after user-verified passkey sign-in, and fresh assurance for sensitive
  employee actions;
- direct customer-to-studio and employee-to-unassigned-customer IDOR attempts;
- reset expiry, replay, compromised-password rejection, session revocation and
  generic unknown-account responses;
- passkey origin/RP mismatch, challenge replay, missing user verification,
  duplicate credential, unauthorized enrollment, cancellation, and final-method
  removal denial;
- migration collision preflight, row-count reconciliation, rollback and
  restore;
- no portal cookie or authentication JavaScript on `shapewebs.com`; and
- accessibility, cross-browser, Lighthouse, k6 and ZAP checks for the unified
  portal.

## Consequences

Shapewebs gains one understandable account and one login destination while
retaining membership, TOTP and RLS boundaries. Account recovery and method
linking become consistent across customers and employees.

The authenticated deployment has a larger application surface and access to
two least-privilege runtime connections. That risk is accepted with strict
repository boundaries, per-request authorization, CSP, tests, audit evidence
and database-enforced isolation.

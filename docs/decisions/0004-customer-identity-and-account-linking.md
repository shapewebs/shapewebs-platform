# ADR 0004: isolated customer identity with explicit account linking

- Status: accepted
- Date: 26 July 2026
- Decision owners: Shapewebs
- Supersedes: the future-portal placement described in the original foundation
  topology; the implemented admin identity contract remains unchanged

## Context

Shapewebs customers must eventually be able to authenticate with either Google
or an email and password. A customer who controls both methods should have one
Shapewebs profile, one set of organization/project permissions, and several
authentication accounts rather than duplicate users.

The implemented Better Auth instance is intentionally administrative:

- it is mounted only in `apps/admin`;
- only exact allowlisted Google identities may create sessions;
- email/password and public registration endpoints are disabled; and
- local TOTP is required before CMS authorization.

Enabling customer credentials in that instance would unnecessarily join two
trust boundaries. Placing portal authentication in `apps/web` would also send
customer cookies on marketing requests and make it easier for request-time
identity APIs to erode the public site's static performance.

Shapewebs is a bespoke service rather than a self-service website builder.
Customer accounts have no useful access until Shapewebs assigns an organization
and project.

## Decision

Create a separately deployed customer portal when customer onboarding enters
implementation:

| Surface         | Origin                         | Authentication                     |
| --------------- | ------------------------------ | ---------------------------------- |
| Public website  | `https://shapewebs.com`        | None                               |
| Customer portal | `https://portal.shapewebs.com` | Google or verified email/password  |
| Admin CMS       | `https://admin.shapewebs.com`  | Allowlisted Google plus local TOTP |

The preferred repository and provider topology is:

- a third Next.js application at `apps/portal`;
- a separate `shapewebs-portal` Vercel project;
- a separate Better Auth configuration, secret, cookie namespace, exact
  origins, Google OAuth client, Neon schema, and least-privilege runtime role;
- host-only `__Host-` cookies with no cross-subdomain session sharing; and
- no automatic customer/admin identity or privilege bridge.

The existing `auth` schema remains the administrative identity store until a
reviewed migration gives it a clearer name. Customer Better Auth records live
in a separate `customer_auth` schema. Migration `0013` implements the accepted
split: `staff_memberships` references the administrative identity store, while
`customer_memberships` and `customer_project_memberships` reference only
`customer_auth.user`. The admin and portal SQL runtime roles have mutually
exclusive identity-schema access, and portal data policies require an active
customer membership plus an exact project assignment.

## Registration policy

Start with invitation-gated registration:

1. an administrator creates an opaque, single-use, expiring invitation bound
   to a normalized email and intended organization/project;
2. the recipient chooses Google or email/password;
3. Shapewebs verifies control of the invited email;
4. the authenticated customer explicitly accepts the matching invitation; and
5. only then does an active membership grant access.

The implemented credential foundation deliberately does not call Better
Auth's general email signup endpoint. That endpoint would persist the password
chosen by anyone holding a forwarded invitation before the mailbox owner had
verified control. Instead, Shapewebs creates an inactive provisional account
and queues a durable verification message. The mailbox owner must choose the
final password from that single-use message; one database transaction replaces
the provisional password, verifies the user, accepts the invitation, assigns
the projects, and activates membership. No session is issued before that
transaction succeeds.

Google onboarding exchanges the invitation URL once for a short-lived
HttpOnly registration grant. The Google callback must return the exact invited
verified email before the invitation can be accepted. Core open signup and
verification endpoints remain disabled for both methods.

The signup interface is therefore complete but not open to arbitrary account
creation. Public visitors continue through the lead journey. Open registration
may be added behind a feature flag only after its abuse, retention, support,
and unassigned-account lifecycle has separate approval.

## Identity and account model

Authentication methods attach to one customer user:

```text
customer_user
├── account(provider = "credential", password_hash)
└── account(provider = "google", provider_subject)
```

Organization memberships and project assignments reference the customer user,
never a provider account, email string, browser role, or OAuth profile field.
The stable Google subject identifies the provider account. Email is a verified
contact and initial-linking attribute, not the provider's durable primary key.

Customer account linking uses:

- `disableImplicitLinking: true`;
- `allowDifferentEmails: false`;
- `allowUnlinkingAll: false`;
- encrypted OAuth tokens; and
- an explicit signed-in `linkSocial()` journey after recent reauthentication.

## Account lifecycle rules

### Email/password first, Google later

The customer verifies the email and signs in with the password. The Security
page requires recent password verification before starting **Connect Google**.
The Google account must return a verified email matching the customer's
canonical email at initial link time.

### Google first, password later

The customer selects **Add password**. Shapewebs uses the single-use
password-recovery journey to the verified primary email. Browser code cannot
call a general privileged `setPassword` endpoint.

### Same email encountered while signed out

Do not silently link a new Google account to an existing credential user.
Return the account-not-linked journey and instruct the customer to sign in with
the original method before connecting Google explicitly.

Duplicate credential signup and password-reset requests return uniform
responses that do not disclose whether an account exists. A rate-limited
security notification may tell the existing owner about a duplicate signup
attempt.

### Different provider email

Do not link it in the first release. The customer may complete the separately
verified primary-email change procedure and then retry an eligible link.
Existing provider accounts remain identified by their stable provider subject
if the provider later changes its displayed email.

### Unlinking and sensitive identity changes

Link, unlink, password change, email change, session revocation, data export,
and account deletion require recent reauthentication. An account cannot remove
its last verified usable method. Successful changes rotate or revoke sessions
as appropriate, append a safe audit event, and send a security notice.

Changing the primary email requires confirmation through the current address,
verification of the new address, and notices to both. Password reset uses a
short-lived, single-use token and revokes existing sessions.

No knowledge-based questions, support-agent password assignment, or
email-only administrative privilege recovery are permitted.

## Customer security policy

- Require verified email before session-backed membership access.
- Require passwords of at least 15 and at most 128 characters while password
  authentication remains a single factor.
- Permit spaces, Unicode, paste, autofill, and password managers; do not impose
  character-class composition rules or scheduled rotation.
- Reject common and known-compromised passwords server-side.
- Use Better Auth's reviewed memory-hard password hashing and keep password
  hashes only in the credential account.
- Store sessions in Postgres and enforce a seven-day absolute lifetime plus a
  24-hour inactivity limit. A longer remembered-device policy requires a later
  risk decision.
- Use database-backed Better Auth rate limits plus Vercel Firewall controls.
- Apply server-verified managed Turnstile to signup, invitation acceptance,
  reset, and resend operations. Require it on sign-in only after a risk or
  failure threshold.
- Keep exact OAuth origins, state/PKCE checks, CSRF/origin protection, bounded
  strict inputs, generic failure responses, and pseudonymous redacted logs.
- Re-authorize every page data access, Server Action, and Route Handler from
  the database-backed session, membership, tenant, and resource relationship.
- Enforce the same customer/project isolation with a dedicated database role
  and forced RLS.

Customer MFA is not a prerequisite for the initial read-focused portal, but
the account model must permit optional passkeys or TOTP later. Administrative
TOTP remains mandatory and is not shared with the customer portal.

## Reliability and email delivery

Verification, invitation, reset, linking, and security-notification messages
reuse the Shapewebs Resend package and durable outbox pattern:

- the authentication path enqueues a small durable command instead of waiting
  for the email provider;
- deterministic command identifiers prevent duplicate messages;
- tokens and raw message bodies never enter logs;
- resend and expiry journeys recover from provider delay; and
- backlog age, terminal failures, and delivery webhooks are monitored.

The exact transaction boundary between Better Auth state and the auth-email
outbox must be proven before implementation. A returned success may not imply
that a required verification message was queued unless durable state proves
it.

## Performance contract

- No Better Auth client, customer cookie, Google SDK, or portal session lookup
  reaches `shapewebs.com`.
- Portal authentication and protected routes are dynamic; public marketing
  output remains static and CDN-cacheable.
- Portal pages are Server Component-first. Forms use the smallest necessary
  client islands.
- Runtime Postgres access uses the pooled Neon endpoint; migration and restore
  access remains direct.
- A proxy may perform only an optimistic cookie-presence redirect. Secure
  authorization stays close to the data source and is memoized within a render
  pass.
- Authenticated responses are private/no-store. Only public, tenant-independent
  output is shared-cacheable.

## Required verification

Before customer launch, automated and manual evidence must cover:

- invite expiry, reuse, forwarding, email mismatch, cancellation, and
  concurrent acceptance;
- verified and unverified credential signup, duplicate signup, generic timing,
  password reset expiry/reuse, breached-password rejection, and session
  revocation;
- Google state, nonce, issuer, audience, subject, verified-email, callback, and
  provider-failure cases;
- explicit link, different-email rejection, link races, duplicate provider
  subjects, unlink-last-method denial, and provider email changes;
- session fixation, idle/absolute expiry, logout, rotation, stolen/replayed
  cookies, and all-device revocation;
- anonymous, suspended, wrong-tenant, wrong-project, IDOR, and RLS-bypass
  attempts;
- CSRF, malformed/oversized input, enumeration, credential stuffing, password
  spraying, Turnstile failure, and firewall thresholds;
- email-provider timeout, outbox-worker crash, retry, deduplication, and delayed
  delivery; and
- zero customer-auth JavaScript/cookies on the public site plus portal
  Lighthouse, browser, accessibility, k6, and ZAP gates.

## Delivery sequence

1. Accept this ADR and update the full architecture, ASVS applicability, data
   inventory, key register, communication inventory, SLOs, and runbooks.
2. Add `apps/portal` and its deterministic CI/build/security boundaries without
   deploying a production domain.
3. Migrate staff/customer membership foreign keys and introduce
   `customer_auth`, a portal runtime role, transaction-local authorization, and
   forced RLS.
4. Implement invitation-gated credential signup, verification, sign-in,
   sign-out, reset, and session management.
5. Provision a separate fixed-staging Google OAuth client and implement Google
   onboarding plus explicit linking.
6. Integrate the auth-email outbox, Turnstile, firewall/rate limits,
   observability, audit, and security notices.
7. Run the complete disposable-database, browser, abuse, recovery, performance,
   and staging provider journeys.
8. Create paid production resources and promote only through the separately
   approved launch procedure.

Repository delivery through the first half of step 4 is now implemented by
migration `0014` and the customer Better Auth/onboarding libraries. The portal
route/UI, auth-email worker, Turnstile journey, explicit linking interface,
recovery and persistent-staging application remain disabled until their own
verification gates pass.

## Consequences

Benefits:

- customers receive both requested methods without weakening the CMS;
- one customer profile can safely own multiple authentication methods;
- public performance remains independent of portal identity;
- the third application, cookie, OAuth client, secret, database role, and
  schema create enforceable blast-radius boundaries; and
- invitation gating matches the service business and avoids unassigned spam
  accounts.

Costs:

- a third deployable application and Vercel project add CI and operational
  surface;
- separate auth schemas require an early membership-model migration;
- customers may need to sign in with an original method before explicitly
  linking Google; and
- complete recovery, abuse, notification, and provider testing is required
  before portal launch.

## Rollback

Portal rollout is additive. Disable invitations and the portal deployment,
revoke its OAuth client and secrets, and remove its runtime access without
changing the public or administrative application. Do not merge customer
credentials into the administrative auth schema as a rollback shortcut.

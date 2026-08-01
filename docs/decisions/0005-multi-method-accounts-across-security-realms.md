# ADR 0005: multi-method accounts across separate security realms

- Status: superseded by ADR 0006
- Date: 26 July 2026
- Decision owners: Shapewebs
- Extends: ADR 0004

## Decision

Every Shapewebs employee and customer account may use Google, a verified
email/password credential, or both. These are authentication methods attached
to one account; they are not separate profiles.

```text
person in one security realm
└── user (stable Shapewebs identity)
    ├── account(provider = "google", provider subject)
    └── account(provider = "credential", password hash)
```

Memberships, roles, projects, content access, audit history and customer data
reference the stable user. They never reference a provider account or use an
email address as authorization evidence.

## Separate realms remain mandatory

The method model is shared, but administrative and customer identity stores
are not:

| Realm    | Application   | Identity schema | Session cookie          | Second factor |
| -------- | ------------- | --------------- | ----------------------- | ------------- |
| Employee | `apps/admin`  | `auth`          | Admin-only host cookie  | TOTP required |
| Customer | `apps/portal` | `customer_auth` | Portal-only host cookie | Optional      |

If one natural person is both an employee and a customer, the same email may
appear in both realms. The person still has two accounts, two sessions and two
authorization records. No login, cookie, provider account, matching email or
membership crosses between the realms.

## Starting and connecting methods

- An invited account may begin with Google or a verified password where that
  realm's onboarding flow supports it.
- A Google-first account adds a password through a single-use link sent to its
  verified canonical mailbox.
- A password-first account connects Google only from an authenticated security
  page after fresh password verification.
- The Google callback must return the same verified canonical email at initial
  linking time.
- An account with both methods may use either method on the normal login page.
- Password reset changes or creates only the credential method. It does not
  replace, duplicate or disconnect Google.

## No implicit merge

Matching email alone must never silently join two signed-out identities. A
person who encounters an existing account signs in with an already connected
method and then deliberately connects the other method. Different-email
linking is disabled.

Provider linking requires an authenticated session, recent reauthentication,
an action-bound server-issued authorization and the provider's OAuth state and
PKCE protections. General browser access to privileged link, set-password,
unlink and signup endpoints remains disabled.

Removing a method is deferred until Shapewebs implements recent
reauthentication, security notifications, audit evidence and a transactional
guarantee that the last usable method cannot be removed.

## Registration and access

Public self-service signup remains disabled. Customer access begins only from
an owner-created invitation bound to the intended email, organization and
projects. Employee access begins only from an owner-controlled allowlist or a
future owner-created staff invitation and an active staff membership.

Authentication never grants application authorization by itself. Every
protected request re-reads the relevant session, active membership, tenant,
role and resource relationship from server-owned state.

## Employee-specific assurance

Google and email/password are alternative first factors for an employee, but
neither is sufficient for CMS access. Every employee session must complete the
existing local TOTP gate after either first factor. Sensitive operations still
require a fresh TOTP step-up. Password reset revokes existing sessions and
does not disable TOTP.

Employee password onboarding and recovery must use a verified mailbox,
single-use short-lived tokens, durable idempotent email delivery, generic
responses, database and edge throttling, compromised-password checks and safe
audit events. Support staff may not assign a password or bypass TOTP.

## Customer-specific assurance

Customer password and Google methods attach only to `customer_auth.user`.
Invitation activation, project assignment and credential verification are
transactional. Customer password reset revokes sessions. Customer MFA is
optional for the initial read-focused portal and may later use passkeys or
TOTP without changing the stable user model.

## Performance contract

- The public application contains no authentication runtime, cookies or
  provider SDK.
- Admin and portal pages are Server Component-first.
- Authentication forms use normal browser POST navigation; Turnstile is the
  only required client island for the portal forms that use it.
- Method discovery is one bounded database query per security-page render.
- Session and authorization work is memoized within a render pass and all
  authenticated responses are private and non-cacheable.

## Required verification

Before either realm is launched with both methods, evidence must cover:

- Google-first, password-first and dual-method login into the same user;
- duplicate-email and different-email non-merging;
- direct privileged-link endpoint denial and expired link authorization;
- reset expiry/replay, password compromise, session revocation and generic
  unknown-account responses;
- copied customer cookies against admin and copied admin cookies against the
  portal;
- mandatory employee TOTP after both Google and password first factors;
- suspended, expired, wrong-role, wrong-tenant and IDOR denial; and
- email worker retry, idempotency, crash recovery and permanent-failure
  classification.

## Consequences

People have one understandable profile in each area and can keep a fallback
login method without duplicated permissions or history. The cost is explicit
linking, verified recovery delivery and two deliberately independent identity
realms. This cost is accepted because it preserves customer/admin isolation
and makes account ownership auditable.

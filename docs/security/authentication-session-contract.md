# Authentication and session security contract

## Scope and ownership

This contract covers the unified Shapewebs account application at
`admin.shapewebs.com`. The public application has no login path. Customers and
employees share one canonical Better Auth identity and cookie, while membership,
workspace authorization, strong-auth assurance, repository credentials, and forced RLS
remain separate security boundaries under ADR 0006. The Shapewebs owner owns
this contract and must review it before every authentication-provider, Better
Auth, passkey, session-policy, or role change.

The contract documents the current implementation. A control listed under
launch gates is not treated as implemented in the exact-ID ASVS evidence
register.

## Supported authentication pathway

Every invited customer or authorized employee has one stable Shapewebs user and
may attach any supported combination of these sign-in methods:

1. Google OIDC. Better Auth completes the authorization-code flow on the
   server. Shapewebs verifies the Google ID Token against the fixed Google
   issuer and JWKS endpoint, permits `RS256` only, and requires the configured
   audience, valid lifetime, stable subject and verified canonical email.
2. Verified email/password. Activation and recovery use one-hour single-use
   links delivered to the allowlisted canonical mailbox. Passwords contain
   15–128 characters, are stored with Better Auth's memory-hard password hash,
   are checked through HIBP's k-anonymity service when created or reset, and
   never produce an automatic session.
3. Passkey. Better Auth performs the WebAuthn ceremony against the exact
   configured origin and relying-party hostname. Shapewebs requires resident
   credentials and authenticator user verification for registration and
   authentication. Five-minute challenges are signed in an HttpOnly cookie,
   persisted as one-time verification records, and consumed on success.

An employee email must be in the exact owner/editor allowlist; a customer must
hold a valid invitation or active membership. A Google-first user may add a
password through verified mailbox recovery. A password-first user may connect
Google only after authenticated reauthentication, and the provider callback
must match the canonical verified email. A passkey may be enrolled only from an
active, authorized account session. Employee method enrollment and removal
require fresh local strong-auth assurance from the preceding five minutes. The
initial passkey is therefore bootstrapped after TOTP; a freshly
passkey-authenticated session can manage methods without entering a second
TOTP. Once connected, every method enters the same user, memberships,
assurance factors, and audit history.

Email matching never silently merges signed-out identities. Implicit and
different-email linking, open signup, browser-accessible set-password,
privileged unlink, magic link, SMS, phone, email OTP, SAML, a second
identity provider, trusted-device bypass and public recovery-code endpoints
remain disabled. All unused Better Auth factor-management endpoints are
disabled. Enrollment generates no recovery codes because an identity-proofed
TOTP recovery procedure has not yet been implemented.

Google or password authentication establishes the primary session but does not
establish employee-workspace assurance. Shapewebs does not depend on Google
`acr`, `amr` or `auth_time` claims; a local TOTP is required after either
method. A signed passkey assertion with positive authenticator user
verification is the complete phishing-resistant strong sign-in. The exact new
session created by that verification is marked freshly assured and enters the
employee workspace without an additional TOTP prompt.

## Authentication attack resistance

- Better Auth stores its rate-limit state in Postgres. Email sign-in is limited
  to 5 requests per 60 seconds, social sign-in to 10, password activation and
  recovery to 3, and the general authentication API to 60.
- Passkey authentication options are limited to 10 requests per minute;
  authentication verification and registration verification to 5; and
  registration options to 5. Credential identifiers are unique in Postgres so
  concurrent duplicate enrollment fails closed.
- WebAuthn verification requires exact origin and relying-party ID, a one-time
  unexpired challenge, a valid signature and counter, and positive authenticator
  user verification. The application never accepts a browser assertion that
  reports `userVerified=false`.
- Passkey listing and mutation require the live canonical session and current
  membership. Employee mutation additionally requires fresh local strong-auth
  assurance. The server, not only the interface, rejects deletion of the final
  usable method.
- Only a `POST` that completes the exact passkey authentication-verification
  route may write passkey assurance to the newly created session. Registration,
  option generation, browser parameters and unrelated session creation cannot
  set it. This happens only after Better Auth has consumed the challenge and
  verified the origin, RP ID, signature and counter, and after Shapewebs has
  required positive authenticator user verification.
- The TOTP route requires either an authorized primary session or Better
  Auth's short-lived password second-factor challenge. An anonymous actor
  cannot lock an owner out by guessing codes.
- Activation and recovery wrappers return the same accepted response for
  unknown, existing, unauthorized and provider-failure cases. Bodies and
  origins are bounded before any account lookup.
- Google linking is explicitly initiated while signed in. A 60-second
  server-signed grant is bound to the live user, live session and link action;
  OAuth state/PKCE and exact-origin checks remain mandatory.
- Ten consecutive failed local TOTP checks produce a 15-minute account-level
  lock. An expired lock resets safely on the next attempt.
- A TOTP is valid only in its exact 30-second time step. No adjacent clock-skew
  window is accepted.
- Each accepted TOTP counter is recorded once per user in Neon. The atomic
  counter update rejects reuse, older codes, concurrent replay and replay from
  another active session.
- TOTP comparison is constant-time, input is restricted to exactly six ASCII
  digits, request bodies are capped at 1 KiB, and the route requires JSON from
  the exact configured admin origin.
- Factor enrollment cannot replace an already verified factor. The factor
  disable, regeneration, backup-code, OTP and direct TOTP endpoints are not
  publicly reachable.

The lockout deliberately requires a valid primary session and expires
automatically. This prevents the lock itself becoming an anonymous
denial-of-service primitive.

## Session policy

Better Auth issues opaque reference sessions that are verified by the trusted
admin backend and backed by Postgres. Browser code cannot construct an
authorization context. Every protected page, Route Handler and Server Action
must independently resolve the primary session and the Neon membership and
session-security records.

The current policy is:

- absolute session lifetime: eight hours;
- inactivity timeout: 30 minutes, enforced by an atomic backend update;
- session refresh: disabled, so the absolute lifetime does not slide;
- session tokens: 256 random bits encoded as 43 base64url characters, generated
  by Shapewebs with Node.js `randomBytes`;
- step-up freshness for publishing: 10 minutes;
- production cookie: `__Host-shapewebs.*`, Secure, HttpOnly, SameSite=Lax,
  path `/`, with no `Domain` attribute;
- trusted origins: exact origins only, with HTTPS required outside local
  development;
- concurrent sessions: currently unlimited, because the release is restricted
  to one allowlisted owner;
- logout: visible in every dashboard layout, invalidates the backend session
  and sends `Clear-Site-Data` for the admin origin after successful sign-out.

Better Auth's token-returning session-list and token-based revocation endpoints
are disabled. The owner settings view instead receives a minimal,
organization-scoped session DTO containing a non-credential session ID, user
identity, sanitized user-agent summary and timestamps. It never receives the
session token or IP address. The owner may revoke another administrator's
session only after fresh local strong-auth assurance completed within the
preceding five minutes.
The current session is terminated through the always-visible logout control.
Both paths invalidate the server-side reference session.

Role or membership removal fails closed on the next request even if the Better
Auth session has not expired. Expired, inactive, revoked, anonymous and
customer-role sessions are rejected by the database-backed authorization
layer.

The Shapewebs session is independent of the selected first factor. Google
logout does not silently create or terminate a Shapewebs session, and changing
a password revokes existing Shapewebs sessions. The eight-hour absolute
lifetime and local revocation are the bounding controls.

## Administrative step-up

Google and password authentication require local TOTP before employee-workspace
access. A user-verified passkey assertion writes the equivalent fresh assurance
to that exact newly created session, so it must not be followed by TOTP.
Sensitive operations still fail closed when the stored assurance is older than
their policy; publishing currently requires assurance from the preceding 10
minutes. The current stale-assurance reauthentication surface remains TOTP.

The first successful enrollment rotates the Better Auth session as part of
factor activation. Every later successful TOTP step-up atomically replaces the
current session token with a new 256-bit value and writes an append-only audit
event. Rotation preserves the original session creation time and absolute
expiry, so reauthentication never extends the eight-hour maximum lifetime. The
replacement cookie is signed with the Better Auth secret and preserves the
configured host-only, Secure, HttpOnly, SameSite=Lax policy.

## Recovery and factor lifecycle

Shapewebs has password recovery through the verified account mailbox. A user
can add multiple passkeys and remove them from account security; raw credential
IDs and public keys are never returned by the page repository. Removing a
passkey requires another usable Google, password, or passkey method to remain.

Shapewebs has no
self-service TOTP reset, TOTP replacement, recovery-code verification or
administrative identity recovery. This is fail-closed: resetting a password or
recovering Google access never bypasses the local TOTP factor, and passkey
recovery never creates or replaces a credential without an already authorized,
freshly assured session.

Before commercial production, Shapewebs must define and test an
identity-proofed owner recovery procedure, factor replacement with fresh
reauthentication, revocation of other active sessions, emergency credential
storage, and an auditable recovery drill. Google account recovery is separate
and must not by itself bypass the local factor.

## Verification evidence

Automated evidence includes:

- `tests/unit/auth-config.test.ts` and
  `tests/unit/admin-auth-primitives.test.ts` for exact origins, allowlisted
  password activation/recovery, disabled privileged endpoints, session-bound
  linking grants, password verification, Google claim mapping, signature,
  issuer, audience, lifetime and algorithm rejection;
- `tests/unit/admin-totp.test.ts` for the RFC 6238 calculation, exact time-step
  lifetime and malformed input;
- `tests/unit/admin-session-cookie.test.ts` for 256-bit token generation,
  rotation-cookie signing, remaining absolute lifetime and secure host-only
  attributes;
- `tests/unit/passkey-policy.test.ts` and
  `tests/unit/auth-surface-contract.test.ts` for exact origin/RP binding,
  mandatory user verification, protected enrollment/removal, final-method
  denial, the live client ceremony, and least-privilege migration grants;
- `packages/database/scripts/verify-security.mjs` for session
  expiry/revocation/inactivity/role checks, globally one-time counters,
  lockout, recovery after expiry, exact-event token rotation,
  organization-scoped token-free session listing, owner revocation and
  privilege denial;
- the disposable Neon lifecycle for fresh migrations, forced RLS, rollback,
  export, logical restore and durable admin-auth email delivery;
- `apps/admin/src/lib/auth.ts` and the protected handlers/actions for
  server-owned authorization and fresh step-up enforcement.

The complete fixed-staging Google-to-TOTP journey passed on 25 July 2026.
Google returned to the protected admin application, an unenrolled owner
completed local TOTP enrollment, a current code produced an audited successful
step-up, and the dashboard plus protected CMS routes returned `200`. The
counter-persistence defect discovered by the live test was repaired and
reverified through the disposable Neon lifecycle before the successful
attempt.

The email/password, passkey, and mixed-method paths are implemented on the current branch
but are not yet counted as fixed-staging evidence. Their launch gate requires a
green disposable migration lifecycle followed by password-first,
Google-first, linking, reset, passkey enrollment/sign-in/removal, revocation,
Google/password-to-TOTP, and passkey-to-direct-workspace browser journeys on the
exact staging origin.

## Launch gates

- Reinspect the deployed cookie after the `__Host-` hardening release; the
  current browser journey already proves Google-to-TOTP authorization.
- Define and rehearse identity-proofed TOTP recovery and replacement.
- Decide and enforce a concurrent-session maximum before a second maintainer or
  customer portal is introduced.
- Enable and verify MFA and recovery settings for the underlying Google
  Workspace owner account.
- Prove employee activation, generic recovery, durable email delivery,
  Google/password/passkey linking, mandatory TOTP after Google or password, and
  direct employee-workspace entry after a user-verified passkey on fixed
  staging.

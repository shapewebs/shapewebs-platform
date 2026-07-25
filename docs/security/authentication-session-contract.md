# Authentication and session security contract

## Scope and ownership

This contract covers the Shapewebs administrative application. The public
application has no login path. The Shapewebs owner owns this contract and must
review it before every authentication-provider, Better Auth, session-policy or
administrative-role change.

The contract documents the current implementation. A control listed under
launch gates is not treated as implemented in the exact-ID ASVS evidence
register.

## Supported authentication pathway

Shapewebs has one administrative authentication pathway:

1. The operator explicitly starts Google OIDC authentication in the admin
   browser session.
2. Better Auth completes the authorization-code flow on the server.
3. Shapewebs cryptographically verifies the Google ID Token and accepts only a
   fixed Google issuer, the fixed Google JWKS endpoint, `RS256`, the configured
   client audience, valid issuance and expiry times, a stable subject, and a
   verified email address.
4. The verified email must be in the exact owner allowlist before a user or
   session can be created.
5. A locally enrolled six-digit TOTP is required before the administrative
   dashboard is authorized.

There is no email/password login, public registration, password reset, magic
link, SMS, phone, email OTP, passkey, SAML, second identity provider, trusted
device bypass or public recovery-code endpoint. All unused Better Auth
factor-management and verification endpoints are disabled. Enrollment
generates no recovery codes, because an identity-proofed recovery procedure has
not yet been implemented.

Google authentication is treated as the first factor even when Google reports
stronger authentication. Shapewebs does not depend on Google `acr`, `amr` or
`auth_time` claims for administrative assurance; the local TOTP is always
required.

## Authentication attack resistance

- Better Auth stores its rate-limit state in Postgres. Social sign-in is
  limited to 10 requests per 60 seconds and the general authentication API to
  60 requests per 60 seconds.
- The TOTP route is reachable only with an authorized primary session, so an
  anonymous actor cannot lock an owner out by guessing codes.
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
- step-up freshness for publishing: 10 minutes;
- production cookie: host-only, Secure, HttpOnly, SameSite=Lax, path `/`;
- trusted origins: exact origins only, with HTTPS required outside local
  development;
- concurrent sessions: currently unlimited, because the release is restricted
  to one allowlisted owner;
- logout: visible in every dashboard layout and invalidates the backend
  session.

Role or membership removal fails closed on the next request even if the Better
Auth session has not expired. Expired, inactive, revoked, anonymous and
customer-role sessions are rejected by the database-backed authorization
layer.

The Shapewebs session is intentionally independent after Google authentication.
A Google logout does not silently create or terminate a Shapewebs session.
Until coordinated provider termination is implemented, the eight-hour absolute
lifetime and local revocation are the bounding controls.

## Administrative step-up

The local TOTP is required after Google authentication and again when the most
recent step-up is older than the sensitive operation's policy. Publishing
currently requires a code verified within the preceding 10 minutes.

The first successful enrollment rotates the Better Auth session as part of
factor activation. A later TOTP step-up currently strengthens the
database-backed authorization context without rotating the Better Auth session
token. ASVS session-token rotation after every reauthentication therefore
remains an explicit launch gate.

## Recovery and factor lifecycle

Shapewebs currently has no self-service factor reset, factor replacement,
recovery-code verification or account recovery. This is fail-closed: losing the
authenticator does not create a weaker bypass.

Before commercial production, Shapewebs must define and test an
identity-proofed owner recovery procedure, factor replacement with fresh
reauthentication, revocation of other active sessions, emergency credential
storage, and an auditable recovery drill. Google account recovery is separate
and must not by itself bypass the local factor.

## Verification evidence

Automated evidence includes:

- `tests/unit/auth-config.test.ts` for exact origins, password-path
  unavailability, disabled factor endpoints, Google claim mapping, signature,
  issuer, audience, lifetime and algorithm rejection;
- `tests/unit/admin-totp.test.ts` for the RFC 6238 calculation, exact time-step
  lifetime and malformed input;
- `packages/database/scripts/verify-security.mjs` for session
  expiry/revocation/inactivity/role checks, globally one-time counters,
  lockout, recovery after expiry and privilege denial;
- the disposable Neon lifecycle for fresh migrations, forced RLS, rollback,
  export and logical restore;
- `apps/admin/src/lib/auth.ts` and the protected handlers/actions for
  server-owned authorization and fresh step-up enforcement.

Provider-side Google OIDC behavior, deployed cookie attributes and the complete
Google-to-TOTP journey still require dated fixed-staging evidence.

## Launch gates

- Configure the fixed staging Google OAuth client and exact callback origins.
- Complete a dated Google-to-TOTP staging journey and inspect the deployed
  session cookie.
- Rotate the session token after every successful reauthentication.
- Add owner-visible and administrator-controlled active-session termination.
- Define and rehearse identity-proofed TOTP recovery and replacement.
- Decide and enforce a concurrent-session maximum before a second maintainer or
  customer portal is introduced.
- Enable and verify MFA and recovery settings for the underlying Google
  Workspace owner account.

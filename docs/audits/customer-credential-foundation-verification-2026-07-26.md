# Customer credential foundation verification — 26 July 2026

## Scope

This evidence covers the repository and disposable-database foundation for
invitation-only customer Google and email/password authentication. It does not
enable a portal route, deploy a portal Vercel project, configure a customer
Google OAuth client, apply migration `0014` to persistent staging, or change
production.

## Implemented controls

- Migration `0014_customer-credential-onboarding` adds owner-created customer
  invitations, exact project assignments, customer session-inactivity state,
  and a durable authentication-email outbox.
- Invitation, registration-grant, verification, and reset tokens are
  cryptographically random. Only SHA-256 hashes are used for lookup; the copy
  required by the email worker is stored in an authenticated encrypted
  envelope under a separate environment secret.
- Invitation URLs are exchanged once for a 30-minute, host-only, HttpOnly,
  SameSite=Lax registration cookie. Production uses a Secure `__Host-` name.
- Credential onboarding creates no session and no active membership before
  mailbox proof. The email link requires the mailbox owner to choose the final
  password, which atomically replaces the provisional password selected from
  the invitation page. A forwarded or intercepted invitation therefore cannot
  preselect the lasting credential.
- Passwords accept paste, spaces, Unicode, and password managers; require
  15–128 characters; reject control characters; and use Better Auth's scrypt
  storage. HIBP checking sends only the protocol's five-character SHA-1 prefix,
  uses response and timeout bounds, and fails closed.
- Google onboarding requires an unexpired registration grant, a
  cryptographically verified Google identity, and an exact verified-email
  match before membership activation.
- Better Auth uses a distinct customer secret, exact origins, schema, cookie
  prefix, OAuth client, database-backed route throttles, seven-day absolute
  sessions, and a separately enforced 24-hour inactivity limit. Core open
  signup and verification endpoints remain disabled.
- Implicit provider linking, different-email linking, and unlinking the final
  authentication method are disabled. The explicit linking interface and its
  recent-reauthentication journey remain a launch gate.
- Generic provider-token, account-info, linking, unlinking, profile-update and
  password-change endpoints are disabled. Sensitive account changes must use
  future Shapewebs-owned, recently reauthenticated interfaces rather than
  exposing Better Auth's general endpoints directly.
- Every invitation requires at least one explicit project assignment. Owner,
  portal, web, tenant, and RLS boundaries are independently enforced in SQL.

## Disposable lifecycle evidence

The final local lifecycle created fresh source and restore branches, then:

1. applied migrations `0000` through `0014`;
2. verified deterministic fixture SHA-256
   `b091129fc9c4110bda29e8b7d2bebeaf2e90bb0f4d5d502ebcdac41c16c0abb4`;
3. passed 18 repository and real-runtime integration scenarios on both the
   source and restored databases;
4. proved a wrong password creates no session;
5. proved a valid active customer receives only the distinct customer cookie,
   a 256-bit session token, and a session-security record;
6. proved the 24-hour inactivity boundary fails closed;
7. proved one-time invitation exchange, wrong-email denial, inactive
   provisional accounts, mailbox-owned final-password replacement, exact
   project assignment, Google activation, replay denial, and encrypted outbox
   storage;
8. verified a deliberately failed migration leaves no schema or journal
   residue; and
9. produced a byte-identical logical export and restore.

Both disposable branches were deleted automatically. An earlier disposable
run safely exposed an incomplete Better Auth adapter model map before any
persistent change; the schema map was corrected, the branch was deleted, and
the complete lifecycle then passed.

## Repository evidence

- zero-warning ESLint and strict TypeScript passed;
- deterministic Better Auth schema and Drizzle migration checks passed;
- 153 unit/coverage tests passed with 96% or higher statement, branch, function,
  and line coverage in the coverage-gated modules;
- application-boundary and ASVS structural gates passed; and
- unused dependency/export and production cycle checks passed after removing
  one unused helper export.

The protected pull-request and clean-runner evidence will be recorded after
the branch is pushed. Persistent staging migration and provider/browser flows
remain separate, rollback-protected follow-up work.

## Remaining gates

- Mount only fail-closed portal routes and implement bounded invitation,
  verification, reset, sign-in, sign-out, explicit-link, and session-management
  interfaces.
- Provision a separate portal Vercel project, fixed staging origin, customer
  Google OAuth client, Turnstile widget, auth-email worker credential, and
  monitoring without reusing administrative secrets.
- Add abandoned provisional-account cleanup and safe resend/recovery behavior.
- Complete enumeration/timing, CSRF, Turnstile, linking, session revocation,
  email-provider failure, browser, ZAP, k6, accessibility, and Lighthouse
  evidence before enabling customer access.
- Apply `0014` to persistent synthetic staging only after the protected pull
  request passes and an expiring pre-migration rollback branch exists.
- Production remains untouched and requires a separate explicit launch
  decision.

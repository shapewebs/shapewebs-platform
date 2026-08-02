# Authentication surfaces

## Purpose

Shapewebs has one account model and one authenticated application at
`admin.shapewebs.com`. Every account may use Google, password, passkeys, or a
combination of those methods on the same identity. Customer registration is
invitation-only; employee access is membership-controlled and requires either
Google/password plus TOTP or a user-verified passkey before entering the studio.

The public application remains a separate unauthenticated boundary. Inside the
account application, cookies, endpoints, sessions and account records are
canonical, while customer and employee authorization contexts and database
roles remain separate.

## Route and state inventory

| Audience | Route                   | Purpose                                        | Required states                                                       |
| -------- | ----------------------- | ---------------------------------------------- | --------------------------------------------------------------------- |
| Account  | `/login`                | Google, password, or passkey sign-in           | Ready, pending, verified, password updated, unauthorized, unavailable |
| Employee | `/login/mfa`            | TOTP enrollment and step-up                    | Enrollment, QR setup, code entry, pending, invalid code, unavailable  |
| Employee | `/activate`             | Allowlisted employee password activation       | Ready, pending, generic submitted, validation error, unavailable      |
| Account  | `/forgot-password`      | Add or recover a password                      | Ready, pending, generic submitted, unavailable                        |
| Account  | `/reset-password`       | Consume a single-use password token            | Ready, pending, success, invalid or expired, validation error         |
| Customer | `/invite/[token]`       | Accept a private invitation                    | Ready, security check, invalid or expired, submitted failure          |
| Customer | `/register`             | Choose the first method for an invited account | Password, Google, security check, validation error                    |
| Customer | `/register/check-email` | Explain provisional-account verification       | Waiting for email                                                     |
| Customer | `/verify/[token]`       | Verify the mailbox and set a password          | Ready, security check, invalid or expired, validation error           |
| Account  | `/account/security`     | Connect methods and review account assurance   | Customer, employee, dual-member, fresh-step-up, pending, failure      |

There is no separate temporary-email-code route in the current contracts.
Employee TOTP is the only code-entry state. Customer verification uses bounded,
single-use bearer links. A future email-code flow requires a separately reviewed
server contract before a corresponding screen is added.

## Shared presentation contract

All signed-out pages use:

- one centered, responsive authentication shell with a Shapewebs identity,
  unique page heading, optional explanatory copy, and audience footnote; its
  compact form column is `320px`, while exceptional MFA setup can request the
  explicitly expanded shell;
- the shared button, link, spinner, form-control, label, description, and error
  primitives from `packages/ui`;
- stable control dimensions, visible keyboard focus, semantic labels, browser
  autocomplete tokens, and live status or error announcements;
- server-rendered page structure with client components limited to interactive
  form state, password reveal, Better Auth calls, and Turnstile;
- no motion that translates or scales controls, and reduced-motion handling for
  the generic spinner.

Application pages may compose these primitives but must not reimplement input,
button, alert, divider, or loading styles.

Login begins with three explicit methods: Google as the brand action, email as
a secondary action, and passkey as a secondary action. The Shapewebs mark stays
fixed while the remaining panel crossfades. Email reveals the email and password
fields, a secondary login action, password recovery, and a link back to the
method picker. Passkey starts the native WebAuthn chooser immediately and the
button changes to the shared spinner with `Waiting for passkey...`. Cancellation,
unsupported-device, and generic failure copy appears inline without revealing
credential details. The page transition preserves fallback URLs and is removed
when reduced motion is requested.

## Passkey boundary

Passkeys are an active strong sign-in method on the canonical account. Better Auth
and the WebAuthn platform API own registration and authentication ceremonies.
Shapewebs binds every ceremony to the exact configured origin and hostname,
requires a discoverable credential and authenticator user verification, and
uses one-time five-minute challenges. Raw public keys and credential identifiers
never enter page DTOs or application logs.

Enrollment, listing, naming, and removal require an active session and an active
Shapewebs membership. Employee mutation additionally requires fresh local
strong-auth assurance from the preceding five minutes. Initial enrollment is
bootstrapped through TOTP; a freshly passkey-authenticated session already has
that assurance. A passkey can be removed only when another Google, password, or
passkey method remains. Passkey authentication creates the same Shapewebs
session as the other methods and, after verified authenticator user verification,
enters the employee studio without a second TOTP prompt.

## Security invariants

- Employee activation remains allowlist-only; there is no public signup.
- Customer registration remains bound to a valid invitation context.
- Google and password remain methods on one account rather than separate account
  types.
- Passkeys attach only to the currently authenticated canonical account and
  cannot be registered through a signed-out identity lookup.
- Every request keeps its existing CSRF, Turnstile, token-format, redirect,
  rate-limit, session, and authorization checks.
- Recovery and activation responses remain generic so account existence is not
  disclosed.
- Tokens stay in hidden fields or bounded URLs only where the existing server
  contract requires them; they are never logged or copied into client telemetry.
- The unified shell does not weaken customer, employee, organization, project,
  TOTP, or database-role authorization.

## Required completion evidence

Before release, the unified surface must pass the canonical repository and
release gates, both Next.js build engines, route-level accessibility/security
checks, the disposable Neon migration lifecycle, identity-migration conflict
fixtures, customer/staff/dual-member journeys, and browser verification at the
compact and desktop breakpoints. Passkey release additionally requires real
enrollment, sign-in, cancellation, removal, final-method denial, and employee
Google/password-to-TOTP and passkey-to-direct-workspace evidence on the exact
target origin.

# Cryptographic inventory and key-management policy

- Owner: Shapewebs owner
- Applies to: public site, admin CMS, workers, CI/CD and provider integrations
- Review cadence: quarterly, after every cryptographic-library upgrade and
  after every suspected credential exposure
- Standard basis: OWASP ASVS 5.0 chapter 11 and NIST SP 800-57 lifecycle
  principles

## Policy

Shapewebs uses platform or pinned, industry-reviewed implementations for
cryptographic operations. Application code must not implement a cipher,
signature scheme, password hash, key derivation function or random-number
generator. Protocol-defined constructions, such as RFC 6238 TOTP verification,
may compose the runtime's approved primitives only when covered by dedicated
tests.

Cryptographic material must:

1. be generated with a cryptographically secure random-number generator;
2. provide at least 128 bits of effective security;
3. have one documented purpose and the narrowest practical environment scope;
4. be stored only in the owning provider's encrypted secret store or an
   approved local operating-system keychain;
5. never enter source control, build artifacts, browser-readable variables,
   URLs, logs, screenshots or test reports;
6. be independently replaceable without changing unrelated credentials;
7. be revoked immediately when exposure is suspected; and
8. be removed after the replacement has been verified and the applicable
   overlap window has ended.

Shared secrets are limited to the service pair that needs them. Production and
non-production values must differ. Production values may not be exposed to
Preview deployments, pull requests or developer shells.

## Approved primitives

| Purpose                                                      | Primitive and minimum                                                 | Current implementation                                                                                              |
| ------------------------------------------------------------ | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Unpredictable tokens                                         | CSPRNG, at least 128 bits                                             | Node.js `randomBytes`; Web Crypto `crypto.randomUUID()` only for identifiers that are not authentication secrets    |
| General digest and token hashing                             | SHA-256 or stronger                                                   | Node.js `createHash("sha256")`                                                                                      |
| Customer password storage                                    | Memory-hard password KDF                                              | Pinned Better Auth scrypt implementation                                                                            |
| Compromised-password query                                   | HIBP k-anonymity range protocol                                       | SHA-1 is used only to disclose the five-character range prefix; the password and full digest never leave the server |
| Message authentication and pseudonymous actor/IP identifiers | HMAC-SHA-256 or stronger                                              | Node.js `createHmac("sha256", key)`                                                                                 |
| Constant-time secret comparison                              | Equal-length digest plus constant-time comparison                     | Node.js `timingSafeEqual`                                                                                           |
| OAuth/OIDC ID Token verification                             | Provider-approved asymmetric signature, exact issuer and audience     | `jose` with Google's JWKS and `RS256` only                                                                          |
| Stored OAuth tokens and TOTP seeds                           | Authenticated encryption with a 256-bit derived key                   | Pinned Better Auth uses XChaCha20-Poly1305 and SHA-256 key derivation from `BETTER_AUTH_SECRET`                     |
| TOTP                                                         | RFC 6238-compatible six-digit code, 30-second period                  | HMAC-SHA-1 is used only as the protocol-defined TOTP PRF; the seed is CSPRNG-generated and encrypted at rest        |
| TLS                                                          | TLS 1.2 or 1.3 with publicly trusted certificates for public services | Vercel, Neon, Google, Resend, Cloudflare, GitHub and Checkly managed TLS                                            |

MD5, SHA-1 signatures, ECB mode, unauthenticated encryption, PKCS#1 v1.5
encryption, predictable PRNGs and UUIDs used as authentication secrets are
prohibited. The TOTP use of HMAC-SHA-1 and the HIBP range protocol's SHA-1
prefix are not signature or collision-resistance uses and are permitted only
for protocol interoperability.

## Key and credential inventory

No secret value belongs in this document. The inventory records its purpose,
owner, storage boundary and rotation trigger.

| Material                                      | Purpose and permitted consumer                                         | Authoritative storage                                                                              | Rotation or revocation trigger                                                                     |
| --------------------------------------------- | ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `BETTER_AUTH_SECRET`                          | Better Auth cookies, encrypted OAuth tokens and TOTP seeds; admin only | Vercel encrypted environment, exact environment/project scope                                      | suspected exposure, administrator compromise, cryptographic migration or scheduled annual exercise |
| `PORTAL_BETTER_AUTH_SECRET`                   | Customer-only Better Auth cookies and encrypted OAuth tokens           | Portal-only Vercel encrypted environment, exact environment/project scope                          | suspected exposure, customer identity compromise, cryptographic migration or annual exercise       |
| `PORTAL_AUTH_EMAIL_ENCRYPTION_SECRET`         | Encrypt invitation, verification and reset tokens awaiting delivery    | Portal/auth-email-worker encrypted environment only                                                | suspected exposure, outbox redesign, environment retirement or annual exercise                     |
| Google OAuth client secret                    | Admin Google OAuth token exchange                                      | Google Cloud and admin-only Vercel environment                                                     | suspected exposure, OAuth-client ownership change or annual exercise                               |
| Customer Google OAuth client secret           | Portal-only Google OAuth token exchange                                | Google Cloud and portal-only Vercel environment                                                    | suspected exposure, OAuth-client ownership change or annual exercise                               |
| Google OAuth client ID                        | Public OAuth identifier; admin client only                             | Google Cloud and admin Vercel environment                                                          | OAuth-client replacement                                                                           |
| Neon role passwords                           | Separate owner, migrator, admin, web and public database identities    | Neon and environment-specific Vercel/GitHub stores                                                 | role exposure, staff/access change, restore exercise or environment rebuild                        |
| `LEAD_IP_HASH_SECRET`                         | Pseudonymous abuse-control IP HMAC; public server only                 | Vercel encrypted web environment                                                                   | exposure or privacy-policy rotation; historical hashes need not be recoverable                     |
| `PREVIEW_TOKEN_SECRET`                        | Legacy preview-token signing during transition                         | Exact server environment only                                                                      | removal with the legacy package or any exposure                                                    |
| Preview activation/session tokens             | One-time, tenant-bound preview access                                  | CSPRNG-generated; only SHA-256 hashes persist in Neon                                              | automatic expiry, activation consumption or explicit exit                                          |
| Customer invitation/registration/email tokens | One-time customer onboarding and recovery                              | CSPRNG-generated; SHA-256 lookup hashes in Neon; email copy in an authenticated encrypted envelope | automatic expiry/consumption, invitation revocation, recovery completion or exposure               |
| `REVALIDATION_WEBHOOK_SECRET`                 | Second-factor authentication for admin-to-public revalidation POST     | Exact admin and web encrypted branch environments only                                             | exposure, sender/receiver rebuild or annual exercise                                               |
| Vercel workload OIDC token                    | Authorize one protected project-to-project request                     | Short-lived Vercel-issued request header; never persisted                                          | automatic expiry; revoke the trusted-source rule on project or trust-boundary change               |
| Turnstile secret                              | Server-side Cloudflare challenge validation                            | Cloudflare and exact web environment                                                               | widget replacement or exposure                                                                     |
| Resend API key                                | Restricted transactional sending; admin worker only                    | Resend and exact admin environment                                                                 | exposure, environment retirement or annual exercise                                                |
| Resend webhook signing secret                 | Verify raw webhook bodies                                              | Resend and exact admin environment                                                                 | webhook replacement or exposure                                                                    |
| Outbox and retention bearer secrets           | Authenticate scheduler-to-admin job POSTs                              | Cloudflare encrypted Worker secrets and exact admin environment                                    | exposure, scheduler replacement or annual exercise                                                 |
| Vercel automation bypass secrets              | Permit named monitoring/provider traffic through protected staging     | Vercel and the one approved external consumer                                                      | consumer replacement, artifact exposure or quarterly exercise                                      |
| Checkly credentials and heartbeat tokens      | Monitoring deployment and heartbeat receipt                            | Checkly encrypted/local credential store and Cloudflare encrypted Worker secret                    | exposure, account-role change or monitor recreation                                                |
| Cloudflare OAuth credential                   | Wrangler management access                                             | macOS Keychain                                                                                     | workstation loss, scope change, account-role change or suspected exposure                          |
| GitHub authentication and environment secrets | Repository automation and protected non-production verification        | GitHub credential store/environment secrets                                                        | contributor removal, exposure or annual exercise                                                   |
| Workspace DKIM private key                    | Domain email signing                                                   | Google Workspace                                                                                   | Google-managed lifecycle, domain migration or compromise                                           |

`noreply@shapewebs.com` is an email identity, not a credential. Public values
such as a Turnstile site key or OAuth client ID remain environment-scoped even
though they are not secrets.

## Lifecycle procedure

### Create

- Generate secrets in the provider or with a CSPRNG.
- Give each environment and integration a distinct value.
- Grant only the service identity and project that consume the value.
- Record the owner, purpose, creation date and next review in the provider or
  confidential operations register.

### Distribute

- Use provider-to-provider secret stores or an approved local keychain.
- Never copy a secret into an issue, pull request, chat, email, shell history,
  screenshot, CI output or repository file.
- When a CLI may print credentials, capture output as opaque data and ensure
  failures cannot echo the input.

### Rotate

1. Create a replacement with the same or narrower privileges.
2. Install it only in the intended non-production or production scope.
3. redeploy or restart the consumers;
4. exercise the authenticated path and inspect redacted logs;
5. revoke the old credential; and
6. verify the old credential fails.

Where a provider supports versioned encryption keys, decrypt with the previous
version only during a bounded migration and encrypt all new data with the
current version. `BETTER_AUTH_SECRET` rotation additionally requires a tested
plan for existing encrypted OAuth tokens and TOTP seeds; it must not be changed
blindly.

### Compromise

Follow `docs/runbooks/security-incident.md`. Revoke first, preserve
non-secret evidence, determine affected environments and data, replace the
credential, verify old-value failure, and document the incident and follow-up
controls.

### Retire

Remove the consumer configuration, revoke the provider-side credential, delete
obsolete encrypted material according to the retention register and prove that
the application no longer references the retired name.

## Crypto-agility and verification

- Cryptographic calls live behind Better Auth, `jose`, the Node.js/Web Crypto
  runtime, or small Shapewebs helpers so algorithms and keys can be replaced
  centrally.
- Dependency updates must review changes to cryptographic algorithms,
  serialization and key derivation.
- The auth, session, preview, webhook, logging and database-security suites
  verify token entropy, exact algorithms where Shapewebs selects them,
  constant-time comparisons, replay resistance, encrypted stored factors and
  fail-closed behavior.
- A quarterly review compares this inventory with code, provider dashboards
  and environment-variable names. Unknown or ownerless cryptographic material
  is a release blocker.

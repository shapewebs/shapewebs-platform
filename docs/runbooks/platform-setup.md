# Shapewebs platform setup

- Status: non-production database foundation executed; production pending
- Applies after: each matching migration and authorization test is reviewed
- Vercel team: `Shapewebs`
- Repository: `shapewebs/shapewebs-platform`

Do not provision production credentials from this document until the matching
schema, migrations, validation, and authorization tests exist in the
repository.

## Topology

Keep one monorepo and the two existing Vercel projects:

| Vercel project    | Root         | Production domain     | Responsibility            |
| ----------------- | ------------ | --------------------- | ------------------------- |
| `shapewebs-web`   | `apps/web`   | `shapewebs.com`       | Static public studio site |
| `shapewebs-admin` | `apps/admin` | `admin.shapewebs.com` | Auth, CMS, future portal  |

Both projects deploy `main`. A pull request creates protected previews only for
affected projects. Keep `www.shapewebs.com` as a permanent redirect to the
apex.

Use two Neon projects for hard data separation:

| Neon project           | Branches                           | Data               |
| ---------------------- | ---------------------------------- | ------------------ |
| `shapewebs-platform`   | persistent staging + ephemeral PRs | synthetic only     |
| `shapewebs-production` | protected production branch        | real business data |

Never branch a general preview from production. Customer or lead data must not
be copied into pull-request environments.

As of 24 July 2026, `shapewebs-platform` exists in Frankfurt
(`aws-eu-central-1`) and is the non-production project. The production Neon
project has not been provisioned.

## 1. Secure the operator accounts

Before connecting services:

- require phishing-resistant MFA or passkeys on GitHub, Vercel, Neon, Google
  Cloud, the domain registrar, and the primary email account;
- keep Shapewebs organization/team membership minimal;
- use organization teams rather than direct grants when another person joins;
- install GitHub and Vercel apps only on `shapewebs-platform`;
- store recovery codes offline.

## 2. Configure GitHub first

Enable the repository security features available on the selected plan:

- dependency graph;
- Dependabot alerts and security updates;
- secret scanning and push protection;
- CodeQL default setup or the supplied workflow when Code Security is
  licensed.

Create an active `main` ruleset:

- block deletion and force pushes;
- require a pull request and linear history;
- require conversation resolution;
- require `Verify foundation` and `OSV dependency scan`;
- require the relevant Vercel deployment checks;
- allow only a tightly controlled emergency-admin bypass.

The workflow files use read-only default permissions and full commit SHAs.
Review Dependabot action updates before merging them.

## 3. Configure the Vercel projects

For both projects:

1. connect `shapewebs/shapewebs-platform`;
2. retain the existing root directory from the topology table;
3. use Node.js 24;
4. enable Turborepo/skip-unaffected-project behavior;
5. protect Preview deployments with Vercel Authentication;
6. create fixed `staging.shapewebs.com` and
   `admin-staging.shapewebs.com` environments for OAuth and cross-app tests;
7. choose the Vercel EU function region nearest the measured Neon EU region;
8. enable Skew Protection and automatic system environment variables;
9. enable WAF managed rules, bot controls, logs, Speed Insights, Web
   Analytics, and Observability where the plan and privacy decision allow;
10. configure spend and error alerts.

Do not repoint production domains while the migration branch is being tested.
Record the current production deployment IDs and verify Instant Rollback before
promotion.

## 4. Create Neon with explicit roles

Choose an EU region, then create the two projects in the topology table.
Measure application-to-database latency from a Vercel preview before fixing the
final Vercel region.

Create separate database capabilities:

- `shapewebs_migrator`: owns schema changes and is used only by a protected
  migration job;
- `shapewebs_admin_runtime`: non-owner runtime role for auth, CMS, and portal
  queries;
- `shapewebs_web_runtime`: non-owner role limited to published-content reads
  and validated lead inserts;
- `shapewebs_public_reader`: narrowly granted published-content reads where the
  public application needs direct database access;
- human break-glass owner: no application connection string and no routine
  use.

Runtime roles must not own application tables and must not have `BYPASSRLS`.
Create application roles with SQL, not the Neon Console, CLI, or API: Neon
control-plane roles inherit `neon_superuser`, which includes `BYPASSRLS`.
Apply migrations from reviewed, generated SQL—never from application startup.
Force RLS on tenant-bearing tables and test both positive and negative access.

Use:

- `DATABASE_URL` for a pooled/serverless, non-owner runtime connection;
- `DATABASE_MIGRATION_URL` only in the protected migration environment.

Do not place `DATABASE_MIGRATION_URL` in either Vercel project.

The current Development environment is wired with only:

- the admin runtime `DATABASE_URL` in `shapewebs-admin`;
- the web runtime `DATABASE_URL` in `shapewebs-web`;
- a development Better Auth secret and localhost origin in `shapewebs-admin`.

Preview and Production variables remain intentionally unset until their
isolated database topology is ready.

## 5. Integrate preview branches

Connect only `shapewebs-platform` to Vercel previews:

1. create an ephemeral Neon branch per pull request;
2. apply committed migrations;
3. load deterministic synthetic seed data;
4. run database and authorization tests;
5. remove the branch when the pull request closes.

Staging uses a persistent non-production branch and fixed domains. Production
uses only the protected production project. A preview must fail closed if its
isolated database cannot be prepared.

## 6. Configure Better Auth

Self-host Better Auth inside `apps/admin` and mount its handler at
`/api/auth/[...all]`.

Required configuration:

- a generated high-entropy `BETTER_AUTH_SECRET`;
- exact `BETTER_AUTH_URL` and trusted origins;
- a Google OAuth client with exact callback URLs;
- secure host-only cookies in production;
- database-backed sessions with rotation and revocation;
- rate limits on authentication-adjacent endpoints;
- append-only audit events for privileged changes.

Use fixed callback hosts:

- `https://admin.shapewebs.com/api/auth/callback/google`
- `https://admin-staging.shapewebs.com/api/auth/callback/google`
- an explicit localhost callback for development

Do not register wildcard Vercel preview callbacks with Google. General previews
can test unauthenticated and fail-closed behavior; fixed staging performs the
complete OAuth journey.

Public customer sign-up remains disabled until invitation/onboarding,
organization membership, tenant authorization, support, export, and deletion
flows are complete.

### Admin step-up requirement

Google sign-in alone is not sufficient for CMS access. Better Auth's normal 2FA
gate does not automatically cover social sign-in, so owner/editor sessions must
pass a custom server-enforced TOTP step-up before entering or mutating admin
routes.

Test at minimum:

- anonymous access is denied;
- an unassigned Google user cannot self-assign a role;
- a valid Google owner without TOTP step-up is denied;
- step-up expires and is revoked with the session;
- an editor cannot change owner/security settings;
- one customer cannot read another organization's records.

## 7. Scope Vercel environment variables

Use Vercel Sensitive values for secrets. Prefer project-specific values over
team-wide variables.

`shapewebs-web` may receive:

- `NEXT_PUBLIC_SITE_URL`;
- the pooled `shapewebs_web_runtime` `DATABASE_URL`;
- `SHAPEWEBS_ORGANIZATION_ID` and `LEAD_IP_HASH_SECRET`;
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`, and an exact
  `TURNSTILE_EXPECTED_HOSTNAME`;
- a narrowly scoped revalidation secret;
- public Blob credentials only when required.

`shapewebs-admin` may receive:

- `NEXT_PUBLIC_ADMIN_URL` and `NEXT_PUBLIC_SITE_URL`;
- `DATABASE_URL` for the non-owner admin runtime role;
- `BETTER_AUTH_SECRET` and `BETTER_AUTH_URL`;
- `BETTER_AUTH_TRUSTED_ORIGINS`, `ADMIN_OWNER_EMAILS`, and
  `SHAPEWEBS_ORGANIZATION_ID`;
- `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`;
- `RESEND_API_KEY`, `RESEND_WEBHOOK_SECRET`,
  `LEAD_NOTIFICATION_FROM_EMAIL`, `LEAD_NOTIFICATION_TO_EMAIL`, and
  `CRON_SECRET`;
- private/public Blob credentials scoped to their stores;
- the server-to-server publish/revalidation secret.

Never expose Better Auth secrets, Google secrets, private storage credentials,
admin database credentials, or migration credentials to `apps/web`.

## 8. Media and email

- Use separate Vercel Blob stores or equivalent capability boundaries for
  public published media and private draft/customer files.
- Restrict uploads by role, MIME type, extension, and size.
- Generate random server-owned object keys and trusted metadata.
- Persist form submissions before sending Resend notifications.
- Treat email as notification, not the system of record.
- Add Turnstile only to public forms and keep it fail closed in production.

Resend reports `shapewebs.com` verified in `eu-west-1`, with sending enabled,
receiving disabled, and open/click tracking disabled. A Development key with
`sending_access` restricted to that domain exists at the provider, but it is
not stored in either application or Vercel. Complete the setup as follows:

1. confirm the generated SPF, DKIM, and Return-Path records remain healthy;
2. begin DMARC in monitoring mode and tighten it only after every legitimate
   sender passes;
3. store the existing Development key only when the server-only email package
   is ready;
4. create a separate Production key with `sending_access`, restricted to the
   Shapewebs domain, only during protected production configuration;
5. store `RESEND_API_KEY`, `LEAD_NOTIFICATION_FROM_EMAIL`,
   `LEAD_NOTIFICATION_TO_EMAIL`, `RESEND_WEBHOOK_SECRET`, and `CRON_SECRET`
   only in `shapewebs-admin`;
6. never place a Resend API key in `shapewebs-web` or a `NEXT_PUBLIC_*`
   variable.

The implementation belongs in a server-only `packages/email` package with
typed HTML/text templates and a provider adapter. A Neon outbox is written in
the same transaction as the business event. Sends use idempotency keys; signed
webhooks are deduplicated by their provider event ID and may arrive out of
order. Lead notifications contain a protected admin link and omit the message
body and project details.

The checked-in Hobby-compatible Vercel Cron schedule runs once daily. It is a
development fallback only and does not satisfy the 15-minute notification SLO.
Upgrade to a Vercel plan with minute-level Cron or approve another
authenticated scheduler before commercial launch; then schedule the protected
outbox endpoint at least every ten minutes.

Before enabling production delivery, test inbox placement, plain-text
fallbacks, accessibility, malicious form content, duplicate worker execution,
provider timeouts, webhook replay, bounce handling, and a disabled/rotated API
key. Update the privacy notice because email addresses and notification
metadata are processed by Resend, and record the approved retention policy.

## 9. Promotion order

1. all local quality gates pass;
2. non-production Neon is created;
3. migrations and synthetic seeds pass on a disposable branch;
4. fixed staging variables and OAuth callbacks are configured;
5. negative database and authentication tests pass in staging;
6. backup and restore are proved with non-production data;
7. production Neon roles and secrets are created;
8. the candidate deploys without moving the domains;
9. smoke, Lighthouse, accessibility, security-header, and authorization checks
   pass;
10. promote the verified deployments and keep Instant Rollback ready;
11. rotate and remove every superseded Supabase variable and credential.

## 10. Post-launch operations

- daily backups and a documented quarterly restore drill;
- target RPO 24 hours and RTO 4 hours until portal data requires tighter
  objectives;
- weekly dependency and action updates;
- continuous real-user performance and error monitoring;
- monthly access review;
- quarterly threat-model, authorization, accessibility, and recovery review;
- ZAP passive scans and k6 tests only against controlled staging.

The repository remains the source of truth for schemas, migrations,
authorization tests, and configuration decisions. Provider dashboards are
deployment surfaces, not undocumented configuration stores.

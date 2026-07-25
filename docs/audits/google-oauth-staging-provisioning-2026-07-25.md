# Google OAuth staging provisioning

- Date: 25 July 2026
- Environment: fixed admin staging Preview
- Production changed: no

## Provisioned configuration

Google Cloud project `shapewebs-platform-2026` was created under the independent
recovery account `shapewebs@gmail.com` as a temporary staging control plane
while the new Workspace organization finishes provisioning.

The Google Auth Platform configuration is:

- application name: `Shapewebs Admin`;
- audience: External, Testing;
- support email: `shapewebs@gmail.com`;
- operational contact: `admin@shapewebs.com`;
- only test user: `admin@shapewebs.com`;
- web client name: `Shapewebs Admin Staging`;
- exact JavaScript origin: `https://admin-staging.shapewebs.com`; and
- exact redirect URI:
  `https://admin-staging.shapewebs.com/api/auth/callback/google`.

The active client ID and client secret are stored as sensitive
`GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` variables only in the
`shapewebs-admin` Vercel Preview environment for Git branch `staging`. They are
not recorded in the repository, public app, general previews or production.
An initial inaccessible secret was disabled and permanently deleted; the
client retains one enabled secret.

## Workspace organization status

The Workspace super-admin account `admin@shapewebs.com` still receives
Google Cloud Console's account-specific unavailable page. Google Workspace
support reported that a new Workspace account's Cloud organization resource
and Console entitlement can take up to 24 hours to propagate.

The following controls were already verified in Workspace Admin:

- Google Cloud Platform is enabled for all users;
- Cloud Resource Manager project creation is allowed; and
- Cloud Shell is enabled.

The temporary personal-account project prevents this provider delay from
blocking staging authentication. After the propagation window:

1. sign in to Cloud Console using only `admin@shapewebs.com` in a clean browser
   session;
2. verify the Shapewebs organization resource appears;
3. if it still fails, reopen Workspace support and request a human agent to
   verify organization/resource-manager provisioning and the account's Cloud
   Console entitlement; and
4. migrate the OAuth client to the Workspace-owned organization only after a
   fresh exact-origin staging test.

## Remaining verification

A new fixed-staging deployment completed at `732c563`.
`/api/health/ready` returned the sanitized response `200 {"status":"ready"}`,
which verifies that the complete Google/auth environment and database
dependency are usable. The interactive deployed journey must still prove:

- unlisted Google accounts are rejected;
- `admin@shapewebs.com` authenticates through the exact callback;
- Google authentication alone cannot enter the dashboard;
- TOTP enrollment/step-up succeeds;
- replayed TOTP counters fail;
- the session cookie and absolute/inactivity limits are enforced; and
- login, denial and step-up audit events contain no token or OAuth payload.

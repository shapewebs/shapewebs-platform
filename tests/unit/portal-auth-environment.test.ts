import { describe, expect, it } from "vitest";

import {
  getPortalBaseUrl,
  getPortalDatabaseUrl,
  getPortalOrganizationId,
  hasPortalAuthEnvironment,
  isPortalIdentityImplemented,
  isPortalRuntimeReady,
} from "../../apps/portal/src/lib/auth-environment";

const completeEnvironment = {
  NEXT_PUBLIC_PORTAL_URL: "https://portal-staging.shapewebs.com",
  NEXT_PUBLIC_PORTAL_TURNSTILE_SITE_KEY: "portal-site-key",
  PORTAL_AUTH_EMAIL_ENCRYPTION_SECRET:
    "a-separate-portal-email-secret-with-32-characters",
  PORTAL_BETTER_AUTH_SECRET:
    "a-separate-portal-secret-with-more-than-32-characters",
  PORTAL_BETTER_AUTH_TRUSTED_ORIGINS: "https://portal-staging.shapewebs.com",
  PORTAL_BETTER_AUTH_URL: "https://portal-staging.shapewebs.com",
  PORTAL_DATABASE_URL: "postgresql://test:test@example.test/portal",
  PORTAL_GOOGLE_CLIENT_ID: "portal-google-client",
  PORTAL_GOOGLE_CLIENT_SECRET: "portal-google-secret",
  PORTAL_TURNSTILE_EXPECTED_HOSTNAME: "portal-staging.shapewebs.com",
  PORTAL_TURNSTILE_SECRET_KEY: "portal-turnstile-secret",
  SHAPEWEBS_ORGANIZATION_ID: "f6214344-7525-42d0-83ac-210881b1b7b6",
} as const;

describe("customer portal authentication environment", () => {
  it("accepts only a complete, exact-origin portal namespace", () => {
    expect(hasPortalAuthEnvironment(completeEnvironment)).toBe(true);
    expect(
      hasPortalAuthEnvironment({
        ...completeEnvironment,
        PORTAL_DATABASE_URL: undefined,
      }),
    ).toBe(false);
  });

  it.each([
    "not-a-url",
    "http://portal-staging.shapewebs.com",
    "https://portal-staging.shapewebs.com/path",
    "https://user:password@portal-staging.shapewebs.com",
  ])("rejects an unsafe portal origin: %s", (origin) => {
    expect(
      hasPortalAuthEnvironment({
        ...completeEnvironment,
        NEXT_PUBLIC_PORTAL_URL: origin,
        PORTAL_BETTER_AUTH_URL: origin,
      }),
    ).toBe(false);
  });

  it("rejects mismatched base and public origins", () => {
    expect(
      hasPortalAuthEnvironment({
        ...completeEnvironment,
        PORTAL_BETTER_AUTH_URL: "https://other.shapewebs.com",
      }),
    ).toBe(false);
  });

  it.each([
    ",",
    "not-an-origin",
    "https://portal-staging.shapewebs.com/path",
    "https://portal-staging.shapewebs.com, http://portal-preview.shapewebs.com",
  ])("rejects an invalid trusted-origin list: %s", (trustedOrigins) => {
    expect(
      hasPortalAuthEnvironment({
        ...completeEnvironment,
        PORTAL_BETTER_AUTH_TRUSTED_ORIGINS: trustedOrigins,
      }),
    ).toBe(false);
  });

  it("requires both implemented routes and the complete provider namespace", () => {
    expect(isPortalIdentityImplemented()).toBe(true);
    expect(isPortalRuntimeReady(completeEnvironment)).toBe(true);
    expect(
      isPortalRuntimeReady({
        ...completeEnvironment,
        PORTAL_TURNSTILE_SECRET_KEY: undefined,
      }),
    ).toBe(false);
  });

  it("exposes only the validated runtime database, origin, and organization", () => {
    expect(getPortalBaseUrl(completeEnvironment)).toBe(
      completeEnvironment.PORTAL_BETTER_AUTH_URL,
    );
    expect(getPortalDatabaseUrl(completeEnvironment)).toBe(
      completeEnvironment.PORTAL_DATABASE_URL,
    );
    expect(getPortalOrganizationId(completeEnvironment)).toBe(
      completeEnvironment.SHAPEWEBS_ORGANIZATION_ID,
    );

    const incomplete = {
      ...completeEnvironment,
      PORTAL_GOOGLE_CLIENT_SECRET: undefined,
    };
    expect(getPortalBaseUrl(incomplete)).toBeNull();
    expect(getPortalDatabaseUrl(incomplete)).toBeNull();
    expect(getPortalOrganizationId(incomplete)).toBeNull();
  });
});

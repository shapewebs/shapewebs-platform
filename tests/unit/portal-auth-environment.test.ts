import { describe, expect, it } from "vitest";

import {
  hasPortalAuthEnvironment,
  isPortalIdentityImplemented,
  isPortalRuntimeReady,
} from "../../apps/portal/src/lib/auth-environment";

const completeEnvironment = {
  NEXT_PUBLIC_PORTAL_URL: "https://portal-staging.shapewebs.com",
  PORTAL_BETTER_AUTH_SECRET:
    "a-separate-portal-secret-with-more-than-32-characters",
  PORTAL_BETTER_AUTH_TRUSTED_ORIGINS: "https://portal-staging.shapewebs.com",
  PORTAL_BETTER_AUTH_URL: "https://portal-staging.shapewebs.com",
  PORTAL_DATABASE_URL: "postgresql://test:test@example.test/portal",
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

  it("cannot be enabled through provider values alone", () => {
    expect(isPortalIdentityImplemented()).toBe(false);
    expect(isPortalRuntimeReady(completeEnvironment)).toBe(false);
  });
});

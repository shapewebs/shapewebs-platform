import { afterEach, describe, expect, it, vi } from "vitest";

import {
  hasAdminAuthConfig,
  isLocalAdminSetupMode,
  isTrustedAdminOrigin,
  splitEnvironmentList,
} from "../../apps/admin/src/lib/auth-environment";

const completeEnvironment = {
  ADMIN_AUTH_EMAIL_ENCRYPTION_SECRET:
    "a-separate-admin-email-encryption-secret-with-32-characters",
  ADMIN_OWNER_EMAILS: "owner@shapewebs.com",
  BETTER_AUTH_SECRET: "a-secure-test-secret-with-more-than-32-characters",
  BETTER_AUTH_URL: "https://admin.shapewebs.com",
  DATABASE_URL: "postgresql://test:test@example.test/shapewebs",
  GOOGLE_CLIENT_ID: "test-client-id",
  GOOGLE_CLIENT_SECRET: "test-client-secret",
  SHAPEWEBS_ORGANIZATION_ID: "00000000-0000-4000-8000-000000000001",
} as const;

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("admin authentication environment", () => {
  it("fails closed when any required value is missing", () => {
    for (const [name, value] of Object.entries(completeEnvironment)) {
      vi.stubEnv(name, value);
    }
    vi.stubEnv("GOOGLE_CLIENT_SECRET", "");

    expect(hasAdminAuthConfig()).toBe(false);
  });

  it("recognizes a complete environment", () => {
    for (const [name, value] of Object.entries(completeEnvironment)) {
      vi.stubEnv(name, value);
    }

    expect(hasAdminAuthConfig()).toBe(true);
  });

  it("limits setup mode to unconfigured local development", () => {
    vi.stubEnv("NODE_ENV", "development");
    expect(isLocalAdminSetupMode()).toBe(true);

    vi.stubEnv("NODE_ENV", "production");
    expect(isLocalAdminSetupMode()).toBe(false);
  });

  it("accepts only exact trusted origins", () => {
    vi.stubEnv("BETTER_AUTH_URL", "https://admin.shapewebs.com");
    vi.stubEnv(
      "BETTER_AUTH_TRUSTED_ORIGINS",
      "https://staging-admin.shapewebs.com, https://preview.example.test",
    );

    expect(isTrustedAdminOrigin("https://admin.shapewebs.com")).toBe(true);
    expect(isTrustedAdminOrigin("https://staging-admin.shapewebs.com")).toBe(
      true,
    );
    expect(isTrustedAdminOrigin("https://evil.shapewebs.com")).toBe(false);
    expect(isTrustedAdminOrigin(null)).toBe(false);
  });

  it("normalizes comma-separated configuration", () => {
    expect(
      splitEnvironmentList(" owner@example.com,editor@example.com, "),
    ).toEqual(["owner@example.com", "editor@example.com"]);
  });
});

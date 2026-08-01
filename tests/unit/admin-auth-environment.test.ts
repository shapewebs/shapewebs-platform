import { afterEach, describe, expect, it, vi } from "vitest";

import {
  getAdminBaseUrl,
  getAdminDatabaseUrl,
  getAdminOrganizationId,
  getCustomerDatabaseUrl,
  hasAdminAuthConfig,
  hasUnifiedAccountPortalConfig,
  isLocalAdminSetupMode,
  isTrustedAdminOrigin,
  splitEnvironmentList,
} from "../../apps/admin/src/lib/auth-environment";

const completeEnvironment = {
  ADMIN_AUTH_EMAIL_ENCRYPTION_SECRET:
    "a-separate-admin-email-encryption-secret-with-32-characters",
  ADMIN_OWNER_EMAILS: "owner@shapewebs.com",
  ACCOUNT_TURNSTILE_EXPECTED_HOSTNAME: "admin.shapewebs.com",
  ACCOUNT_TURNSTILE_SECRET_KEY: "turnstile-test-secret",
  BETTER_AUTH_SECRET: "a-secure-test-secret-with-more-than-32-characters",
  BETTER_AUTH_URL: "https://admin.shapewebs.com",
  DATABASE_URL: "postgresql://test:test@example.test/shapewebs",
  CUSTOMER_DATABASE_URL: "postgresql://customer:test@example.test/shapewebs",
  GOOGLE_CLIENT_ID: "test-client-id",
  GOOGLE_CLIENT_SECRET: "test-client-secret",
  NEXT_PUBLIC_ACCOUNT_TURNSTILE_SITE_KEY: "turnstile-test-site-key",
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
    expect(hasUnifiedAccountPortalConfig()).toBe(true);
  });

  it("fails the unified portal contract when customer isolation is absent", () => {
    for (const [name, value] of Object.entries(completeEnvironment)) {
      vi.stubEnv(name, value);
    }
    vi.stubEnv("CUSTOMER_DATABASE_URL", "");

    expect(hasAdminAuthConfig()).toBe(true);
    expect(hasUnifiedAccountPortalConfig()).toBe(false);
  });

  it("fails the unified portal contract when account abuse controls are absent", () => {
    for (const [name, value] of Object.entries(completeEnvironment)) {
      vi.stubEnv(name, value);
    }
    vi.stubEnv("ACCOUNT_TURNSTILE_SECRET_KEY", "");

    expect(hasAdminAuthConfig()).toBe(true);
    expect(hasUnifiedAccountPortalConfig()).toBe(false);
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

  it("returns the exact configured account and database boundaries", () => {
    for (const [name, value] of Object.entries(completeEnvironment)) {
      vi.stubEnv(name, value);
    }

    expect(getAdminBaseUrl()).toBe(completeEnvironment.BETTER_AUTH_URL);
    expect(getAdminDatabaseUrl()).toBe(completeEnvironment.DATABASE_URL);
    expect(getCustomerDatabaseUrl()).toBe(
      completeEnvironment.CUSTOMER_DATABASE_URL,
    );
    expect(getAdminOrganizationId()).toBe(
      completeEnvironment.SHAPEWEBS_ORGANIZATION_ID,
    );
  });

  it("returns null for absent optional lookups", () => {
    vi.stubEnv("BETTER_AUTH_URL", "");
    vi.stubEnv("CUSTOMER_DATABASE_URL", "");
    vi.stubEnv("DATABASE_URL", "");
    vi.stubEnv("SHAPEWEBS_ORGANIZATION_ID", "");

    expect(getAdminBaseUrl()).toBeNull();
    expect(getAdminDatabaseUrl()).toBeNull();
    expect(getCustomerDatabaseUrl()).toBeNull();
    expect(getAdminOrganizationId()).toBeNull();
  });
});

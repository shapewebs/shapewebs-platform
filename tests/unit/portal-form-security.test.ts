import { afterEach, describe, expect, it, vi } from "vitest";

import {
  createPortalFormToken,
  getSingleFormValue,
  readSecurePortalForm,
} from "../../apps/portal/src/lib/form-security";
import { getSafePortalRedirectTarget } from "../../apps/portal/src/lib/redirect";

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

function configurePortalEnvironment() {
  for (const [name, value] of Object.entries(completeEnvironment)) {
    vi.stubEnv(name, value);
  }
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("customer portal form security", () => {
  it("accepts one action-bound token only from the exact portal origin", async () => {
    configurePortalEnvironment();
    const token = createPortalFormToken("customer_login", 1_000_000);
    const body = new URLSearchParams({ csrfToken: token, method: "password" });
    const request = new Request(
      "https://portal-staging.shapewebs.com/api/auth-flow/login",
      {
        body,
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Origin: "https://portal-staging.shapewebs.com",
          "Sec-Fetch-Site": "same-origin",
        },
        method: "POST",
      },
    );

    await expect(
      readSecurePortalForm(request, "customer_login"),
    ).resolves.toMatchObject({ status: "invalid" });

    const freshToken = createPortalFormToken("customer_login");
    const freshBody = new URLSearchParams({ csrfToken: freshToken });
    await expect(
      readSecurePortalForm(
        new Request(
          "https://portal-staging.shapewebs.com/api/auth-flow/login",
          {
            body: freshBody,
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
              Origin: "https://portal-staging.shapewebs.com",
            },
            method: "POST",
          },
        ),
        "customer_login",
      ),
    ).resolves.toMatchObject({ status: "ok" });
  });

  it("rejects cross-origin, wrong-action, duplicate, and oversized inputs", async () => {
    configurePortalEnvironment();
    const token = createPortalFormToken("customer_login");

    for (const [origin, action] of [
      ["https://attacker.example", "customer_login"],
      ["https://portal-staging.shapewebs.com", "customer_logout"],
    ] as const) {
      const request = new Request(
        "https://portal-staging.shapewebs.com/api/auth-flow/login",
        {
          body: new URLSearchParams({ csrfToken: token }),
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Origin: origin,
          },
          method: "POST",
        },
      );

      await expect(
        readSecurePortalForm(request, action),
      ).resolves.toMatchObject({ status: "invalid" });
    }

    const duplicate = new URLSearchParams();
    duplicate.append("method", "google");
    duplicate.append("method", "password");
    expect(getSingleFormValue(duplicate, "method", 16)).toBeNull();

    const oversized = new Request(
      "https://portal-staging.shapewebs.com/api/auth-flow/login",
      {
        body: `csrfToken=${encodeURIComponent(token)}&value=${"x".repeat(17_000)}`,
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Origin: "https://portal-staging.shapewebs.com",
        },
        method: "POST",
      },
    );
    await expect(
      readSecurePortalForm(oversized, "customer_login"),
    ).resolves.toMatchObject({ status: "too_large" });
  });
});

describe("customer portal redirect allowlist", () => {
  it.each([
    ["/dashboard", "/dashboard"],
    ["/projects/site-1?tab=status", "/projects/site-1?tab=status"],
    ["/settings/security", "/settings/security"],
    ["https://attacker.example", "/dashboard"],
    ["//attacker.example", "/dashboard"],
    ["/login", "/dashboard"],
    ["/settings\\..\\admin", "/dashboard"],
  ])("maps %s to %s", (input, expected) => {
    expect(getSafePortalRedirectTarget(input)).toBe(expected);
  });
});

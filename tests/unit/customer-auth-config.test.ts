import { describe, expect, it } from "vitest";

import { createShapewebsCustomerAuth } from "../../packages/auth/src/create-customer-auth";

const validOptions = {
  baseUrl: "http://localhost:3002",
  databaseUrl: "postgresql://user:password@localhost:5432/shapewebs",
  emailEncryptionSecret: "a-separate-customer-email-encryption-secret",
  organizationId: "f6214344-7525-42d0-83ac-210881b1b7b6",
  production: false,
  secret: "a-separate-customer-auth-secret-that-is-long-enough",
  trustedOrigins: ["http://localhost:3002"],
};

describe("customer Better Auth security configuration", () => {
  it("uses a separate fixed session, cookie, and endpoint policy", () => {
    const auth = createShapewebsCustomerAuth(validOptions);

    expect(auth.options.session).toMatchObject({
      disableSessionRefresh: true,
      expiresIn: 7 * 24 * 60 * 60,
      freshAge: 5 * 60,
    });
    expect(auth.options.advanced).toMatchObject({
      cookiePrefix: "shapewebs-customer",
      defaultCookieAttributes: {
        httpOnly: true,
        path: "/",
        sameSite: "lax",
        secure: false,
      },
    });
    expect(auth.options.disabledPaths).toEqual(
      expect.arrayContaining([
        "/account-info",
        "/change-password",
        "/change-email",
        "/delete-user",
        "/get-access-token",
        "/list-accounts",
        "/list-sessions",
        "/refresh-token",
        "/send-verification-email",
        "/set-password",
        "/sign-up/email",
        "/unlink-account",
        "/update-user",
        "/verify-email",
      ]),
    );
  });

  it("enables credential sign-in but disables open credential signup", () => {
    const auth = createShapewebsCustomerAuth(validOptions);

    expect(auth.options.emailAndPassword).toMatchObject({
      autoSignIn: false,
      disableSignUp: true,
      enabled: true,
      maxPasswordLength: 128,
      minPasswordLength: 15,
      requireEmailVerification: true,
      revokeSessionsOnPasswordReset: true,
    });
  });

  it("requires explicit, same-email, non-orphaning account linking", () => {
    const auth = createShapewebsCustomerAuth(validOptions);

    expect(auth.options.account?.accountLinking).toMatchObject({
      allowDifferentEmails: false,
      allowUnlinkingAll: false,
      disableImplicitLinking: true,
      trustedProviders: ["google"],
      updateUserInfoOnLink: false,
    });
    expect(auth.options.account?.encryptOAuthTokens).toBe(true);
  });

  it("uses database-backed route-specific throttles", () => {
    const auth = createShapewebsCustomerAuth(validOptions);

    expect(auth.options.rateLimit).toMatchObject({
      customRules: {
        "/request-password-reset": { max: 3, window: 60 },
        "/reset-password": { max: 5, window: 60 },
        "/sign-in/email": { max: 5, window: 60 },
        "/sign-in/social": { max: 10, window: 60 },
      },
      enabled: true,
      storage: "database",
      window: 60,
    });
  });

  it("rejects shared, incomplete, and wildcard production configuration", () => {
    expect(() =>
      createShapewebsCustomerAuth({
        ...validOptions,
        emailEncryptionSecret: "short",
      }),
    ).toThrow("PORTAL_AUTH_EMAIL_ENCRYPTION_SECRET");

    expect(() =>
      createShapewebsCustomerAuth({
        ...validOptions,
        trustedOrigins: ["https://*.vercel.app"],
      }),
    ).toThrow("exact HTTP(S) origin");

    expect(() =>
      createShapewebsCustomerAuth({
        ...validOptions,
        baseUrl: "https://portal.shapewebs.com",
        production: true,
        trustedOrigins: ["https://portal.shapewebs.com"],
      }),
    ).toThrow("Google OAuth");
  });

  it("returns 404 for public signup and unwrapped sensitive account routes", async () => {
    const auth = createShapewebsCustomerAuth(validOptions);

    for (const path of [
      "/account-info",
      "/change-password",
      "/get-access-token",
      "/refresh-token",
      "/set-password",
      "/sign-up/email",
      "/unlink-account",
      "/update-user",
      "/verify-email",
    ]) {
      const response = await auth.handler(
        new Request(`${validOptions.baseUrl}/api/auth${path}`, {
          body: path === "/verify-email" ? undefined : "{}",
          headers: { Origin: validOptions.baseUrl },
          method: path === "/verify-email" ? "GET" : "POST",
        }),
      );

      expect(response.status, path).toBe(404);
    }
  });
});

import { describe, expect, it } from "vitest";

import { createShapewebsAuth } from "../../packages/auth/src/create-auth";

const validOptions = {
  baseUrl: "http://localhost:3001",
  databaseUrl: "postgresql://user:password@localhost:5432/shapewebs",
  organizationId: "f6214344-7525-42d0-83ac-210881b1b7b6",
  ownerEmails: ["owner@shapewebs.com"],
  production: false,
  secret: "a-secure-test-secret-that-is-long-enough",
  trustedOrigins: ["http://localhost:3001"],
};

describe("Better Auth security configuration", () => {
  it("rejects wildcard trusted origins", () => {
    expect(() =>
      createShapewebsAuth({
        ...validOptions,
        trustedOrigins: [
          ...validOptions.trustedOrigins,
          "https://*.vercel.app",
        ],
      }),
    ).toThrow("exact HTTP(S) origin");
  });

  it("requires HTTPS and Google OAuth in production", () => {
    expect(() =>
      createShapewebsAuth({
        ...validOptions,
        production: true,
      }),
    ).toThrow("exact HTTP(S) origin");

    expect(() =>
      createShapewebsAuth({
        ...validOptions,
        baseUrl: "https://admin.shapewebs.com",
        production: true,
        trustedOrigins: ["https://admin.shapewebs.com"],
      }),
    ).toThrow("Google OAuth");
  });

  it("requires the base URL in the exact trusted-origin set", () => {
    expect(() =>
      createShapewebsAuth({
        ...validOptions,
        trustedOrigins: ["http://127.0.0.1:3001"],
      }),
    ).toThrow("must include BETTER_AUTH_URL");
  });

  it("rejects malformed owner identity and short secrets", () => {
    expect(() =>
      createShapewebsAuth({
        ...validOptions,
        ownerEmails: ["not-an-email"],
      }),
    ).toThrow("invalid email");
    expect(() =>
      createShapewebsAuth({
        ...validOptions,
        secret: "short",
      }),
    ).toThrow("at least 32 characters");
  });

  it("rejects adversarially long owner identities before email parsing", () => {
    expect(() =>
      createShapewebsAuth({
        ...validOptions,
        ownerEmails: [`owner@${"a".repeat(100_000)}.com`],
      }),
    ).toThrow("invalid email");
  });

  it("uses fixed short-lived sessions and disables password authentication", () => {
    const auth = createShapewebsAuth(validOptions);

    expect(auth.options.session?.expiresIn).toBe(60 * 60 * 8);
    expect(auth.options.session?.freshAge).toBe(60 * 5);
    expect(auth.options.session?.disableSessionRefresh).toBe(true);
    expect(auth.options.emailAndPassword?.enabled).toBe(false);
    expect(auth.options.disabledPaths).toEqual(
      expect.arrayContaining(["/sign-in/email", "/sign-up/email"]),
    );
  });
});

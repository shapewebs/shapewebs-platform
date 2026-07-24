import { describe, expect, it } from "vitest";

import { createShapewebsAuth } from "../../packages/auth/src/create-auth";
import { createVerifiedGoogleUserInfo } from "../../packages/auth/src/google-user-info";

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
      expect.arrayContaining([
        "/sign-in/email",
        "/sign-up/email",
        "/two-factor/disable",
        "/two-factor/generate-backup-codes",
        "/two-factor/get-totp-uri",
        "/two-factor/send-otp",
        "/two-factor/verify-backup-code",
        "/two-factor/verify-otp",
        "/two-factor/verify-totp",
      ]),
    );
    expect(auth.options.hooks?.before).toBeTypeOf("function");
  });

  it("accepts Google profile claims only after exact-audience token verification", async () => {
    const verifier = async ({
      audience,
      token,
    }: {
      audience: string | string[];
      nonce?: string;
      token: string;
    }) => {
      expect(audience).toBe("shapewebs-google-client");
      expect(token).toBe("signed-google-token");

      return {
        aud: audience,
        email: "owner@shapewebs.com",
        email_verified: true,
        exp: Math.floor(Date.now() / 1000) + 300,
        iss: "https://accounts.google.com",
        name: "Shapewebs Owner",
        picture: "https://example.test/owner.png",
        sub: "google-subject",
      };
    };
    const getUserInfo = createVerifiedGoogleUserInfo(
      "shapewebs-google-client",
      verifier,
    );

    await expect(
      getUserInfo({ idToken: "signed-google-token" }),
    ).resolves.toEqual({
      data: expect.objectContaining({
        aud: "shapewebs-google-client",
        iss: "https://accounts.google.com",
      }),
      user: {
        email: "owner@shapewebs.com",
        emailVerified: true,
        id: "google-subject",
        image: "https://example.test/owner.png",
        name: "Shapewebs Owner",
      },
    });
  });

  it("rejects missing, invalid, unverified, and malformed Google identity claims", async () => {
    const rejectToken = createVerifiedGoogleUserInfo(
      "shapewebs-google-client",
      async () => null,
    );
    const unverifiedEmail = createVerifiedGoogleUserInfo(
      "shapewebs-google-client",
      async () => ({
        email: "owner@shapewebs.com",
        email_verified: false,
        sub: "google-subject",
      }),
    );
    const malformedEmail = createVerifiedGoogleUserInfo(
      "shapewebs-google-client",
      async () => ({
        email: "not-an-email",
        email_verified: true,
        sub: "google-subject",
      }),
    );
    const missingSubject = createVerifiedGoogleUserInfo(
      "shapewebs-google-client",
      async () => ({
        email: "owner@shapewebs.com",
        email_verified: true,
      }),
    );

    await expect(rejectToken({})).resolves.toBeNull();
    await expect(rejectToken({ idToken: "invalid" })).resolves.toBeNull();
    await expect(
      unverifiedEmail({ idToken: "unverified-email" }),
    ).resolves.toBeNull();
    await expect(
      malformedEmail({ idToken: "malformed-email" }),
    ).resolves.toBeNull();
    await expect(
      missingSubject({ idToken: "missing-subject" }),
    ).resolves.toBeNull();
  });
});

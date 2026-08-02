import { describe, expect, it } from "vitest";

import {
  getPasskeyRelyingParty,
  isPasskeyVerifiedSessionCreation,
  requireRemovablePasskey,
  requirePasskeyUserVerification,
} from "../../packages/auth/src/passkey-policy";

describe("passkey security policy", () => {
  it("binds localhost ceremonies to the exact local origin", () => {
    expect(getPasskeyRelyingParty("http://localhost:3001")).toEqual({
      origin: "http://localhost:3001",
      rpID: "localhost",
    });
  });

  it("binds production ceremonies to the exact production host", () => {
    expect(getPasskeyRelyingParty("https://admin.shapewebs.com")).toEqual({
      origin: "https://admin.shapewebs.com",
      rpID: "admin.shapewebs.com",
    });
  });

  it("rejects malformed relying-party configuration", () => {
    expect(() => getPasskeyRelyingParty("not-an-origin")).toThrow();
  });

  it("requires verified user presence from the authenticator", () => {
    expect(() => requirePasskeyUserVerification(true)).not.toThrow();
    expect(() => requirePasskeyUserVerification(false)).toThrow(
      "Passkey user verification is required.",
    );
    expect(() => requirePasskeyUserVerification(undefined)).toThrow(
      "Passkey user verification is required.",
    );
  });

  it("recognizes only the exact passkey verification session request", () => {
    expect(
      isPasskeyVerifiedSessionCreation({
        path: "/passkey/verify-authentication",
        request: new Request(
          "https://admin.shapewebs.com/api/auth/passkey/verify-authentication",
          { method: "POST" },
        ),
      }),
    ).toBe(true);

    for (const context of [
      null,
      {
        path: "/passkey/verify-authentication",
        request: new Request(
          "https://admin.shapewebs.com/api/auth/passkey/verify-authentication",
        ),
      },
      {
        path: "/passkey/generate-authenticate-options",
        request: new Request(
          "https://admin.shapewebs.com/api/auth/passkey/verify-authentication",
          { method: "POST" },
        ),
      },
      {
        path: "/passkey/verify-authentication",
        request: new Request(
          "https://admin.shapewebs.com/api/auth/passkey/verify-registration",
          { method: "POST" },
        ),
      },
    ]) {
      expect(isPasskeyVerifiedSessionCreation(context)).toBe(false);
    }
  });

  it("prevents removing an account's final usable sign-in method", () => {
    expect(() =>
      requireRemovablePasskey({
        google: false,
        passkeyCount: 1,
        password: false,
      }),
    ).toThrow("Connect another sign-in method before removing this passkey.");
  });

  it("allows removal when another passkey or sign-in method remains", () => {
    for (const methods of [
      { google: true, passkeyCount: 1, password: false },
      { google: false, passkeyCount: 1, password: true },
      { google: false, passkeyCount: 2, password: false },
    ]) {
      expect(() => requireRemovablePasskey(methods)).not.toThrow();
    }
  });
});

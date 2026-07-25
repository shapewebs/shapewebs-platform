import { describe, expect, it } from "vitest";

import {
  generateAdminSessionToken,
  serializeAdminSessionCookie,
} from "../../packages/auth/src/session-cookie";
import { getSessionCookie } from "../../packages/auth/src/proxy";

const productionAuthOptions = {
  advanced: {
    cookiePrefix: "shapewebs",
    defaultCookieAttributes: {
      httpOnly: true,
      path: "/",
      sameSite: "lax" as const,
      secure: true,
    },
    useSecureCookies: true,
  },
  session: {
    expiresIn: 60 * 60 * 8,
  },
};

describe("administrative session cookie rotation", () => {
  it("detects only the Shapewebs-prefixed session cookie in the admin proxy", () => {
    expect(
      getSessionCookie(
        new Headers({
          cookie: "__Secure-shapewebs.session_token=admin-session-token",
        }),
      ),
    ).toBe("admin-session-token");

    expect(
      getSessionCookie(
        new Headers({
          cookie: "__Secure-better-auth.session_token=wrong-prefix-token",
        }),
      ),
    ).toBeNull();
  });

  it("generates distinct 256-bit base64url session tokens", () => {
    const tokens = new Set(
      Array.from({ length: 64 }, () => generateAdminSessionToken()),
    );

    expect(tokens.size).toBe(64);

    for (const token of tokens) {
      expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    }
  });

  it("preserves the remaining absolute lifetime and secure host-only policy", async () => {
    const now = new Date("2026-07-25T12:00:00.000Z");
    const cookie = await serializeAdminSessionCookie({
      authOptions: productionAuthOptions,
      expiresAt: new Date("2026-07-25T13:00:00.000Z"),
      now,
      secret: "a-secure-test-secret-that-is-long-enough",
      token: "a".repeat(43),
    });

    expect(cookie).toContain("__Secure-shapewebs.session_token=");
    expect(cookie).toContain("; Max-Age=3600");
    expect(cookie).toContain("; Path=/");
    expect(cookie).toContain("; HttpOnly");
    expect(cookie).toContain("; Secure");
    expect(cookie).toContain("; SameSite=Lax");
    expect(cookie).not.toContain("; Domain=");
  });

  it("rejects malformed tokens and expired replacement sessions", async () => {
    await expect(
      serializeAdminSessionCookie({
        authOptions: productionAuthOptions,
        expiresAt: new Date("2026-07-25T13:00:00.000Z"),
        now: new Date("2026-07-25T12:00:00.000Z"),
        secret: "a-secure-test-secret-that-is-long-enough",
        token: "not-a-session-token",
      }),
    ).rejects.toThrow("rotated administrative session");

    await expect(
      serializeAdminSessionCookie({
        authOptions: productionAuthOptions,
        expiresAt: new Date("2026-07-25T11:59:59.000Z"),
        now: new Date("2026-07-25T12:00:00.000Z"),
        secret: "a-secure-test-secret-that-is-long-enough",
        token: "b".repeat(43),
      }),
    ).rejects.toThrow("rotated administrative session");
  });
});

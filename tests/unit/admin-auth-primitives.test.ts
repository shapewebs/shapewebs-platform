import { describe, expect, it } from "vitest";

import {
  decryptAdminEmailToken,
  encryptAdminEmailToken,
  hashAdminEmailToken,
} from "../../packages/auth/src/admin-email-token";
import {
  createAdminMethodAuthorization,
  verifyAdminMethodAuthorization,
} from "../../packages/auth/src/admin-method-authorization";
import { verifyAdminPasswordHash } from "../../packages/auth/src/admin-password";
import { hashCustomerPassword } from "../../packages/auth/src/customer-password";

const encryptionSecret =
  "a-separate-admin-email-encryption-secret-with-32-characters";

describe("administrative multi-method primitives", () => {
  it("encrypts email tokens and rejects expired, malformed, or wrong-key data", async () => {
    const token = "admin-email-token-that-is-long-enough";
    const encrypted = await encryptAdminEmailToken(token, encryptionSecret, 60);

    expect(encrypted).not.toContain(token);
    expect(await hashAdminEmailToken(token)).toMatch(/^[0-9a-f]{64}$/);
    await expect(
      decryptAdminEmailToken(encrypted, encryptionSecret),
    ).resolves.toBe(token);
    await expect(
      decryptAdminEmailToken(
        encrypted,
        "a-different-admin-email-encryption-secret-with-32-characters",
      ),
    ).resolves.toBeNull();
    await expect(
      decryptAdminEmailToken("not-an-encrypted-token", encryptionSecret),
    ).resolves.toBeNull();
  });

  it("makes Google linking a short-lived server-authorized operation", () => {
    const secret = "a-separate-admin-auth-secret-that-is-long-enough";
    const issuedAt = Date.now();
    const grant = createAdminMethodAuthorization(
      {
        action: "link_google",
        sessionId: "admin-session-123",
        userId: "admin-user-123",
      },
      secret,
      issuedAt,
    );

    expect(
      verifyAdminMethodAuthorization(grant, secret, issuedAt + 30_000, {
        sessionId: "admin-session-123",
        userId: "admin-user-123",
      }),
    ).toBe(true);
    expect(
      verifyAdminMethodAuthorization(grant, secret, issuedAt + 30_000, {
        sessionId: "different-admin-session",
        userId: "admin-user-123",
      }),
    ).toBe(false);
    expect(
      verifyAdminMethodAuthorization(grant, secret, issuedAt + 30_000, {
        sessionId: "admin-session-123",
        userId: "different-admin-user",
      }),
    ).toBe(false);
    expect(
      verifyAdminMethodAuthorization(grant, secret, issuedAt + 61_000),
    ).toBe(false);
    expect(
      verifyAdminMethodAuthorization(`${grant}tampered`, secret, issuedAt),
    ).toBe(false);
  });

  it("verifies the Better Auth credential hash without exposing it", async () => {
    const password = "an employee passphrase for 2026";
    const hash = await hashCustomerPassword(password);

    expect(hash).not.toContain(password);
    await expect(verifyAdminPasswordHash(password, hash)).resolves.toBe(true);
    await expect(
      verifyAdminPasswordHash("a different employee passphrase", hash),
    ).resolves.toBe(false);
    await expect(verifyAdminPasswordHash("a".repeat(129), hash)).resolves.toBe(
      false,
    );
  });
});

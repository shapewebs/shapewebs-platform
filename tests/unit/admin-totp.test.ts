import { describe, expect, it } from "vitest";

import {
  decryptAdminTotpSecret,
  findMatchingTotpCounter,
} from "../../packages/auth/src/admin-totp";

describe("administrative TOTP verification", () => {
  it("matches the RFC 6238 SHA-1 vector in the current time step", () => {
    expect(
      findMatchingTotpCounter(
        "287082",
        "12345678901234567890",
        new Date(59_000),
      ),
    ).toBe(1);
  });

  it("rejects codes outside the exact 30-second time step", () => {
    const secret = "12345678901234567890";

    expect(
      findMatchingTotpCounter("755224", secret, new Date(59_000)),
    ).toBeNull();
    expect(
      findMatchingTotpCounter("359152", secret, new Date(59_000)),
    ).toBeNull();
    expect(
      findMatchingTotpCounter("969429", secret, new Date(59_000)),
    ).toBeNull();
  });

  it("rejects malformed codes and missing secrets", () => {
    expect(
      findMatchingTotpCounter(
        "28708",
        "12345678901234567890",
        new Date(59_000),
      ),
    ).toBeNull();
    expect(findMatchingTotpCounter("287082", "", new Date(59_000))).toBeNull();
  });

  it("decrypts versioned Better Auth TOTP envelopes with its runtime key configuration", async () => {
    const key = {
      currentVersion: 7,
      keys: new Map([
        [7, "current-secret-current-secret-123"],
        [6, "previous-secret-previous-secret"],
      ]),
      legacySecret: "legacy-secret-legacy-secret-1234",
    };
    const totpSecret = "server-generated-totp-secret";
    const encryptedSecret =
      "$ba$7$6ae9008ce81d355196c34de54a332d43f3cbf1fed5da92d5cf60a541a6d46c077cf28a5d1169eb5371c5ff9f60bbf1593396cfc0884a1d74806bc0ef0f63db9d8216ac25";

    await expect(decryptAdminTotpSecret(encryptedSecret, key)).resolves.toBe(
      totpSecret,
    );
  });
});

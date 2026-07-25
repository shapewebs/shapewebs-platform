import { describe, expect, it } from "vitest";

import { findMatchingTotpCounter } from "../../packages/auth/src/admin-totp";

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
});

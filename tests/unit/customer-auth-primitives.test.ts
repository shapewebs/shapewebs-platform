import { describe, expect, it, vi } from "vitest";

import {
  clearCustomerRegistrationContext,
  clearCustomerRegistrationGrant,
  readCustomerRegistrationGrant,
  serializeCustomerRegistrationContext,
  serializeCustomerRegistrationGrant,
} from "../../packages/auth/src/customer-cookie";
import { createCustomerInvitation } from "../../packages/auth/src/customer-onboarding";
import {
  assertCustomerPasswordNotCompromised,
  assertCustomerPasswordPolicy,
  CustomerPasswordError,
  hashCustomerPassword,
  verifyCustomerPasswordHash,
} from "../../packages/auth/src/customer-password";
import {
  decryptCustomerRegistrationContext,
  encryptCustomerRegistrationContext,
} from "../../packages/auth/src/customer-registration-context";
import {
  generateCustomerBearerToken,
  hashCustomerBearerToken,
  isCustomerBearerToken,
} from "../../packages/auth/src/customer-tokens";

const encryptionSecret =
  "a-separate-test-email-encryption-secret-with-32-chars";

describe("customer registration tokens and cookies", () => {
  it("generates high-entropy opaque tokens and hashes them deterministically", async () => {
    const first = generateCustomerBearerToken();
    const second = generateCustomerBearerToken();

    expect(isCustomerBearerToken(first)).toBe(true);
    expect(first).not.toBe(second);
    expect(await hashCustomerBearerToken(first)).toMatch(/^[0-9a-f]{64}$/);
    expect(await hashCustomerBearerToken(first)).toBe(
      await hashCustomerBearerToken(first),
    );
  });

  it("uses a host-only, HttpOnly, secure production registration cookie", () => {
    const grant = generateCustomerBearerToken();
    const serialized = serializeCustomerRegistrationGrant(grant, true);
    const request = new Request("https://admin.shapewebs.com/register", {
      headers: { cookie: serialized.split(";", 1)[0] ?? "" },
    });

    expect(serialized).toContain("__Host-shapewebs-customer-registration=");
    expect(serialized).toContain("HttpOnly");
    expect(serialized).toContain("SameSite=Lax");
    expect(serialized).toContain("Secure");
    expect(serialized).not.toContain("Domain=");
    expect(readCustomerRegistrationGrant(request, true)).toBe(grant);
    expect(clearCustomerRegistrationGrant(true)).toContain("Max-Age=0");
  });

  it("keeps invitation identity server-owned in a separate encrypted cookie", async () => {
    const encrypted = await encryptCustomerRegistrationContext(
      { email: " Customer@Example.test ", name: " Lifecycle Customer " },
      encryptionSecret,
    );
    const serialized = serializeCustomerRegistrationContext(encrypted, true);

    expect(encrypted).not.toContain("customer@example.test");
    expect(serialized).toContain(
      "__Host-shapewebs-customer-registration-context=",
    );
    expect(serialized).toContain("HttpOnly");
    expect(serialized).toContain("Secure");
    expect(serialized).not.toContain("Domain=");
    expect(clearCustomerRegistrationContext(true)).toContain("Max-Age=0");
    await expect(
      decryptCustomerRegistrationContext(encrypted, encryptionSecret),
    ).resolves.toEqual({
      email: "customer@example.test",
      name: "Lifecycle Customer",
    });
  });
});

describe("customer invitation validation", () => {
  it("requires an explicit project assignment before touching the database", async () => {
    await expect(
      createCustomerInvitation({
        authorization: {
          actor: { id: "owner" },
          latestStepUpAt: new Date(),
          organizationId: "10000000-0000-4000-8000-000000000001",
          role: "owner",
          session: { id: "owner-session" },
        },
        databaseUrl:
          "postgresql://shapewebs_admin_runtime:password@example.test/shapewebs",
        email: "customer@example.test",
        encryptionSecret,
        name: "Lifecycle Customer",
        projectIds: [],
      }),
    ).rejects.toThrow("project assignment");
  });
});

describe("customer password assurance", () => {
  it("accepts long passphrases, Unicode, spaces, and paste-friendly values", () => {
    expect(() =>
      assertCustomerPasswordPolicy("måne støv correctly 2026"),
    ).not.toThrow();
  });

  it("rejects short, oversized, and control-character passwords", () => {
    expect(() => assertCustomerPasswordPolicy("too short")).toThrow(
      CustomerPasswordError,
    );
    expect(() => assertCustomerPasswordPolicy("a".repeat(129))).toThrow(
      CustomerPasswordError,
    );
    expect(() =>
      assertCustomerPasswordPolicy("valid length but\u0000hidden"),
    ).toThrow(CustomerPasswordError);
  });

  it("uses the HIBP k-anonymity range without sending the password", async () => {
    const password = "correct horse battery staple 2026";
    // Precomputed protocol fixture. Production uses SHA-1 only for HIBP's
    // five-character k-anonymity range lookup, never for password storage.
    const fingerprint = "AE31C90658FAC00B48429C34983BEC5D155A8C07";
    const fetchImplementation = vi.fn(async (url: string | URL | Request) => {
      expect(String(url)).toBe(
        `https://api.pwnedpasswords.com/range/${fingerprint.slice(0, 5)}`,
      );
      expect(String(url)).not.toContain(password);

      return new Response(`000000:1\n${fingerprint.slice(5)}:42\n`, {
        status: 200,
      });
    }) as typeof fetch;

    await expect(
      assertCustomerPasswordNotCompromised(password, {
        fetchImplementation,
      }),
    ).rejects.toMatchObject({ code: "compromised" });
  });

  it("fails closed when breach validation is unavailable", async () => {
    const fetchImplementation = vi.fn(async () =>
      Promise.reject(new Error("network unavailable")),
    ) as typeof fetch;

    await expect(
      assertCustomerPasswordNotCompromised(
        "a sufficiently long and unique passphrase",
        { fetchImplementation },
      ),
    ).rejects.toMatchObject({ code: "provider_unavailable" });
  });

  it("verifies a credential without exposing or reusing its stored hash", async () => {
    const password = "måne støv correctly 2026";
    const hash = await hashCustomerPassword(password);

    expect(hash).not.toContain(password);
    await expect(verifyCustomerPasswordHash(password, hash)).resolves.toBe(
      true,
    );
    await expect(
      verifyCustomerPasswordHash("a different secure passphrase", hash),
    ).resolves.toBe(false);
  });
});

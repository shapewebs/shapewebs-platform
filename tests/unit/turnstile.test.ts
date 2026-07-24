import { describe, expect, it } from "vitest";
import { isTurnstileVerificationAccepted } from "../../apps/web/src/lib/turnstile";

const testSiteKey = "1x00000000000000000000AA";
const testSecretKey = "1x0000000000000000000000000000000AA";

describe("Turnstile verification policy", () => {
  it("accepts the strict production response contract", () => {
    expect(
      isTurnstileVerificationAccepted({
        expectedHostname: "shapewebs.com",
        payload: {
          action: "lead_submission",
          hostname: "shapewebs.com",
          success: true,
        },
        secret: "production-secret",
      }),
    ).toBe(true);
  });

  it("rejects a production response with the wrong action", () => {
    expect(
      isTurnstileVerificationAccepted({
        expectedHostname: "shapewebs.com",
        payload: {
          action: null,
          hostname: "shapewebs.com",
          success: true,
        },
        secret: "production-secret",
      }),
    ).toBe(false);
  });

  it("accepts Cloudflare's documented test response only in preview", () => {
    expect(
      isTurnstileVerificationAccepted({
        environment: {
          NEXT_PUBLIC_TURNSTILE_SITE_KEY: testSiteKey,
          TURNSTILE_TEST_MODE: "true",
          VERCEL_ENV: "preview",
        },
        expectedHostname: "example.com",
        payload: {
          action: null,
          hostname: "example.com",
          success: true,
        },
        secret: testSecretKey,
      }),
    ).toBe(true);
  });

  it("rejects test mode in production", () => {
    expect(
      isTurnstileVerificationAccepted({
        environment: {
          NEXT_PUBLIC_TURNSTILE_SITE_KEY: testSiteKey,
          TURNSTILE_TEST_MODE: "true",
          VERCEL_ENV: "production",
        },
        expectedHostname: "example.com",
        payload: {
          action: null,
          hostname: "example.com",
          success: true,
        },
        secret: testSecretKey,
      }),
    ).toBe(false);
  });

  it("rejects test mode unless both documented test keys match", () => {
    expect(
      isTurnstileVerificationAccepted({
        environment: {
          NEXT_PUBLIC_TURNSTILE_SITE_KEY: testSiteKey,
          TURNSTILE_TEST_MODE: "true",
          VERCEL_ENV: "preview",
        },
        expectedHostname: "example.com",
        payload: {
          action: null,
          hostname: "example.com",
          success: true,
        },
        secret: "wrong-secret",
      }),
    ).toBe(false);
  });
});

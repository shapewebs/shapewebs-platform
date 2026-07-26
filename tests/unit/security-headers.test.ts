import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildAdminApiContentSecurityPolicy,
  buildAdminContentSecurityPolicy,
  buildAdminSecurityHeaders,
  buildPortalApiContentSecurityPolicy,
  buildPortalContentSecurityPolicy,
  buildPortalSecurityHeaders,
  buildWebSecurityHeaders,
} from "../../packages/config/src/security";

function toHeaderMap(headers: Array<{ key: string; value: string }>) {
  return new Map(
    headers.map((header) => [header.key.toLowerCase(), header.value]),
  );
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("security headers", () => {
  it("uses a production CSP without unsafe-eval", () => {
    vi.stubEnv("NODE_ENV", "production");
    const headers = toHeaderMap(buildWebSecurityHeaders());
    const csp = headers.get("content-security-policy");

    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("base-uri 'none'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain(
      "script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com",
    );
    expect(csp).toContain("frame-src 'self' https://challenges.cloudflare.com");
    expect(csp).not.toContain("'unsafe-eval'");
    expect(headers.get("strict-transport-security")).toContain(
      "includeSubDomains",
    );
    expect(headers.get("x-frame-options")).toBe("DENY");
  });

  it("allows eval only for the local Next.js development runtime", () => {
    vi.stubEnv("NODE_ENV", "development");
    const headers = toHeaderMap(buildWebSecurityHeaders());

    expect(headers.get("content-security-policy")).toContain("'unsafe-eval'");
  });

  it("prevents indexing of the admin application", () => {
    vi.stubEnv("NODE_ENV", "production");
    const headers = toHeaderMap(buildAdminSecurityHeaders());

    expect(headers.get("x-robots-tag")).toBe("noindex, nofollow");
  });

  it("keeps the portal private with an independent nonce policy", () => {
    vi.stubEnv("NODE_ENV", "production");
    const headers = toHeaderMap(buildPortalSecurityHeaders());
    const csp = buildPortalContentSecurityPolicy("portalNonce123");
    const apiCsp = buildPortalApiContentSecurityPolicy();

    expect(headers.get("x-robots-tag")).toBe("noindex, nofollow");
    expect(csp).toContain("'nonce-portalNonce123'");
    expect(csp).toContain("'strict-dynamic'");
    expect(csp.match(/script-src [^;]+/)?.[0]).not.toContain("'unsafe-inline'");
    expect(csp).toContain("https://challenges.cloudflare.com");
    expect(headers.get("referrer-policy")).toBe("no-referrer");
    expect(apiCsp).toContain("default-src 'none'");
  });

  it("builds an admin nonce policy without inline script execution", () => {
    vi.stubEnv("NODE_ENV", "production");
    const csp = buildAdminContentSecurityPolicy("safeNonce123");

    expect(csp).toContain("'nonce-safeNonce123'");
    expect(csp).toContain("'strict-dynamic'");
    expect(csp).toContain("base-uri 'none'");
    expect(csp.match(/script-src [^;]+/)?.[0]).not.toContain("'unsafe-inline'");
    expect(csp).not.toContain("challenges.cloudflare.com");
    expect(csp).not.toContain("supabase.co");
  });

  it("allows only the exact public origin for admin preview transfers", () => {
    vi.stubEnv("NODE_ENV", "production");
    const csp = buildAdminContentSecurityPolicy("safeNonce123", {
      formActionOrigins: [
        "https://staging.shapewebs.com",
        "https://staging.shapewebs.com",
      ],
    });

    expect(csp).toContain("form-action 'self' https://staging.shapewebs.com");
    expect(csp.split("https://staging.shapewebs.com")).toHaveLength(2);
    expect(csp).not.toContain("*");
  });

  it("allows loopback HTTP form actions only in development", () => {
    vi.stubEnv("NODE_ENV", "development");

    expect(
      buildAdminContentSecurityPolicy("safeNonce123", {
        formActionOrigins: ["http://127.0.0.1:3100"],
      }),
    ).toContain("form-action 'self' http://127.0.0.1:3100");
  });

  it.each([
    "https://staging.shapewebs.com/path",
    "https://user:password@staging.shapewebs.com",
    "http://staging.shapewebs.com",
    "javascript:alert(1)",
  ])("rejects unsafe admin form-action origin %s", (origin) => {
    vi.stubEnv("NODE_ENV", "production");

    expect(() =>
      buildAdminContentSecurityPolicy("safeNonce123", {
        formActionOrigins: [origin],
      }),
    ).toThrow("exact secure origin");
  });

  it("denies all browser rendering contexts for admin API responses", () => {
    const csp = buildAdminApiContentSecurityPolicy();

    expect(csp).toContain("default-src 'none'");
    expect(csp).toContain("base-uri 'none'");
    expect(csp).toContain("form-action 'none'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
  });

  it("rejects malformed admin CSP nonces", () => {
    expect(() => buildAdminContentSecurityPolicy("bad nonce;")).toThrow(
      "invalid characters",
    );
  });
});

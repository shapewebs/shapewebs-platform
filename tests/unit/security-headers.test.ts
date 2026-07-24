import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildAdminContentSecurityPolicy,
  buildAdminSecurityHeaders,
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

  it("builds an admin nonce policy without inline script execution", () => {
    vi.stubEnv("NODE_ENV", "production");
    const csp = buildAdminContentSecurityPolicy("safeNonce123");

    expect(csp).toContain("'nonce-safeNonce123'");
    expect(csp).toContain("'strict-dynamic'");
    expect(csp.match(/script-src [^;]+/)?.[0]).not.toContain("'unsafe-inline'");
    expect(csp).not.toContain("challenges.cloudflare.com");
    expect(csp).not.toContain("supabase.co");
  });

  it("rejects malformed admin CSP nonces", () => {
    expect(() => buildAdminContentSecurityPolicy("bad nonce;")).toThrow(
      "invalid characters",
    );
  });
});

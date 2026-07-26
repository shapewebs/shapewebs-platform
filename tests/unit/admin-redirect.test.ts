import { describe, expect, it } from "vitest";
import { getSafeAdminRedirectTarget } from "../../apps/admin/src/lib/redirect";

describe("admin redirect sanitizer", () => {
  it("preserves allowlisted admin paths, queries, and fragments", () => {
    expect(getSafeAdminRedirectTarget("/audit")).toBe("/audit");
    expect(getSafeAdminRedirectTarget("/account/security")).toBe(
      "/account/security",
    );
    expect(
      getSafeAdminRedirectTarget("/content/pages/123?mode=edit#title"),
    ).toBe("/content/pages/123?mode=edit#title");
  });

  it.each([
    undefined,
    "",
    "https://example.com",
    "//example.com/dashboard",
    "/\\example.com/dashboard",
    "/login",
    "/contentious",
  ])("falls back for unsafe or unapproved target %s", (target) => {
    expect(getSafeAdminRedirectTarget(target)).toBe("/dashboard");
  });

  it("falls back when URL parsing fails", () => {
    expect(getSafeAdminRedirectTarget("http://[")).toBe("/dashboard");
  });
});

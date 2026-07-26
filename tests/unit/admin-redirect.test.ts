import { describe, expect, it } from "vitest";
import {
  getAdminStepUpUrl,
  getSafeAdminRedirectTarget,
} from "../../apps/admin/src/lib/redirect";

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

  it("builds a password-link step-up URL with a sanitized resume target", () => {
    expect(
      getAdminStepUpUrl(
        "/account/security?resume=password-link",
        "password-link",
      ),
    ).toBe(
      "/login/mfa?reason=password-link&redirectTo=%2Faccount%2Fsecurity%3Fresume%3Dpassword-link",
    );
    expect(
      getAdminStepUpUrl("https://example.com/account", "password-link"),
    ).toBe("/login/mfa?reason=password-link&redirectTo=%2Fdashboard");
  });
});

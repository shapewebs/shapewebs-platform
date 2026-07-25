import { describe, expect, it } from "vitest";

import { getPreviewCookiePolicy } from "../../apps/web/src/lib/preview-cookie";
import { buildPrivatePreviewPath } from "../../apps/web/src/lib/preview-path";
import { parsePreviewGrantToken } from "../../apps/web/src/lib/preview-request";

const previewToken = "a".repeat(43);

describe("private content preview security", () => {
  it("accepts exactly one bounded one-time token in the POST body", () => {
    expect(parsePreviewGrantToken(`token=${previewToken}`)).toBe(previewToken);

    for (const body of [
      "",
      `token=${previewToken}&token=${previewToken}`,
      `token=${previewToken}&redirect=https%3A%2F%2Fevil.example`,
      "token=short",
      `other=${previewToken}`,
    ]) {
      expect(parsePreviewGrantToken(body)).toBeNull();
    }
  });

  it("uses a secure host-only cookie in production", () => {
    expect(getPreviewCookiePolicy(true)).toEqual({
      attributes: {
        httpOnly: true,
        path: "/",
        sameSite: "lax",
        secure: true,
      },
      name: "__Host-sw-preview-token",
    });
    expect(getPreviewCookiePolicy(false).name).toBe("sw-preview-token");
  });

  it("maps only normalized internal content paths into the private namespace", () => {
    expect(buildPrivatePreviewPath("/")).toBe("/preview");
    expect(buildPrivatePreviewPath("/projects/secure-site")).toBe(
      "/preview/projects/secure-site",
    );
    expect(buildPrivatePreviewPath("/da-DK/blog/sikker-platform")).toBe(
      "/preview/da-DK/blog/sikker-platform",
    );

    for (const path of [
      "",
      "projects/site",
      "//evil.example/path",
      "/../admin",
      "/projects\\evil",
      "/projects/site?next=https://evil.example",
      "/projects/site#fragment",
    ]) {
      expect(buildPrivatePreviewPath(path)).toBeNull();
    }
  });
});

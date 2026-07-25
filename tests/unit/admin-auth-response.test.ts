import { describe, expect, it } from "vitest";

import { hardenAuthResponse } from "../../apps/admin/src/lib/auth-response";

describe("administrative authentication response hardening", () => {
  it("clears browser-held authenticated state after successful sign-out", async () => {
    const response = hardenAuthResponse(
      new Request("https://admin.shapewebs.com/api/auth/sign-out", {
        method: "POST",
      }),
      Response.json(
        { success: true },
        {
          headers: { "Set-Cookie": "shapewebs.session_token=; Max-Age=0" },
        },
      ),
    );

    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("clear-site-data")).toBe(
      '"cache", "cookies", "storage"',
    );
    expect(response.headers.get("set-cookie")).toContain("Max-Age=0");
    await expect(response.json()).resolves.toEqual({ success: true });
  });

  it("does not add the destructive header to failures or other routes", () => {
    for (const [request, response] of [
      [
        new Request("https://admin.shapewebs.com/api/auth/sign-out", {
          method: "POST",
        }),
        Response.json({ error: "failed" }, { status: 401 }),
      ],
      [
        new Request("https://admin.shapewebs.com/api/auth/sign-in/social", {
          method: "POST",
        }),
        Response.json({ success: true }),
      ],
    ] as const) {
      expect(
        hardenAuthResponse(request, response).headers.get("clear-site-data"),
      ).toBeNull();
    }
  });
});

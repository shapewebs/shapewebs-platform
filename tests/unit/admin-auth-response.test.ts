import { describe, expect, it } from "vitest";

import { hardenAuthResponse } from "../../apps/admin/src/lib/auth-response";
import { readSignedSessionFromResponse } from "../../packages/auth/src/response-session";

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

  it("recovers a replacement session from Better Auth's signed response cookie", async () => {
    const response = Response.json(
      {
        token: "stale-session-token",
        user: { id: "admin-user" },
      },
      {
        headers: {
          "Set-Cookie":
            "shapewebs.session_token=replacement-token.signature; Path=/; HttpOnly; SameSite=Lax",
        },
      },
    );

    const session = await readSignedSessionFromResponse(response, (headers) => {
      expect(headers.get("cookie")).toBe(
        "shapewebs.session_token=replacement-token.signature",
      );

      return Promise.resolve({
        session: { id: "replacement-session", token: "replacement-token" },
        user: { id: "admin-user" },
      });
    });

    expect(session).toEqual({
      session: { id: "replacement-session", token: "replacement-token" },
      user: { id: "admin-user" },
    });
  });

  it("does not read a session from a failed response or missing cookie", async () => {
    let readCount = 0;
    const readSession = () => {
      readCount += 1;
      return Promise.resolve({ session: { id: "unexpected" } });
    };

    await expect(
      readSignedSessionFromResponse(
        Response.json({ error: "failed" }, { status: 401 }),
        readSession,
      ),
    ).resolves.toBeNull();
    await expect(
      readSignedSessionFromResponse(Response.json({ ok: true }), readSession),
    ).resolves.toBeNull();
    expect(readCount).toBe(0);
  });
});

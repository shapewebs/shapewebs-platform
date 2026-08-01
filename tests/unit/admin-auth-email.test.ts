import { afterEach, describe, expect, it, vi } from "vitest";

import { sendAdminAuthNotification } from "../../packages/email/src/admin-auth-delivery";
import {
  getAdminAuthActionUrl,
  renderAdminAuthEmailHtml,
} from "../../packages/email/src/admin-auth-template";

const baseInput = {
  adminBaseUrl: "https://admin.shapewebs.com",
  from: "Shapewebs <noreply@shapewebs.com>",
  idempotencyKey: "admin.password_reset/fixture",
  kind: "password_reset" as const,
  to: "employee@shapewebs.com",
  token: "admin-secret-token-with-special-%2F-characters",
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("administrative authentication email", () => {
  it("uses exact admin routes and safely encodes tokens", () => {
    expect(
      getAdminAuthActionUrl({ ...baseInput, kind: "email_verification" }),
    ).toContain("https://admin.shapewebs.com/api/auth/verify-email?token=");
    expect(getAdminAuthActionUrl(baseInput)).toContain(
      "/api/auth/reset-password/admin-secret-token-with-special-%252F-characters?callbackURL=",
    );
  });

  it("escapes the action URL before rendering HTML", () => {
    const html = renderAdminAuthEmailHtml({
      ...baseInput,
      token: 'token"><script>alert(1)</script>',
    });

    expect(html).not.toContain("<script>");
    expect(html).not.toContain('token">');
  });

  it("sends a no-cache idempotent Resend request", async () => {
    const fetchImplementation = vi.fn(async (_url, init) => {
      expect(init?.headers).toMatchObject({
        Authorization: "Bearer restricted-staging-key",
        "Content-Type": "application/json",
        "Idempotency-Key": baseInput.idempotencyKey,
      });
      expect(init?.cache).toBe("no-store");
      expect(JSON.parse(String(init?.body))).toMatchObject({
        from: baseInput.from,
        tags: [
          { name: "source", value: "shapewebs-account-auth" },
          { name: "kind", value: "password_reset" },
        ],
        to: [baseInput.to],
      });

      return Response.json({ id: "admin-email-fixture-id" });
    }) as typeof fetch;

    await expect(
      sendAdminAuthNotification("restricted-staging-key", baseInput, {
        fetchImplementation,
      }),
    ).resolves.toEqual({
      providerMessageId: "admin-email-fixture-id",
      status: "sent",
    });
  });

  it.each([
    [429, "retryable"],
    [503, "retryable"],
    [400, "permanent_failure"],
  ] as const)("classifies Resend HTTP %s as %s", async (status, expected) => {
    const fetchImplementation = vi.fn(async () =>
      Response.json({}, { status }),
    ) as typeof fetch;

    await expect(
      sendAdminAuthNotification("restricted-staging-key", baseInput, {
        fetchImplementation,
      }),
    ).resolves.toMatchObject({
      errorCode: `resend_http_${status}`,
      status: expected,
    });
  });
});

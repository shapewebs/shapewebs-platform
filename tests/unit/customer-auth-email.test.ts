import { afterEach, describe, expect, it, vi } from "vitest";

import { sendCustomerAuthNotification } from "../../packages/email/src/customer-auth-delivery";
import {
  getCustomerAuthActionUrl,
  renderCustomerAuthEmailHtml,
} from "../../packages/email/src/customer-auth-template";

const baseInput = {
  accountBaseUrl: "https://admin.shapewebs.com",
  from: "Shapewebs <noreply@shapewebs.com>",
  idempotencyKey: "customer.password_reset/fixture",
  kind: "password_reset" as const,
  to: "customer@example.test",
  token: "secret-token-with-special-%2F-characters",
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("customer authentication email", () => {
  it("uses exact account routes and encodes bearer tokens", () => {
    expect(getCustomerAuthActionUrl({ ...baseInput, kind: "invitation" })).toBe(
      "https://admin.shapewebs.com/invite/secret-token-with-special-%252F-characters",
    );
    expect(
      getCustomerAuthActionUrl({
        ...baseInput,
        kind: "email_verification",
      }),
    ).toBe(
      "https://admin.shapewebs.com/verify/secret-token-with-special-%252F-characters",
    );
    expect(getCustomerAuthActionUrl(baseInput)).toContain(
      "/api/auth/reset-password/secret-token-with-special-%252F-characters?callbackURL=",
    );
  });

  it("escapes the action URL before rendering HTML", () => {
    const html = renderCustomerAuthEmailHtml({
      ...baseInput,
      token: 'token\"><script>alert(1)</script>',
    });

    expect(html).not.toContain("<script>");
    expect(html).not.toContain('token\">');
  });

  it("sends a no-cache idempotent Resend request without logging secrets", async () => {
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

      return Response.json({ id: "email-fixture-id" });
    }) as typeof fetch;

    await expect(
      sendCustomerAuthNotification("restricted-staging-key", baseInput, {
        fetchImplementation,
      }),
    ).resolves.toEqual({
      providerMessageId: "email-fixture-id",
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
      sendCustomerAuthNotification("restricted-staging-key", baseInput, {
        fetchImplementation,
      }),
    ).resolves.toMatchObject({
      errorCode: `resend_http_${status}`,
      status: expected,
    });
  });
});

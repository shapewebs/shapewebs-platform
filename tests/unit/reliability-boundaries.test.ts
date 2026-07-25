import { describe, expect, it } from "vitest";

import { hasValidBearerSecret } from "../../apps/admin/src/lib/job-security";
import { getOutboxEnvironment } from "../../apps/admin/src/lib/outbox-environment";
import { getSyntheticRetentionEnvironment } from "../../apps/admin/src/lib/synthetic-retention-environment";
import { getClientIp } from "../../apps/web/src/lib/request-identity";
import {
  getExactStagingHttpsOrigin,
  isChecklyOutboxHeartbeatReady,
} from "../../monitoring/lib/environment";
import {
  escapeEmailHtml,
  renderLeadHtml,
  renderLeadText,
} from "../../packages/email/src/lead-template";
import { sendLeadNotification } from "../../packages/email/src/resend-delivery";
import {
  contactFormSchema,
  parseAdminEnv,
} from "../../packages/validation/src/index";
import { readBoundedText } from "../../packages/validation/src/http";

describe("reliability and provider boundaries", () => {
  it("trusts only the Vercel-owned forwarding header in production", () => {
    const headers = new Headers({
      "x-forwarded-for": "198.51.100.20",
      "x-real-ip": "198.51.100.21",
      "x-vercel-forwarded-for": "203.0.113.10, 203.0.113.11",
    });

    expect(getClientIp(headers, { NODE_ENV: "production", VERCEL: "1" })).toBe(
      "203.0.113.10",
    );
    expect(getClientIp(headers, { NODE_ENV: "production" })).toBe("unknown");
    expect(
      getClientIp(
        new Headers({
          "x-vercel-forwarded-for": "not-an-ip",
        }),
        { NODE_ENV: "production", VERCEL: "1" },
      ),
    ).toBe("unknown");
    expect(getClientIp(headers, { NODE_ENV: "development" })).toBe(
      "198.51.100.20",
    );
  });

  it("requires explicit lead privacy acknowledgement", () => {
    const input = {
      consentAccepted: false,
      email: "lead@example.com",
      localeCode: "en",
      message: "A sufficiently long message.",
      name: "Lead",
    };

    expect(contactFormSchema.safeParse(input).success).toBe(false);
    expect(
      contactFormSchema.safeParse({
        ...input,
        consentAccepted: true,
      }).success,
    ).toBe(true);
    expect(
      contactFormSchema.safeParse({
        ...input,
        administrator: true,
        consentAccepted: true,
      }).success,
    ).toBe(false);
  });

  it("compares cron bearer credentials without accepting partial matches", () => {
    const secret = "an-exact-secret-with-at-least-32-characters";

    expect(hasValidBearerSecret(`Bearer ${secret}`, secret)).toBe(true);
    expect(hasValidBearerSecret("Bearer partial", secret)).toBe(false);
    expect(hasValidBearerSecret(`Basic ${secret}`, secret)).toBe(false);
    expect(hasValidBearerSecret(null, secret)).toBe(false);
    expect(hasValidBearerSecret(`Bearer ${secret}`, undefined)).toBe(false);
    expect(hasValidBearerSecret("Bearer short", "short")).toBe(false);
  });

  it("fails the outbox configuration closed if one dependency is missing", () => {
    const completeEnvironment = {
      BETTER_AUTH_URL: "https://admin.shapewebs.com",
      DATABASE_URL: "postgresql://redacted",
      LEAD_NOTIFICATION_FROM_EMAIL: "website@example.com",
      LEAD_NOTIFICATION_TO_EMAIL: "owner@example.com",
      RESEND_API_KEY: "redacted",
      SHAPEWEBS_ORGANIZATION_ID: "f6214344-7525-42d0-83ac-210881b1b7b6",
    };

    expect(getOutboxEnvironment(completeEnvironment)).toEqual({
      adminBaseUrl: "https://admin.shapewebs.com",
      databaseUrl: "postgresql://redacted",
      from: "website@example.com",
      organizationId: "f6214344-7525-42d0-83ac-210881b1b7b6",
      resendApiKey: "redacted",
      to: "owner@example.com",
    });
    expect(
      getOutboxEnvironment({
        ...completeEnvironment,
        RESEND_API_KEY: undefined,
      }),
    ).toBeNull();
    expect(
      getOutboxEnvironment({
        ...completeEnvironment,
        BETTER_AUTH_URL: "http://admin.shapewebs.com",
        NODE_ENV: "production",
      }),
    ).toBeNull();
  });

  it("accepts one notification sender mailbox without allowing header injection", () => {
    expect(
      parseAdminEnv({
        LEAD_NOTIFICATION_FROM_EMAIL: "Shapewebs <website@shapewebs.com>",
        LEAD_NOTIFICATION_TO_EMAIL: "owner@example.com",
      }),
    ).toMatchObject({
      LEAD_NOTIFICATION_FROM_EMAIL: "Shapewebs <website@shapewebs.com>",
      LEAD_NOTIFICATION_TO_EMAIL: "owner@example.com",
    });
    expect(
      parseAdminEnv({
        LEAD_NOTIFICATION_FROM_EMAIL: "website@shapewebs.com",
      }),
    ).toMatchObject({
      LEAD_NOTIFICATION_FROM_EMAIL: "website@shapewebs.com",
    });

    for (const sender of [
      "Shapewebs <not-an-email>",
      "Shapewebs <website@shapewebs.com>\r\nBcc: attacker@example.com",
    ]) {
      expect(() =>
        parseAdminEnv({
          LEAD_NOTIFICATION_FROM_EMAIL: sender,
        }),
      ).toThrow();
    }
  });

  it("enables synthetic retention only for the exact protected preview origin", () => {
    const completeEnvironment = {
      BETTER_AUTH_URL: "https://admin-staging.shapewebs.com",
      DATABASE_URL: "postgresql://redacted",
      SHAPEWEBS_ORGANIZATION_ID: "f6214344-7525-42d0-83ac-210881b1b7b6",
      SYNTHETIC_RETENTION_SECRET:
        "a-dedicated-retention-secret-with-sufficient-length",
      VERCEL_ENV: "preview",
    };

    expect(
      getSyntheticRetentionEnvironment(
        "https://admin-staging.shapewebs.com/api/jobs/synthetic-retention",
        completeEnvironment,
      ),
    ).toEqual({
      databaseUrl: "postgresql://redacted",
      organizationId: "f6214344-7525-42d0-83ac-210881b1b7b6",
      secret: "a-dedicated-retention-secret-with-sufficient-length",
    });

    for (const environment of [
      { ...completeEnvironment, VERCEL_ENV: "production" },
      { ...completeEnvironment, SYNTHETIC_RETENTION_SECRET: "short" },
      {
        ...completeEnvironment,
        BETTER_AUTH_URL: "https://admin.shapewebs.com",
      },
    ]) {
      expect(
        getSyntheticRetentionEnvironment(
          "https://admin-staging.shapewebs.com/api/jobs/synthetic-retention",
          environment,
        ),
      ).toBeNull();
    }
  });

  it("always defines staging monitors with exact HTTPS origins", () => {
    expect(
      getExactStagingHttpsOrigin("CHECKLY_STAGING_ADMIN_BASE_URL", {}).origin,
    ).toBe("https://admin-staging.shapewebs.com");
    expect(
      getExactStagingHttpsOrigin("CHECKLY_STAGING_WEB_BASE_URL", {}).origin,
    ).toBe("https://staging.shapewebs.com");
    expect(
      getExactStagingHttpsOrigin("CHECKLY_STAGING_ADMIN_BASE_URL", {
        CHECKLY_STAGING_ADMIN_BASE_URL: "https://admin-staging.shapewebs.com",
      }).origin,
    ).toBe("https://admin-staging.shapewebs.com");

    for (const configuredUrl of [
      "http://admin-staging.shapewebs.com",
      "https://admin-staging.shapewebs.com/path",
      "https://user:password@admin-staging.shapewebs.com",
    ]) {
      expect(() =>
        getExactStagingHttpsOrigin("CHECKLY_STAGING_ADMIN_BASE_URL", {
          CHECKLY_STAGING_ADMIN_BASE_URL: configuredUrl,
        }),
      ).toThrow(
        "CHECKLY_STAGING_ADMIN_BASE_URL must be one exact HTTPS origin.",
      );
    }
  });

  it("keeps the outbox heartbeat inactive until explicitly ready", () => {
    expect(isChecklyOutboxHeartbeatReady({})).toBe(false);
    expect(
      isChecklyOutboxHeartbeatReady({
        CHECKLY_OUTBOX_HEARTBEAT_READY: "false",
      }),
    ).toBe(false);
    expect(
      isChecklyOutboxHeartbeatReady({
        CHECKLY_OUTBOX_HEARTBEAT_READY: "true",
      }),
    ).toBe(true);
    expect(() =>
      isChecklyOutboxHeartbeatReady({
        CHECKLY_OUTBOX_HEARTBEAT_READY: "yes",
      }),
    ).toThrow("CHECKLY_OUTBOX_HEARTBEAT_READY must be true, false, or unset.");
  });

  it("rejects request bodies declared or streamed beyond the byte limit", async () => {
    const declaredOversize = new Request("https://example.com/webhook", {
      body: "{}",
      headers: {
        "Content-Length": "100",
      },
      method: "POST",
    });
    const streamedOversize = new Request("https://example.com/webhook", {
      body: "12345",
      method: "POST",
    });

    await expect(readBoundedText(declaredOversize, 4)).resolves.toEqual({
      status: "too_large",
    });
    await expect(readBoundedText(streamedOversize, 4)).resolves.toEqual({
      status: "too_large",
    });
  });

  it("returns bounded bodies exactly and handles an empty body", async () => {
    await expect(
      readBoundedText(
        new Request("https://example.com/webhook", {
          body: '{"safe":true}',
          method: "POST",
        }),
        64,
      ),
    ).resolves.toEqual({
      status: "ok",
      value: '{"safe":true}',
    });
    await expect(
      readBoundedText(new Request("https://example.com/webhook"), 64),
    ).resolves.toEqual({
      status: "ok",
      value: "",
    });
  });

  it("escapes all editor-controlled fields in lead notifications", () => {
    const html = renderLeadHtml({
      adminBaseUrl: "https://admin.shapewebs.com",
      email: `owner@example.com"><script>alert(1)</script>`,
      kind: "project_inquiry",
      leadId: "f6214344-7525-42d0-83ac-210881b1b7b6",
      name: "A&B",
    });

    expect(escapeEmailHtml(`<>&"'`)).toBe("&lt;&gt;&amp;&quot;&#039;");
    expect(html).not.toContain("<script>");
    expect(html).toContain("A&amp;B");
    expect(html).toContain("Open the protected submission");
    expect(
      renderLeadText({
        adminBaseUrl: "https://admin.shapewebs.com",
        email: "owner@example.com",
        kind: "contact",
        leadId: "f6214344-7525-42d0-83ac-210881b1b7b6",
        name: "Owner",
      }),
    ).toContain(
      "https://admin.shapewebs.com/submissions?lead=f6214344-7525-42d0-83ac-210881b1b7b6",
    );
  });

  it("sends a lead with provider and application idempotency", async () => {
    let capturedHeaders: Headers | undefined;
    let capturedPayload: Record<string, unknown> | undefined;
    const fetchImplementation: typeof fetch = async (_input, init) => {
      capturedHeaders = new Headers(init?.headers);
      capturedPayload = JSON.parse(String(init?.body)) as Record<
        string,
        unknown
      >;
      return Response.json({ id: "provider-message-1" });
    };

    await expect(
      sendLeadNotification(
        "provider-secret",
        {
          adminBaseUrl: "https://admin.shapewebs.com",
          email: "lead@example.com",
          from: "website@shapewebs.com",
          idempotencyKey: "lead.notification/test-command",
          kind: "contact",
          leadId: "f6214344-7525-42d0-83ac-210881b1b7b6",
          name: "Test Lead",
          replyTo: "lead@example.com",
          to: "owner@shapewebs.com",
        },
        { fetchImplementation },
      ),
    ).resolves.toEqual({
      providerMessageId: "provider-message-1",
      status: "sent",
    });

    expect(capturedHeaders?.get("Idempotency-Key")).toBe(
      "lead.notification/test-command",
    );
    expect(capturedPayload?.text).toContain(
      "https://admin.shapewebs.com/submissions?lead=",
    );
    expect(capturedPayload?.html).not.toContain("Safe test message");
  });

  it.each([
    [400, "permanent_failure"],
    [429, "retryable"],
    [503, "retryable"],
  ] as const)(
    "classifies Resend HTTP %s as %s without leaking the response",
    async (status, expectedStatus) => {
      const result = await sendLeadNotification(
        "provider-secret",
        {
          adminBaseUrl: "https://admin.shapewebs.com",
          email: "lead@example.com",
          from: "website@shapewebs.com",
          idempotencyKey: "lead.notification/test-command",
          kind: "contact",
          leadId: "f6214344-7525-42d0-83ac-210881b1b7b6",
          name: "Test Lead",
          replyTo: "lead@example.com",
          to: "owner@shapewebs.com",
        },
        {
          fetchImplementation: async () =>
            new Response("provider detail must not escape", { status }),
        },
      );

      expect(result).toEqual({
        errorCode: `resend_http_${status}`,
        status: expectedStatus,
      });
    },
  );

  it("keeps malformed and failed provider calls retryable", async () => {
    const input = {
      adminBaseUrl: "https://admin.shapewebs.com",
      email: "lead@example.com",
      from: "website@shapewebs.com",
      idempotencyKey: "lead.notification/test-command",
      kind: "contact" as const,
      leadId: "f6214344-7525-42d0-83ac-210881b1b7b6",
      name: "Test Lead",
      replyTo: "lead@example.com",
      to: "owner@shapewebs.com",
    };

    await expect(
      sendLeadNotification("provider-secret", input, {
        fetchImplementation: async () => Response.json({}),
      }),
    ).resolves.toEqual({
      errorCode: "resend_invalid_response",
      status: "retryable",
    });
    await expect(
      sendLeadNotification("provider-secret", input, {
        fetchImplementation: async () => {
          throw new Error("provider unavailable");
        },
      }),
    ).resolves.toEqual({
      errorCode: "resend_network_error",
      status: "retryable",
    });
  });
});

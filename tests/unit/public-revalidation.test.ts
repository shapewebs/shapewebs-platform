import { describe, expect, it, vi } from "vitest";

import { triggerPublicContentRevalidation } from "../../apps/admin/src/lib/public-revalidation";

const documentId = "0f924f64-e69f-4274-8a82-273c18a6b649";
const revalidationSecret = "r".repeat(64);

function buildEnvironment(
  overrides: NodeJS.ProcessEnv = {},
): NodeJS.ProcessEnv {
  return {
    NEXT_PUBLIC_SITE_URL: "https://staging.shapewebs.com",
    NODE_ENV: "production",
    REVALIDATION_WEBHOOK_SECRET: revalidationSecret,
    ...overrides,
  };
}

describe("public content revalidation", () => {
  it("forwards the short-lived Vercel identity and app secret to one exact endpoint", async () => {
    const fetchImplementation = vi.fn(
      async () => new Response(null, { status: 204 }),
    );

    await expect(
      triggerPublicContentRevalidation(
        {
          documentId,
          localeCode: "en",
          paths: ["/services", "/services", "/projects"],
          vercelOidcToken: "header.payload.signature",
        },
        {
          environment: buildEnvironment(),
          fetchImplementation: fetchImplementation as typeof fetch,
        },
      ),
    ).resolves.toBe(true);

    expect(fetchImplementation).toHaveBeenCalledTimes(2);

    const [endpoint, request] = fetchImplementation.mock.calls[0] ?? [];
    const requestHeaders = request?.headers as Record<string, string>;

    expect(endpoint?.toString()).toBe(
      "https://staging.shapewebs.com/api/revalidate",
    );
    expect(request).toMatchObject({
      cache: "no-store",
      method: "POST",
      redirect: "error",
    });
    expect(requestHeaders).toMatchObject({
      Accept: "application/json",
      "Content-Type": "application/json",
      "x-shapewebs-revalidate-secret": revalidationSecret,
      "x-vercel-trusted-oidc-idp-token": "header.payload.signature",
    });
    expect(JSON.parse(String(request?.body))).toEqual({
      contentType: "page",
      documentId,
      localeCode: "en",
      path: "/services",
    });
  });

  it("does not invent a Vercel identity for an unprotected local request", async () => {
    const fetchImplementation = vi.fn(
      async () => new Response(null, { status: 200 }),
    );

    await expect(
      triggerPublicContentRevalidation(
        {
          documentId,
          localeCode: "da-DK",
          paths: ["/da-DK/services"],
        },
        {
          environment: buildEnvironment({
            NEXT_PUBLIC_SITE_URL: undefined,
            NODE_ENV: "development",
          }),
          fetchImplementation: fetchImplementation as typeof fetch,
        },
      ),
    ).resolves.toBe(true);

    const [endpoint, request] = fetchImplementation.mock.calls[0] ?? [];
    expect(endpoint?.toString()).toBe("http://localhost:3000/api/revalidate");
    expect(request?.headers).not.toHaveProperty(
      "x-vercel-trusted-oidc-idp-token",
    );
  });

  it("accepts a bounded published Sanity ID and preserves the post content type", async () => {
    const fetchImplementation = vi.fn(
      async () => new Response(null, { status: 204 }),
    );

    await expect(
      triggerPublicContentRevalidation(
        {
          contentType: "post",
          documentId: "blog-post-7f53cf47-1234-4abc-9234-667d9c48f001",
          localeCode: "en",
          paths: ["/blog/provider-assurance"],
        },
        {
          environment: buildEnvironment(),
          fetchImplementation: fetchImplementation as typeof fetch,
        },
      ),
    ).resolves.toBe(true);

    const request = fetchImplementation.mock.calls[0]?.[1];
    expect(JSON.parse(String(request?.body))).toMatchObject({
      contentType: "post",
      documentId: "blog-post-7f53cf47-1234-4abc-9234-667d9c48f001",
    });
  });

  it("fails closed for missing, malformed, or insecure configuration", async () => {
    const fetchImplementation = vi.fn(
      async () => new Response(null, { status: 200 }),
    );
    const input = {
      documentId,
      localeCode: "en",
      paths: ["/services"],
    };

    for (const environment of [
      buildEnvironment({ REVALIDATION_WEBHOOK_SECRET: undefined }),
      buildEnvironment({ REVALIDATION_WEBHOOK_SECRET: "short" }),
      buildEnvironment({ NEXT_PUBLIC_SITE_URL: undefined }),
      buildEnvironment({ NEXT_PUBLIC_SITE_URL: "not-a-url" }),
      buildEnvironment({ NEXT_PUBLIC_SITE_URL: "http://shapewebs.com" }),
      buildEnvironment({
        NEXT_PUBLIC_SITE_URL: "https://user:password@shapewebs.com",
      }),
      buildEnvironment({ NEXT_PUBLIC_SITE_URL: "https://shapewebs.com/path" }),
      buildEnvironment({
        NEXT_PUBLIC_SITE_URL: "http://example.test",
        NODE_ENV: "development",
      }),
    ]) {
      await expect(
        triggerPublicContentRevalidation(input, {
          environment,
          fetchImplementation: fetchImplementation as typeof fetch,
        }),
      ).resolves.toBe(false);
    }

    expect(fetchImplementation).not.toHaveBeenCalled();
  });

  it("rejects invalid commands and unsafe identity headers before sending", async () => {
    const fetchImplementation = vi.fn(
      async () => new Response(null, { status: 200 }),
    );
    const invalidInputs = [
      {
        documentId,
        localeCode: "en",
        paths: [],
      },
      {
        documentId: "drafts.not-a-public-id",
        localeCode: "en",
        paths: ["/services"],
      },
      {
        documentId,
        localeCode: "en",
        paths: ["https://evil.example/path"],
      },
      {
        documentId,
        localeCode: "en",
        paths: ["/services"],
        vercelOidcToken: "",
      },
      {
        documentId,
        localeCode: "en",
        paths: ["/services"],
        vercelOidcToken: "token\r\ninjected",
      },
      {
        documentId,
        localeCode: "en",
        paths: ["/services"],
        vercelOidcToken: "x".repeat(16_385),
      },
    ];

    for (const input of invalidInputs) {
      await expect(
        triggerPublicContentRevalidation(input, {
          environment: buildEnvironment(),
          fetchImplementation: fetchImplementation as typeof fetch,
        }),
      ).resolves.toBe(false);
    }

    expect(fetchImplementation).not.toHaveBeenCalled();
  });

  it("reports provider rejection and transport failure without throwing", async () => {
    const rejectedFetch = vi.fn(
      async () => new Response(null, { status: 401 }),
    );
    const failedFetch = vi.fn(async () => {
      throw new Error("network unavailable");
    });
    const input = {
      documentId,
      localeCode: "en",
      paths: ["/services"],
      vercelOidcToken: "header.payload.signature",
    };

    await expect(
      triggerPublicContentRevalidation(input, {
        environment: buildEnvironment(),
        fetchImplementation: rejectedFetch as typeof fetch,
      }),
    ).resolves.toBe(false);
    await expect(
      triggerPublicContentRevalidation(input, {
        environment: buildEnvironment(),
        fetchImplementation: failedFetch as typeof fetch,
      }),
    ).resolves.toBe(false);
  });
});

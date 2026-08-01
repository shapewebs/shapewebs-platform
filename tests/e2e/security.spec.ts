import { expect, test } from "@playwright/test";

const adminOrigin = "http://127.0.0.1:3101";

test("public responses expose the required production security policy", async ({
  request,
}) => {
  const response = await request.get("/");
  const headers = response.headers();
  const csp = headers["content-security-policy"];

  expect(response.status()).toBe(200);
  expect(headers["x-powered-by"]).toBeUndefined();
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["x-frame-options"]).toBe("DENY");
  expect(headers["strict-transport-security"]).toContain("includeSubDomains");
  expect(headers["cache-control"]).toContain("s-maxage");
  expect(csp).toContain("default-src 'self'");
  expect(csp).toContain("base-uri 'none'");
  expect(csp).toContain("frame-ancestors 'none'");
  expect(csp).not.toContain("'unsafe-eval'");
});

test("private preview routes are non-indexable and never shared-cacheable", async ({
  request,
}) => {
  const response = await request.get("/preview");
  const headers = response.headers();

  expect(response.status()).toBe(404);
  expect(headers["cache-control"]).toContain("no-store");
  expect(headers["x-robots-tag"]).toBe("noindex, nofollow, noarchive");
});

test("exiting private preview clears the session without a cacheable redirect", async ({
  request,
}) => {
  const response = await request.post("/api/preview/exit", {
    maxRedirects: 0,
  });
  const headers = response.headers();

  expect(response.status()).toBe(303);
  expect(headers["cache-control"]).toBe("private, no-store");
  expect(headers.location).toBe("http://127.0.0.1:3100/");
  expect(headers["set-cookie"]).toContain("sw-preview-token=");
  expect(headers["set-cookie"]).toContain("Max-Age=0");
});

test("admin API responses deny browser rendering contexts", async ({
  request,
}) => {
  const response = await request.get(`${adminOrigin}/api/health/live`);
  const headers = response.headers();
  const csp = headers["content-security-policy"];

  expect(response.status()).toBe(200);
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(csp).toContain("default-src 'none'");
  expect(csp).toContain("base-uri 'none'");
  expect(csp).toContain("frame-ancestors 'none'");
});

test("admin entry and metadata misses keep hardened minimal responses", async ({
  request,
}) => {
  const entryResponse = await request.get(`${adminOrigin}/`, {
    maxRedirects: 0,
  });

  expect(entryResponse.status()).toBe(307);
  expect(entryResponse.headers().location).toBe("/login");
  expect(entryResponse.headers()["cache-control"]).toBe("no-store");
  expect((await entryResponse.body()).byteLength).toBeLessThanOrEqual(256);

  for (const path of ["/robots.txt", "/sitemap.xml"]) {
    const response = await request.get(`${adminOrigin}${path}`);
    const headers = response.headers();

    expect(response.status()).toBe(404);
    expect(headers["cache-control"]).toContain("no-store");
    expect(headers["content-security-policy"]).toContain(
      "frame-ancestors 'none'",
    );
    expect(headers["x-robots-tag"]).toBe("noindex, nofollow");
  }
});

test("placeholder inventory route returns a real 404", async ({ request }) => {
  const response = await request.get("/readme");

  expect(response.status()).toBe(404);
});

test("admin routes fail closed when authentication is unconfigured", async ({
  request,
}) => {
  const response = await request.get(`${adminOrigin}/dashboard`);
  const headers = response.headers();

  expect(response.status()).toBe(503);
  expect(headers["cache-control"]).toBe("no-store");
  expect(headers["x-robots-tag"]).toBe("noindex, nofollow");
});

test("customer workspace fails closed through the unified portal", async ({
  request,
}) => {
  const response = await request.get(`${adminOrigin}/customer`);
  const headers = response.headers();

  expect(response.status()).toBe(503);
  expect(headers["cache-control"]).toBe("no-store");
  expect(headers["x-robots-tag"]).toBe("noindex, nofollow");
  expect(headers["content-security-policy"]).toContain("'strict-dynamic'");
  expect(
    headers["content-security-policy"].match(/script-src [^;]+/)?.[0],
  ).not.toContain("'unsafe-inline'");
});

test("admin readiness and mutation APIs fail closed without authentication configuration", async ({
  request,
}) => {
  const readinessResponse = await request.get(
    `${adminOrigin}/api/health/ready`,
  );

  expect(readinessResponse.status()).toBe(503);
  expect(readinessResponse.headers()["cache-control"]).toBe("no-store");
  await expect(readinessResponse.json()).resolves.toEqual({
    status: "unavailable",
  });

  const stepUpResponse = await request.post(
    `${adminOrigin}/api/admin/step-up`,
    {
      data: { code: "000000" },
      headers: {
        Origin: adminOrigin,
      },
    },
  );

  expect(stepUpResponse.status()).toBe(503);
  expect(stepUpResponse.headers()["cache-control"]).toBe("no-store");
  await expect(stepUpResponse.json()).resolves.toEqual({
    error: "authentication_unavailable",
  });

  const revocationResponse = await request.delete(
    `${adminOrigin}/api/admin/sessions/stagingprobe01`,
    {
      headers: {
        Origin: adminOrigin,
      },
    },
  );

  expect(revocationResponse.status()).toBe(503);
  expect(revocationResponse.headers()["cache-control"]).toBe("no-store");
  await expect(revocationResponse.json()).resolves.toEqual({
    error: "authentication_unavailable",
  });
});

test("form endpoints reject malformed payloads and missing production controls", async ({
  request,
}) => {
  const invalidResponse = await request.post("/api/forms/contact", {
    data: { broken: true },
  });

  expect(invalidResponse.status()).toBe(400);

  const unavailableResponse = await request.post("/api/forms/contact", {
    data: {
      company: "Shapewebs",
      consentAccepted: true,
      email: "test@example.com",
      localeCode: "en",
      message: "Local automated fail-closed verification.",
      name: "Automated Test",
    },
    headers: {
      "Idempotency-Key": "f6214344-7525-42d0-83ac-210881b1b7b6",
    },
  });

  expect(unavailableResponse.status()).toBe(503);
});

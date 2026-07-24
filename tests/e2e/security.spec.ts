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
  expect(csp).toContain("frame-ancestors 'none'");
  expect(csp).not.toContain("'unsafe-eval'");
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
  });

  expect(unavailableResponse.status()).toBe(503);
});

import { ApiCheck, AssertionBuilder, Frequency } from "checkly/constructs";

function getStagingAdminBaseUrl(): URL | null {
  const configuredUrl = process.env.CHECKLY_STAGING_ADMIN_BASE_URL;

  if (!configuredUrl) {
    return null;
  }

  const baseUrl = new URL(configuredUrl);

  if (
    baseUrl.protocol !== "https:" ||
    baseUrl.origin !== configuredUrl ||
    baseUrl.username ||
    baseUrl.password
  ) {
    throw new Error(
      "CHECKLY_STAGING_ADMIN_BASE_URL must be one exact HTTPS origin.",
    );
  }

  return baseUrl;
}

const stagingAdminBaseUrl = getStagingAdminBaseUrl();

if (stagingAdminBaseUrl) {
  new ApiCheck("staging-synthetic-retention", {
    name: "Staging synthetic lead retention",
    activated: true,
    frequency: Frequency.EVERY_24H,
    locations: ["eu-west-1"],
    maxResponseTime: 10_000,
    request: {
      assertions: [
        AssertionBuilder.statusCode().equals(200),
        AssertionBuilder.jsonBody("$.status").equals("completed"),
        AssertionBuilder.responseTime().lessThan(10_000),
      ],
      headers: [
        {
          key: "Authorization",
          value: "Bearer {{SHAPEWEBS_STAGING_RETENTION_SECRET}}",
        },
        {
          key: "x-vercel-protection-bypass",
          value: "{{SHAPEWEBS_STAGING_BYPASS_SECRET}}",
        },
      ],
      method: "POST",
      url: new URL(
        "/api/jobs/synthetic-retention",
        stagingAdminBaseUrl,
      ).toString(),
    },
    tags: ["retention", "staging", "synthetic"],
  });
}

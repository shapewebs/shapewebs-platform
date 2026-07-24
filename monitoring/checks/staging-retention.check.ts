import { ApiCheck, AssertionBuilder, Frequency } from "checkly/constructs";

import { getOptionalExactHttpsOrigin } from "../lib/environment";

const stagingAdminBaseUrl = getOptionalExactHttpsOrigin(
  "CHECKLY_STAGING_ADMIN_BASE_URL",
);

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
          value: "{{SHAPEWEBS_STAGING_ADMIN_BYPASS_SECRET}}",
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

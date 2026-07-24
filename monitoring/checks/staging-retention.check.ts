import { ApiCheck, AssertionBuilder, Frequency } from "checkly/constructs";

import { operationalEmailAlerts } from "../lib/alert-channels";
import {
  getExactStagingHttpsOrigin,
  isChecklyCheckActivated,
} from "../lib/environment";

const stagingAdminBaseUrl = getExactStagingHttpsOrigin(
  "CHECKLY_STAGING_ADMIN_BASE_URL",
);

const checkId = "staging-synthetic-retention";

new ApiCheck(checkId, {
  name: "Staging synthetic lead retention",
  activated: isChecklyCheckActivated(checkId),
  alertChannels: [operationalEmailAlerts],
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

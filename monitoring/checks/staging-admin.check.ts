import { ApiCheck, AssertionBuilder, Frequency } from "checkly/constructs";

import { operationalEmailAlerts } from "../lib/alert-channels";
import {
  getOptionalExactHttpsOrigin,
  isChecklyCheckActivated,
} from "../lib/environment";

const stagingAdminBaseUrl = getOptionalExactHttpsOrigin(
  "CHECKLY_STAGING_ADMIN_BASE_URL",
);

if (stagingAdminBaseUrl) {
  const checkId = "staging-admin-readiness";

  new ApiCheck(checkId, {
    name: "Staging admin readiness",
    activated: isChecklyCheckActivated(checkId),
    alertChannels: [operationalEmailAlerts],
    frequency: Frequency.EVERY_2M,
    locations: ["eu-west-1"],
    degradedResponseTime: 1_500,
    maxResponseTime: 2_500,
    request: {
      assertions: [
        AssertionBuilder.statusCode().equals(200),
        AssertionBuilder.jsonBody("$.status").equals("ready"),
        AssertionBuilder.responseTime().lessThan(2_500),
      ],
      headers: [
        {
          key: "x-vercel-protection-bypass",
          value: "{{SHAPEWEBS_STAGING_ADMIN_BYPASS_SECRET}}",
        },
      ],
      method: "GET",
      url: new URL("/api/health/ready", stagingAdminBaseUrl).toString(),
    },
    tags: ["admin", "readiness", "staging"],
  });
}

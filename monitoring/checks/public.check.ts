import { ApiCheck, AssertionBuilder, Frequency } from "checkly/constructs";

import { operationalEmailAlerts } from "../lib/alert-channels";
import { isChecklyCheckActivated } from "../lib/environment";

function getPublicBaseUrl(): URL {
  const configuredUrl =
    process.env.CHECKLY_WEB_BASE_URL ?? "https://shapewebs.com";
  const baseUrl = new URL(configuredUrl);

  if (
    baseUrl.protocol !== "https:" ||
    baseUrl.origin !== configuredUrl ||
    baseUrl.username ||
    baseUrl.password ||
    baseUrl.search ||
    baseUrl.hash
  ) {
    throw new Error(
      "CHECKLY_WEB_BASE_URL must be an HTTPS origin without credentials, a query, or a fragment.",
    );
  }

  return baseUrl;
}

const publicBaseUrl = getPublicBaseUrl();
const publicHomeCheckId = "public-home-availability";
const publicReadinessCheckId = "public-readiness";

new ApiCheck(publicHomeCheckId, {
  name: "Public home availability",
  activated: isChecklyCheckActivated(publicHomeCheckId),
  alertChannels: [operationalEmailAlerts],
  frequency: Frequency.EVERY_2M,
  locations: ["eu-west-1"],
  degradedResponseTime: 1_500,
  maxResponseTime: 2_500,
  request: {
    method: "GET",
    url: new URL("/", publicBaseUrl).toString(),
    assertions: [
      AssertionBuilder.statusCode().equals(200),
      AssertionBuilder.responseTime().lessThan(2_500),
    ],
  },
  tags: ["availability", "production", "public"],
});

new ApiCheck(publicReadinessCheckId, {
  name: "Public database readiness",
  activated: isChecklyCheckActivated(publicReadinessCheckId),
  alertChannels: [operationalEmailAlerts],
  frequency: Frequency.EVERY_2M,
  locations: ["eu-west-1"],
  degradedResponseTime: 1_500,
  maxResponseTime: 2_500,
  request: {
    method: "GET",
    url: new URL("/api/health/ready", publicBaseUrl).toString(),
    assertions: [
      AssertionBuilder.statusCode().equals(200),
      AssertionBuilder.jsonBody("$.status").equals("ready"),
      AssertionBuilder.responseTime().lessThan(2_500),
    ],
  },
  tags: ["production", "readiness"],
});

import http from "k6/http";
import { check, sleep } from "k6";

function getStagingBaseUrl() {
  if (!__ENV.K6_TARGET_URL) {
    throw new Error("K6_TARGET_URL is required.");
  }

  const target = new URL(__ENV.K6_TARGET_URL);
  const allowedHosts = (__ENV.SHAPEWEBS_STAGING_HOSTS ?? "")
    .split(",")
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean);

  if (
    target.protocol !== "https:" ||
    target.username ||
    target.password ||
    target.search ||
    target.hash ||
    !allowedHosts.includes(target.hostname.toLowerCase())
  ) {
    throw new Error(
      "The k6 target must be an explicitly allowlisted HTTPS host.",
    );
  }

  return target;
}

const stagingBaseUrl = getStagingBaseUrl();

export const options = {
  scenarios: {
    publicSmoke: {
      executor: "shared-iterations",
      vus: 1,
      iterations: 3,
      maxDuration: "30s",
    },
  },
  thresholds: {
    checks: ["rate>0.99"],
    http_req_duration: ["p(95)<1500"],
    http_req_failed: ["rate<0.01"],
  },
};

export default function publicSmoke() {
  const home = http.get(new URL("/", stagingBaseUrl).toString(), {
    tags: { journey: "public-home" },
    timeout: "5s",
  });

  check(home, {
    "home returns 200": (response) => response.status === 200,
  });

  const readiness = http.get(
    new URL("/api/health/ready", stagingBaseUrl).toString(),
    {
      tags: { journey: "public-readiness" },
      timeout: "5s",
    },
  );

  check(readiness, {
    "readiness returns 200": (response) => response.status === 200,
    "readiness is sanitized": (response) =>
      response.json("status") === "ready" &&
      !response.body.includes("database") &&
      !response.body.includes("postgres"),
  });

  sleep(1);
}

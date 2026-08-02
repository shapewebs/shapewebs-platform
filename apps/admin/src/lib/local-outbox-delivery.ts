import "server-only";

import {
  createStructuredLogger,
  resolveShapewebsEnvironment,
} from "@shapewebs/observability";

type LocalOutboxEnvironment = Partial<
  Pick<NodeJS.ProcessEnv, "BETTER_AUTH_URL" | "CRON_SECRET" | "NODE_ENV">
>;

type LocalOutboxDeliveryConfig = {
  secret: string;
  targetUrl: string;
};

const logger = createStructuredLogger({
  deploymentId: process.env.VERCEL_DEPLOYMENT_ID,
  environment: resolveShapewebsEnvironment(),
  service: "shapewebs-admin",
});

const loopbackHostnames = new Set(["127.0.0.1", "[::1]", "localhost"]);

export function getLocalOutboxDeliveryConfig(
  environment: LocalOutboxEnvironment = process.env,
): LocalOutboxDeliveryConfig | null {
  if (
    environment.NODE_ENV !== "development" ||
    !environment.BETTER_AUTH_URL ||
    !environment.CRON_SECRET ||
    environment.CRON_SECRET.length < 32
  ) {
    return null;
  }

  let baseUrl: URL;
  try {
    baseUrl = new URL(environment.BETTER_AUTH_URL);
  } catch {
    return null;
  }

  if (
    baseUrl.protocol !== "http:" ||
    !loopbackHostnames.has(baseUrl.hostname) ||
    baseUrl.username ||
    baseUrl.password ||
    baseUrl.pathname !== "/" ||
    baseUrl.search ||
    baseUrl.hash
  ) {
    return null;
  }

  return {
    secret: environment.CRON_SECRET,
    targetUrl: new URL("/api/jobs/outbox", baseUrl).toString(),
  };
}

export function scheduleLocalOutboxDelivery(): void {
  const config = getLocalOutboxDeliveryConfig();
  if (!config) {
    return;
  }

  // Yield the current handler before calling the same local Next.js server.
  // This is development-only; deployed environments retain the durable scheduler.
  setTimeout(() => {
    void fetch(config.targetUrl, {
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${config.secret}`,
        "Content-Type": "application/json",
        "X-Request-ID": `local-outbox-${crypto.randomUUID()}`,
      },
      method: "POST",
      signal: AbortSignal.timeout(25_000),
    })
      .then((response) => {
        logger.log({
          eventCode: "shapewebs.outbox.local_trigger",
          level: response.ok ? "info" : "warn",
          metadata: {
            httpStatus: response.status,
          },
          result: response.ok ? "success" : "failure",
        });
      })
      .catch(() => {
        logger.log({
          eventCode: "shapewebs.outbox.local_trigger",
          level: "warn",
          metadata: {
            reasonCode: "worker_unreachable",
          },
          result: "failure",
        });
      });
  }, 0);
}

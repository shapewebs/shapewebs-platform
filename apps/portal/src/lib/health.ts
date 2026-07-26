import {
  createStructuredLogger,
  evaluateReadiness,
  resolveShapewebsEnvironment,
} from "@shapewebs/observability";

import { isPortalRuntimeReady } from "./auth-environment";

const logger = createStructuredLogger({
  deploymentId: process.env.VERCEL_DEPLOYMENT_ID,
  environment: resolveShapewebsEnvironment(),
  service: "shapewebs-portal",
});

export async function getPortalReadiness() {
  const startedAt = performance.now();
  const result = await evaluateReadiness([
    {
      name: "authentication",
      check: async () => {
        if (!isPortalRuntimeReady()) {
          throw new Error("Customer identity is unavailable.");
        }
      },
    },
  ]);

  logger.log({
    durationMs: Math.round(performance.now() - startedAt),
    eventCode: "shapewebs.health.readiness",
    level: result.ready ? "info" : "warn",
    result: result.ready ? "success" : "degraded",
  });

  return result;
}

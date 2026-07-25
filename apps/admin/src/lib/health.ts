import { pingDatabase } from "@shapewebs/database/server";
import {
  createStructuredLogger,
  evaluateReadiness,
  resolveShapewebsEnvironment,
} from "@shapewebs/observability";

import { hasAdminAuthConfig } from "./auth-environment";

const logger = createStructuredLogger({
  deploymentId: process.env.VERCEL_DEPLOYMENT_ID,
  environment: resolveShapewebsEnvironment(),
  service: "shapewebs-admin",
});

export async function getAdminReadiness() {
  const startedAt = performance.now();
  const databaseUrl = process.env.DATABASE_URL;
  const authenticationConfigured = hasAdminAuthConfig();
  const result = await evaluateReadiness([
    {
      name: "authentication",
      check: async () => {
        if (!authenticationConfigured) {
          throw new Error("Authentication is unavailable.");
        }
      },
    },
    ...(databaseUrl
      ? [
          {
            name: "database",
            check: () => pingDatabase(databaseUrl),
          } as const,
        ]
      : []),
  ]);

  logger.log({
    durationMs: Math.round(performance.now() - startedAt),
    eventCode: "shapewebs.health.readiness",
    level: result.ready ? "info" : "warn",
    result: result.ready ? "success" : "degraded",
  });

  return result;
}

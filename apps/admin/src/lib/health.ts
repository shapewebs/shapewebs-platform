import { pingDatabase } from "@shapewebs/database/server";
import {
  createStructuredLogger,
  evaluateReadiness,
  type ShapewebsEnvironment,
} from "@shapewebs/observability";

function getEnvironment(): ShapewebsEnvironment {
  if (process.env.NODE_ENV === "test") {
    return "test";
  }

  if (process.env.VERCEL_ENV === "production") {
    return "production";
  }

  if (process.env.VERCEL_ENV === "preview") {
    return "preview";
  }

  return "development";
}

const logger = createStructuredLogger({
  deploymentId: process.env.VERCEL_DEPLOYMENT_ID,
  environment: getEnvironment(),
  service: "shapewebs-admin",
});

export async function getAdminReadiness() {
  const startedAt = performance.now();
  const databaseUrl = process.env.DATABASE_URL;
  const result = await evaluateReadiness(
    databaseUrl
      ? [
          {
            name: "database",
            check: () => pingDatabase(databaseUrl),
          } as const,
        ]
      : [],
  );

  logger.log({
    durationMs: Math.round(performance.now() - startedAt),
    eventCode: "shapewebs.health.readiness",
    level: result.ready ? "info" : "warn",
    result: result.ready ? "success" : "degraded",
  });

  return result;
}

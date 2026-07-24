import { pingDatabase } from "@shapewebs/database/server";
import {
  createStructuredLogger,
  evaluateReadiness,
  resolveShapewebsEnvironment,
} from "@shapewebs/observability";

const logger = createStructuredLogger({
  deploymentId: process.env.VERCEL_DEPLOYMENT_ID,
  environment: resolveShapewebsEnvironment(),
  service: "shapewebs-web",
});

export async function getWebReadiness() {
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

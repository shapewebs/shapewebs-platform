import { pingDatabase } from "@shapewebs/database/server";
import { pingSanityContent } from "@shapewebs/content-platform/server";
import {
  createStructuredLogger,
  evaluateReadiness,
  resolveShapewebsEnvironment,
} from "@shapewebs/observability";

import { getWebSanityRuntime, hasWebSanityIntent } from "./sanity";

const logger = createStructuredLogger({
  deploymentId: process.env.VERCEL_DEPLOYMENT_ID,
  environment: resolveShapewebsEnvironment(),
  service: "shapewebs-web",
});

export async function getWebReadiness() {
  const startedAt = performance.now();
  const databaseUrl = process.env.DATABASE_URL;
  const sanityIntended = hasWebSanityIntent();
  const result = await evaluateReadiness([
    ...(databaseUrl
      ? [
          {
            name: "database",
            check: () => pingDatabase(databaseUrl),
          } as const,
        ]
      : []),
    ...(sanityIntended
      ? [
          {
            name: "content",
            check: async () => {
              const runtime = getWebSanityRuntime();

              if (!runtime) {
                throw new Error("Content is unavailable.");
              }

              await pingSanityContent(
                runtime.client,
                AbortSignal.timeout(3_000),
              );
            },
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

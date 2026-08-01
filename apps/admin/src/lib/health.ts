import { pingDatabase } from "@shapewebs/database/server";
import { pingSanityContent } from "@shapewebs/content-platform/server";
import {
  createStructuredLogger,
  evaluateReadiness,
  resolveShapewebsEnvironment,
} from "@shapewebs/observability";

import {
  hasAdminAuthConfig,
  hasUnifiedAccountPortalConfig,
} from "./auth-environment";
import { getAdminSanityRuntime, hasAdminSanityIntent } from "./sanity";

const logger = createStructuredLogger({
  deploymentId: process.env.VERCEL_DEPLOYMENT_ID,
  environment: resolveShapewebsEnvironment(),
  service: "shapewebs-admin",
});

export async function getAdminReadiness() {
  const startedAt = performance.now();
  const databaseUrl = process.env.DATABASE_URL;
  const customerDatabaseUrl = process.env.CUSTOMER_DATABASE_URL;
  const authenticationConfigured = hasAdminAuthConfig();
  const accountPortalConfigured = hasUnifiedAccountPortalConfig();
  const sanityIntended = hasAdminSanityIntent();
  const result = await evaluateReadiness([
    {
      name: "authentication",
      check: async () => {
        if (!authenticationConfigured) {
          throw new Error("Authentication is unavailable.");
        }
      },
    },
    {
      name: "account-portal",
      check: async () => {
        if (!accountPortalConfigured) {
          throw new Error("Account portal is unavailable.");
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
    ...(customerDatabaseUrl
      ? [
          {
            name: "customer-database",
            check: () => pingDatabase(customerDatabaseUrl),
          } as const,
        ]
      : []),
    ...(sanityIntended
      ? [
          {
            name: "content",
            check: async () => {
              const runtime = getAdminSanityRuntime();

              if (!runtime) {
                throw new Error("Content is unavailable.");
              }

              await pingSanityContent(
                runtime.draftClient,
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

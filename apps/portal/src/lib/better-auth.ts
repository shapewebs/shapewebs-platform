import "server-only";

import { createShapewebsCustomerAuth } from "@shapewebs/auth/server";
import {
  createStructuredLogger,
  resolveShapewebsEnvironment,
} from "@shapewebs/observability";

import {
  getPortalBaseUrl,
  isPortalRuntimeReady,
  splitPortalEnvironmentList,
} from "./auth-environment";

type PortalAuth = ReturnType<typeof createShapewebsCustomerAuth>;

let cachedAuth: PortalAuth | null | undefined;
const logger = createStructuredLogger({
  deploymentId: process.env.VERCEL_DEPLOYMENT_ID,
  environment: resolveShapewebsEnvironment(),
  service: "shapewebs-portal",
});

export function getPortalAuth(): PortalAuth | null {
  if (cachedAuth !== undefined) {
    return cachedAuth;
  }

  if (!isPortalRuntimeReady()) {
    cachedAuth = null;
    return cachedAuth;
  }

  const baseUrl = getPortalBaseUrl() as string;
  const trustedOrigins = new Set([
    baseUrl,
    ...splitPortalEnvironmentList(
      process.env.PORTAL_BETTER_AUTH_TRUSTED_ORIGINS,
    ),
  ]);

  cachedAuth = createShapewebsCustomerAuth({
    baseUrl,
    databaseUrl: process.env.PORTAL_DATABASE_URL as string,
    emailEncryptionSecret: process.env
      .PORTAL_AUTH_EMAIL_ENCRYPTION_SECRET as string,
    google: {
      clientId: process.env.PORTAL_GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.PORTAL_GOOGLE_CLIENT_SECRET as string,
    },
    onApiError: () => {
      logger.log({
        eventCode: "shapewebs.customer_auth.api_failure",
        level: "warn",
        result: "failure",
      });
    },
    organizationId: process.env.SHAPEWEBS_ORGANIZATION_ID as string,
    production: process.env.NODE_ENV === "production",
    secret: process.env.PORTAL_BETTER_AUTH_SECRET as string,
    trustedOrigins: [...trustedOrigins],
  });

  return cachedAuth;
}

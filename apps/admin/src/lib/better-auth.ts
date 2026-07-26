import "server-only";

import { createShapewebsAuth } from "@shapewebs/auth/server";
import {
  createStructuredLogger,
  resolveShapewebsEnvironment,
} from "@shapewebs/observability";

import { hasAdminAuthConfig, splitEnvironmentList } from "./auth-environment";

export {
  getAdminBaseUrl,
  getAdminDatabaseUrl,
  getAdminOrganizationId,
  hasAdminAuthConfig,
  isLocalAdminSetupMode,
  isTrustedAdminOrigin,
} from "./auth-environment";

type AdminAuth = ReturnType<typeof createShapewebsAuth>;

let cachedAuth: AdminAuth | null | undefined;
const logger = createStructuredLogger({
  deploymentId: process.env.VERCEL_DEPLOYMENT_ID,
  environment: resolveShapewebsEnvironment(),
  service: "shapewebs-admin",
});

export function getAdminAuth(): AdminAuth | null {
  if (cachedAuth !== undefined) {
    return cachedAuth;
  }

  if (!hasAdminAuthConfig()) {
    cachedAuth = null;
    return cachedAuth;
  }

  const baseUrl = process.env.BETTER_AUTH_URL as string;
  const trustedOrigins = new Set([
    baseUrl,
    ...splitEnvironmentList(process.env.BETTER_AUTH_TRUSTED_ORIGINS),
  ]);

  cachedAuth = createShapewebsAuth({
    baseUrl,
    databaseUrl: process.env.DATABASE_URL as string,
    editorEmails: splitEnvironmentList(process.env.ADMIN_EDITOR_EMAILS),
    emailEncryptionSecret: process.env
      .ADMIN_AUTH_EMAIL_ENCRYPTION_SECRET as string,
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    },
    organizationId: process.env.SHAPEWEBS_ORGANIZATION_ID as string,
    onApiError: () => {
      logger.log({
        eventCode: "shapewebs.auth.api_failure",
        level: "warn",
        result: "failure",
      });
    },
    ownerEmails: splitEnvironmentList(process.env.ADMIN_OWNER_EMAILS),
    production: process.env.NODE_ENV === "production",
    secret: process.env.BETTER_AUTH_SECRET as string,
    trustedOrigins: [...trustedOrigins],
  });

  return cachedAuth;
}

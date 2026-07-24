import { createHmac } from "node:crypto";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { AdminRole } from "@shapewebs/config";
import {
  appendAdminAuditEvent,
  appendSystemAuditEvent,
  authorizeAdminSession,
  type AdminAuthorizationContext,
} from "@shapewebs/database/server";
import {
  createStructuredLogger,
  resolveShapewebsEnvironment,
} from "@shapewebs/observability";

import {
  getAdminAuth,
  getAdminDatabaseUrl,
  getAdminOrganizationId,
  isLocalAdminSetupMode,
} from "./better-auth";
import { getSafeAdminRedirectTarget } from "./redirect";

type BetterAuthSession = NonNullable<
  Awaited<
    ReturnType<
      NonNullable<ReturnType<typeof getAdminAuth>>["api"]["getSession"]
    >
  >
>;

export type AdminRuntimeState = {
  authorization: AdminAuthorizationContext | null;
  primarySession: BetterAuthSession | null;
  session: AdminRuntimeSession | null;
  setupMode: boolean;
};

type AdminRuntimeSession = {
  aal: "aal1" | "aal2";
  nextAal: "aal2";
  profile: {
    authUserId: string;
    defaultLocale: "en";
    displayName: string;
    id: string;
    status: "active";
  };
  roles: AdminRole[];
  sessionId: string;
  userEmail: string;
  userId: string;
};

const logger = createStructuredLogger({
  deploymentId: process.env.VERCEL_DEPLOYMENT_ID,
  environment: resolveShapewebsEnvironment(),
  service: "shapewebs-admin",
});

async function recordAuthorizationDenial(
  runtime: AdminRuntimeState,
  reasonCode: string,
) {
  const databaseUrl = getAdminDatabaseUrl();
  const organizationId = getAdminOrganizationId();
  const requestHeaders = await headers();
  const requestId = requestHeaders.get("x-request-id") ?? undefined;
  const actorIdHash =
    runtime.primarySession && process.env.BETTER_AUTH_SECRET
      ? createHmac("sha256", process.env.BETTER_AUTH_SECRET)
          .update(runtime.primarySession.user.id)
          .digest("base64url")
          .slice(0, 22)
      : undefined;

  logger.log({
    actorIdHash,
    eventCode: "shapewebs.auth.authorization_denied",
    level: "warn",
    metadata: {
      reasonCode,
      resourceType: "admin_route",
    },
    requestId,
    result: "denied",
  });

  if (!databaseUrl || !organizationId || !runtime.primarySession) {
    return;
  }

  const auditWrite = runtime.authorization
    ? appendAdminAuditEvent(databaseUrl, {
        action: "auth.authorization_denied",
        organizationId,
        requestId,
        result: "denied",
        role: runtime.authorization.role,
        sessionId: runtime.primarySession.session.id,
        targetId: reasonCode,
        targetType: "admin_route",
        userId: runtime.primarySession.user.id,
      })
    : appendSystemAuditEvent(databaseUrl, {
        action: "auth.authorization_denied",
        organizationId,
        requestId,
        result: "denied",
        targetId: reasonCode,
        targetType: "admin_route",
      });

  await Promise.allSettled([auditWrite]);
}

function toAdminSessionContext(
  primarySession: BetterAuthSession,
  authorization: AdminAuthorizationContext,
): AdminRuntimeSession {
  return {
    aal: authorization.latestStepUpAt ? "aal2" : "aal1",
    nextAal: "aal2",
    profile: {
      authUserId: primarySession.user.id,
      defaultLocale: "en",
      displayName: primarySession.user.name,
      id: primarySession.user.id,
      status: "active",
    },
    roles: [authorization.role],
    sessionId: primarySession.session.id,
    userEmail: primarySession.user.email,
    userId: primarySession.user.id,
  };
}

async function getAdminRuntimeState(): Promise<AdminRuntimeState> {
  const requestHeaders = await headers();
  const setupMode = isLocalAdminSetupMode();

  if (setupMode) {
    return {
      authorization: null,
      primarySession: null,
      session: null,
      setupMode: true,
    };
  }

  const auth = getAdminAuth();
  const databaseUrl = getAdminDatabaseUrl();
  const organizationId = getAdminOrganizationId();

  if (!auth || !databaseUrl || !organizationId) {
    throw new Error(
      "Admin authentication is unavailable because its required configuration is missing.",
    );
  }

  const primarySession = await auth.api.getSession({
    headers: requestHeaders,
  });

  if (!primarySession) {
    return {
      authorization: null,
      primarySession: null,
      session: null,
      setupMode: false,
    };
  }

  const authorization = await authorizeAdminSession(databaseUrl, {
    organizationId,
    sessionId: primarySession.session.id,
    userId: primarySession.user.id,
  });

  return {
    authorization,
    primarySession,
    session:
      authorization === null
        ? null
        : toAdminSessionContext(primarySession, authorization),
    setupMode: false,
  };
}

export async function requireAdminSession(options?: {
  freshStepUpWithinSeconds?: number;
  redirectTo?: string;
  roles?: AdminRole[];
}) {
  const runtime = await getAdminRuntimeState();

  if (runtime.setupMode) {
    return runtime;
  }

  const redirectTo = getSafeAdminRedirectTarget(options?.redirectTo);
  const session = runtime.session;
  const authorization = runtime.authorization;

  if (!session || !authorization || !runtime.primarySession) {
    await recordAuthorizationDenial(runtime, "session_unavailable");
    redirect(`/login?redirectTo=${encodeURIComponent(redirectTo)}`);
  }

  if (
    !runtime.primarySession.user.twoFactorEnabled ||
    !authorization.latestStepUpAt
  ) {
    await recordAuthorizationDenial(runtime, "totp_step_up_required");
    redirect(`/login/mfa?redirectTo=${encodeURIComponent(redirectTo)}`);
  }

  if (options?.freshStepUpWithinSeconds) {
    const oldestAllowed = Date.now() - options.freshStepUpWithinSeconds * 1_000;

    if (authorization.latestStepUpAt.getTime() < oldestAllowed) {
      await recordAuthorizationDenial(runtime, "totp_step_up_stale");
      redirect(
        `/login/mfa?redirectTo=${encodeURIComponent(redirectTo)}&reason=step-up`,
      );
    }
  }

  if (options?.roles?.length) {
    const hasAnyRole = options.roles.some((role) =>
      session.roles.includes(role),
    );

    if (!hasAnyRole) {
      await recordAuthorizationDenial(runtime, "role_forbidden");
      redirect("/dashboard?error=forbidden");
    }
  }

  return runtime;
}

export async function requirePrimaryAdminSession(redirectTo = "/dashboard") {
  const runtime = await getAdminRuntimeState();

  if (runtime.setupMode) {
    return runtime;
  }

  if (!runtime.primarySession || !runtime.authorization) {
    await recordAuthorizationDenial(runtime, "primary_session_unavailable");
    redirect(
      `/login?redirectTo=${encodeURIComponent(getSafeAdminRedirectTarget(redirectTo))}`,
    );
  }

  return runtime;
}

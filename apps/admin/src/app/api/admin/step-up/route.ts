import { createHmac, randomUUID } from "node:crypto";

import {
  generateAdminSessionToken,
  serializeAdminSessionCookie,
  serializeAdminSessionDeletionCookie,
  verifyAdminTotpCode,
} from "@shapewebs/auth/server";
import {
  appendAdminAuditEvent,
  appendSystemAuditEvent,
  authorizeAdminSession,
  findAdminSessionByToken,
  rotateAdminSessionToken,
  setAdminSessionStepUp,
  type AdminAuthorizationContext,
} from "@shapewebs/database/server";
import {
  createStructuredLogger,
  resolveShapewebsEnvironment,
} from "@shapewebs/observability";
import { readBoundedText } from "@shapewebs/validation";

import {
  getAdminAuth,
  getAdminDatabaseUrl,
  getAdminOrganizationId,
  isTrustedAdminOrigin,
} from "@/lib/better-auth";
import { getAdminRuntimeState } from "@/lib/auth";

const maximumBodyBytes = 1_024;
const logger = createStructuredLogger({
  deploymentId: process.env.VERCEL_DEPLOYMENT_ID,
  environment: resolveShapewebsEnvironment(),
  service: "shapewebs-admin",
});

function isValidCode(value: unknown): value is string {
  return typeof value === "string" && /^\d{6}$/.test(value);
}

function jsonNoStore(
  body: { error: string } | { status: string },
  status = 200,
  setCookies: string[] = [],
) {
  const headers = new Headers({
    "Cache-Control": "no-store",
  });

  for (const cookie of setCookies) {
    headers.append("Set-Cookie", cookie);
  }

  return Response.json(body, {
    headers,
    status,
  });
}

function readSetCookies(headers: Headers): string[] {
  const headersWithCookies = headers as Headers & {
    getSetCookie?: () => string[];
  };
  const setCookies = headersWithCookies.getSetCookie?.();

  if (setCookies) {
    return setCookies;
  }

  const combinedCookie = headers.get("set-cookie");

  return combinedCookie ? [combinedCookie] : [];
}

function withoutSessionCookie(setCookies: string[]): string[] {
  return setCookies.filter((cookie) => !cookie.includes(".session_token="));
}

async function readVerifiedSession(
  databaseUrl: string,
  response: Response,
): Promise<{
  expiresAt: Date;
  sessionId: string;
  token: string;
  userId: string;
} | null> {
  const payload = (await response
    .clone()
    .json()
    .catch(() => null)) as {
    token?: unknown;
    user?: { id?: unknown };
  } | null;

  if (
    !response.ok ||
    typeof payload?.token !== "string" ||
    typeof payload.user?.id !== "string"
  ) {
    return null;
  }

  const session = await findAdminSessionByToken(databaseUrl, payload.token);

  return session && session.userId === payload.user.id
    ? {
        expiresAt: session.expiresAt,
        sessionId: session.id,
        token: payload.token,
        userId: session.userId,
      }
    : null;
}

function auditStepUp(
  result: "denied" | "failure" | "success",
  authorization?: AdminAuthorizationContext,
  reasonCode?: string,
) {
  const actorIdHash =
    authorization && process.env.BETTER_AUTH_SECRET
      ? createHmac("sha256", process.env.BETTER_AUTH_SECRET)
          .update(authorization.actor.id)
          .digest("base64url")
          .slice(0, 22)
      : undefined;

  logger.log({
    actorIdHash,
    eventCode: "shapewebs.auth.totp_step_up",
    level: result === "success" ? "info" : "warn",
    metadata: reasonCode ? { reasonCode } : undefined,
    result,
  });
}

export async function POST(request: Request) {
  if (
    !isTrustedAdminOrigin(request.headers.get("origin")) ||
    request.headers.get("content-type")?.split(";", 1)[0] !== "application/json"
  ) {
    auditStepUp("denied");
    return jsonNoStore({ error: "invalid_request" }, 400);
  }

  const rawBody = await readBoundedText(request, maximumBodyBytes);

  if (rawBody.status !== "ok") {
    auditStepUp("denied");
    return jsonNoStore({ error: "invalid_request" }, 413);
  }

  let body: unknown;

  try {
    body = JSON.parse(rawBody.value) as unknown;
  } catch {
    auditStepUp("denied");
    return jsonNoStore({ error: "invalid_request" }, 400);
  }

  const code =
    typeof body === "object" && body !== null && "code" in body
      ? body.code
      : null;

  if (!isValidCode(code)) {
    auditStepUp("denied");
    return jsonNoStore({ error: "invalid_code" }, 400);
  }

  const runtime = await getAdminRuntimeState();
  const auth = getAdminAuth();
  const databaseUrl = getAdminDatabaseUrl();
  const organizationId = getAdminOrganizationId();

  if (
    !runtime.authenticationAvailable ||
    !auth ||
    !databaseUrl ||
    !organizationId
  ) {
    auditStepUp("denied");
    return jsonNoStore({ error: "authentication_unavailable" }, 503);
  }

  if (runtime.setupMode) {
    auditStepUp("denied");
    return jsonNoStore({ error: "authentication_required" }, 401);
  }

  const requestId = request.headers.get("x-request-id") ?? randomUUID();
  const recordDurableStepUp = (
    result: "failure" | "success",
    authorization?: AdminAuthorizationContext,
  ): Promise<void> => {
    return authorization
      ? appendAdminAuditEvent(databaseUrl, {
          action: "auth.totp_step_up",
          organizationId,
          requestId,
          result,
          role: authorization.role,
          sessionId: authorization.session.id,
          targetId: authorization.session.id,
          targetType: "session",
          userId: authorization.actor.id,
        })
      : appendSystemAuditEvent(databaseUrl, {
          action: "auth.totp_step_up",
          organizationId,
          requestId,
          result,
          targetType: "authentication",
        });
  };

  try {
    const authContext = await auth.$context;
    const primarySession = runtime.primarySession;
    const authorization = runtime.authorization;

    if (!primarySession || !authorization) {
      const challengeResponse = await auth.api.verifyTOTP({
        asResponse: true,
        body: {
          code,
          trustDevice: false,
        },
        headers: request.headers,
      });
      const challengeCookies = readSetCookies(challengeResponse.headers);
      const challengeSession = await readVerifiedSession(
        databaseUrl,
        challengeResponse,
      );

      if (!challengeSession) {
        await Promise.allSettled([recordDurableStepUp("failure")]);
        auditStepUp("failure", undefined, "primary_verification_failed");
        return jsonNoStore(
          { error: "verification_failed" },
          401,
          withoutSessionCookie(challengeCookies),
        );
      }

      const verification = await verifyAdminTotpCode({
        code,
        databaseUrl,
        secret: authContext.secretConfig,
        sessionId: challengeSession.sessionId,
        userId: challengeSession.userId,
      });

      if (verification.status !== "accepted") {
        await Promise.allSettled([
          authContext.internalAdapter.deleteSession(challengeSession.token),
          recordDurableStepUp("failure"),
        ]);
        auditStepUp("failure", undefined, verification.reasonCode);
        return jsonNoStore({ error: "verification_failed" }, 401, [
          ...withoutSessionCookie(challengeCookies),
          serializeAdminSessionDeletionCookie(auth.options),
        ]);
      }

      const verifiedAuthorization = await authorizeAdminSession(databaseUrl, {
        organizationId,
        sessionId: challengeSession.sessionId,
        userId: challengeSession.userId,
      });

      if (!verifiedAuthorization) {
        await Promise.allSettled([
          authContext.internalAdapter.deleteSession(challengeSession.token),
          recordDurableStepUp("failure"),
        ]);
        auditStepUp("failure", undefined, "authorization_unavailable");
        return jsonNoStore({ error: "session_unavailable" }, 401, [
          ...withoutSessionCookie(challengeCookies),
          serializeAdminSessionDeletionCookie(auth.options),
        ]);
      }

      const rotatedAt = new Date();
      const replacementToken = generateAdminSessionToken();
      const rotatedSession = await rotateAdminSessionToken(databaseUrl, {
        authorization: verifiedAuthorization,
        newToken: replacementToken,
        requestId,
        rotatedAt,
        verifiedAt: verification.verifiedAt,
      });

      if (!rotatedSession) {
        await Promise.allSettled([
          authContext.internalAdapter.deleteSession(challengeSession.token),
          recordDurableStepUp("failure", verifiedAuthorization),
        ]);
        auditStepUp(
          "failure",
          verifiedAuthorization,
          "session_rotation_failed",
        );
        return jsonNoStore({ error: "session_unavailable" }, 401, [
          ...withoutSessionCookie(challengeCookies),
          serializeAdminSessionDeletionCookie(auth.options),
        ]);
      }

      const replacementCookie = await serializeAdminSessionCookie({
        authOptions: auth.options,
        expiresAt: rotatedSession.expiresAt,
        now: rotatedAt,
        secret: process.env.BETTER_AUTH_SECRET as string,
        token: replacementToken,
      });

      await recordDurableStepUp("success", verifiedAuthorization);
      auditStepUp("success", verifiedAuthorization);
      return jsonNoStore({ status: "verified" }, 200, [
        ...challengeCookies,
        replacementCookie,
      ]);
    }

    const verification = await verifyAdminTotpCode({
      code,
      databaseUrl,
      secret: authContext.secretConfig,
      sessionId: primarySession.session.id,
      userId: primarySession.user.id,
    });

    if (verification.status !== "accepted") {
      await Promise.allSettled([recordDurableStepUp("failure", authorization)]);
      auditStepUp("failure", authorization, verification.reasonCode);
      return jsonNoStore({ error: "verification_failed" }, 401);
    }

    let setCookies: string[];

    if (verification.enrollmentPending) {
      const enrollmentResponse = await auth.api.verifyTOTP({
        asResponse: true,
        body: {
          code,
          trustDevice: false,
        },
        headers: request.headers,
      });
      const enrollmentCookies = readSetCookies(enrollmentResponse.headers);
      const replacementSession = await readVerifiedSession(
        databaseUrl,
        enrollmentResponse,
      );

      if (
        !replacementSession ||
        replacementSession.userId !== primarySession.user.id ||
        !(await setAdminSessionStepUp(
          databaseUrl,
          {
            sessionId: replacementSession.sessionId,
            userId: replacementSession.userId,
          },
          verification.verifiedAt,
        ))
      ) {
        if (replacementSession) {
          await Promise.allSettled([
            authContext.internalAdapter.deleteSession(replacementSession.token),
          ]);
        }
        await Promise.allSettled([
          recordDurableStepUp("failure", authorization),
        ]);
        auditStepUp("failure", authorization, "enrollment_session_failed");
        return jsonNoStore({ error: "session_unavailable" }, 401, [
          ...withoutSessionCookie(enrollmentCookies),
          serializeAdminSessionDeletionCookie(auth.options),
        ]);
      }

      setCookies = enrollmentCookies;

      if (setCookies.length === 0) {
        await Promise.allSettled([
          authContext.internalAdapter.deleteSession(replacementSession.token),
          recordDurableStepUp("failure", authorization),
        ]);
        auditStepUp("failure", authorization, "session_cookie_unavailable");
        return jsonNoStore({ error: "session_unavailable" }, 401);
      }
    } else {
      const rotatedAt = new Date();
      const replacementToken = generateAdminSessionToken();
      const rotatedSession = await rotateAdminSessionToken(databaseUrl, {
        authorization,
        newToken: replacementToken,
        requestId,
        rotatedAt,
        verifiedAt: verification.verifiedAt,
      });

      if (!rotatedSession) {
        await Promise.allSettled([
          recordDurableStepUp("failure", authorization),
        ]);
        auditStepUp("failure", authorization, "session_rotation_failed");
        return jsonNoStore({ error: "session_unavailable" }, 401);
      }

      setCookies = [
        await serializeAdminSessionCookie({
          authOptions: auth.options,
          expiresAt: rotatedSession.expiresAt,
          now: rotatedAt,
          secret: process.env.BETTER_AUTH_SECRET as string,
          token: replacementToken,
        }),
      ];
    }

    await recordDurableStepUp("success", authorization);

    auditStepUp("success", authorization);
    return jsonNoStore({ status: "verified" }, 200, setCookies);
  } catch {
    await Promise.allSettled([
      recordDurableStepUp("failure", runtime.authorization ?? undefined),
    ]);
    auditStepUp(
      "failure",
      runtime.authorization ?? undefined,
      "verification_exception",
    );
    return jsonNoStore({ error: "verification_failed" }, 401);
  }
}

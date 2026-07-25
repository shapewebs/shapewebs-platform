import { createHmac, randomUUID } from "node:crypto";

import {
  generateAdminSessionToken,
  serializeAdminSessionCookie,
  verifyAdminTotpCode,
} from "@shapewebs/auth/server";
import {
  appendAdminAuditEvent,
  rotateAdminSessionToken,
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
  isTrustedAdminOrigin,
} from "@/lib/better-auth";
import { requirePrimaryAdminSession } from "@/lib/auth";

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

function auditStepUp(
  result: "denied" | "failure" | "success",
  authorization?: AdminAuthorizationContext,
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

  const runtime = await requirePrimaryAdminSession("/dashboard");
  const auth = getAdminAuth();
  const databaseUrl = getAdminDatabaseUrl();

  if (!runtime.authenticationAvailable) {
    auditStepUp("denied");
    return jsonNoStore({ error: "authentication_unavailable" }, 503);
  }

  if (
    runtime.setupMode ||
    !runtime.primarySession ||
    !runtime.authorization ||
    !auth ||
    !databaseUrl
  ) {
    auditStepUp("denied");
    return jsonNoStore({ error: "authentication_required" }, 401);
  }

  const authorization = runtime.authorization;
  const primarySession = runtime.primarySession;
  const requestId = request.headers.get("x-request-id") ?? randomUUID();
  const recordDurableStepUp = (
    result: "failure" | "success",
  ): Promise<void> => {
    return appendAdminAuditEvent(databaseUrl, {
      action: "auth.totp_step_up",
      organizationId: authorization.organizationId,
      requestId,
      result,
      role: authorization.role,
      sessionId: primarySession.session.id,
      targetId: primarySession.session.id,
      targetType: "session",
      userId: primarySession.user.id,
    });
  };

  let body: unknown;

  try {
    body = JSON.parse(rawBody.value) as unknown;
  } catch {
    await Promise.allSettled([recordDurableStepUp("failure")]);
    auditStepUp("denied", runtime.authorization);
    return jsonNoStore({ error: "invalid_request" }, 400);
  }

  const code =
    typeof body === "object" && body !== null && "code" in body
      ? body.code
      : null;

  if (!isValidCode(code)) {
    await Promise.allSettled([recordDurableStepUp("failure")]);
    auditStepUp("denied", runtime.authorization);
    return jsonNoStore({ error: "invalid_code" }, 400);
  }

  try {
    const verification = await verifyAdminTotpCode({
      code,
      databaseUrl,
      secret: process.env.BETTER_AUTH_SECRET as string,
      sessionId: runtime.primarySession.session.id,
      userId: runtime.primarySession.user.id,
    });

    if (verification.status !== "accepted") {
      await Promise.allSettled([recordDurableStepUp("failure")]);
      auditStepUp("failure", runtime.authorization);
      return jsonNoStore({ error: "verification_failed" }, 401);
    }

    let setCookies: string[] = [];

    if (verification.enrollmentPending) {
      const enrollmentResponse = await auth.api.verifyTOTP({
        asResponse: true,
        body: {
          code,
          trustDevice: false,
        },
        headers: request.headers,
      });

      if (!enrollmentResponse.ok) {
        await Promise.allSettled([recordDurableStepUp("failure")]);
        auditStepUp("failure", runtime.authorization);
        return jsonNoStore({ error: "verification_failed" }, 401);
      }

      setCookies = readSetCookies(enrollmentResponse.headers);

      if (setCookies.length === 0) {
        await Promise.allSettled([recordDurableStepUp("failure")]);
        auditStepUp("failure", runtime.authorization);
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
        await Promise.allSettled([recordDurableStepUp("failure")]);
        auditStepUp("failure", runtime.authorization);
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

    await recordDurableStepUp("success");

    auditStepUp("success", runtime.authorization);
    return jsonNoStore({ status: "verified" }, 200, setCookies);
  } catch {
    await Promise.allSettled([recordDurableStepUp("failure")]);
    auditStepUp("failure", runtime.authorization);
    return jsonNoStore({ error: "verification_failed" }, 401);
  }
}

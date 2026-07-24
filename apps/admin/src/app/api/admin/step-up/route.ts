import { createHmac, randomUUID } from "node:crypto";

import {
  appendAdminAuditEvent,
  recordAdminStepUp,
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
) {
  return Response.json(body, {
    headers: {
      "Cache-Control": "no-store",
    },
    status,
  });
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

  let body: unknown;

  try {
    body = JSON.parse(rawBody.value) as unknown;
  } catch {
    auditStepUp("denied", runtime.authorization);
    return jsonNoStore({ error: "invalid_request" }, 400);
  }

  const code =
    typeof body === "object" && body !== null && "code" in body
      ? body.code
      : null;

  if (!isValidCode(code)) {
    auditStepUp("denied", runtime.authorization);
    return jsonNoStore({ error: "invalid_code" }, 400);
  }

  try {
    await auth.api.verifyTOTP({
      body: {
        code,
        trustDevice: false,
      },
      headers: request.headers,
    });

    const recorded = await recordAdminStepUp(
      databaseUrl,
      {
        sessionId: runtime.primarySession.session.id,
        userId: runtime.primarySession.user.id,
      },
      new Date(),
    );

    if (!recorded) {
      auditStepUp("failure", runtime.authorization);
      return jsonNoStore({ error: "session_unavailable" }, 401);
    }

    await appendAdminAuditEvent(databaseUrl, {
      action: "auth.totp_step_up",
      organizationId: runtime.authorization.organizationId,
      requestId: request.headers.get("x-request-id") ?? randomUUID(),
      result: "success",
      role: runtime.authorization.role,
      sessionId: runtime.primarySession.session.id,
      targetId: runtime.primarySession.session.id,
      targetType: "session",
      userId: runtime.primarySession.user.id,
    });

    auditStepUp("success", runtime.authorization);
    return jsonNoStore({ status: "verified" });
  } catch {
    auditStepUp("failure", runtime.authorization);
    return jsonNoStore({ error: "verification_failed" }, 401);
  }
}

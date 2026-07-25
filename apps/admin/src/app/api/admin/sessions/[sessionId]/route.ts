import { createHmac, randomUUID } from "node:crypto";

import { revokeOrganizationAdminSession } from "@shapewebs/database/server";
import {
  createStructuredLogger,
  resolveShapewebsEnvironment,
} from "@shapewebs/observability";

import { authorizeAdminApiSession } from "@/lib/auth";
import { getAdminDatabaseUrl, isTrustedAdminOrigin } from "@/lib/better-auth";

const sessionIdPattern = /^[A-Za-z0-9_-]{8,128}$/;
const logger = createStructuredLogger({
  deploymentId: process.env.VERCEL_DEPLOYMENT_ID,
  environment: resolveShapewebsEnvironment(),
  service: "shapewebs-admin",
});

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

export async function DELETE(
  request: Request,
  context: { params: Promise<{ sessionId: string }> },
) {
  if (!isTrustedAdminOrigin(request.headers.get("origin"))) {
    return jsonNoStore({ error: "invalid_request" }, 400);
  }

  const authorizationResult = await authorizeAdminApiSession({
    freshStepUpWithinSeconds: 5 * 60,
    roles: ["owner"],
  });

  if (authorizationResult.status === "denied") {
    return jsonNoStore(
      { error: authorizationResult.error },
      authorizationResult.statusCode,
    );
  }

  const { sessionId } = await context.params;
  const runtime = authorizationResult.runtime;
  const databaseUrl = getAdminDatabaseUrl();

  if (!sessionIdPattern.test(sessionId)) {
    return jsonNoStore({ error: "invalid_request" }, 400);
  }

  if (sessionId === runtime.authorization.session.id) {
    return jsonNoStore({ error: "current_session" }, 400);
  }

  if (!databaseUrl) {
    return jsonNoStore({ error: "service_unavailable" }, 503);
  }

  const requestId = request.headers.get("x-request-id") ?? randomUUID();
  const revoked = await revokeOrganizationAdminSession(databaseUrl, {
    authorization: runtime.authorization,
    requestId,
    targetSessionId: sessionId,
  });

  if (!revoked) {
    return jsonNoStore({ error: "session_not_found" }, 404);
  }

  const actorIdHash = process.env.BETTER_AUTH_SECRET
    ? createHmac("sha256", process.env.BETTER_AUTH_SECRET)
        .update(runtime.authorization.actor.id)
        .digest("base64url")
        .slice(0, 22)
    : undefined;

  logger.log({
    actorIdHash,
    eventCode: "shapewebs.auth.session_revoked",
    level: "info",
    requestId,
    result: "success",
  });

  return jsonNoStore({ status: "revoked" });
}

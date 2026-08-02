import {
  getAccountAuthEmailRequestCooldown,
  getAdminAuthenticationMethods,
} from "@shapewebs/database/server";
import { readBoundedText } from "@shapewebs/validation";

import { authorizeAccountApiSession } from "@/lib/auth";
import {
  getAdminAuth,
  getAdminBaseUrl,
  getAdminDatabaseUrl,
  isTrustedAdminOrigin,
} from "@/lib/better-auth";
import { scheduleLocalOutboxDelivery } from "@/lib/local-outbox-delivery";

const maximumBodyBytes = 256;

function jsonNoStore(
  body: { error: string } | { retryAfterSeconds?: number; status: string },
  status = 200,
) {
  return Response.json(body, {
    headers: { "Cache-Control": "no-store" },
    status,
  });
}

export async function POST(request: Request) {
  if (
    !isTrustedAdminOrigin(request.headers.get("origin")) ||
    request.headers.get("content-type")?.split(";", 1)[0] !== "application/json"
  ) {
    return jsonNoStore({ error: "invalid_request" }, 400);
  }

  const body = await readBoundedText(request, maximumBodyBytes);
  if (body.status !== "ok") {
    return jsonNoStore({ error: "invalid_request" }, 413);
  }

  try {
    JSON.parse(body.value || "{}") as unknown;
  } catch {
    return jsonNoStore({ error: "invalid_request" }, 400);
  }

  const authorization = await authorizeAccountApiSession({
    freshStaffStepUpWithinSeconds: 5 * 60,
  });
  if (authorization.status === "denied") {
    return jsonNoStore(
      { error: authorization.error },
      authorization.statusCode,
    );
  }

  const auth = getAdminAuth();
  const baseUrl = getAdminBaseUrl();
  const databaseUrl = getAdminDatabaseUrl();
  if (!auth || !baseUrl || !databaseUrl) {
    return jsonNoStore({ error: "authentication_unavailable" }, 503);
  }

  const runtime = authorization.runtime;
  const user = runtime.primarySession.user;
  const methods = await getAdminAuthenticationMethods(databaseUrl, user.id);
  if (methods.password) {
    return jsonNoStore({ status: "password_exists" });
  }

  const organizationId =
    runtime.authorization?.organizationId ??
    runtime.customerAuthorization?.organizationId;
  if (!organizationId) {
    return jsonNoStore({ error: "forbidden" }, 403);
  }

  const cooldown = await getAccountAuthEmailRequestCooldown(
    databaseUrl,
    {
      membershipRole: runtime.authorization?.role,
      organizationId,
      userId: user.id,
    },
    "password_reset",
  );
  if (cooldown) {
    return jsonNoStore({
      retryAfterSeconds: cooldown.retryAfterSeconds,
      status: "password_email_pending",
    });
  }

  try {
    const response = await auth.api.requestPasswordReset({
      asResponse: true,
      body: {
        email: user.email,
        redirectTo: `${baseUrl}/reset-password`,
      },
      headers: request.headers,
    });

    if (response.ok) {
      scheduleLocalOutboxDelivery();
    }

    return response.ok
      ? jsonNoStore({
          retryAfterSeconds: 5 * 60,
          status: "password_email_queued",
        })
      : jsonNoStore({ error: "method_update_failed" }, 400);
  } catch {
    return jsonNoStore({ error: "method_update_failed" }, 400);
  }
}

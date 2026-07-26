import { getAdminAuthenticationMethods } from "@shapewebs/database/server";
import { readBoundedText } from "@shapewebs/validation";

import { authorizeAdminApiSession } from "@/lib/auth";
import {
  getAdminAuth,
  getAdminBaseUrl,
  getAdminDatabaseUrl,
  isTrustedAdminOrigin,
} from "@/lib/better-auth";

const maximumBodyBytes = 256;

function jsonNoStore(
  body: { error: string } | { status: string },
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

  const authorization = await authorizeAdminApiSession({
    freshStepUpWithinSeconds: 5 * 60,
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

  const user = authorization.runtime.primarySession.user;
  const methods = await getAdminAuthenticationMethods(databaseUrl, user.id);
  if (methods.password) {
    return jsonNoStore({ status: "password_exists" });
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

    return response.ok
      ? jsonNoStore({ status: "password_email_sent" })
      : jsonNoStore({ error: "method_update_failed" }, 400);
  } catch {
    return jsonNoStore({ error: "method_update_failed" }, 400);
  }
}

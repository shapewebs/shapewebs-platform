import {
  createAdminMethodAuthorization,
  verifyAdminPasswordHash,
} from "@shapewebs/auth/server";
import {
  getAdminAuthenticationMethods,
  getAdminCredentialPasswordHash,
} from "@shapewebs/database/server";
import { readBoundedText } from "@shapewebs/validation";

import { authorizeAdminApiSession } from "@/lib/auth";
import { readAuthSetCookies } from "@/lib/auth-response";
import {
  getAdminAuth,
  getAdminBaseUrl,
  getAdminDatabaseUrl,
  isTrustedAdminOrigin,
} from "@/lib/better-auth";

const maximumBodyBytes = 1_024;

function jsonNoStore(
  body: { error: string } | { status: string; url?: string },
  status = 200,
  setCookies: string[] = [],
) {
  const headers = new Headers({ "Cache-Control": "no-store" });
  for (const cookie of setCookies) headers.append("Set-Cookie", cookie);
  return Response.json(body, { headers, status });
}

export async function POST(request: Request) {
  if (
    !isTrustedAdminOrigin(request.headers.get("origin")) ||
    request.headers.get("content-type")?.split(";", 1)[0] !== "application/json"
  ) {
    return jsonNoStore({ error: "invalid_request" }, 400);
  }

  const rawBody = await readBoundedText(request, maximumBodyBytes);
  if (rawBody.status !== "ok") {
    return jsonNoStore({ error: "invalid_request" }, 413);
  }

  let password: unknown;
  try {
    const body = JSON.parse(rawBody.value) as { password?: unknown };
    password = body.password;
  } catch {
    return jsonNoStore({ error: "invalid_request" }, 400);
  }

  if (typeof password !== "string" || !password || password.length > 128) {
    return jsonNoStore({ error: "reauthentication_failed" }, 400);
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
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!auth || !baseUrl || !databaseUrl || !secret) {
    return jsonNoStore({ error: "authentication_unavailable" }, 503);
  }

  const runtime = authorization.runtime;
  const userId = runtime.primarySession.user.id;
  const methods = await getAdminAuthenticationMethods(databaseUrl, userId);
  if (methods.google) {
    return jsonNoStore({ status: "google_exists" });
  }

  const passwordHash = await getAdminCredentialPasswordHash(
    databaseUrl,
    userId,
  );
  if (
    !passwordHash ||
    !(await verifyAdminPasswordHash(password, passwordHash))
  ) {
    return jsonNoStore({ error: "reauthentication_failed" }, 401);
  }

  try {
    const headers = new Headers(request.headers);
    headers.set(
      "x-shapewebs-method-authorization",
      createAdminMethodAuthorization(
        {
          action: "link_google",
          sessionId: runtime.primarySession.session.id,
          userId,
        },
        secret,
      ),
    );
    const response = await auth.api.linkSocialAccount({
      asResponse: true,
      body: {
        callbackURL: `${baseUrl}/account/security?status=google_connected`,
        errorCallbackURL: `${baseUrl}/account/security?error=method_update`,
        provider: "google",
      },
      headers,
    });
    const payload = (await response
      .clone()
      .json()
      .catch(() => null)) as { url?: unknown } | null;
    const redirectUrl =
      response.headers.get("location") ??
      (typeof payload?.url === "string" ? payload.url : null);

    if (!response.ok || !redirectUrl) {
      return jsonNoStore({ error: "method_update_failed" }, 400);
    }

    const parsed = new URL(redirectUrl);
    if (
      parsed.protocol !== "https:" ||
      parsed.hostname !== "accounts.google.com"
    ) {
      return jsonNoStore({ error: "method_update_failed" }, 400);
    }

    return jsonNoStore(
      { status: "google_authorization", url: parsed.toString() },
      200,
      readAuthSetCookies(response.headers),
    );
  } catch {
    return jsonNoStore({ error: "method_update_failed" }, 400);
  }
}

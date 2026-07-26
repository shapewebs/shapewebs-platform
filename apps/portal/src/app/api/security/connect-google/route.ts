import {
  createCustomerMethodAuthorization,
  verifyCustomerPasswordHash,
} from "@shapewebs/auth/server";
import {
  getCustomerAuthenticationMethods,
  getCustomerCredentialPasswordHash,
} from "@shapewebs/database/server";

import { requireCustomerApiSession } from "@/lib/auth";
import { getPortalBaseUrl, getPortalDatabaseUrl } from "@/lib/auth-environment";
import { readSetCookies } from "@/lib/auth-response";
import { getPortalAuth } from "@/lib/better-auth";
import {
  getSingleFormValue,
  portalFormErrorResponse,
  portalRedirectResponse,
  readSecurePortalForm,
} from "@/lib/form-security";

export async function POST(request: Request) {
  const form = await readSecurePortalForm(request, "customer_method");
  if (form.status !== "ok") {
    return portalFormErrorResponse(request, "/settings/security", form.status);
  }

  const authorization = await requireCustomerApiSession();
  if (authorization.status === "denied") {
    return portalRedirectResponse(request, "/login?error=authentication");
  }

  const password = getSingleFormValue(form.params, "password", 128);
  const auth = getPortalAuth();
  const baseUrl = getPortalBaseUrl();
  const databaseUrl = getPortalDatabaseUrl();
  const secret = process.env.PORTAL_BETTER_AUTH_SECRET;
  if (!password || !auth || !baseUrl || !databaseUrl || !secret) {
    return portalRedirectResponse(
      request,
      "/settings/security?error=reauthentication",
    );
  }

  const runtime = authorization.runtime;
  const methods = await getCustomerAuthenticationMethods(
    databaseUrl,
    runtime.primarySession.user.id,
  );
  if (methods.google) {
    return portalRedirectResponse(
      request,
      "/settings/security?status=google_exists",
    );
  }

  const passwordHash = await getCustomerCredentialPasswordHash(
    databaseUrl,
    runtime.primarySession.user.id,
  );
  if (
    !passwordHash ||
    !(await verifyCustomerPasswordHash(password, passwordHash))
  ) {
    return portalRedirectResponse(
      request,
      "/settings/security?error=reauthentication",
    );
  }

  try {
    const headers = new Headers(request.headers);
    headers.set(
      "x-shapewebs-method-authorization",
      createCustomerMethodAuthorization(
        {
          action: "link_google",
          sessionId: runtime.primarySession.session.id,
          userId: runtime.primarySession.user.id,
        },
        secret,
      ),
    );
    const response = await auth.api.linkSocialAccount({
      asResponse: true,
      body: {
        callbackURL: `${baseUrl}/settings/security?status=google_connected`,
        errorCallbackURL: `${baseUrl}/settings/security?error=method_update`,
        provider: "google",
      },
      headers,
    });
    const payload = (await response
      .clone()
      .json()
      .catch(() => null)) as {
      url?: unknown;
    } | null;
    const location = response.headers.get("location");
    const redirectUrl =
      location ?? (typeof payload?.url === "string" ? payload.url : null);

    if (!response.ok || !redirectUrl) {
      return portalRedirectResponse(
        request,
        "/settings/security?error=method_update",
      );
    }

    const parsedRedirect = new URL(redirectUrl);
    if (
      parsedRedirect.protocol !== "https:" ||
      parsedRedirect.hostname !== "accounts.google.com"
    ) {
      return portalRedirectResponse(
        request,
        "/settings/security?error=method_update",
      );
    }

    const responseHeaders = new Headers({
      "Cache-Control": "no-store",
      Location: parsedRedirect.toString(),
    });
    for (const cookie of readSetCookies(response.headers)) {
      responseHeaders.append("Set-Cookie", cookie);
    }

    return new Response(null, { headers: responseHeaders, status: 303 });
  } catch {
    return portalRedirectResponse(
      request,
      "/settings/security?error=method_update",
    );
  }
}

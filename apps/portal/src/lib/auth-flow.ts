import "server-only";

import { getPortalBaseUrl } from "./auth-environment";
import { getPortalAuth } from "./better-auth";
import { readSetCookies } from "./auth-response";
import { portalRedirectResponse } from "./form-security";
import { getSafePortalRedirectTarget } from "./redirect";

export async function signInCustomerWithPassword(
  request: Request,
  input: { email: string; password: string; redirectTo: string },
): Promise<Response> {
  const auth = getPortalAuth();
  if (!auth) {
    return portalRedirectResponse(request, "/login?error=unavailable");
  }

  try {
    const response = await auth.api.signInEmail({
      asResponse: true,
      body: {
        callbackURL: input.redirectTo,
        email: input.email,
        password: input.password,
        rememberMe: true,
      },
      headers: request.headers,
    });

    if (!response.ok) {
      return portalRedirectResponse(
        request,
        `/login?error=authentication&redirectTo=${encodeURIComponent(input.redirectTo)}`,
      );
    }

    return portalRedirectResponse(
      request,
      input.redirectTo,
      readSetCookies(response.headers),
    );
  } catch {
    return portalRedirectResponse(
      request,
      `/login?error=authentication&redirectTo=${encodeURIComponent(input.redirectTo)}`,
    );
  }
}

export async function beginCustomerGoogleSignIn(
  request: Request,
  redirectTo: string,
): Promise<Response> {
  const auth = getPortalAuth();
  const baseUrl = getPortalBaseUrl();
  const safeRedirect = getSafePortalRedirectTarget(redirectTo);

  if (!auth || !baseUrl) {
    return portalRedirectResponse(request, "/login?error=unavailable");
  }

  try {
    const response = await auth.api.signInSocial({
      asResponse: true,
      body: {
        callbackURL: `${baseUrl}${safeRedirect}`,
        errorCallbackURL: `${baseUrl}/login?error=authentication`,
        newUserCallbackURL: `${baseUrl}${safeRedirect}`,
        provider: "google",
      },
      headers: request.headers,
    });

    if (!response.ok) {
      return portalRedirectResponse(request, "/login?error=authentication");
    }

    const payload = (await response
      .clone()
      .json()
      .catch(() => null)) as {
      url?: unknown;
    } | null;
    const location = response.headers.get("location");
    const redirectUrl =
      location ?? (typeof payload?.url === "string" ? payload.url : null);

    if (!redirectUrl) {
      return portalRedirectResponse(request, "/login?error=authentication");
    }

    const parsedRedirect = new URL(redirectUrl);
    if (
      parsedRedirect.protocol !== "https:" ||
      parsedRedirect.hostname !== "accounts.google.com"
    ) {
      return portalRedirectResponse(request, "/login?error=authentication");
    }

    const headers = new Headers({
      "Cache-Control": "no-store",
      Location: parsedRedirect.toString(),
    });
    for (const cookie of readSetCookies(response.headers)) {
      headers.append("Set-Cookie", cookie);
    }

    return new Response(null, { headers, status: 303 });
  } catch {
    return portalRedirectResponse(request, "/login?error=authentication");
  }
}

import "server-only";

import { getAdminAuth, getAdminBaseUrl } from "./better-auth";
import { readAuthSetCookies } from "./auth-response";
import { accountRedirectResponse } from "./account-form-security";

export async function beginInvitedGoogleRegistration(
  request: Request,
): Promise<Response> {
  const auth = getAdminAuth();
  const baseUrl = getAdminBaseUrl();

  if (!auth || !baseUrl) {
    return accountRedirectResponse(request, "/login?error=unavailable");
  }

  try {
    const completionUrl = `${baseUrl}/login/complete?redirectTo=${encodeURIComponent("/customer")}`;
    const response = await auth.api.signInSocial({
      asResponse: true,
      body: {
        callbackURL: completionUrl,
        errorCallbackURL: `${baseUrl}/register?error=registration`,
        newUserCallbackURL: completionUrl,
        provider: "google",
      },
      headers: request.headers,
    });

    if (!response.ok) {
      return accountRedirectResponse(request, "/register?error=registration");
    }

    const payload = (await response
      .clone()
      .json()
      .catch(() => null)) as { url?: unknown } | null;
    const redirectUrl =
      response.headers.get("location") ??
      (typeof payload?.url === "string" ? payload.url : null);

    if (!redirectUrl) {
      return accountRedirectResponse(request, "/register?error=registration");
    }

    const parsed = new URL(redirectUrl);
    if (
      parsed.protocol !== "https:" ||
      parsed.hostname !== "accounts.google.com"
    ) {
      return accountRedirectResponse(request, "/register?error=registration");
    }

    const headers = new Headers({
      "Cache-Control": "no-store",
      Location: parsed.toString(),
    });
    for (const cookie of readAuthSetCookies(response.headers)) {
      headers.append("Set-Cookie", cookie);
    }

    return new Response(null, { headers, status: 303 });
  } catch {
    return accountRedirectResponse(request, "/register?error=registration");
  }
}

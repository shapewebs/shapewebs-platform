import { getPortalAuth } from "@/lib/better-auth";
import { readSetCookies } from "@/lib/auth-response";
import {
  portalFormErrorResponse,
  portalRedirectResponse,
  readSecurePortalForm,
} from "@/lib/form-security";

export async function POST(request: Request) {
  const form = await readSecurePortalForm(request, "customer_logout");
  if (form.status !== "ok") {
    return portalFormErrorResponse(request, "/login", form.status);
  }

  const auth = getPortalAuth();
  if (!auth) {
    return portalRedirectResponse(request, "/login?error=unavailable");
  }

  try {
    const response = await auth.api.signOut({
      asResponse: true,
      headers: request.headers,
    });
    const redirect = portalRedirectResponse(
      request,
      "/login?loggedOut=true",
      readSetCookies(response.headers),
    );
    const headers = new Headers(redirect.headers);
    headers.set("Clear-Site-Data", '"cache", "cookies", "storage"');

    return new Response(null, { headers, status: 303 });
  } catch {
    return portalRedirectResponse(request, "/login?error=authentication");
  }
}

import { getCustomerAuthenticationMethods } from "@shapewebs/database/server";

import { requireCustomerApiSession } from "@/lib/auth";
import { getPortalBaseUrl, getPortalDatabaseUrl } from "@/lib/auth-environment";
import { getPortalAuth } from "@/lib/better-auth";
import {
  getSingleFormValue,
  portalFormErrorResponse,
  portalRedirectResponse,
  readSecurePortalForm,
} from "@/lib/form-security";
import { getPortalRequestIp, verifyPortalTurnstile } from "@/lib/turnstile";

export async function POST(request: Request) {
  const form = await readSecurePortalForm(request, "customer_method");
  if (form.status !== "ok") {
    return portalFormErrorResponse(request, "/settings/security", form.status);
  }

  const turnstileToken = getSingleFormValue(
    form.params,
    "turnstileToken",
    2_048,
  );
  if (
    !(await verifyPortalTurnstile({
      action: "customer_recovery",
      ip: getPortalRequestIp(request),
      token: turnstileToken,
    }))
  ) {
    return portalRedirectResponse(
      request,
      "/settings/security?error=security_check",
    );
  }

  const authorization = await requireCustomerApiSession();
  if (authorization.status === "denied") {
    return portalRedirectResponse(request, "/login?error=authentication");
  }

  const auth = getPortalAuth();
  const baseUrl = getPortalBaseUrl();
  const databaseUrl = getPortalDatabaseUrl();
  if (!auth || !baseUrl || !databaseUrl) {
    return portalRedirectResponse(request, "/login?error=unavailable");
  }

  const runtime = authorization.runtime;
  const methods = await getCustomerAuthenticationMethods(databaseUrl, {
    organizationId: runtime.authorization.organizationId,
    userId: runtime.primarySession.user.id,
  });
  if (methods.password) {
    return portalRedirectResponse(
      request,
      "/settings/security?status=password_exists",
    );
  }

  try {
    const response = await auth.api.requestPasswordReset({
      asResponse: true,
      body: {
        email: runtime.primarySession.user.email,
        redirectTo: `${baseUrl}/reset-password`,
      },
      headers: request.headers,
    });

    return response.ok
      ? portalRedirectResponse(
          request,
          "/settings/security?status=password_email_sent",
        )
      : portalRedirectResponse(
          request,
          "/settings/security?error=method_update",
        );
  } catch {
    return portalRedirectResponse(
      request,
      "/settings/security?error=method_update",
    );
  }
}

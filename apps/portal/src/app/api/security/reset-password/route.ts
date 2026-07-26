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
    return portalFormErrorResponse(request, "/login", form.status);
  }

  const token = getSingleFormValue(form.params, "token", 512);
  const password = getSingleFormValue(form.params, "password", 128);
  const confirmation = getSingleFormValue(
    form.params,
    "passwordConfirmation",
    128,
  );
  const turnstileToken = getSingleFormValue(
    form.params,
    "turnstileToken",
    2_048,
  );
  const auth = getPortalAuth();

  if (
    !token ||
    !password ||
    password !== confirmation ||
    !auth ||
    !(await verifyPortalTurnstile({
      action: "customer_recovery",
      ip: getPortalRequestIp(request),
      token: turnstileToken,
    }))
  ) {
    return portalRedirectResponse(request, "/login?error=password_reset");
  }

  try {
    const response = await auth.api.resetPassword({
      asResponse: true,
      body: { newPassword: password, token },
      headers: request.headers,
    });

    return response.ok
      ? portalRedirectResponse(request, "/login?passwordUpdated=true")
      : portalRedirectResponse(request, "/login?error=password_reset");
  } catch {
    return portalRedirectResponse(request, "/login?error=password_reset");
  }
}

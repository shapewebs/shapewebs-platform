import { emailAddressSchema } from "@shapewebs/validation";

import { getPortalBaseUrl } from "@/lib/auth-environment";
import { getPortalAuth } from "@/lib/better-auth";
import {
  getSingleFormValue,
  portalFormErrorResponse,
  portalRedirectResponse,
  readSecurePortalForm,
} from "@/lib/form-security";
import { getPortalRequestIp, verifyPortalTurnstile } from "@/lib/turnstile";

export async function POST(request: Request) {
  const form = await readSecurePortalForm(request, "customer_recovery");
  if (form.status !== "ok") {
    return portalFormErrorResponse(request, "/forgot-password", form.status);
  }

  const emailInput = getSingleFormValue(form.params, "email", 320);
  const turnstileToken = getSingleFormValue(
    form.params,
    "turnstileToken",
    2_048,
  );
  const email = emailInput
    ? emailAddressSchema.safeParse(emailInput.trim().toLowerCase())
    : null;
  const auth = getPortalAuth();
  const baseUrl = getPortalBaseUrl();

  if (
    !email?.success ||
    !auth ||
    !baseUrl ||
    !(await verifyPortalTurnstile({
      action: "customer_recovery",
      ip: getPortalRequestIp(request),
      token: turnstileToken,
    }))
  ) {
    return portalRedirectResponse(
      request,
      "/forgot-password?error=invalid_request",
    );
  }

  try {
    // The response is deliberately identical for existing and unknown emails.
    // Better Auth and the durable outbox perform their own database throttling.
    await auth.api.requestPasswordReset({
      asResponse: true,
      body: {
        email: email.data,
        redirectTo: `${baseUrl}/reset-password`,
      },
      headers: request.headers,
    });
  } catch {
    // Do not disclose account membership or provider availability here.
  }

  return portalRedirectResponse(request, "/forgot-password?status=sent");
}

import { confirmCustomerPasswordRegistration } from "@shapewebs/auth/server";

import {
  getSingleFormValue,
  portalFormErrorResponse,
  portalRedirectResponse,
  readSecurePortalForm,
} from "@/lib/form-security";
import { getPortalRequestIp, verifyPortalTurnstile } from "@/lib/turnstile";

export async function POST(request: Request) {
  const form = await readSecurePortalForm(request, "customer_verification");
  if (form.status !== "ok") {
    return portalFormErrorResponse(request, "/login", form.status);
  }

  const verificationToken = getSingleFormValue(
    form.params,
    "verificationToken",
    512,
  );
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
  const databaseUrl = process.env.PORTAL_DATABASE_URL;

  if (
    !verificationToken ||
    !password ||
    password !== confirmation ||
    !databaseUrl ||
    !(await verifyPortalTurnstile({
      action: "customer_registration",
      ip: getPortalRequestIp(request),
      token: turnstileToken,
    }))
  ) {
    return portalRedirectResponse(request, "/login?error=verification");
  }

  try {
    const result = await confirmCustomerPasswordRegistration({
      databaseUrl,
      finalPassword: password,
      verificationToken,
    });

    return result
      ? portalRedirectResponse(request, "/login?verified=true")
      : portalRedirectResponse(request, "/login?error=verification");
  } catch {
    return portalRedirectResponse(request, "/login?error=verification");
  }
}

import {
  beginCustomerPasswordRegistration,
  readCustomerRegistrationGrant,
} from "@shapewebs/auth/server";

import { beginCustomerGoogleSignIn } from "@/lib/auth-flow";
import {
  getSingleFormValue,
  portalFormErrorResponse,
  portalRedirectResponse,
  readSecurePortalForm,
} from "@/lib/form-security";
import {
  clearPortalRegistrationCookies,
  getPortalRegistrationContextFromRequest,
} from "@/lib/registration-context";
import { getPortalRequestIp, verifyPortalTurnstile } from "@/lib/turnstile";

export async function POST(request: Request) {
  const form = await readSecurePortalForm(request, "customer_registration");
  if (form.status !== "ok") {
    return portalFormErrorResponse(request, "/register", form.status);
  }

  const method = getSingleFormValue(form.params, "method", 16);
  const turnstileToken = getSingleFormValue(
    form.params,
    "turnstileToken",
    2_048,
  );
  const context = await getPortalRegistrationContextFromRequest(request);
  const registrationGrant = readCustomerRegistrationGrant(
    request,
    process.env.NODE_ENV === "production",
  );

  if (
    !context ||
    !registrationGrant ||
    !(await verifyPortalTurnstile({
      action: "customer_registration",
      ip: getPortalRequestIp(request),
      token: turnstileToken,
    }))
  ) {
    return portalRedirectResponse(request, "/register?error=registration");
  }

  if (method === "google") {
    return beginCustomerGoogleSignIn(request, "/dashboard");
  }

  const password = getSingleFormValue(form.params, "password", 128);
  const confirmation = getSingleFormValue(
    form.params,
    "passwordConfirmation",
    128,
  );
  const databaseUrl = process.env.PORTAL_DATABASE_URL;
  const encryptionSecret = process.env.PORTAL_AUTH_EMAIL_ENCRYPTION_SECRET;

  if (
    method !== "password" ||
    !password ||
    password !== confirmation ||
    !databaseUrl ||
    !encryptionSecret
  ) {
    return portalRedirectResponse(request, "/register?error=password_policy");
  }

  try {
    await beginCustomerPasswordRegistration({
      databaseUrl,
      email: context.email,
      encryptionSecret,
      name: context.name,
      password,
      registrationGrant,
    });

    return portalRedirectResponse(
      request,
      "/register/check-email",
      clearPortalRegistrationCookies(),
    );
  } catch {
    return portalRedirectResponse(request, "/register?error=registration");
  }
}

import { emailAddressSchema } from "@shapewebs/validation";

import {
  beginCustomerGoogleSignIn,
  signInCustomerWithPassword,
} from "@/lib/auth-flow";
import {
  getSingleFormValue,
  portalFormErrorResponse,
  portalRedirectResponse,
  readSecurePortalForm,
} from "@/lib/form-security";
import { getSafePortalRedirectTarget } from "@/lib/redirect";

export async function POST(request: Request) {
  const form = await readSecurePortalForm(request, "customer_login");
  if (form.status !== "ok") {
    return portalFormErrorResponse(request, "/login", form.status);
  }

  const method = getSingleFormValue(form.params, "method", 16);
  const redirectTo = getSafePortalRedirectTarget(
    getSingleFormValue(form.params, "redirectTo", 512),
  );

  if (method === "google") {
    return beginCustomerGoogleSignIn(request, redirectTo);
  }

  const emailInput = getSingleFormValue(form.params, "email", 320);
  const password = getSingleFormValue(form.params, "password", 128);
  const email = emailInput
    ? emailAddressSchema.safeParse(emailInput.trim().toLowerCase())
    : null;

  if (method !== "password" || !email?.success || !password) {
    return portalRedirectResponse(
      request,
      `/login?error=authentication&redirectTo=${encodeURIComponent(redirectTo)}`,
    );
  }

  return signInCustomerWithPassword(request, {
    email: email.data,
    password,
    redirectTo,
  });
}

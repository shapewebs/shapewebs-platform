import { confirmCustomerPasswordRegistration } from "@shapewebs/auth/server";

import {
  accountFormErrorResponse,
  accountRedirectResponse,
  getSingleAccountFormValue,
  readSecureAccountForm,
} from "@/lib/account-form-security";
import {
  getAccountRequestIp,
  verifyAccountTurnstile,
} from "@/lib/account-turnstile";
import { getCustomerDatabaseUrl } from "@/lib/better-auth";

export async function POST(request: Request) {
  const form = await readSecureAccountForm(request, "customer_verification");
  if (form.status !== "ok") {
    return accountFormErrorResponse(request, "/login", form.status);
  }

  const verificationToken = getSingleAccountFormValue(
    form.params,
    "verificationToken",
    512,
  );
  const password = getSingleAccountFormValue(form.params, "password", 128);
  const confirmation = getSingleAccountFormValue(
    form.params,
    "passwordConfirmation",
    128,
  );
  const turnstileToken = getSingleAccountFormValue(
    form.params,
    "turnstileToken",
    2_048,
  );
  const databaseUrl = getCustomerDatabaseUrl();

  if (
    !verificationToken ||
    !password ||
    password !== confirmation ||
    !databaseUrl ||
    !(await verifyAccountTurnstile({
      action: "customer_registration",
      ip: getAccountRequestIp(request),
      token: turnstileToken,
    }))
  ) {
    return accountRedirectResponse(request, "/login?error=verification");
  }

  try {
    const result = await confirmCustomerPasswordRegistration({
      databaseUrl,
      finalPassword: password,
      verificationToken,
    });

    return result
      ? accountRedirectResponse(request, "/login?verified=true")
      : accountRedirectResponse(request, "/login?error=verification");
  } catch {
    return accountRedirectResponse(request, "/login?error=verification");
  }
}

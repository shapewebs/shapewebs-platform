import {
  beginCustomerPasswordRegistration,
  readCustomerRegistrationGrant,
} from "@shapewebs/auth/server";

import { beginInvitedGoogleRegistration } from "@/lib/account-auth-flow";
import {
  accountFormErrorResponse,
  accountRedirectResponse,
  getSingleAccountFormValue,
  readSecureAccountForm,
} from "@/lib/account-form-security";
import {
  clearAccountRegistrationCookies,
  getAccountRegistrationContextFromRequest,
} from "@/lib/account-registration-context";
import {
  getAccountRequestIp,
  verifyAccountTurnstile,
} from "@/lib/account-turnstile";
import { getCustomerDatabaseUrl } from "@/lib/better-auth";

export async function POST(request: Request) {
  const form = await readSecureAccountForm(request, "customer_registration");
  if (form.status !== "ok") {
    return accountFormErrorResponse(request, "/register", form.status);
  }

  const method = getSingleAccountFormValue(form.params, "method", 16);
  const turnstileToken = getSingleAccountFormValue(
    form.params,
    "turnstileToken",
    2_048,
  );
  const context = await getAccountRegistrationContextFromRequest(request);
  const registrationGrant = readCustomerRegistrationGrant(
    request,
    process.env.NODE_ENV === "production",
  );

  if (
    !context ||
    !registrationGrant ||
    !(await verifyAccountTurnstile({
      action: "customer_registration",
      ip: getAccountRequestIp(request),
      token: turnstileToken,
    }))
  ) {
    return accountRedirectResponse(request, "/register?error=registration");
  }

  if (method === "google") {
    return beginInvitedGoogleRegistration(request);
  }

  const password = getSingleAccountFormValue(form.params, "password", 128);
  const confirmation = getSingleAccountFormValue(
    form.params,
    "passwordConfirmation",
    128,
  );
  const databaseUrl = getCustomerDatabaseUrl();
  const encryptionSecret = process.env.ADMIN_AUTH_EMAIL_ENCRYPTION_SECRET;

  if (
    method !== "password" ||
    !password ||
    password !== confirmation ||
    !databaseUrl ||
    !encryptionSecret
  ) {
    return accountRedirectResponse(request, "/register?error=password_policy");
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

    return accountRedirectResponse(
      request,
      "/register/check-email",
      clearAccountRegistrationCookies(),
    );
  } catch {
    return accountRedirectResponse(request, "/register?error=registration");
  }
}

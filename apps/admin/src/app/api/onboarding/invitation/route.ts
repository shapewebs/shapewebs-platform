import { activateCustomerInvitation } from "@shapewebs/auth/server";

import {
  accountFormErrorResponse,
  accountRedirectResponse,
  getSingleAccountFormValue,
  readSecureAccountForm,
} from "@/lib/account-form-security";
import { createAccountRegistrationCookies } from "@/lib/account-registration-context";
import {
  getAccountRequestIp,
  verifyAccountTurnstile,
} from "@/lib/account-turnstile";
import { getCustomerDatabaseUrl } from "@/lib/better-auth";

export async function POST(request: Request) {
  const form = await readSecureAccountForm(request, "customer_invitation");
  if (form.status !== "ok") {
    return accountFormErrorResponse(request, "/login", form.status);
  }

  const invitationToken = getSingleAccountFormValue(
    form.params,
    "invitationToken",
    128,
  );
  const turnstileToken = getSingleAccountFormValue(
    form.params,
    "turnstileToken",
    2_048,
  );

  if (
    !invitationToken ||
    !(await verifyAccountTurnstile({
      action: "customer_invitation",
      ip: getAccountRequestIp(request),
      token: turnstileToken,
    }))
  ) {
    return accountRedirectResponse(request, "/login?error=invitation");
  }

  const databaseUrl = getCustomerDatabaseUrl();
  if (!databaseUrl) {
    return accountRedirectResponse(request, "/login?error=unavailable");
  }

  try {
    const invitation = await activateCustomerInvitation({
      databaseUrl,
      invitationToken,
    });

    if (!invitation) {
      return accountRedirectResponse(request, "/login?error=invitation");
    }

    return accountRedirectResponse(
      request,
      "/register",
      await createAccountRegistrationCookies({
        email: invitation.email,
        name: invitation.name,
        registrationGrant: invitation.registrationGrant,
      }),
    );
  } catch {
    return accountRedirectResponse(request, "/login?error=invitation");
  }
}

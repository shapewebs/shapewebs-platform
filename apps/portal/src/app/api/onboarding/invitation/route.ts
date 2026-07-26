import { activateCustomerInvitation } from "@shapewebs/auth/server";

import {
  getSingleFormValue,
  portalFormErrorResponse,
  portalRedirectResponse,
  readSecurePortalForm,
} from "@/lib/form-security";
import { createPortalRegistrationCookies } from "@/lib/registration-context";
import { getPortalRequestIp, verifyPortalTurnstile } from "@/lib/turnstile";

export async function POST(request: Request) {
  const form = await readSecurePortalForm(request, "customer_invitation");
  if (form.status !== "ok") {
    return portalFormErrorResponse(request, "/login", form.status);
  }

  const invitationToken = getSingleFormValue(
    form.params,
    "invitationToken",
    128,
  );
  const turnstileToken = getSingleFormValue(
    form.params,
    "turnstileToken",
    2_048,
  );

  if (
    !invitationToken ||
    !(await verifyPortalTurnstile({
      action: "customer_invitation",
      ip: getPortalRequestIp(request),
      token: turnstileToken,
    }))
  ) {
    return portalRedirectResponse(request, "/login?error=invitation");
  }

  const databaseUrl = process.env.PORTAL_DATABASE_URL;
  if (!databaseUrl) {
    return portalRedirectResponse(request, "/login?error=unavailable");
  }

  try {
    const invitation = await activateCustomerInvitation({
      databaseUrl,
      invitationToken,
    });

    if (!invitation) {
      return portalRedirectResponse(request, "/login?error=invitation");
    }

    return portalRedirectResponse(
      request,
      "/register",
      await createPortalRegistrationCookies({
        email: invitation.email,
        name: invitation.name,
        registrationGrant: invitation.registrationGrant,
      }),
    );
  } catch {
    return portalRedirectResponse(request, "/login?error=invitation");
  }
}

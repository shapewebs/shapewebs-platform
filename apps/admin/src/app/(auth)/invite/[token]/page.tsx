import { headers } from "next/headers";
import { connection } from "next/server";
import { isCustomerBearerToken } from "@shapewebs/auth/server";
import type { Metadata } from "next";
import { Authentication, Buttons, Forms, Navigation } from "@shapewebs/ui";

import { AccountTurnstileField } from "@/components/account-turnstile-field";
import { AdminAuthShell } from "@/components/admin-auth-shell";
import { createAccountFormToken } from "@/lib/account-form-security";

export const metadata: Metadata = {
  title: "Accept invitation",
};

export default async function AccountInvitationPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  await connection();
  const { token } = await params;
  const requestHeaders = await headers();
  const validFormat = isCustomerBearerToken(token);

  return (
    <AdminAuthShell
      description={
        <p>
          This single-use invitation is bound to your email and assigned
          projects. Google and password can both be connected to the same
          Shapewebs account.
        </p>
      }
      eyebrow="Private invitation"
      title="Create your account"
    >
      <Authentication.AuthStack>
        {!validFormat ? (
          <>
            <Authentication.AuthMessage tone="error">
              This invitation is invalid or has expired.
            </Authentication.AuthMessage>
            <Authentication.AuthLinks>
              <Navigation.Link href="/login">Return to sign in</Navigation.Link>
            </Authentication.AuthLinks>
          </>
        ) : (
          <Forms.Form action="/api/onboarding/invitation" method="post">
            <input
              name="csrfToken"
              type="hidden"
              value={createAccountFormToken("customer_invitation")}
            />
            <input name="invitationToken" type="hidden" value={token} />
            <AccountTurnstileField
              action="customer_invitation"
              nonce={requestHeaders.get("x-nonce") ?? ""}
              siteKey={process.env.NEXT_PUBLIC_ACCOUNT_TURNSTILE_SITE_KEY ?? ""}
            />
            <Authentication.AuthActions>
              <Buttons.Button kind="brand" size="large" type="submit">
                Accept invitation
              </Buttons.Button>
            </Authentication.AuthActions>
          </Forms.Form>
        )}
      </Authentication.AuthStack>
    </AdminAuthShell>
  );
}

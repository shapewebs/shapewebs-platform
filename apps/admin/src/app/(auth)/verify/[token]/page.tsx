import { headers } from "next/headers";
import { connection } from "next/server";
import { isCustomerBearerToken } from "@shapewebs/auth/server";
import type { Metadata } from "next";
import { Authentication, Buttons, Forms, Navigation } from "@shapewebs/ui";

import { AccountTurnstileField } from "@/components/account-turnstile-field";
import { AdminAuthShell } from "@/components/admin-auth-shell";
import { createAccountFormToken } from "@/lib/account-form-security";

export const metadata: Metadata = {
  title: "Verify email",
};

export default async function VerifyAccountEmailPage({
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
      description={<p>Choose the password for your Shapewebs account.</p>}
      eyebrow="Mailbox verified"
      title="Set your final password"
    >
      <Authentication.AuthStack>
        {!validFormat ? (
          <>
            <Authentication.AuthMessage tone="error">
              This verification link is invalid or expired.
            </Authentication.AuthMessage>
            <Authentication.AuthLinks>
              <Navigation.Link href="/login">Return to sign in</Navigation.Link>
            </Authentication.AuthLinks>
          </>
        ) : (
          <Forms.Form action="/api/onboarding/verify" method="post">
            <input
              name="csrfToken"
              type="hidden"
              value={createAccountFormToken("customer_verification")}
            />
            <input name="verificationToken" type="hidden" value={token} />
            <Forms.PasswordField
              autoComplete="new-password"
              description="Use at least 15 characters and a unique password."
              label="Final password"
              maxLength={128}
              minLength={15}
              name="password"
              required
            />
            <Forms.PasswordField
              autoComplete="new-password"
              label="Repeat final password"
              maxLength={128}
              minLength={15}
              name="passwordConfirmation"
              required
            />
            <AccountTurnstileField
              action="customer_registration"
              nonce={requestHeaders.get("x-nonce") ?? ""}
              siteKey={process.env.NEXT_PUBLIC_ACCOUNT_TURNSTILE_SITE_KEY ?? ""}
            />
            <Authentication.AuthActions>
              <Buttons.Button kind="brand" size="large" type="submit">
                Activate account
              </Buttons.Button>
            </Authentication.AuthActions>
          </Forms.Form>
        )}
      </Authentication.AuthStack>
    </AdminAuthShell>
  );
}

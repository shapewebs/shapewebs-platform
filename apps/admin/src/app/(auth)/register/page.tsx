import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import type { Metadata } from "next";
import { Authentication, Buttons, Forms } from "@shapewebs/ui";

import { AccountTurnstileField } from "@/components/account-turnstile-field";
import { AdminAuthShell } from "@/components/admin-auth-shell";
import { createAccountFormToken } from "@/lib/account-form-security";
import { getAccountRegistrationContext } from "@/lib/account-registration-context";

export const metadata: Metadata = {
  title: "Create account",
};

export default async function AccountRegistrationPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await connection();
  const context = await getAccountRegistrationContext();
  if (!context) {
    redirect("/login?error=invitation");
  }

  const query = await searchParams;
  const requestHeaders = await headers();

  return (
    <AdminAuthShell
      description={
        <p>
          Your account email is <strong>{context.email}</strong>. Choose either
          method now; you can connect the other method to this same account
          afterward.
        </p>
      }
      eyebrow="Account setup"
      title={`Welcome, ${context.name}`}
    >
      <Authentication.AuthStack>
        {query.error ? (
          <Authentication.AuthMessage tone="error">
            Registration could not be completed. Use a strong, uncompromised
            password or the Google account matching the invited email.
          </Authentication.AuthMessage>
        ) : null}
        <Forms.Form action="/api/onboarding/register" method="post">
          <input
            name="csrfToken"
            type="hidden"
            value={createAccountFormToken("customer_registration")}
          />
          <Forms.PasswordField
            autoComplete="new-password"
            description="Use at least 15 characters and a unique password."
            label="Password"
            maxLength={128}
            minLength={15}
            name="password"
            required
          />
          <Forms.PasswordField
            autoComplete="new-password"
            label="Repeat password"
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
            <Buttons.Button
              kind="brand"
              name="method"
              size="large"
              type="submit"
              value="password"
            >
              Verify and create password
            </Buttons.Button>
          </Authentication.AuthActions>
          <Authentication.AuthDivider />
          <Authentication.AuthActions>
            <Buttons.Button
              formNoValidate
              kind="secondary"
              name="method"
              size="large"
              type="submit"
              value="google"
            >
              Verify with Google first
            </Buttons.Button>
          </Authentication.AuthActions>
        </Forms.Form>
      </Authentication.AuthStack>
    </AdminAuthShell>
  );
}

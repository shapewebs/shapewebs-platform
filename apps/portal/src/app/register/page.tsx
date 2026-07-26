import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";

import { AuthShell } from "@/components/auth-shell";
import styles from "@/components/auth-shell.module.css";
import { PortalTurnstileField } from "@/components/turnstile-field";
import { createPortalFormToken } from "@/lib/form-security";
import { getPortalRegistrationContext } from "@/lib/registration-context";

export default async function CustomerRegistrationPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await connection();
  const context = await getPortalRegistrationContext();
  if (!context) {
    redirect("/login?error=invitation");
  }

  const query = await searchParams;
  const requestHeaders = await headers();

  return (
    <AuthShell eyebrow="Account setup" title={`Welcome, ${context.name}`}>
      <p className={styles["sw-portal-copy-j6m3v8"]}>
        Your account email is <strong>{context.email}</strong>. Start with
        either method; the Security page lets you connect the other method to
        this same account immediately afterward.
      </p>
      {query.error ? (
        <p className={styles["sw-portal-message-e2q9n4"]}>
          Registration could not be completed. Try again with a strong,
          uncompromised password or Google account matching the invited email.
        </p>
      ) : null}
      <form
        action="/api/onboarding/register"
        className={styles["sw-portal-form-c5n8p2"]}
        method="post"
      >
        <input
          name="csrfToken"
          type="hidden"
          value={createPortalFormToken("customer_registration")}
        />
        <label className={styles["sw-portal-field-f9q2m6"]}>
          <span>Password</span>
          <input
            autoComplete="new-password"
            maxLength={128}
            minLength={15}
            name="password"
            required
            type="password"
          />
        </label>
        <label className={styles["sw-portal-field-f9q2m6"]}>
          <span>Repeat password</span>
          <input
            autoComplete="new-password"
            maxLength={128}
            minLength={15}
            name="passwordConfirmation"
            required
            type="password"
          />
        </label>
        <PortalTurnstileField
          action="customer_registration"
          nonce={requestHeaders.get("x-nonce") ?? ""}
          siteKey={process.env.NEXT_PUBLIC_PORTAL_TURNSTILE_SITE_KEY ?? ""}
        />
        <div className={styles["sw-portal-actions-b4v7k1"]}>
          <button
            className={styles["sw-portal-button-h3m8q5"]}
            name="method"
            type="submit"
            value="password"
          >
            Verify and create password
          </button>
          <button
            className={styles["sw-portal-button-alt-z8p1c6"]}
            formNoValidate
            name="method"
            type="submit"
            value="google"
          >
            Verify with Google first
          </button>
        </div>
      </form>
    </AuthShell>
  );
}

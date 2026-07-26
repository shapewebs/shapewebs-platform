import { headers } from "next/headers";
import { connection } from "next/server";

import { AuthShell } from "@/components/auth-shell";
import styles from "@/components/auth-shell.module.css";
import { PortalTurnstileField } from "@/components/turnstile-field";
import { createPortalFormToken } from "@/lib/form-security";

export default async function ResetCustomerPasswordPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await connection();
  const query = await searchParams;
  const token = typeof query.token === "string" ? query.token : "";
  const requestHeaders = await headers();

  return (
    <AuthShell eyebrow="Account security" title="Choose your password">
      {!token ? (
        <p className={styles["sw-portal-message-e2q9n4"]}>
          This password link is invalid or expired.
        </p>
      ) : (
        <form
          action="/api/security/reset-password"
          className={styles["sw-portal-form-c5n8p2"]}
          method="post"
        >
          <input
            name="csrfToken"
            type="hidden"
            value={createPortalFormToken("customer_method")}
          />
          <input name="token" type="hidden" value={token} />
          <label className={styles["sw-portal-field-f9q2m6"]}>
            <span>New password</span>
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
            action="customer_recovery"
            nonce={requestHeaders.get("x-nonce") ?? ""}
            siteKey={process.env.NEXT_PUBLIC_PORTAL_TURNSTILE_SITE_KEY ?? ""}
          />
          <button className={styles["sw-portal-button-h3m8q5"]} type="submit">
            Save password
          </button>
        </form>
      )}
    </AuthShell>
  );
}

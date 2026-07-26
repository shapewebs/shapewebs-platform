import { headers } from "next/headers";
import { connection } from "next/server";
import { getCustomerAuthenticationMethods } from "@shapewebs/database/server";

import { AuthShell } from "@/components/auth-shell";
import styles from "@/components/auth-shell.module.css";
import { PortalTurnstileField } from "@/components/turnstile-field";
import { requireCustomerPageSession } from "@/lib/auth";
import { getPortalDatabaseUrl } from "@/lib/auth-environment";
import { createPortalFormToken } from "@/lib/form-security";

export default async function CustomerSecurityPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await connection();
  const runtime = await requireCustomerPageSession("/settings/security");
  const databaseUrl = getPortalDatabaseUrl();
  if (!databaseUrl) {
    throw new Error("Customer authentication methods are unavailable.");
  }

  const methods = await getCustomerAuthenticationMethods(databaseUrl, {
    organizationId: runtime.authorization.organizationId,
    userId: runtime.primarySession.user.id,
  });
  const query = await searchParams;
  const requestHeaders = await headers();
  const message = query.status
    ? query.status === "google_connected"
      ? "Google is now connected to this account."
      : query.status === "password_email_sent"
        ? "Check your verified email to add a password."
        : "This sign-in method is already connected."
    : query.error
      ? "The sign-in method could not be updated. Try again securely."
      : null;

  return (
    <AuthShell eyebrow="Account security" title="Your sign-in methods">
      <p className={styles["sw-portal-copy-j6m3v8"]}>
        Both methods belong to{" "}
        <strong>{runtime.primarySession.user.email}</strong>. Once connected,
        either method opens this same account.
      </p>
      {message ? (
        <p className={styles["sw-portal-message-e2q9n4"]}>{message}</p>
      ) : null}
      <p className={styles["sw-portal-copy-j6m3v8"]}>
        Google:{" "}
        <strong>{methods.google ? "Connected" : "Not connected"}</strong>
        <br />
        Password:{" "}
        <strong>{methods.password ? "Connected" : "Not connected"}</strong>
      </p>
      {!methods.google && methods.password ? (
        <form
          action="/api/security/connect-google"
          className={styles["sw-portal-form-c5n8p2"]}
          method="post"
        >
          <input
            name="csrfToken"
            type="hidden"
            value={createPortalFormToken("customer_method")}
          />
          <label className={styles["sw-portal-field-f9q2m6"]}>
            <span>Confirm current password</span>
            <input
              autoComplete="current-password"
              maxLength={128}
              name="password"
              required
              type="password"
            />
          </label>
          <button className={styles["sw-portal-button-h3m8q5"]} type="submit">
            Connect matching Google account
          </button>
        </form>
      ) : null}
      {!methods.password && methods.google ? (
        <form
          action="/api/security/add-password"
          className={styles["sw-portal-form-c5n8p2"]}
          method="post"
        >
          <input
            name="csrfToken"
            type="hidden"
            value={createPortalFormToken("customer_method")}
          />
          <PortalTurnstileField
            action="customer_recovery"
            nonce={requestHeaders.get("x-nonce") ?? ""}
            siteKey={process.env.NEXT_PUBLIC_PORTAL_TURNSTILE_SITE_KEY ?? ""}
          />
          <button className={styles["sw-portal-button-h3m8q5"]} type="submit">
            Email me a secure password link
          </button>
        </form>
      ) : null}
      {methods.google && methods.password ? (
        <p className={styles["sw-portal-message-e2q9n4"]}>
          Complete: you can sign in with either Google or your password.
        </p>
      ) : null}
    </AuthShell>
  );
}

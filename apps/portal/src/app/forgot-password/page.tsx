import Link from "next/link";
import { headers } from "next/headers";
import { connection } from "next/server";

import { AuthShell } from "@/components/auth-shell";
import styles from "@/components/auth-shell.module.css";
import { PortalTurnstileField } from "@/components/turnstile-field";
import { createPortalFormToken } from "@/lib/form-security";

export default async function ForgotCustomerPasswordPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await connection();
  const query = await searchParams;
  const requestHeaders = await headers();

  return (
    <AuthShell eyebrow="Account recovery" title="Reset your password">
      <p className={styles["sw-portal-copy-j6m3v8"]}>
        Enter the verified email for your Shapewebs account. If that account is
        eligible, we will send a single-use link. Google sign-in remains
        available while your password is being reset.
      </p>
      {query.status === "sent" ? (
        <p className={styles["sw-portal-message-e2q9n4"]}>
          If an active account matches that address, the secure email is on its
          way.
        </p>
      ) : query.error ? (
        <p className={styles["sw-portal-message-e2q9n4"]}>
          The request could not be accepted. Complete the security check and try
          again.
        </p>
      ) : null}
      <form
        action="/api/security/request-password-reset"
        className={styles["sw-portal-form-c5n8p2"]}
        method="post"
      >
        <input
          name="csrfToken"
          type="hidden"
          value={createPortalFormToken("customer_recovery")}
        />
        <label className={styles["sw-portal-field-f9q2m6"]}>
          <span>Email</span>
          <input autoComplete="email" name="email" required type="email" />
        </label>
        <PortalTurnstileField
          action="customer_recovery"
          nonce={requestHeaders.get("x-nonce") ?? ""}
          siteKey={process.env.NEXT_PUBLIC_PORTAL_TURNSTILE_SITE_KEY ?? ""}
        />
        <button className={styles["sw-portal-button-h3m8q5"]} type="submit">
          Send secure reset link
        </button>
      </form>
      <Link className={styles["sw-portal-link-d7q4m2"]} href="/login">
        Return to sign in
      </Link>
    </AuthShell>
  );
}

import { headers } from "next/headers";
import { connection } from "next/server";
import { isCustomerBearerToken } from "@shapewebs/auth/server";

import { AuthShell } from "@/components/auth-shell";
import styles from "@/components/auth-shell.module.css";
import { PortalTurnstileField } from "@/components/turnstile-field";
import { createPortalFormToken } from "@/lib/form-security";

export default async function VerifyCustomerEmailPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  await connection();
  const { token } = await params;
  const requestHeaders = await headers();
  const validFormat = isCustomerBearerToken(token);

  return (
    <AuthShell eyebrow="Mailbox verified" title="Set your final password">
      {!validFormat ? (
        <p className={styles["sw-portal-message-e2q9n4"]}>
          This verification link is invalid or expired.
        </p>
      ) : (
        <form
          action="/api/onboarding/verify"
          className={styles["sw-portal-form-c5n8p2"]}
          method="post"
        >
          <input
            name="csrfToken"
            type="hidden"
            value={createPortalFormToken("customer_verification")}
          />
          <input name="verificationToken" type="hidden" value={token} />
          <label className={styles["sw-portal-field-f9q2m6"]}>
            <span>Final password</span>
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
            <span>Repeat final password</span>
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
          <button className={styles["sw-portal-button-h3m8q5"]} type="submit">
            Activate account
          </button>
        </form>
      )}
    </AuthShell>
  );
}

import { headers } from "next/headers";
import { connection } from "next/server";
import { isCustomerBearerToken } from "@shapewebs/auth/server";

import { AuthShell } from "@/components/auth-shell";
import styles from "@/components/auth-shell.module.css";
import { PortalTurnstileField } from "@/components/turnstile-field";
import { createPortalFormToken } from "@/lib/form-security";

export default async function CustomerInvitationPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  await connection();
  const { token } = await params;
  const requestHeaders = await headers();
  const validFormat = isCustomerBearerToken(token);

  return (
    <AuthShell eyebrow="Private invitation" title="Create your account">
      <p className={styles["sw-portal-copy-j6m3v8"]}>
        This one-time invitation is bound to your email and assigned projects.
        After it is accepted, you can connect both Google and a password to the
        same account.
      </p>
      {!validFormat ? (
        <p className={styles["sw-portal-message-e2q9n4"]}>
          This invitation is invalid or has expired.
        </p>
      ) : (
        <form
          action="/api/onboarding/invitation"
          className={styles["sw-portal-form-c5n8p2"]}
          method="post"
        >
          <input
            name="csrfToken"
            type="hidden"
            value={createPortalFormToken("customer_invitation")}
          />
          <input name="invitationToken" type="hidden" value={token} />
          <PortalTurnstileField
            action="customer_invitation"
            nonce={requestHeaders.get("x-nonce") ?? ""}
            siteKey={process.env.NEXT_PUBLIC_PORTAL_TURNSTILE_SITE_KEY ?? ""}
          />
          <button className={styles["sw-portal-button-h3m8q5"]} type="submit">
            Accept invitation
          </button>
        </form>
      )}
    </AuthShell>
  );
}

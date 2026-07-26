import Link from "next/link";
import { connection } from "next/server";

import { AuthShell } from "@/components/auth-shell";
import styles from "@/components/auth-shell.module.css";
import { requireCustomerPageSession } from "@/lib/auth";
import { createPortalFormToken } from "@/lib/form-security";

export default async function CustomerDashboardPage() {
  await connection();
  const runtime = await requireCustomerPageSession("/dashboard");

  return (
    <AuthShell
      eyebrow="Customer portal"
      title={runtime.primarySession.user.name}
    >
      <p className={styles["sw-portal-copy-j6m3v8"]}>
        Your Shapewebs account is active. Project status and customer files will
        appear here in the next portal slice.
      </p>
      <Link
        className={styles["sw-portal-link-d7q4m2"]}
        href="/settings/security"
      >
        Manage Google and password sign-in
      </Link>
      <hr className={styles["sw-portal-divider-w5k2r7"]} />
      <form action="/api/auth-flow/logout" method="post">
        <input
          name="csrfToken"
          type="hidden"
          value={createPortalFormToken("customer_logout")}
        />
        <button className={styles["sw-portal-button-alt-z8p1c6"]} type="submit">
          Sign out
        </button>
      </form>
    </AuthShell>
  );
}

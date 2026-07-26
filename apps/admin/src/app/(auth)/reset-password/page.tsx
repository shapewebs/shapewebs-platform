import { Suspense } from "react";
import { connection } from "next/server";

import { hasAdminAuthConfig } from "@/lib/better-auth";
import { ResetPasswordForm } from "./reset-password-form";
import styles from "../login/page.module.css";

export default async function ResetPasswordPage() {
  await connection();

  return (
    <main className={styles.rootD4n8k1}>
      <section className={styles.panelQ7m2v5}>
        <p className={styles.eyebrowZ3p9t2}>Shapewebs Admin</p>
        <h1 className={styles.titleR6k2m4}>Choose your password</h1>
        <p className={styles.copyH2v8q6}>
          The link is single-use. Updating a password revokes existing admin
          sessions, and the next login still requires TOTP.
        </p>
        <Suspense fallback={null}>
          <ResetPasswordForm isConfigured={hasAdminAuthConfig()} />
        </Suspense>
      </section>
    </main>
  );
}

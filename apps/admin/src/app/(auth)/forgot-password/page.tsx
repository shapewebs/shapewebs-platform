import { connection } from "next/server";

import { hasAdminAuthConfig } from "@/lib/better-auth";
import { ForgotPasswordForm } from "./forgot-password-form";
import styles from "../login/page.module.css";

export default async function ForgotPasswordPage() {
  await connection();

  return (
    <main className={styles.rootD4n8k1}>
      <section className={styles.panelQ7m2v5}>
        <p className={styles.eyebrowZ3p9t2}>Shapewebs Admin</p>
        <h1 className={styles.titleR6k2m4}>Set or recover a password</h1>
        <p className={styles.copyH2v8q6}>
          This works both for password recovery and for adding a password to an
          account originally created with Google.
        </p>
        <ForgotPasswordForm isConfigured={hasAdminAuthConfig()} />
      </section>
    </main>
  );
}

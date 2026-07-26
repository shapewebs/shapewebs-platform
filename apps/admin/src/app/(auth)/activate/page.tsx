import { connection } from "next/server";

import { hasAdminAuthConfig } from "@/lib/better-auth";
import { ActivationForm } from "./activation-form";
import styles from "../login/page.module.css";

export default async function ActivateEmployeePage() {
  await connection();

  return (
    <main className={styles.rootD4n8k1}>
      <section className={styles.panelQ7m2v5}>
        <p className={styles.eyebrowZ3p9t2}>Shapewebs Admin</p>
        <h1 className={styles.titleR6k2m4}>Activate your employee account</h1>
        <p className={styles.copyH2v8q6}>
          This creates the password method for an email already approved by a
          Shapewebs owner. Public employee registration is not available.
        </p>
        <ActivationForm isConfigured={hasAdminAuthConfig()} />
      </section>
    </main>
  );
}

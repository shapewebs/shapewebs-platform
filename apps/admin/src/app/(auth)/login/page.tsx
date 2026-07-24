import { Suspense } from "react";
import { hasAdminAuthConfig, isLocalAdminSetupMode } from "@/lib/better-auth";
import { LoginForm } from "./login-form";
import styles from "./page.module.css";

export default function LoginPage() {
  const isConfigured = hasAdminAuthConfig();
  const isLocalSetupMode = isLocalAdminSetupMode();

  return (
    <main className={styles.rootD4n8k1}>
      <section className={styles.panelQ7m2v5}>
        <p className={styles.eyebrowZ3p9t2}>Shapewebs Admin</p>
        <h1 className={styles.titleR6k2m4}>CMS access</h1>
        <p className={styles.copyH2v8q6}>
          Sign in with your allowlisted Google account, then complete a TOTP
          check before entering the CMS.
        </p>

        {isLocalSetupMode ? (
          <p className={styles.noticeStateV7m3k2}>
            Local setup mode is active for development. Protected screens are
            available for interface work until authentication is connected.
          </p>
        ) : !isConfigured ? (
          <p className={styles.noticeStateV7m3k2} role="alert">
            Authentication is unavailable because the required environment
            configuration is missing.
          </p>
        ) : null}

        <Suspense fallback={null}>
          <LoginForm isConfigured={isConfigured} />
        </Suspense>
      </section>
    </main>
  );
}

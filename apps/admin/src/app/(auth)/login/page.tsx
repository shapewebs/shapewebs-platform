import { Suspense } from "react";
import { connection } from "next/server";

import { AdminAuthShell } from "@/components/admin-auth-shell";
import { hasAdminAuthConfig, isLocalAdminSetupMode } from "@/lib/better-auth";
import { LoginForm } from "./login-form";
import styles from "./page.module.css";

export default async function LoginPage() {
  await connection();

  const isConfigured = hasAdminAuthConfig();
  const isLocalSetupMode = isLocalAdminSetupMode();

  return (
    <AdminAuthShell
      description={
        <p>
          Use Google or your password for the same allowlisted employee account,
          then complete TOTP before entering the CMS.
        </p>
      }
      title="Sign in"
    >
      {isLocalSetupMode ? (
        <p className={styles["sw-auth-notice-p5a1d7"]}>
          Local setup mode is active for development. Protected screens are
          available for interface work until authentication is connected.
        </p>
      ) : !isConfigured ? (
        <p className={styles["sw-auth-notice-p5a1d7"]} role="alert">
          Authentication is unavailable because the required environment
          configuration is missing.
        </p>
      ) : null}

      <Suspense fallback={null}>
        <LoginForm isConfigured={isConfigured} />
      </Suspense>
    </AdminAuthShell>
  );
}

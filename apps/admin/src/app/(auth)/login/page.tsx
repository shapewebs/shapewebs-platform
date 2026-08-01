import { Suspense } from "react";
import { connection } from "next/server";
import type { Metadata } from "next";
import { AdminAuthShell } from "@/components/admin-auth-shell";
import { hasAdminAuthConfig, isLocalAdminSetupMode } from "@/lib/better-auth";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Sign in",
};

export default async function LoginPage() {
  await connection();

  const isConfigured = hasAdminAuthConfig();
  const isLocalSetupMode = isLocalAdminSetupMode();

  return (
    <AdminAuthShell
      description={
        <p>
          Use Google or your password for the same Shapewebs account. Employee
          studio access adds the required TOTP check after sign-in.
        </p>
      }
      minimal
      title="Sign in"
    >
      <Suspense fallback={null}>
        <LoginForm
          isConfigured={isConfigured}
          isLocalSetupMode={isLocalSetupMode}
        />
      </Suspense>
    </AdminAuthShell>
  );
}

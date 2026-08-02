import { Suspense } from "react";
import { connection } from "next/server";
import type { Metadata } from "next";
import { Feedback } from "@shapewebs/ui";
import { AdminAuthShell } from "@/components/admin-auth-shell";
import { hasAdminAuthConfig } from "@/lib/better-auth";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Sign in",
};

export default async function LoginPage() {
  await connection();

  const isConfigured = hasAdminAuthConfig();

  return (
    <AdminAuthShell
      description={
        <p>
          Use Google or your password for the same Shapewebs account. Employee
          studio access adds the required TOTP check after sign-in.
        </p>
      }
      minimal
      overlay={
        !isConfigured ? (
          <Feedback.NotificationViewport>
            <Feedback.Notification delay="initial" tone="error">
              Authentication is unavailable in this environment.
            </Feedback.Notification>
          </Feedback.NotificationViewport>
        ) : undefined
      }
      title="Sign in"
    >
      <Suspense fallback={null}>
        <LoginForm isConfigured={isConfigured} />
      </Suspense>
    </AdminAuthShell>
  );
}

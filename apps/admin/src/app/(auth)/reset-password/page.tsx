import { Suspense } from "react";
import { connection } from "next/server";
import type { Metadata } from "next";

import { AdminAuthShell } from "@/components/admin-auth-shell";
import { hasAdminAuthConfig } from "@/lib/better-auth";
import { ResetPasswordForm } from "./reset-password-form";
import { Authentication } from "@shapewebs/ui";

export const metadata: Metadata = {
  title: "Choose password",
};

export default async function ResetPasswordPage() {
  await connection();

  return (
    <AdminAuthShell
      description={
        <p>
          The link is single-use. Updating a password revokes existing admin
          sessions, and the next login still requires TOTP.
        </p>
      }
      title="Choose your password"
    >
      <Suspense
        fallback={<Authentication.AuthPending label="Checking password link" />}
      >
        <ResetPasswordForm isConfigured={hasAdminAuthConfig()} />
      </Suspense>
    </AdminAuthShell>
  );
}

import { connection } from "next/server";

import { AdminAuthShell } from "@/components/admin-auth-shell";
import { hasAdminAuthConfig } from "@/lib/better-auth";
import { ForgotPasswordForm } from "./forgot-password-form";

export default async function ForgotPasswordPage() {
  await connection();

  return (
    <AdminAuthShell
      description={
        <p>
          This works both for password recovery and for adding a password to an
          account originally created with Google.
        </p>
      }
      title="Set or recover a password"
    >
      <ForgotPasswordForm isConfigured={hasAdminAuthConfig()} />
    </AdminAuthShell>
  );
}

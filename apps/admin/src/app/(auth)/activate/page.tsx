import { connection } from "next/server";

import { AdminAuthShell } from "@/components/admin-auth-shell";
import { hasAdminAuthConfig } from "@/lib/better-auth";
import { ActivationForm } from "./activation-form";

export default async function ActivateEmployeePage() {
  await connection();

  return (
    <AdminAuthShell
      description={
        <p>
          This creates the password method for an email already approved by a
          Shapewebs owner. Public employee registration is not available.
        </p>
      }
      title="Activate your employee account"
    >
      <ActivationForm isConfigured={hasAdminAuthConfig()} />
    </AdminAuthShell>
  );
}

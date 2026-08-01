import { connection } from "next/server";
import { Authentication, Navigation } from "@shapewebs/ui";

import { AdminAuthShell } from "@/components/admin-auth-shell";
import { AccountLogoutButton } from "@/components/account-logout-button";
import { requireCustomerSession } from "@/lib/auth";

export default async function CustomerWorkspacePage() {
  await connection();

  const runtime = await requireCustomerSession("/customer");

  return (
    <AdminAuthShell
      description={
        <p>
          Project status, milestones and approved customer files will live in
          this workspace.
        </p>
      }
      eyebrow="Customer workspace"
      title={runtime.primarySession.user.name}
    >
      <Authentication.AuthStack>
        <Authentication.AuthLinks>
          <Navigation.Link href="/account/security">
            Account security
          </Navigation.Link>
        </Authentication.AuthLinks>
        <AccountLogoutButton />
      </Authentication.AuthStack>
    </AdminAuthShell>
  );
}

import { connection } from "next/server";
import { getAdminAuthenticationMethods } from "@shapewebs/database/server";
import { Authentication, Navigation } from "@shapewebs/ui";

import { AccountLogoutButton } from "@/components/account-logout-button";
import { AccountSecurityMethods } from "@/components/account-security-methods";
import { AdminAuthShell } from "@/components/admin-auth-shell";
import { requireAccountSession } from "@/lib/auth";
import { getAdminDatabaseUrl } from "@/lib/better-auth";

export default async function AccountSecurityPage({
  searchParams,
}: {
  searchParams: Promise<{
    passkeyId?: string | string[];
    resume?: string | string[];
  }>;
}) {
  await connection();

  const query = await searchParams;
  const resume = typeof query.resume === "string" ? query.resume : null;
  const passkeyId =
    typeof query.passkeyId === "string" &&
    /^[A-Za-z0-9_-]{1,128}$/.test(query.passkeyId)
      ? query.passkeyId
      : undefined;
  const runtime = await requireAccountSession("/account/security");
  const databaseUrl = getAdminDatabaseUrl();
  if (!databaseUrl) {
    throw new Error("Account authentication methods are unavailable.");
  }

  const methods = await getAdminAuthenticationMethods(
    databaseUrl,
    runtime.primarySession.user.id,
  );

  return (
    <AdminAuthShell
      description={
        <p>
          Manage the secure ways you enter your account. Methods belong to one
          identity and do not change your customer or studio permissions.
        </p>
      }
      expanded
      eyebrow="Account security"
      title="Your sign-in methods"
    >
      <Authentication.AuthStack>
        <AccountSecurityMethods
          customerAccess={runtime.customerAuthorization !== null}
          email={runtime.primarySession.user.email}
          initialMethods={methods}
          resumePasskeyEnrollment={resume === "passkey-add"}
          resumePasskeyRemovalId={
            resume === "passkey-delete" ? passkeyId : undefined
          }
          resumePasswordLink={resume === "password-link"}
          staffAccess={runtime.authorization !== null}
        />
        <Authentication.AuthLinks>
          <Navigation.Link href="/dashboard">
            Return to your workspace
          </Navigation.Link>
        </Authentication.AuthLinks>
        <AccountLogoutButton />
      </Authentication.AuthStack>
    </AdminAuthShell>
  );
}

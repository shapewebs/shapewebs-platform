import { getAdminAuthenticationMethods } from "@shapewebs/database/server";

import { AdminPage } from "@/components/admin-page";
import { requireAdminSession } from "@/lib/auth";
import { getAdminDatabaseUrl } from "@/lib/better-auth";
import { SecurityMethods } from "./security-methods";

export default async function AccountSecurityPage({
  searchParams,
}: {
  searchParams: Promise<{
    resume?: string | string[];
  }>;
}) {
  const query = await searchParams;
  const runtime = await requireAdminSession({
    redirectTo: "/account/security",
  });
  const databaseUrl = getAdminDatabaseUrl();
  const methods =
    runtime.setupMode || !databaseUrl || !runtime.primarySession
      ? { google: false, password: false }
      : await getAdminAuthenticationMethods(
          databaseUrl,
          runtime.primarySession.user.id,
        );

  return (
    <AdminPage
      description={
        <p>
          Manage the secure ways you enter Shapewebs Admin. Methods can be
          added, but the last method cannot be removed through this interface.
        </p>
      }
      eyebrow="System"
      title="Your login methods"
    >
      {!runtime.setupMode && runtime.primarySession ? (
        <SecurityMethods
          email={runtime.primarySession.user.email}
          initialMethods={methods}
          resumePasswordLink={query.resume === "password-link"}
        />
      ) : null}
    </AdminPage>
  );
}

import { getAdminAuthenticationMethods } from "@shapewebs/database/server";

import { requireAdminSession } from "@/lib/auth";
import { getAdminDatabaseUrl } from "@/lib/better-auth";
import { SecurityMethods } from "./security-methods";
import styles from "./page.module.css";

export default async function AccountSecurityPage() {
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
    <main className={styles["sw-security-root-a3m8q2"]}>
      <header className={styles["sw-security-header-c6p2v9"]}>
        <p className={styles["sw-security-eyebrow-z5k8m2"]}>Account security</p>
        <h1>Your login methods</h1>
        <p>
          Manage the secure ways you enter Shapewebs Admin. Methods can be
          added, but the last method cannot be removed through this interface.
        </p>
      </header>
      {!runtime.setupMode && runtime.primarySession ? (
        <SecurityMethods
          email={runtime.primarySession.user.email}
          initialMethods={methods}
        />
      ) : null}
    </main>
  );
}

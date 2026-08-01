import Link from "next/link";
import { connection } from "next/server";
import { Brand } from "@shapewebs/ui";

import { requireAdminSession } from "@/lib/auth";
import { AdminNavigation } from "./admin-navigation";
import { LogoutButton } from "./logout-button";
import styles from "./layout.module.css";

type DashboardLayoutProps = Readonly<{
  children: React.ReactNode;
}>;

export default async function DashboardLayout({
  children,
}: DashboardLayoutProps) {
  await connection();

  const runtime = await requireAdminSession({
    redirectTo: "/dashboard",
  });

  return (
    <div className={styles["adminshell-root-yuojsd"]}>
      <aside className={styles["adminshell-sidebar-emhea0"]}>
        <div className={styles["adminshell-top-67eapf"]}>
          <Link
            aria-label="Shapewebs admin overview"
            className={styles["adminshell-brand-dnxo7l"]}
            href="/dashboard"
            prefetch={false}
          >
            <Brand.ShapewebsBrand />
            <span className={styles["adminshell-studio-vudl9c"]}>Studio</span>
          </Link>
          <AdminNavigation />
        </div>

        <div className={styles["adminshell-profile-iwgyka"]}>
          <div className={styles["adminshell-identity-1zkxby"]}>
            <strong>
              {runtime.setupMode
                ? "Local setup"
                : (runtime.session?.profile.displayName ?? "Shapewebs member")}
            </strong>
            <span>{runtime.setupMode ? "Development" : "Employee"}</span>
          </div>
          {!runtime.setupMode ? <LogoutButton /> : null}
        </div>
      </aside>

      <div className={styles["adminshell-content-qto7no"]}>
        {runtime.setupMode ? (
          <div className={styles["adminshell-notice-2ld3qg"]}>
            Authentication is not configured, so this development server is
            using local setup mode with fallback content and read-only editorial
            screens.
          </div>
        ) : null}
        {children}
      </div>
    </div>
  );
}

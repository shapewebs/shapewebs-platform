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
    <div className={styles["sw-adminshell-root-f9s5w7"]}>
      <aside className={styles["sw-adminshell-sidebar-g1t6x8"]}>
        <div className={styles["sw-adminshell-top-h2v7y9"]}>
          <Link
            aria-label="Shapewebs admin overview"
            className={styles["sw-adminshell-brand-j3w8z1"]}
            href="/dashboard"
            prefetch={false}
          >
            <Brand.ShapewebsBrand />
            <span className={styles["sw-adminshell-studio-k4x9a2"]}>
              Studio
            </span>
          </Link>
          <AdminNavigation />
        </div>

        <div className={styles["sw-adminshell-profile-m5y1b3"]}>
          <div className={styles["sw-adminshell-identity-n6z2c4"]}>
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

      <div className={styles["sw-adminshell-content-p7a3d5"]}>
        {runtime.setupMode ? (
          <div className={styles["sw-adminshell-notice-q8b4e6"]}>
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

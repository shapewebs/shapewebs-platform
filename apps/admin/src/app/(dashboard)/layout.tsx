import Link from "next/link";
import { requireAdminSession } from "@/lib/auth";
import { siteConfig } from "@shapewebs/config";
import { LogoutButton } from "./logout-button";
import styles from "./layout.module.css";

const sections = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/content", label: "Content" },
  { href: "/media", label: "Media" },
  { href: "/submissions", label: "Forms" },
  { href: "/settings", label: "Settings" },
  { href: "/audit", label: "Audit" },
] as const;

type DashboardLayoutProps = Readonly<{
  children: React.ReactNode;
}>;

export default async function DashboardLayout({
  children,
}: DashboardLayoutProps) {
  const runtime = await requireAdminSession({
    redirectTo: "/dashboard",
  });

  return (
    <div className={styles.shellK4n8p1}>
      <aside className={styles.sidebarM7q2r5}>
        <div className={styles.brandZ2m6k8}>
          <p className={styles.eyebrowV5p1n3}>Private Workspace</p>
          <h1>{siteConfig.name} Admin</h1>
          {runtime.setupMode ? (
            <p className={styles.metaCopyN4p8q2}>Local setup mode</p>
          ) : runtime.session ? (
            <p className={styles.metaCopyN4p8q2}>
              {runtime.session.profile.displayName}
            </p>
          ) : null}
        </div>

        <nav aria-label="Admin navigation" className={styles.navP6k3m4}>
          {sections.map((section) => (
            <Link className={styles.linkB7m2q9} href={section.href} key={section.href}>
              {section.label}
            </Link>
          ))}
        </nav>

        {!runtime.setupMode ? <LogoutButton /> : null}
      </aside>

      <div className={styles.contentT9q4m6}>
        {runtime.setupMode ? (
          <div className={styles.setupBannerP6n2v1}>
            Supabase auth is not configured, so the admin app is rendering in a
            local setup mode with fallback content and read-only editorial
            screens.
          </div>
        ) : null}
        {children}
      </div>
    </div>
  );
}

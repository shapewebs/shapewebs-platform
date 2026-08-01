"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import styles from "./layout.module.css";

const navigationGroups = [
  {
    label: "Workspace",
    links: [{ href: "/dashboard", label: "Overview" }],
  },
  {
    label: "Manage",
    links: [
      { href: "/content", label: "Content" },
      { href: "/media", label: "Media" },
      { href: "/submissions", label: "Submissions" },
    ],
  },
  {
    label: "System",
    links: [
      { href: "/settings", label: "Settings" },
      { href: "/account/security", label: "Account security" },
      { href: "/audit", label: "Audit log" },
    ],
  },
] as const;

function routeIsActive(pathname: string, href: string) {
  return (
    pathname === href ||
    (href !== "/dashboard" && pathname.startsWith(`${href}/`))
  );
}

export function AdminNavigation() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Admin navigation"
      className={styles["adminnav-root-nrcm2n"]}
    >
      {navigationGroups.map((group) => (
        <section className={styles["adminnav-group-hihuqw"]} key={group.label}>
          <h2 className={styles["adminnav-label-rbq4ib"]}>{group.label}</h2>
          <div className={styles["adminnav-links-q7gwv2"]}>
            {group.links.map((link) => {
              const active = routeIsActive(pathname, link.href);

              return (
                <Link
                  aria-current={active ? "page" : undefined}
                  className={styles["adminnav-link-a5odh6"]}
                  href={link.href}
                  key={link.href}
                  prefetch={false}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>
        </section>
      ))}
    </nav>
  );
}

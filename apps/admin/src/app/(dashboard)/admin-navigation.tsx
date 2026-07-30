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
      className={styles["sw-adminnav-root-a4m9q2"]}
    >
      {navigationGroups.map((group) => (
        <section
          className={styles["sw-adminnav-group-b5n1r3"]}
          key={group.label}
        >
          <h2 className={styles["sw-adminnav-label-c6p2s4"]}>{group.label}</h2>
          <div className={styles["sw-adminnav-links-d7q3t5"]}>
            {group.links.map((link) => {
              const active = routeIsActive(pathname, link.href);

              return (
                <Link
                  aria-current={active ? "page" : undefined}
                  className={styles["sw-adminnav-link-e8r4v6"]}
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

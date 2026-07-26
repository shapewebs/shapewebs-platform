import Link from "next/link";

import styles from "./auth-shell.module.css";

export function AuthShell({
  children,
  eyebrow,
  title,
}: {
  children: React.ReactNode;
  eyebrow: string;
  title: string;
}) {
  return (
    <main className={styles["sw-portal-main-m2q8v4"]}>
      <section className={styles["sw-portal-card-p7k3n9"]}>
        <Link className={styles["sw-portal-brand-r4m9x2"]} href="/dashboard">
          Shapewebs
        </Link>
        <header className={styles["sw-portal-header-t8v2q5"]}>
          <p className={styles["sw-portal-eyebrow-a3k7m1"]}>{eyebrow}</p>
          <h1>{title}</h1>
        </header>
        {children}
      </section>
    </main>
  );
}

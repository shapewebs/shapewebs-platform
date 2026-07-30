import type { ReactNode } from "react";
import Link from "next/link";

import { Brand, Layout } from "@shapewebs/ui";

import styles from "./admin-auth-shell.module.css";

type AdminAuthShellProps = Readonly<{
  children: ReactNode;
  description: ReactNode;
  eyebrow?: string;
  title: string;
  wide?: boolean;
}>;

export function AdminAuthShell({
  children,
  description,
  eyebrow = "Shapewebs Studio",
  title,
  wide = false,
}: AdminAuthShellProps) {
  return (
    <main className={styles["sw-authshell-root-a4m9q2"]}>
      <div
        className={
          wide
            ? styles["sw-authshell-wide-b5n1r3"]
            : styles["sw-authshell-default-c6p2s4"]
        }
      >
        <Link
          aria-label="Shapewebs admin sign in"
          className={styles["sw-authshell-brand-d7q3t5"]}
          href="/login"
          prefetch={false}
        >
          <Brand.ShapewebsBrand />
        </Link>

        <Layout.Surface
          className={styles["sw-authshell-panel-e8r4v6"]}
          level="raised"
          padding="large"
        >
          <header className={styles["sw-authshell-heading-f9s5w7"]}>
            <p className={styles["sw-authshell-eyebrow-g1t6x8"]}>{eyebrow}</p>
            <h1 className={styles["sw-authshell-title-h2v7y9"]}>{title}</h1>
            <div className={styles["sw-authshell-copy-j3w8z1"]}>
              {description}
            </div>
          </header>
          {children}
        </Layout.Surface>

        <p className={styles["sw-authshell-footnote-k4x9a2"]}>
          Private employee access
        </p>
      </div>
    </main>
  );
}

import type { ReactNode } from "react";

import { Layout } from "@shapewebs/ui";

import styles from "./admin-page.module.css";

type AdminPageProps = Readonly<{
  actions?: ReactNode;
  children: ReactNode;
  description?: ReactNode;
  eyebrow?: string;
  title: string;
}>;

type AdminEmptyStateProps = Readonly<{
  description: ReactNode;
  title: string;
}>;

export function AdminPage({
  actions,
  children,
  description,
  eyebrow,
  title,
}: AdminPageProps) {
  return (
    <main className={styles["sw-adminpage-root-a3m8q2"]}>
      <Layout.Container
        className={styles["sw-adminpage-container-b4n9r3"]}
        size="wide"
      >
        <header className={styles["sw-adminpage-header-c5p1s4"]}>
          <div className={styles["sw-adminpage-heading-d6q2t5"]}>
            {eyebrow ? (
              <p className={styles["sw-adminpage-eyebrow-e7r3v6"]}>{eyebrow}</p>
            ) : null}
            <h1 className={styles["sw-adminpage-title-f8s4w7"]}>{title}</h1>
            {description ? (
              <div className={styles["sw-adminpage-copy-g9t5x8"]}>
                {description}
              </div>
            ) : null}
          </div>
          {actions ? (
            <div className={styles["sw-adminpage-actions-h1v6y9"]}>
              {actions}
            </div>
          ) : null}
        </header>
        <div className={styles["sw-adminpage-body-j2w7z1"]}>{children}</div>
      </Layout.Container>
    </main>
  );
}

export function AdminEmptyState({ description, title }: AdminEmptyStateProps) {
  return (
    <section className={styles["sw-adminempty-root-k3x8a2"]}>
      <h2 className={styles["sw-adminempty-title-m4y9b3"]}>{title}</h2>
      <div className={styles["sw-adminempty-copy-n5z1c4"]}>{description}</div>
    </section>
  );
}

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
    <main className={styles["adminpage-root-4kofnw"]}>
      <Layout.Container
        className={styles["adminpage-container-jb61v1"]}
        size="wide"
      >
        <header className={styles["adminpage-header-tfxy9j"]}>
          <div className={styles["adminpage-heading-k8denu"]}>
            {eyebrow ? (
              <p className={styles["adminpage-eyebrow-lio7ky"]}>{eyebrow}</p>
            ) : null}
            <h1 className={styles["adminpage-title-kmrzwi"]}>{title}</h1>
            {description ? (
              <div className={styles["adminpage-copy-36fo5s"]}>
                {description}
              </div>
            ) : null}
          </div>
          {actions ? (
            <div className={styles["adminpage-actions-fe93az"]}>{actions}</div>
          ) : null}
        </header>
        <div className={styles["adminpage-body-3kcr32"]}>{children}</div>
      </Layout.Container>
    </main>
  );
}

export function AdminEmptyState({ description, title }: AdminEmptyStateProps) {
  return (
    <section className={styles["adminempty-root-9g3pok"]}>
      <h2 className={styles["adminempty-title-r8s2ml"]}>{title}</h2>
      <div className={styles["adminempty-copy-gqwx80"]}>{description}</div>
    </section>
  );
}

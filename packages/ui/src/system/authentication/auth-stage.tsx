import type { ReactNode } from "react";

import styles from "./auth-stage.module.css";

export type AuthStageHeaderProps = Readonly<{
  description?: ReactNode;
  eyebrow?: ReactNode;
  title: ReactNode;
}>;

export function AuthStageHeader({
  description,
  eyebrow,
  title,
}: AuthStageHeaderProps) {
  return (
    <header
      className={styles["authstage-header-h3zdki"]}
      data-component-status="styled"
      data-slot="auth-stage-header"
    >
      {eyebrow ? (
        <p className={styles["authstage-eyebrow-gdna63"]}>{eyebrow}</p>
      ) : null}
      <h1 className={styles["authstage-title-pg8m01"]}>{title}</h1>
      {description ? (
        <div className={styles["authstage-description-lucf6e"]}>
          {description}
        </div>
      ) : null}
    </header>
  );
}

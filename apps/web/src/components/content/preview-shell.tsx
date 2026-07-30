import { Buttons } from "@shapewebs/ui";

import styles from "./preview-shell.module.css";

type PreviewShellProps = Readonly<{
  children: React.ReactNode;
}>;

export function PreviewShell({ children }: PreviewShellProps) {
  return (
    <div className={styles["sw-preview-shell-a3m8q1"]}>
      <aside
        aria-label="Content preview"
        className={styles["sw-preview-banner-b4n9r2"]}
      >
        <span>Private CMS preview</span>
        <form action="/api/preview/exit" method="post">
          <Buttons.Button kind="secondary" size="small" type="submit">
            Exit preview
          </Buttons.Button>
        </form>
      </aside>
      <main className={styles["sw-preview-main-d6q2t4"]}>{children}</main>
    </div>
  );
}

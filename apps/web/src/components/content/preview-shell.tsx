import { Button } from "@shapewebs/ui/button";

import styles from "./preview-shell.module.css";

type PreviewShellProps = Readonly<{
  children: React.ReactNode;
}>;

export function PreviewShell({ children }: PreviewShellProps) {
  return (
    <div className={styles["preview-shell-i15yyt"]}>
      <aside
        aria-label="Content preview"
        className={styles["preview-banner-za6e13"]}
      >
        <span>Private CMS preview</span>
        <form action="/api/preview/exit" method="post">
          <Button kind="secondary" size="small" type="submit">
            Exit preview
          </Button>
        </form>
      </aside>
      <main className={styles["preview-main-l19ng4"]}>{children}</main>
    </div>
  );
}

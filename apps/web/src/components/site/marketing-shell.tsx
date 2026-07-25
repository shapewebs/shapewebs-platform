import { SiteFooter } from "./site-footer";
import { SiteHeader } from "./site-header";
import styles from "./marketing-shell.module.css";

type MarketingShellProps = Readonly<{
  children: React.ReactNode;
  preview?: boolean;
}>;

export function MarketingShell({
  children,
  preview = false,
}: MarketingShellProps) {
  return (
    <div className={styles["sw-marketing-shell-g6p2v8"]}>
      {preview ? (
        <aside
          aria-label="Content preview"
          className={styles["sw-preview-banner-r7m2q5"]}
        >
          <span>Private CMS preview</span>
          <form action="/api/preview/exit" method="post">
            <button className={styles["sw-preview-exit-k4n8p2"]} type="submit">
              Exit preview
            </button>
          </form>
        </aside>
      ) : null}
      <SiteHeader />
      <main className={styles["sw-marketing-main-h3k8n1"]}>{children}</main>
      <SiteFooter />
    </div>
  );
}

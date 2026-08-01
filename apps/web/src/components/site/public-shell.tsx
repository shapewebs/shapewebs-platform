import { SiteFooter } from "./site-footer";
import { SiteHeader } from "./site-header";
import styles from "./public-shell.module.css";

type PublicShellProps = Readonly<{
  children: React.ReactNode;
}>;

export function PublicShell({ children }: PublicShellProps) {
  return (
    <div className={styles["public-shell-i1mz07"]}>
      <SiteHeader />
      <main className={styles["public-main-9oimqj"]}>{children}</main>
      <SiteFooter />
    </div>
  );
}

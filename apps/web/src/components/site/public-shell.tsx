import { SiteFooter } from "./site-footer";
import { SiteHeader } from "./site-header";
import styles from "./public-shell.module.css";

type PublicShellProps = Readonly<{
  children: React.ReactNode;
}>;

export function PublicShell({ children }: PublicShellProps) {
  return (
    <div className={styles["sw-public-shell-g1t6x8"]}>
      <SiteHeader />
      <main className={styles["sw-public-main-h2v7y9"]}>{children}</main>
      <SiteFooter />
    </div>
  );
}

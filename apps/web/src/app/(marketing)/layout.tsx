import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import styles from "./layout.module.css";

export default function MarketingLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className={styles.shellG6p2v8}>
      <SiteHeader />
      <main className={styles.mainH3k8n1}>{children}</main>
      <SiteFooter />
    </div>
  );
}

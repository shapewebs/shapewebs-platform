import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { hasContentPreviewSession } from "@/lib/content";
import styles from "./layout.module.css";

export default async function MarketingLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const previewEnabled = await hasContentPreviewSession();

  return (
    <div className={styles.shellG6p2v8}>
      {previewEnabled ? (
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
      <main className={styles.mainH3k8n1}>{children}</main>
      <SiteFooter />
    </div>
  );
}

import type { PublishedDocument } from "@shapewebs/database/server";
import { Layout, Navigation } from "@shapewebs/ui";

import { ContentRenderer } from "./content-renderer";
import styles from "./content-page.module.css";

type ContentPageProps = {
  document: PublishedDocument;
};

export function ContentPage({ document }: ContentPageProps) {
  return (
    <section className={styles["sw-contentpage-root-a4m9q2"]}>
      <Layout.Container className={styles["sw-contentpage-container-b5n1r3"]}>
        <header className={styles["sw-contentpage-header-c6p2s4"]}>
          <p className={styles["sw-contentpage-kicker-d7q3t5"]}>
            {document.contentType}
          </p>
          <h1>{document.title}</h1>
          {document.summary ? (
            <p className={styles["sw-contentpage-summary-e8r4v6"]}>
              {document.summary}
            </p>
          ) : null}
        </header>

        <ContentRenderer document={document.content} />

        <footer className={styles["sw-contentpage-footer-f9s5w7"]}>
          <Navigation.Link href="/">Return to homepage</Navigation.Link>
        </footer>
      </Layout.Container>
    </section>
  );
}

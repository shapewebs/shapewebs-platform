import type { PublishedDocument } from "@shapewebs/database/server";
import { Container } from "@shapewebs/ui/container";
import { Link } from "@shapewebs/ui/link";

import { ContentRenderer } from "./content-renderer";
import styles from "./content-page.module.css";

type ContentPageProps = {
  document: PublishedDocument;
};

export function ContentPage({ document }: ContentPageProps) {
  return (
    <section className={styles["contentpage-root-c7j9r7"]}>
      <Container className={styles["contentpage-container-2ao08t"]}>
        <header className={styles["contentpage-header-49kq95"]}>
          <p className={styles["contentpage-kicker-5fiwhj"]}>
            {document.contentType}
          </p>
          <h1>{document.title}</h1>
          {document.summary ? (
            <p className={styles["contentpage-summary-3d7vvm"]}>
              {document.summary}
            </p>
          ) : null}
        </header>

        <ContentRenderer document={document.content} />

        <footer className={styles["contentpage-footer-hg1pri"]}>
          <Link href="/">Return to homepage</Link>
        </footer>
      </Container>
    </section>
  );
}

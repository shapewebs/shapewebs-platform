import Link from "next/link";
import type { PublishedDocument } from "@shapewebs/db";
import { ContentRenderer } from "./content-renderer";
import styles from "./content-page.module.css";

type ContentPageProps = {
  document: PublishedDocument;
};

export function ContentPage({ document }: ContentPageProps) {
  return (
    <section className={styles.pageF6m2q4}>
      <div className={styles.containerP4m8q1}>
        <header className={styles.headerN8m3q2}>
          <p className={styles.kickerT7m1p4}>{document.contentType}</p>
          <h1>{document.title}</h1>
          {document.summary ? <p className={styles.summaryM4p2q8}>{document.summary}</p> : null}
        </header>

        <ContentRenderer document={document.content} />

        <footer className={styles.footerQ8m1r5}>
          <Link className={styles.backLinkV2m6q4} href="/contact">
            Start a project conversation
          </Link>
        </footer>
      </div>
    </section>
  );
}

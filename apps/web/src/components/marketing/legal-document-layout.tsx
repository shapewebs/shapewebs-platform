import styles from "./legal-document-layout.module.css";

type LegalSection = {
  title: string;
  paragraphs: readonly string[];
};

type LegalDocumentLayoutProps = {
  title: string;
  intro: string;
  effectiveDate: string;
  lastUpdated: string;
  highlights: readonly string[];
  sections: readonly LegalSection[];
};

export function LegalDocumentLayout({
  title,
  intro,
  effectiveDate,
  lastUpdated,
  highlights,
  sections,
}: LegalDocumentLayoutProps) {
  return (
    <section className={styles.root}>
      <aside className={styles.summary}>
        <div className={styles.summaryList}>
          <p className={styles.summaryLabel}>Highlights</p>
          {highlights.map((item) => (
            <p className={styles.summaryItem} key={item}>
              {item}
            </p>
          ))}
        </div>

        <div className={styles.dates}>
          <p className={styles.datesLabel}>Document details</p>
          <p className={styles.dateRow}>Effective: {effectiveDate}</p>
          <p className={styles.dateRow}>Updated: {lastUpdated}</p>
        </div>
      </aside>

      <article className={styles.content}>
        <header className={styles.header}>
          <h2 className={styles.title}>{title}</h2>
          <p className={styles.intro}>{intro}</p>
        </header>

        {sections.map((section) => (
          <section className={styles.section} key={section.title}>
            <h3 className={styles.sectionTitle}>{section.title}</h3>
            {section.paragraphs.map((paragraph) => (
              <p className={styles.paragraph} key={paragraph}>
                {paragraph}
              </p>
            ))}
          </section>
        ))}
      </article>
    </section>
  );
}

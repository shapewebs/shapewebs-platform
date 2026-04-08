import styles from "./page.module.css";

const widgets = [
  "Drafts waiting for review",
  "Published content by type",
  "Recent submissions",
  "Recent audit log entries",
  "Translation completeness",
  "Scheduled publishing queue",
] as const;

export default function DashboardPage() {
  return (
    <main className={styles.rootQ8n2m5}>
      <header className={styles.headerM3v7k1}>
        <p className={styles.eyebrowN5q2t8}>Admin</p>
        <h1 className={styles.titleB6p8k3}>Shapewebs CMS</h1>
        <p className={styles.copyT4m9v1}>
          Phase 0 foundation: the dashboard shell is ready for Supabase auth,
          content CRUD, compliance settings, and editorial workflows.
        </p>
      </header>

      <section className={styles.gridL9p4r2}>
        {widgets.map((widget) => (
          <article className={styles.cardG2m7k4} key={widget}>
            <h2>{widget}</h2>
            <p>Implementation hook prepared for the next CMS phase.</p>
          </article>
        ))}
      </section>
    </main>
  );
}

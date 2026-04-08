import { listContactSubmissions } from "@shapewebs/db";
import { getAdminRuntimeState } from "@/lib/auth";
import styles from "./page.module.css";

export default async function SubmissionsPage() {
  const runtime = await getAdminRuntimeState();
  const submissions = await listContactSubmissions(runtime.supabase);

  return (
    <main className={styles.rootW6m2q3}>
      <header className={styles.headerN5m2q8}>
        <p className={styles.eyebrowQ4m7p1}>Forms</p>
        <h1>Submissions</h1>
        <p>Stored contact and project inquiry records appear here with their current review state.</p>
      </header>

      <section className={styles.tableM4p8q2}>
        {submissions.map((submission) => (
          <article className={styles.rowF7m3q4} key={submission.id}>
            <div className={styles.primaryT5m1q9}>
              <strong>{submission.name}</strong>
              <span>{submission.email}</span>
            </div>
            <span>{submission.formType}</span>
            <span>{submission.localeCode}</span>
            <span>{submission.status}</span>
            <p>{submission.message}</p>
          </article>
        ))}
      </section>
    </main>
  );
}

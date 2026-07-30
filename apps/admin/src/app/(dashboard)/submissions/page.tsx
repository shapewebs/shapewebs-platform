import { listLeadSubmissions } from "@shapewebs/database/server";

import { AdminEmptyState, AdminPage } from "@/components/admin-page";
import { requireAdminSession } from "@/lib/auth";
import { getAdminDatabaseUrl } from "@/lib/better-auth";
import styles from "./page.module.css";

export default async function SubmissionsPage() {
  const runtime = await requireAdminSession({
    redirectTo: "/submissions",
    roles: ["owner", "editor"],
  });
  const databaseUrl = getAdminDatabaseUrl();
  const submissions =
    databaseUrl && runtime.authorization
      ? await listLeadSubmissions(databaseUrl, runtime.authorization)
      : [];

  return (
    <AdminPage
      description={
        <p>
          Stored contact and project inquiry records appear here with their
          current review state.
        </p>
      }
      eyebrow="Manage"
      title="Submissions"
    >
      {submissions.length === 0 ? (
        <AdminEmptyState
          description={
            <p>
              New contact and project enquiries will appear here after their
              durable database transaction completes.
            </p>
          }
          title="No submissions yet"
        />
      ) : (
        <section
          aria-label="Lead submissions"
          className={styles["sw-submissions-list-c8p4s1"]}
        >
          {submissions.map((submission) => (
            <article
              className={styles["sw-submissions-row-d9q5t2"]}
              key={submission.id}
            >
              <div className={styles["sw-submissions-primary-e1r6v3"]}>
                <strong>{submission.name}</strong>
                <span>{submission.email}</span>
              </div>
              <dl className={styles["sw-submissions-meta-f2s7w4"]}>
                <div>
                  <dt>Type</dt>
                  <dd>{submission.kind}</dd>
                </div>
                <div>
                  <dt>Locale</dt>
                  <dd>
                    {typeof submission.payload.localeCode === "string"
                      ? submission.payload.localeCode
                      : "en"}
                  </dd>
                </div>
                <div>
                  <dt>Status</dt>
                  <dd>{submission.status}</dd>
                </div>
                <div>
                  <dt>Email</dt>
                  <dd>{submission.notificationStatus ?? "Not scheduled"}</dd>
                </div>
              </dl>
              <p className={styles["sw-submissions-message-g3t8x5"]}>
                {submission.message}
              </p>
            </article>
          ))}
        </section>
      )}
    </AdminPage>
  );
}

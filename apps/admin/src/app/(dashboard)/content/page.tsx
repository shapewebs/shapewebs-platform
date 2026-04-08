import Link from "next/link";
import { listDocuments } from "@shapewebs/db";
import { documentFiltersSchema } from "@shapewebs/validation";
import { getAdminRuntimeState } from "@/lib/auth";
import styles from "./page.module.css";

type ContentPageProps = {
  searchParams?: Promise<{
    contentType?: string;
    localeCode?: string;
    state?: string;
  }>;
};

export default async function ContentPage({ searchParams }: ContentPageProps) {
  const params = searchParams ? await searchParams : undefined;
  const filters = documentFiltersSchema.parse(params ?? {});
  const runtime = await getAdminRuntimeState();
  const documents = await listDocuments(runtime.supabase, filters);

  return (
    <main className={styles.rootP6m2k1}>
      <header className={styles.headerN7m4v2}>
        <div>
          <p className={styles.eyebrowF5m2k8}>Content</p>
          <h1>Editorial documents</h1>
          <p>
            Manage localized pages first, then expand the same workflow to blog
            posts, projects, services, methods, and legal content.
          </p>
        </div>

        <Link className={styles.primaryActionV3m9q2} href="/content/pages/new">
          New page
        </Link>
      </header>

      <form className={styles.filtersQ4m8p3} method="get">
        <label className={styles.filterFieldR8m1p4}>
          <span>Type</span>
          <select defaultValue={filters.contentType ?? ""} name="contentType">
            <option value="">All</option>
            <option value="page">Page</option>
            <option value="post">Post</option>
            <option value="project">Project</option>
            <option value="service">Service</option>
            <option value="method">Method</option>
            <option value="legal">Legal</option>
          </select>
        </label>

        <label className={styles.filterFieldR8m1p4}>
          <span>Locale</span>
          <select defaultValue={filters.localeCode ?? ""} name="localeCode">
            <option value="">All</option>
            <option value="en">English</option>
            <option value="da-DK">Dansk</option>
          </select>
        </label>

        <label className={styles.filterFieldR8m1p4}>
          <span>Status</span>
          <select defaultValue={filters.state ?? ""} name="state">
            <option value="">All</option>
            <option value="draft">Draft</option>
            <option value="review">Review</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>
        </label>

        <button className={styles.filterSubmitX7m2q4} type="submit">
          Apply filters
        </button>
      </form>

      <section className={styles.tableWrapW4m6v1}>
        <div className={styles.tableHeadT5p9n2}>
          <span>Title</span>
          <span>Type</span>
          <span>Locale</span>
          <span>Status</span>
          <span>Updated</span>
          <span>Open</span>
        </div>

        {documents.length === 0 ? (
          <p className={styles.emptyStateM8q4v1}>
            No documents matched the current filters.
          </p>
        ) : (
          documents.map((document) => {
            const href =
              document.contentType === "page"
                ? `/content/pages/${document.documentId}?locale=${encodeURIComponent(document.localeCode)}`
                : "#";

            return (
              <article className={styles.rowB9m3q7} key={`${document.documentId}:${document.localeCode}`}>
                <div className={styles.titleCellY7m1q8}>
                  <strong>{document.title}</strong>
                  <span>{document.slug}</span>
                </div>
                <span>{document.contentType}</span>
                <span>{document.localeCode}</span>
                <span>{document.state}</span>
                <span>{document.updatedAt ?? "Unknown"}</span>
                {document.contentType === "page" ? (
                  <Link className={styles.inlineLinkU4m8q1} href={href}>
                    Edit
                  </Link>
                ) : (
                  <span className={styles.comingSoonS6m2p4}>Next phase</span>
                )}
              </article>
            );
          })
        )}
      </section>
    </main>
  );
}

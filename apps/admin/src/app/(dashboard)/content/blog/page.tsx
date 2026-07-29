import Link from "next/link";

import { requireAdminSession } from "@/lib/auth";
import { getAdminSanityRuntime } from "@/lib/sanity";
import styles from "./page.module.css";

type BlogListPageProps = {
  searchParams?: Promise<{
    locale?: string;
  }>;
};

export default async function BlogListPage({
  searchParams,
}: BlogListPageProps) {
  const query = searchParams ? await searchParams : undefined;
  const locale =
    query?.locale === "en" || query?.locale === "da-DK"
      ? query.locale
      : undefined;
  await requireAdminSession({
    redirectTo: "/content/blog",
    roles: ["owner", "editor"],
  });
  const sanity = getAdminSanityRuntime();
  const posts = sanity
    ? await sanity.draftRepository.listBlogPostEditorSummaries({
        limit: 100,
        locale,
      })
    : [];

  return (
    <main className={styles["sw-bloglist-root-m3q7k2"]}>
      <header className={styles["sw-bloglist-header-r6p2v8"]}>
        <div>
          <p className={styles["sw-bloglist-eyebrow-t8m4q1"]}>Publishing</p>
          <h1>Blog posts</h1>
          <p>
            Employee-authored structured content backed by the staging Sanity
            dataset. Provider Studio remains a recovery surface, not the normal
            editorial workflow.
          </p>
        </div>
        <Link
          className={styles["sw-bloglist-action-x6p1m9"]}
          href="/content/blog/new"
        >
          New blog post
        </Link>
      </header>

      <form className={styles["sw-bloglist-filter-b7n2q5"]} method="get">
        <label>
          <span>Locale</span>
          <select defaultValue={locale ?? ""} name="locale">
            <option value="">All</option>
            <option value="en">English</option>
            <option value="da-DK">Dansk</option>
          </select>
        </label>
        <button type="submit">Apply</button>
      </form>

      <section className={styles["sw-bloglist-panel-q5n9p2"]}>
        {!sanity ? (
          <p>
            Sanity is not configured in this local environment. Fixed staging
            and production fail closed instead of showing this fallback.
          </p>
        ) : posts.length === 0 ? (
          <p>No blog posts exist for this filter yet.</p>
        ) : (
          <div className={styles["sw-bloglist-list-a7q3m6"]}>
            {posts.map((entry) => (
              <article
                className={styles["sw-bloglist-item-c2m8p4"]}
                key={entry.documentId}
              >
                <div>
                  <strong>{entry.post.title}</strong>
                  <span>
                    /{entry.post.locale}/blog/{entry.post.slug.current}
                  </span>
                </div>
                <dl>
                  <div>
                    <dt>State</dt>
                    <dd>
                      {entry.draftRevision && entry.publishedRevision
                        ? "Published with changes"
                        : entry.publishedRevision
                          ? "Published"
                          : "Draft"}
                    </dd>
                  </div>
                  <div>
                    <dt>Locale</dt>
                    <dd>{entry.post.locale}</dd>
                  </div>
                  <div>
                    <dt>Updated</dt>
                    <dd>{entry.post._updatedAt}</dd>
                  </div>
                </dl>
                <Link href={`/content/blog/${entry.documentId}`}>Edit</Link>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

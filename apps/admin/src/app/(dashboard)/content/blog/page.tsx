import { Buttons, Navigation } from "@shapewebs/ui";

import { AdminEmptyState, AdminPage } from "@/components/admin-page";
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
    <AdminPage
      actions={
        <Buttons.ButtonLink href="/content/blog/new" size="small">
          New blog post
        </Buttons.ButtonLink>
      }
      description={
        <p>
          Employee-authored structured content backed by the staging Sanity
          dataset. Provider Studio remains a recovery surface, not the normal
          editorial workflow.
        </p>
      }
      eyebrow="Publishing"
      title="Blog posts"
    >
      <form className={styles["sw-bloglist-filter-b7n2q5"]} method="get">
        <label className={styles["sw-bloglist-field-c8p4s1"]}>
          <span>Locale</span>
          <select defaultValue={locale ?? ""} name="locale">
            <option value="">All</option>
            <option value="en">English</option>
            <option value="da-DK">Dansk</option>
          </select>
        </label>
        <Buttons.Button kind="secondary" size="small" type="submit">
          Apply
        </Buttons.Button>
      </form>

      {!sanity ? (
        <AdminEmptyState
          description={
            <p>
              Sanity is not configured in this local environment. Fixed staging
              and production fail closed instead of showing this fallback.
            </p>
          }
          title="Publishing is unavailable"
        />
      ) : posts.length === 0 ? (
        <AdminEmptyState
          description={<p>Change the locale filter or create a blog post.</p>}
          title="No blog posts yet"
        />
      ) : (
        <section className={styles["sw-bloglist-panel-q5n9p2"]}>
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
                <Navigation.Link
                  href={`/content/blog/${entry.documentId}`}
                  underline="none"
                >
                  Edit
                </Navigation.Link>
              </article>
            ))}
          </div>
        </section>
      )}
    </AdminPage>
  );
}

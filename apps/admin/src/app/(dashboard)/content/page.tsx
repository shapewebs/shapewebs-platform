import {
  getDefaultContentDocumentList,
  listContentDocuments,
} from "@shapewebs/database/server";
import { Buttons, Navigation } from "@shapewebs/ui";
import { documentFiltersSchema } from "@shapewebs/validation";

import { AdminEmptyState, AdminPage } from "@/components/admin-page";
import { requireAdminSession } from "@/lib/auth";
import { getAdminDatabaseUrl } from "@/lib/better-auth";
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
  const runtime = await requireAdminSession({
    redirectTo: "/content",
    roles: ["owner", "editor"],
  });
  const databaseUrl = getAdminDatabaseUrl();

  if (!runtime.setupMode && (!databaseUrl || !runtime.authorization)) {
    throw new Error("Content documents are unavailable.");
  }

  const documents =
    runtime.setupMode || !databaseUrl || !runtime.authorization
      ? getDefaultContentDocumentList(filters)
      : await listContentDocuments(databaseUrl, runtime.authorization, filters);

  return (
    <AdminPage
      actions={
        <Buttons.ButtonGroup align="end">
          <Buttons.ButtonLink
            href="/content/blog"
            kind="secondary"
            size="small"
          >
            Blog posts
          </Buttons.ButtonLink>
          <Buttons.ButtonLink href="/content/pages/new" size="small">
            New page
          </Buttons.ButtonLink>
        </Buttons.ButtonGroup>
      }
      description={
        <p>
          Manage localized pages first, then expand the same workflow to blog
          posts, projects, services, methods, and legal content.
        </p>
      }
      eyebrow="Manage"
      title="Editorial documents"
    >
      <form className={styles["content-filters-o8yszi"]} method="get">
        <label className={styles["content-field-9nzd5k"]}>
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

        <label className={styles["content-field-9nzd5k"]}>
          <span>Locale</span>
          <select defaultValue={filters.localeCode ?? ""} name="localeCode">
            <option value="">All</option>
            <option value="en">English</option>
            <option value="da-DK">Dansk</option>
          </select>
        </label>

        <label className={styles["content-field-9nzd5k"]}>
          <span>Status</span>
          <select defaultValue={filters.state ?? ""} name="state">
            <option value="">All</option>
            <option value="draft">Draft</option>
            <option value="review">Review</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>
        </label>

        <Buttons.Button kind="secondary" size="small" type="submit">
          Apply filters
        </Buttons.Button>
      </form>

      {documents.length === 0 ? (
        <AdminEmptyState
          description={<p>Change the filters or create a new page.</p>}
          title="No matching documents"
        />
      ) : (
        <div className={styles["content-tablewrap-4dj3n5"]}>
          <table className={styles["content-table-0b8ogw"]}>
            <thead>
              <tr>
                <th scope="col">Title</th>
                <th scope="col">Type</th>
                <th scope="col">Locale</th>
                <th scope="col">Status</th>
                <th scope="col">Updated</th>
                <th scope="col">
                  <span className={styles["content-sronly-08exq7"]}>
                    Actions
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {documents.map((document) => {
                const href = `/content/pages/${document.documentId}?locale=${encodeURIComponent(document.localeCode)}`;

                return (
                  <tr key={`${document.documentId}:${document.localeCode}`}>
                    <th scope="row">
                      <span className={styles["content-title-7fthk9"]}>
                        <strong>{document.title}</strong>
                        <span>{document.slug}</span>
                      </span>
                    </th>
                    <td>{document.contentType}</td>
                    <td>{document.localeCode}</td>
                    <td>
                      <span className={styles["content-state-nplhmw"]}>
                        {document.state}
                      </span>
                    </td>
                    <td>{document.updatedAt ?? "Unknown"}</td>
                    <td>
                      {document.contentType === "page" ? (
                        <Navigation.Link href={href} underline="none">
                          Edit
                        </Navigation.Link>
                      ) : (
                        <span className={styles["content-muted-k8ffbo"]}>
                          Next phase
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </AdminPage>
  );
}

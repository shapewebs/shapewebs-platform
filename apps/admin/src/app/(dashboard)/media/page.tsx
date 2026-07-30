import { listAdminMediaFiles } from "@shapewebs/database/server";
import { Layout } from "@shapewebs/ui";

import { AdminEmptyState, AdminPage } from "@/components/admin-page";
import { requireAdminSession } from "@/lib/auth";
import { getMediaEnvironment } from "@/lib/media-environment";

import { MediaUploadForm } from "./media-upload-form";
import styles from "./page.module.css";

export default async function MediaPage() {
  const runtime = await requireAdminSession({
    redirectTo: "/media",
    roles: ["owner", "editor"],
  });
  const environment = getMediaEnvironment();
  const media =
    runtime.setupMode || !environment || !runtime.authorization
      ? []
      : await listAdminMediaFiles(
          environment.databaseUrl,
          runtime.authorization,
        );

  return (
    <AdminPage
      description={
        <p>
          Every source image is decoded, bounded, normalized to metadata-free
          WebP, and stored privately before it can enter a publishing workflow.
        </p>
      }
      eyebrow="Manage"
      title="Private image library"
    >
      <Layout.Card className={styles["sw-media-panel-q5n9p2"]}>
        <div className={styles["sw-media-heading-r6p2v8"]}>
          <h2>Upload an image</h2>
          <p>
            Uploading never makes an image public. Publishing uses a separate,
            reviewed public asset path.
          </p>
        </div>

        {environment ? (
          <MediaUploadForm />
        ) : (
          <p className={styles["sw-media-notice-v2m8q6"]}>
            Private media storage is not configured for this environment.
          </p>
        )}
      </Layout.Card>

      <section className={styles["sw-media-library-f4q1m8"]}>
        <div className={styles["sw-media-heading-r6p2v8"]}>
          <h2>Verified files</h2>
          <p>Provider paths and private URLs are never exposed in this view.</p>
        </div>

        {media.length === 0 ? (
          <AdminEmptyState
            description={
              <p>
                Upload a source image when it is ready to enter the reviewed
                publishing workflow.
              </p>
            }
            title="No private images yet"
          />
        ) : (
          <div className={styles["sw-media-list-a7q3m6"]}>
            {media.map((item) => (
              <Layout.Card
                className={styles["sw-media-item-c2m8p4"]}
                key={`${item.id}:${item.localeCode}`}
                tone="quiet"
              >
                <div>
                  <strong>{item.originalName}</strong>
                  <span>{item.altText}</span>
                </div>
                <dl>
                  <div>
                    <dt>Status</dt>
                    <dd>{item.status}</dd>
                  </div>
                  <div>
                    <dt>Visibility</dt>
                    <dd>{item.visibility}</dd>
                  </div>
                  <div>
                    <dt>Dimensions</dt>
                    <dd>
                      {item.width} × {item.height}
                    </dd>
                  </div>
                  <div>
                    <dt>Size</dt>
                    <dd>{Math.ceil(item.byteSize / 1024)} KiB</dd>
                  </div>
                </dl>
              </Layout.Card>
            ))}
          </div>
        )}
      </section>
    </AdminPage>
  );
}

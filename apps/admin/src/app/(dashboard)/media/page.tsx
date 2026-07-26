import { listAdminMediaFiles } from "@shapewebs/database/server";

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
    <main className={styles["sw-media-root-m3q7k2"]}>
      <header className={styles["sw-media-header-r6p2v8"]}>
        <p className={styles["sw-media-eyebrow-t8m4q1"]}>Media</p>
        <h1>Private image library</h1>
        <p>
          Every source image is decoded, bounded, normalized to metadata-free
          WebP, and stored privately before it can enter a publishing workflow.
        </p>
      </header>

      <section className={styles["sw-media-panel-q5n9p2"]}>
        <div>
          <h2>Upload an image</h2>
          <p>
            Uploading never makes an image public. Publishing will use a
            separate reviewed public asset path in a later slice.
          </p>
        </div>
        {environment ? (
          <MediaUploadForm />
        ) : (
          <p className={styles["sw-media-notice-v2m8q6"]}>
            Private media storage is not configured for this environment.
          </p>
        )}
      </section>

      <section className={styles["sw-media-library-f4q1m8"]}>
        <div>
          <h2>Verified files</h2>
          <p>Provider paths and private URLs are never exposed in this view.</p>
        </div>

        {media.length === 0 ? (
          <p className={styles["sw-media-empty-k9m2v5"]}>
            No private images have been uploaded.
          </p>
        ) : (
          <div className={styles["sw-media-list-a7q3m6"]}>
            {media.map((item) => (
              <article
                className={styles["sw-media-item-c2m8p4"]}
                key={`${item.id}:${item.localeCode}`}
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
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

import { randomUUID } from "node:crypto";

import { Buttons } from "@shapewebs/ui";
import type { ContentEditorState } from "@shapewebs/database/server";
import {
  previewSavedPageAction,
  rollbackPageAction,
  savePageEditorAction,
  unpublishPageAction,
} from "../_actions/page-editor";
import { PreviewSavedRevisionForm } from "./preview-saved-revision-form";
import styles from "./page-editor-form.module.css";

type PageEditorFormProps = {
  commandId: string;
  editorState: ContentEditorState;
  notice?: string | null;
  setupMode?: boolean;
};

export function PageEditorForm({
  commandId,
  editorState,
  notice,
  setupMode = false,
}: PageEditorFormProps) {
  return (
    <main className={styles.rootP4m8q2}>
      <header className={styles.headerB7m2p5}>
        <div>
          <p className={styles.eyebrowD8m3q1}>Page editor</p>
          <h1>{editorState.title || "Untitled page"}</h1>
          <p>
            Manage structured metadata, localized slugs, content JSON, SEO
            fields, revision history, and preview from one editing surface.
          </p>
        </div>

        <div className={styles.metaGridR6m2q4}>
          <span>Document: {editorState.documentId}</span>
          <span>Locale: {editorState.localeCode}</span>
          <span>State: {editorState.state}</span>
          <span>Version: {editorState.version}</span>
          <span>Source: {editorState.source}</span>
        </div>
      </header>

      {notice ? <p className={styles.noticeK6m1q7}>{notice}</p> : null}
      {setupMode ? (
        <p className={styles.noticeK6m1q7}>
          Saving is disabled until Neon and administrative authentication are
          configured for this environment.
        </p>
      ) : null}

      <form action={savePageEditorAction} className={styles.formN5m2p8}>
        <input name="commandId" type="hidden" value={commandId} />
        <input
          name="expectedVersion"
          type="hidden"
          value={editorState.version}
        />
        {editorState.documentId ? (
          <input
            name="documentId"
            type="hidden"
            value={editorState.documentId}
          />
        ) : null}

        <section className={styles.sectionQ7m3n9}>
          <h2>Document</h2>

          <div className={styles.fieldGridF3m8v2}>
            <label className={styles.fieldY2m7q3}>
              <span>Locale</span>
              <select defaultValue={editorState.localeCode} name="localeCode">
                <option value="en">English</option>
                <option value="da-DK">Dansk</option>
              </select>
            </label>

            <label className={styles.fieldY2m7q3}>
              <span>Page kind</span>
              <input
                defaultValue={editorState.pageKind ?? "standard"}
                name="pageKind"
              />
            </label>
          </div>

          <div className={styles.fieldGridF3m8v2}>
            <label className={styles.fieldY2m7q3}>
              <span>Title</span>
              <input defaultValue={editorState.title} name="title" required />
            </label>

            <label className={styles.fieldY2m7q3}>
              <span>Slug</span>
              <input defaultValue={editorState.slug} name="slug" required />
            </label>
          </div>

          <label className={styles.fieldY2m7q3}>
            <span>Summary</span>
            <textarea
              defaultValue={editorState.summary ?? ""}
              name="summary"
              rows={3}
            />
          </label>
        </section>

        <section className={styles.sectionQ7m3n9}>
          <h2>SEO</h2>

          <div className={styles.fieldGridF3m8v2}>
            <label className={styles.fieldY2m7q3}>
              <span>Meta title</span>
              <input
                defaultValue={editorState.seo.metaTitle ?? ""}
                name="metaTitle"
              />
            </label>

            <label className={styles.fieldY2m7q3}>
              <span>Canonical URL override</span>
              <input
                defaultValue={editorState.seo.canonicalUrlOverride ?? ""}
                name="canonicalUrlOverride"
              />
            </label>
          </div>

          <label className={styles.fieldY2m7q3}>
            <span>Meta description</span>
            <textarea
              defaultValue={editorState.seo.metaDescription ?? ""}
              name="metaDescription"
              rows={3}
            />
          </label>

          <label className={styles.checkboxG2m4n8}>
            <input
              defaultChecked={editorState.seo.robotsIndex}
              name="robotsIndex"
              type="checkbox"
              value="true"
            />
            <span>Allow indexing</span>
          </label>
        </section>

        <section className={styles.sectionQ7m3n9}>
          <h2>Content JSON</h2>

          <label className={styles.fieldY2m7q3}>
            <span>Structured content document</span>
            <textarea
              defaultValue={JSON.stringify(editorState.content, null, 2)}
              name="contentJson"
              rows={18}
              spellCheck={false}
            />
          </label>

          <label className={styles.fieldY2m7q3}>
            <span>Change note</span>
            <input name="changeNote" placeholder="Short revision summary" />
          </label>
        </section>

        <div className={styles.actionsM8q2r6}>
          <Buttons.Button
            disabled={setupMode}
            kind="secondary"
            name="intent"
            size="small"
            type="submit"
            value="draft"
          >
            Save draft
          </Buttons.Button>
          <Buttons.Button
            disabled={setupMode}
            kind="secondary"
            name="intent"
            size="small"
            type="submit"
            value="review"
          >
            Submit for review
          </Buttons.Button>
          <Buttons.Button
            disabled={setupMode}
            kind="primary"
            name="intent"
            size="small"
            type="submit"
            value="publish"
          >
            Publish
          </Buttons.Button>
        </div>
      </form>

      <PreviewSavedRevisionForm
        previewAction={previewSavedPageAction}
        disabled={
          setupMode ||
          !editorState.documentId ||
          editorState.revisions.length === 0
        }
        documentId={editorState.documentId ?? ""}
        localeCode={editorState.localeCode}
        revisionId={editorState.revisions[0]?.revisionId ?? ""}
      />

      {editorState.documentId && editorState.revisions.length > 0 ? (
        <section className={styles.sectionQ7m3n9}>
          <h2>Publication recovery</h2>
          <p className={styles.mutedW2m7n4}>
            These commands immediately change the public site, preserve
            immutable revision history, and require a TOTP check from the
            preceding five minutes.
          </p>

          {editorState.publishedRevisionId ? (
            <form action={unpublishPageAction} className={styles.formN5m2p8}>
              <input name="commandId" type="hidden" value={randomUUID()} />
              <input
                name="documentId"
                type="hidden"
                value={editorState.documentId}
              />
              <input
                name="expectedVersion"
                type="hidden"
                value={editorState.version}
              />
              <input
                name="localeCode"
                type="hidden"
                value={editorState.localeCode}
              />
              <p className={styles.mutedW2m7n4}>
                Unpublish the current {editorState.localeCode} page while
                retaining its content and revision history.
              </p>
              <label className={styles.checkboxG2m4n8}>
                <input
                  name="confirmation"
                  required
                  type="checkbox"
                  value="true"
                />
                <span>
                  I understand this removes the page from public view.
                </span>
              </label>
              <div className={styles.actionsM8q2r6}>
                <Buttons.Button
                  disabled={setupMode}
                  kind="secondary"
                  size="small"
                  type="submit"
                >
                  Unpublish page
                </Buttons.Button>
              </div>
            </form>
          ) : (
            <p className={styles.mutedW2m7n4}>
              This locale is not currently published.
            </p>
          )}

          <form action={rollbackPageAction} className={styles.formN5m2p8}>
            <input name="commandId" type="hidden" value={randomUUID()} />
            <input
              name="documentId"
              type="hidden"
              value={editorState.documentId}
            />
            <input
              name="expectedVersion"
              type="hidden"
              value={editorState.version}
            />
            <input
              name="localeCode"
              type="hidden"
              value={editorState.localeCode}
            />
            <label className={styles.fieldY2m7q3}>
              <span>Revision to restore and publish</span>
              <select name="revisionId" required>
                {editorState.revisions.map((revision) => (
                  <option key={revision.revisionId} value={revision.revisionId}>
                    Revision {revision.revisionNumber} · {revision.editorState}{" "}
                    · {revision.createdAt}
                  </option>
                ))}
              </select>
            </label>
            <label className={styles.checkboxG2m4n8}>
              <input
                name="confirmation"
                required
                type="checkbox"
                value="true"
              />
              <span>
                I understand this creates and publishes a new immutable
                revision.
              </span>
            </label>
            <div className={styles.actionsM8q2r6}>
              <Buttons.Button
                disabled={setupMode}
                kind="secondary"
                size="small"
                type="submit"
              >
                Restore and publish revision
              </Buttons.Button>
            </div>
          </form>
        </section>
      ) : null}

      <section className={styles.sectionQ7m3n9}>
        <h2>Revision history</h2>

        <div className={styles.revisionsS9m4q1}>
          {editorState.revisions.length === 0 ? (
            <p className={styles.mutedW2m7n4}>No revisions yet.</p>
          ) : (
            editorState.revisions.map((revision) => (
              <article
                className={styles.revisionCardC5m2q8}
                key={revision.revisionId}
              >
                <strong>Revision {revision.revisionNumber}</strong>
                <span>{revision.editorState}</span>
                <span>{revision.createdAt}</span>
                <p>{revision.changeNote ?? "No change note provided."}</p>
              </article>
            ))
          )}
        </div>
      </section>
    </main>
  );
}

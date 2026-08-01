import { randomUUID } from "node:crypto";

import { Buttons } from "@shapewebs/ui";
import type { ContentEditorState } from "@shapewebs/database/server";
import {
  previewSavedPageAction,
  rollbackPageAction,
  savePageEditorAction,
  unpublishPageAction,
} from "../_actions/page-editor";
import { AdminPage } from "@/components/admin-page";
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
    <AdminPage
      description={
        <>
          <p>
            Manage structured metadata, localized slugs, content JSON, SEO
            fields, revision history, and preview from one editing surface.
          </p>
          <div className={styles["pageeditor-meta-b6hyc8"]}>
            <span>Document: {editorState.documentId || "New"}</span>
            <span>Locale: {editorState.localeCode}</span>
            <span>State: {editorState.state}</span>
            <span>Version: {editorState.version}</span>
            <span>Source: {editorState.source}</span>
          </div>
        </>
      }
      eyebrow="Page editor"
      title={editorState.title || "Untitled page"}
    >
      {notice ? (
        <p className={styles["pageeditor-notice-glmndg"]}>{notice}</p>
      ) : null}
      {setupMode ? (
        <p className={styles["pageeditor-notice-glmndg"]}>
          Saving is disabled until Neon and administrative authentication are
          configured for this environment.
        </p>
      ) : null}

      <form
        action={savePageEditorAction}
        className={styles["pageeditor-form-ceowmo"]}
      >
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

        <section className={styles["pageeditor-section-smrq66"]}>
          <h2>Document</h2>

          <div className={styles["pageeditor-fieldgrid-hsg83w"]}>
            <label className={styles["pageeditor-field-c4rwwr"]}>
              <span>Locale</span>
              <select defaultValue={editorState.localeCode} name="localeCode">
                <option value="en">English</option>
                <option value="da-DK">Dansk</option>
              </select>
            </label>

            <label className={styles["pageeditor-field-c4rwwr"]}>
              <span>Page kind</span>
              <input
                defaultValue={editorState.pageKind ?? "standard"}
                name="pageKind"
              />
            </label>
          </div>

          <div className={styles["pageeditor-fieldgrid-hsg83w"]}>
            <label className={styles["pageeditor-field-c4rwwr"]}>
              <span>Title</span>
              <input defaultValue={editorState.title} name="title" required />
            </label>

            <label className={styles["pageeditor-field-c4rwwr"]}>
              <span>Slug</span>
              <input defaultValue={editorState.slug} name="slug" required />
            </label>
          </div>

          <label className={styles["pageeditor-field-c4rwwr"]}>
            <span>Summary</span>
            <textarea
              defaultValue={editorState.summary ?? ""}
              name="summary"
              rows={3}
            />
          </label>
        </section>

        <section className={styles["pageeditor-section-smrq66"]}>
          <h2>SEO</h2>

          <div className={styles["pageeditor-fieldgrid-hsg83w"]}>
            <label className={styles["pageeditor-field-c4rwwr"]}>
              <span>Meta title</span>
              <input
                defaultValue={editorState.seo.metaTitle ?? ""}
                name="metaTitle"
              />
            </label>

            <label className={styles["pageeditor-field-c4rwwr"]}>
              <span>Canonical URL override</span>
              <input
                defaultValue={editorState.seo.canonicalUrlOverride ?? ""}
                name="canonicalUrlOverride"
              />
            </label>
          </div>

          <label className={styles["pageeditor-field-c4rwwr"]}>
            <span>Meta description</span>
            <textarea
              defaultValue={editorState.seo.metaDescription ?? ""}
              name="metaDescription"
              rows={3}
            />
          </label>

          <label className={styles["pageeditor-check-5m8sqt"]}>
            <input
              defaultChecked={editorState.seo.robotsIndex}
              name="robotsIndex"
              type="checkbox"
              value="true"
            />
            <span>Allow indexing</span>
          </label>
        </section>

        <section className={styles["pageeditor-section-smrq66"]}>
          <h2>Content JSON</h2>

          <label className={styles["pageeditor-field-c4rwwr"]}>
            <span>Structured content document</span>
            <textarea
              defaultValue={JSON.stringify(editorState.content, null, 2)}
              name="contentJson"
              rows={18}
              spellCheck={false}
            />
          </label>

          <label className={styles["pageeditor-field-c4rwwr"]}>
            <span>Change note</span>
            <input name="changeNote" placeholder="Short revision summary" />
          </label>
        </section>

        <div className={styles["pageeditor-actions-gka9y4"]}>
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
        <section className={styles["pageeditor-section-smrq66"]}>
          <h2>Publication recovery</h2>
          <p className={styles["pageeditor-muted-344mlf"]}>
            These commands immediately change the public site, preserve
            immutable revision history, and require a TOTP check from the
            preceding five minutes.
          </p>

          {editorState.publishedRevisionId ? (
            <form
              action={unpublishPageAction}
              className={styles["pageeditor-form-ceowmo"]}
            >
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
              <p className={styles["pageeditor-muted-344mlf"]}>
                Unpublish the current {editorState.localeCode} page while
                retaining its content and revision history.
              </p>
              <label className={styles["pageeditor-check-5m8sqt"]}>
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
              <div className={styles["pageeditor-actions-gka9y4"]}>
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
            <p className={styles["pageeditor-muted-344mlf"]}>
              This locale is not currently published.
            </p>
          )}

          <form
            action={rollbackPageAction}
            className={styles["pageeditor-form-ceowmo"]}
          >
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
            <label className={styles["pageeditor-field-c4rwwr"]}>
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
            <label className={styles["pageeditor-check-5m8sqt"]}>
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
            <div className={styles["pageeditor-actions-gka9y4"]}>
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

      <section className={styles["pageeditor-section-smrq66"]}>
        <h2>Revision history</h2>

        <div className={styles["pageeditor-revisions-zkmdqv"]}>
          {editorState.revisions.length === 0 ? (
            <p className={styles["pageeditor-muted-344mlf"]}>
              No revisions yet.
            </p>
          ) : (
            editorState.revisions.map((revision) => (
              <article
                className={styles["pageeditor-revision-hbxyee"]}
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
    </AdminPage>
  );
}

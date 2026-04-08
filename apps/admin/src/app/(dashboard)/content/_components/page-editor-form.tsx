import { Buttons } from "@shapewebs/ui";
import type { DocumentEditorState } from "@shapewebs/db";
import { savePageEditorAction } from "../_actions/page-editor";
import styles from "./page-editor-form.module.css";

type PageEditorFormProps = {
  editorState: DocumentEditorState;
  notice?: string | null;
  setupMode?: boolean;
};

export function PageEditorForm({
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
          <span>Source: {editorState.source}</span>
        </div>
      </header>

      {notice ? <p className={styles.noticeK6m1q7}>{notice}</p> : null}
      {setupMode ? (
        <p className={styles.noticeK6m1q7}>
          Saving is disabled until Supabase is configured for this environment.
        </p>
      ) : null}

      <form action={savePageEditorAction} className={styles.formN5m2p8}>
        <input name="documentId" type="hidden" value={editorState.documentId} />

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
              <input defaultValue={editorState.pageKind ?? "standard"} name="pageKind" />
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
            <textarea defaultValue={editorState.summary ?? ""} name="summary" rows={3} />
          </label>
        </section>

        <section className={styles.sectionQ7m3n9}>
          <h2>SEO</h2>

          <div className={styles.fieldGridF3m8v2}>
            <label className={styles.fieldY2m7q3}>
              <span>Meta title</span>
              <input defaultValue={editorState.seo.metaTitle ?? ""} name="metaTitle" />
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
              type="radio"
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
            value="draft"
          >
            Save draft
          </Buttons.Button>
          <Buttons.Button
            disabled={setupMode}
            kind="secondary"
            name="intent"
            size="small"
            value="review"
          >
            Submit for review
          </Buttons.Button>
          <Buttons.Button
            disabled={setupMode}
            kind="tertiary"
            name="intent"
            size="small"
            value="preview"
          >
            Preview
          </Buttons.Button>
          <Buttons.Button
            disabled={setupMode}
            kind="primary"
            name="intent"
            size="small"
            value="publish"
          >
            Publish
          </Buttons.Button>
        </div>
      </form>

      <section className={styles.sectionQ7m3n9}>
        <h2>Revision history</h2>

        <div className={styles.revisionsS9m4q1}>
          {editorState.revisions.length === 0 ? (
            <p className={styles.mutedW2m7n4}>No revisions yet.</p>
          ) : (
            editorState.revisions.map((revision) => (
              <article className={styles.revisionCardC5m2q8} key={revision.revisionId}>
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

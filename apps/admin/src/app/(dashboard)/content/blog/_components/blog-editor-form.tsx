"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import Image from "next/image";
import {
  defineSchema,
  EditorProvider,
  PortableTextEditable,
  useEditor,
  type PortableTextBlock,
  type RenderAnnotationFunction,
  type RenderBlockFunction,
  type RenderDecoratorFunction,
  type RenderListItemFunction,
  type RenderStyleFunction,
} from "@portabletext/editor";
import { EventListenerPlugin } from "@portabletext/editor/plugins";
import type { SanityBlogPost } from "@shapewebs/content-schema";
import { Buttons } from "@shapewebs/ui";

import { AdminPage } from "@/components/admin-page";
import { PreviewSavedRevisionForm } from "../../_components/preview-saved-revision-form";
import styles from "./blog-editor-form.module.css";

export type BlogAssetOption = {
  height: number;
  id: string;
  name: string;
  url: string;
  width: number;
};

type BlogReferenceOption = {
  id: string;
  title: string;
};

type BlogEditorFormProps = {
  assets: BlogAssetOption[];
  authors: BlogReferenceOption[];
  categories: BlogReferenceOption[];
  commandId: string;
  documentId?: string;
  expectedRevision?: string;
  hasDraft?: boolean;
  notice?: string | null;
  post?: SanityBlogPost;
  previewAction: (
    state:
      | { status: "idle" }
      | { endpoint: string; status: "ready"; token: string }
      | { status: "unavailable" },
    formData: FormData,
  ) => Promise<
    | { status: "idle" }
    | { endpoint: string; status: "ready"; token: string }
    | { status: "unavailable" }
  >;
  publishAction: (formData: FormData) => Promise<void>;
  publishCommandId: string;
  publishedRevision?: string;
  saveAction: (formData: FormData) => Promise<void>;
  unpublishAction: (formData: FormData) => Promise<void>;
  unpublishCommandId: string;
};

const editorSchema = defineSchema({
  annotations: [
    {
      fields: [{ name: "href", type: "string" }],
      name: "link",
    },
  ],
  blockObjects: [
    {
      fields: [
        { name: "alt", type: "string" },
        { name: "decorative", type: "boolean" },
        { name: "caption", type: "string" },
        { name: "layout", type: "string" },
        { name: "asset", type: "object" },
      ],
      name: "image",
    },
    { name: "callout" },
    { name: "cta" },
    { name: "codeBlock" },
  ],
  decorators: [
    { name: "strong" },
    { name: "em" },
    { name: "underline" },
    { name: "strike-through" },
    { name: "code" },
  ],
  inlineObjects: [],
  lists: [{ name: "bullet" }, { name: "number" }],
  styles: [
    { name: "normal" },
    { name: "h2" },
    { name: "h3" },
    { name: "h4" },
    { name: "blockquote" },
  ],
});

const renderStyle: RenderStyleFunction = (props) => {
  switch (props.schemaType.value) {
    case "h2":
      return <h2>{props.children}</h2>;
    case "h3":
      return <h3>{props.children}</h3>;
    case "h4":
      return <h4>{props.children}</h4>;
    case "blockquote":
      return <blockquote>{props.children}</blockquote>;
    default:
      return <p>{props.children}</p>;
  }
};

const renderDecorator: RenderDecoratorFunction = (props) => {
  switch (props.value) {
    case "strong":
      return <strong>{props.children}</strong>;
    case "em":
      return <em>{props.children}</em>;
    case "underline":
      return <u>{props.children}</u>;
    case "strike-through":
      return <s>{props.children}</s>;
    case "code":
      return <code>{props.children}</code>;
    default:
      return <>{props.children}</>;
  }
};

const renderAnnotation: RenderAnnotationFunction = (props) => {
  const candidate =
    typeof props.value.href === "string" ? props.value.href : undefined;
  let href: string | undefined;

  if (candidate?.startsWith("/") && !candidate.startsWith("//")) {
    href = candidate;
  } else if (candidate) {
    try {
      const parsed = new URL(candidate);

      if (
        parsed.protocol === "https:" &&
        !parsed.username &&
        !parsed.password &&
        !parsed.port
      ) {
        href = parsed.href;
      }
    } catch {
      href = undefined;
    }
  }

  return href ? <a href={href}>{props.children}</a> : <>{props.children}</>;
};

const renderListItem: RenderListItemFunction = (props) => (
  <li>{props.children}</li>
);

function isImageBlock(value: PortableTextBlock): value is PortableTextBlock & {
  alt: string;
  asset: { _ref: string };
  caption?: string;
  decorative: boolean;
  layout: "contained" | "full" | "wide";
} {
  return (
    value._type === "image" &&
    "asset" in value &&
    typeof value.asset === "object" &&
    value.asset !== null &&
    "_ref" in value.asset &&
    typeof value.asset._ref === "string"
  );
}

function createRenderBlock(assets: BlogAssetOption[]): RenderBlockFunction {
  return function BlogBlockRenderer(props) {
    if (props.schemaType.name === "image" && isImageBlock(props.value)) {
      const imageBlock = props.value;
      const asset = assets.find(
        (candidate) => candidate.id === imageBlock.asset._ref,
      );

      return (
        <figure className={styles["sw-blog-imageblock-r8q2m4"]}>
          {asset ? (
            <Image
              alt={imageBlock.decorative ? "" : imageBlock.alt}
              height={asset.height}
              src={asset.url}
              width={asset.width}
            />
          ) : (
            <p>Image asset unavailable.</p>
          )}
          {imageBlock.caption ? (
            <figcaption>{imageBlock.caption}</figcaption>
          ) : null}
          <small>
            {imageBlock.layout} ·{" "}
            {imageBlock.decorative ? "decorative" : `Alt: ${imageBlock.alt}`}
          </small>
        </figure>
      );
    }

    if (props.schemaType.name === "callout") {
      return (
        <aside className={styles["sw-blog-object-v2m8q6"]}>Callout block</aside>
      );
    }

    if (props.schemaType.name === "cta") {
      return (
        <aside className={styles["sw-blog-object-v2m8q6"]}>
          Call-to-action block
        </aside>
      );
    }

    if (props.schemaType.name === "codeBlock") {
      return <pre className={styles["sw-blog-object-v2m8q6"]}>Code block</pre>;
    }

    return <div>{props.children}</div>;
  };
}

function EditorToolbar({ assets }: { assets: BlogAssetOption[] }) {
  const editor = useEditor();
  const [alt, setAlt] = useState("");
  const [assetId, setAssetId] = useState(assets[0]?.id ?? "");
  const [caption, setCaption] = useState("");
  const [decorative, setDecorative] = useState(false);
  const [href, setHref] = useState("");
  const [layout, setLayout] = useState<"contained" | "full" | "wide">(
    "contained",
  );
  const effectiveAssetId = assetId || assets[0]?.id || "";

  function refocus() {
    editor.send({ type: "focus" });
  }

  function toggleStyle(style: "blockquote" | "h2" | "h3" | "h4" | "normal") {
    editor.send({ style, type: "style.toggle" });
    refocus();
  }

  function toggleDecorator(
    decorator: "code" | "em" | "strike-through" | "strong" | "underline",
  ) {
    editor.send({ decorator, type: "decorator.toggle" });
    refocus();
  }

  function insertImage() {
    if (!effectiveAssetId || (!decorative && alt.trim().length === 0)) {
      return;
    }

    editor.send({
      block: {
        _type: "image",
        alt: decorative ? "" : alt.trim(),
        asset: {
          _ref: effectiveAssetId,
          _type: "reference",
        },
        ...(caption.trim() ? { caption: caption.trim() } : {}),
        decorative,
        layout,
      },
      placement: "auto",
      select: "none",
      type: "insert.block",
    });
    setAlt("");
    setCaption("");
    setDecorative(false);
    refocus();
  }

  function applyLink() {
    const normalized = href.trim();

    if (!normalized) {
      return;
    }

    editor.send({
      annotation: {
        name: "link",
        value: { href: normalized },
      },
      type: "annotation.toggle",
    });
    setHref("");
    refocus();
  }

  return (
    <div className={styles["sw-blog-toolbar-q4m8p3"]}>
      <div className={styles["sw-blog-toolrow-f3m8v2"]}>
        {(["normal", "h2", "h3", "h4", "blockquote"] as const).map((style) => (
          <Buttons.Button
            key={style}
            kind="ghost"
            onClick={() => toggleStyle(style)}
            size="small"
            type="button"
          >
            {style}
          </Buttons.Button>
        ))}
        {(["strong", "em", "underline", "strike-through", "code"] as const).map(
          (decorator) => (
            <Buttons.Button
              key={decorator}
              kind="ghost"
              onClick={() => toggleDecorator(decorator)}
              size="small"
              type="button"
            >
              {decorator}
            </Buttons.Button>
          ),
        )}
        <Buttons.Button
          kind="ghost"
          onClick={() => {
            editor.send({ listItem: "bullet", type: "list item.toggle" });
            refocus();
          }}
          size="small"
          type="button"
        >
          Bullets
        </Buttons.Button>
        <Buttons.Button
          kind="ghost"
          onClick={() => {
            editor.send({ listItem: "number", type: "list item.toggle" });
            refocus();
          }}
          size="small"
          type="button"
        >
          Numbered
        </Buttons.Button>
        <Buttons.Button
          kind="ghost"
          onClick={() => editor.send({ type: "history.undo" })}
          size="small"
          type="button"
        >
          Undo
        </Buttons.Button>
        <Buttons.Button
          kind="ghost"
          onClick={() => editor.send({ type: "history.redo" })}
          size="small"
          type="button"
        >
          Redo
        </Buttons.Button>
      </div>

      <div className={styles["sw-blog-toolrow-f3m8v2"]}>
        <input
          aria-label="Link URL"
          onChange={(event) => setHref(event.target.value)}
          placeholder="/contact or https://…"
          value={href}
        />
        <Buttons.Button
          kind="secondary"
          onClick={applyLink}
          size="small"
          type="button"
        >
          Apply link to selection
        </Buttons.Button>
      </div>

      <div className={styles["sw-blog-imageinsert-n4v8q1"]}>
        <label>
          <span>Insert image</span>
          <select
            onChange={(event) => setAssetId(event.target.value)}
            value={effectiveAssetId}
          >
            {assets.map((asset) => (
              <option key={asset.id} value={asset.id}>
                {asset.name} · {asset.width}×{asset.height}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Alt text</span>
          <input
            disabled={decorative}
            maxLength={240}
            onChange={(event) => setAlt(event.target.value)}
            value={alt}
          />
        </label>
        <label>
          <span>Caption</span>
          <input
            maxLength={400}
            onChange={(event) => setCaption(event.target.value)}
            value={caption}
          />
        </label>
        <label>
          <span>Layout</span>
          <select
            onChange={(event) =>
              setLayout(event.target.value as "contained" | "full" | "wide")
            }
            value={layout}
          >
            <option value="contained">Contained</option>
            <option value="wide">Wide</option>
            <option value="full">Full</option>
          </select>
        </label>
        <label className={styles["sw-blog-check-z6p1h3"]}>
          <input
            checked={decorative}
            onChange={(event) => setDecorative(event.target.checked)}
            type="checkbox"
          />
          <span>Decorative image</span>
        </label>
        <Buttons.Button
          disabled={assets.length === 0}
          kind="secondary"
          onClick={insertImage}
          size="small"
          type="button"
        >
          Insert selected image
        </Buttons.Button>
      </div>
    </div>
  );
}

function PublicMediaUploadControl({
  onUploaded,
}: {
  onUploaded: (asset: BlogAssetOption) => void;
}) {
  const inputReference = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function upload() {
    const file = inputReference.current?.files?.[0];

    if (!file) {
      setMessage("Choose one JPEG, PNG, or WebP image.");
      return;
    }

    startTransition(async () => {
      const formData = new FormData();
      formData.set("file", file);

      try {
        const response = await fetch("/api/admin/content/media", {
          body: formData,
          method: "POST",
        });
        const result = (await response.json()) as {
          asset?: BlogAssetOption;
          error?: string;
        };

        if (!response.ok || !result.asset) {
          setMessage(
            result.error === "payload_too_large"
              ? "The source image exceeds 4 MiB."
              : "The image could not be verified and uploaded.",
          );
          return;
        }

        onUploaded(result.asset);
        if (inputReference.current) {
          inputReference.current.value = "";
        }
        setMessage("Public image uploaded and added to this editor.");
      } catch {
        setMessage("The image could not be verified and uploaded.");
      }
    });
  }

  return (
    <div className={styles["sw-blog-upload-b7n2q5"]}>
      <label>
        <span>Upload public website image</span>
        <input
          accept="image/jpeg,image/png,image/webp"
          disabled={isPending}
          ref={inputReference}
          type="file"
        />
      </label>
      <Buttons.Button
        kind="secondary"
        onClick={upload}
        pending={isPending}
        size="small"
        type="button"
      >
        {isPending ? "Verifying and uploading…" : "Upload to public library"}
      </Buttons.Button>
      <p aria-live="polite" role="status">
        {message}
      </p>
    </div>
  );
}

export function BlogEditorForm({
  assets: initialAssets,
  authors,
  categories,
  commandId,
  documentId,
  expectedRevision,
  hasDraft = false,
  notice,
  post,
  previewAction,
  publishAction,
  publishCommandId,
  publishedRevision,
  saveAction,
  unpublishAction,
  unpublishCommandId,
}: BlogEditorFormProps) {
  const [assets, setAssets] = useState(initialAssets);
  const [body, setBody] = useState<PortableTextBlock[]>(
    (post?.body as PortableTextBlock[] | undefined) ?? [],
  );
  const renderBlock = useMemo(() => createRenderBlock(assets), [assets]);
  const selectedCoverId = post?.coverImage.asset._ref ?? assets[0]?.id ?? "";

  return (
    <AdminPage
      description={
        <>
          <p>
            Structured website content is saved in Sanity. Every mutation is
            re-authorized here; publishing also requires a recent TOTP step-up.
          </p>
          {documentId ? (
            <div className={styles["sw-blog-meta-r6m2q4"]}>
              <span>Document: {documentId}</span>
              <span>Draft revision: {expectedRevision}</span>
              <span>Published: {publishedRevision ? "yes" : "not yet"}</span>
            </div>
          ) : null}
        </>
      }
      eyebrow="Blog editor"
      title={post?.title ?? "New blog post"}
    >
      {notice ? (
        <p className={styles["sw-blog-notice-k6m1q7"]}>{notice}</p>
      ) : null}

      <PublicMediaUploadControl
        onUploaded={(asset) =>
          setAssets((current) => [
            asset,
            ...current.filter((candidate) => candidate.id !== asset.id),
          ])
        }
      />

      <form action={saveAction} className={styles["sw-blog-form-n5m2p8"]}>
        <input name="bodyJson" type="hidden" value={JSON.stringify(body)} />
        <input name="commandId" type="hidden" value={commandId} />
        {documentId ? (
          <input name="documentId" type="hidden" value={documentId} />
        ) : null}
        {expectedRevision ? (
          <input
            name="expectedRevision"
            type="hidden"
            value={expectedRevision}
          />
        ) : null}

        <section className={styles["sw-blog-section-q7m3n9"]}>
          <h2>Article</h2>
          <div className={styles["sw-blog-grid-f3m8v2"]}>
            <label className={styles["sw-blog-field-y2m7q3"]}>
              <span>Title</span>
              <input
                defaultValue={post?.title}
                maxLength={140}
                name="title"
                required
              />
            </label>
            <label className={styles["sw-blog-field-y2m7q3"]}>
              <span>Slug</span>
              <input
                defaultValue={post?.slug.current}
                maxLength={120}
                name="slug"
                pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                required
              />
            </label>
            <label className={styles["sw-blog-field-y2m7q3"]}>
              <span>Locale</span>
              <select defaultValue={post?.locale ?? "en"} name="locale">
                <option value="en">English</option>
                <option value="da-DK">Dansk</option>
              </select>
            </label>
            <label className={styles["sw-blog-field-y2m7q3"]}>
              <span>Author</span>
              <select
                defaultValue={post?.author._ref ?? authors[0]?.id}
                name="authorId"
                required
              >
                {authors.map((author) => (
                  <option key={author.id} value={author.id}>
                    {author.title}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className={styles["sw-blog-field-y2m7q3"]}>
            <span>Excerpt</span>
            <textarea
              defaultValue={post?.excerpt}
              maxLength={320}
              name="excerpt"
              required
              rows={3}
            />
          </label>
          {categories.length > 0 ? (
            <fieldset className={styles["sw-blog-categories-c2m8p4"]}>
              <legend>Categories</legend>
              {categories.map((category) => (
                <label key={category.id}>
                  <input
                    defaultChecked={post?.categories.some(
                      (reference) => reference._ref === category.id,
                    )}
                    name="categoryId"
                    type="checkbox"
                    value={category.id}
                  />
                  <span>{category.title}</span>
                </label>
              ))}
            </fieldset>
          ) : null}
        </section>

        <section className={styles["sw-blog-section-q7m3n9"]}>
          <h2>Cover image</h2>
          <div className={styles["sw-blog-grid-f3m8v2"]}>
            <label className={styles["sw-blog-field-y2m7q3"]}>
              <span>Shared public asset</span>
              <select
                defaultValue={selectedCoverId}
                name="coverAssetId"
                required
              >
                {assets.map((asset) => (
                  <option key={asset.id} value={asset.id}>
                    {asset.name} · {asset.width}×{asset.height}
                  </option>
                ))}
              </select>
            </label>
            <label className={styles["sw-blog-field-y2m7q3"]}>
              <span>Alternative text</span>
              <input
                defaultValue={post?.coverImage.alt}
                maxLength={240}
                name="coverAlt"
              />
            </label>
          </div>
          <label className={styles["sw-blog-field-y2m7q3"]}>
            <span>Caption (optional)</span>
            <input
              defaultValue={post?.coverImage.caption}
              maxLength={400}
              name="coverCaption"
            />
          </label>
          <label className={styles["sw-blog-check-z6p1h3"]}>
            <input
              defaultChecked={post?.coverImage.decorative}
              name="coverDecorative"
              type="checkbox"
              value="true"
            />
            <span>Cover is decorative; publish with empty alt text</span>
          </label>
        </section>

        <section className={styles["sw-blog-section-q7m3n9"]}>
          <h2>Body</h2>
          <EditorProvider
            initialConfig={{
              initialValue: body,
              schemaDefinition: editorSchema,
            }}
          >
            <EventListenerPlugin
              on={(event) => {
                if (event.type === "mutation") {
                  setBody(event.value ?? []);
                }
              }}
            />
            <EditorToolbar assets={assets} />
            <PortableTextEditable
              aria-label="Blog post body"
              className={styles["sw-blog-editor-a7q3m6"]}
              renderAnnotation={renderAnnotation}
              renderBlock={renderBlock}
              renderDecorator={renderDecorator}
              renderListItem={renderListItem}
              renderPlaceholder={() => <p>Start writing the article…</p>}
              renderStyle={renderStyle}
            />
          </EditorProvider>
        </section>

        <section className={styles["sw-blog-section-q7m3n9"]}>
          <h2>Search and sharing</h2>
          <div className={styles["sw-blog-grid-f3m8v2"]}>
            <label className={styles["sw-blog-field-y2m7q3"]}>
              <span>SEO title (optional)</span>
              <input
                defaultValue={post?.seo.title}
                maxLength={70}
                name="seoTitle"
              />
            </label>
            <label className={styles["sw-blog-field-y2m7q3"]}>
              <span>SEO description (optional)</span>
              <textarea
                defaultValue={post?.seo.description}
                maxLength={320}
                name="seoDescription"
                rows={3}
              />
            </label>
          </div>
          <label className={styles["sw-blog-check-z6p1h3"]}>
            <input
              defaultChecked={post?.seo.noIndex}
              name="seoNoIndex"
              type="checkbox"
              value="true"
            />
            <span>Keep this published article out of search indexes</span>
          </label>
        </section>

        <div className={styles["sw-blog-actions-m8q2r6"]}>
          <Buttons.Button
            disabled={assets.length === 0 || authors.length === 0}
            type="submit"
          >
            Save draft
          </Buttons.Button>
        </div>
      </form>

      {documentId && expectedRevision && hasDraft ? (
        <>
          <PreviewSavedRevisionForm
            disabled={false}
            documentId={documentId}
            localeCode={post?.locale ?? "en"}
            previewAction={previewAction}
            revisionId={expectedRevision}
          />
          <form
            action={publishAction}
            className={styles["sw-blog-publish-v3m9q2"]}
          >
            <input name="commandId" type="hidden" value={publishCommandId} />
            <input name="documentId" type="hidden" value={documentId} />
            <input
              name="expectedRevision"
              type="hidden"
              value={expectedRevision}
            />
            <div>
              <h2>Publish current saved draft</h2>
              <p>
                Publishing requires a TOTP step-up from the preceding five
                minutes. Unsaved editor changes are never published.
              </p>
            </div>
            <Buttons.Button type="submit">
              Publish saved revision
            </Buttons.Button>
          </form>
        </>
      ) : null}

      {documentId && publishedRevision ? (
        <form
          action={unpublishAction}
          className={styles["sw-blog-publish-v3m9q2"]}
        >
          <input name="commandId" type="hidden" value={unpublishCommandId} />
          <input name="documentId" type="hidden" value={documentId} />
          <input
            name="expectedPublishedRevision"
            type="hidden"
            value={publishedRevision}
          />
          <div>
            <h2>Unpublish website article</h2>
            <p>
              The public copy is removed while the editable draft is retained.
              This destructive action requires a recent TOTP step-up.
            </p>
          </div>
          <Buttons.Button kind="danger" type="submit">
            Unpublish article
          </Buttons.Button>
        </form>
      ) : null}
    </AdminPage>
  );
}

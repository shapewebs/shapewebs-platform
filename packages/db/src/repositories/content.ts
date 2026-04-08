import { randomBytes, createHash, createHmac } from "node:crypto";
import type { ContentDocument } from "@shapewebs/content-schema";
import type { ContentState, ContentType } from "@shapewebs/config";
import { defaultLocale, type LocaleCode } from "@shapewebs/i18n";
import { parseAdminEnv } from "@shapewebs/validation";
import {
  mockDocumentListItems,
  mockEditorStates,
  mockPublishedDocuments,
} from "../mock/content";
import type {
  DocumentEditorState,
  DocumentListItem,
  PublishResult,
  PublishedDocument,
} from "../types/documents";
import type { PreviewTokenPayload } from "../types/auth";
import {
  buildContentListCacheTag,
  buildDocumentCacheTag,
  buildLocalizationCacheTag,
} from "./content-repository";

function isConfigured(
  supabase: any,
): supabase is NonNullable<any> {
  return supabase !== null;
}

function normalizeState(value: unknown): ContentState {
  return value === "draft" ||
    value === "review" ||
    value === "scheduled" ||
    value === "published" ||
    value === "archived"
    ? value
    : "draft";
}

function normalizeContentType(value: unknown): ContentType {
  return value === "page" ||
    value === "post" ||
    value === "project" ||
    value === "service" ||
    value === "method" ||
    value === "legal"
    ? value
    : "page";
}

function normalizeContentDocument(value: unknown): ContentDocument {
  if (typeof value === "object" && value !== null && "schemaVersion" in value) {
    return value as ContentDocument;
  }

  return {
    schemaVersion: 1,
    blocks: [],
  };
}

function createSeoState(
  meta: Record<string, unknown> | null | undefined,
): PublishedDocument["seo"] {
  return {
    canonicalUrlOverride:
      typeof meta?.canonical_url_override === "string"
        ? meta.canonical_url_override
        : null,
    metaDescription:
      typeof meta?.meta_description === "string" ? meta.meta_description : null,
    metaTitle: typeof meta?.meta_title === "string" ? meta.meta_title : null,
    robotsIndex:
      typeof meta?.robots_index === "boolean" ? meta.robots_index : true,
  };
}

export async function listDocuments(
  supabase: any,
  filters: {
    contentType?: ContentType;
    localeCode?: string;
    state?: ContentState;
  } = {},
): Promise<DocumentListItem[]> {
  if (!isConfigured(supabase)) {
    return mockDocumentListItems.filter((item) => {
      return (
        (!filters.contentType || item.contentType === filters.contentType) &&
        (!filters.localeCode || item.localeCode === filters.localeCode) &&
        (!filters.state || item.state === filters.state)
      );
    });
  }

  let query = supabase
    .schema("cms")
    .from("documents")
    .select(
      `
        id,
        content_type,
        state,
        published_at,
        updated_at,
        pages (page_kind),
        document_localizations!inner (
          locale_code,
          slug,
          title,
          summary
        )
      `,
    )
    .order("updated_at", { ascending: false });

  if (filters.contentType) {
    query = query.eq("content_type", filters.contentType);
  }

  if (filters.state) {
    query = query.eq("state", filters.state);
  }

  if (filters.localeCode) {
    query = query.eq("document_localizations.locale_code", filters.localeCode);
  }

  const { data, error } = await query;

  if (error || !data) {
    return [];
  }

  return data.flatMap((row: any) => {
    const localizations = Array.isArray(row.document_localizations)
      ? row.document_localizations
      : [];
    const pageKind =
      Array.isArray(row.pages) && row.pages[0] && typeof row.pages[0].page_kind === "string"
        ? row.pages[0].page_kind
        : null;

    return localizations.map((localization: any) => ({
      documentId: row.id,
      contentType: normalizeContentType(row.content_type),
      localeCode: localization.locale_code as DocumentListItem["localeCode"],
      pageKind,
      publishedAt: row.published_at,
      slug: localization.slug,
      state: normalizeState(row.state),
      summary: localization.summary,
      title: localization.title,
      updatedAt: row.updated_at,
    }));
  });
}

export async function getDocumentEditorState(
  supabase: any,
  options: {
    documentId: string;
    localeCode?: string;
  },
): Promise<DocumentEditorState | null> {
  if (!isConfigured(supabase)) {
    return mockEditorStates[options.documentId] ?? null;
  }

  const localeCode = options.localeCode ?? defaultLocale;

  const { data: document, error: documentError } = await supabase
    .schema("cms")
    .from("documents")
    .select("id, content_type, state, default_locale, published_at")
    .eq("id", options.documentId)
    .single();

  if (documentError || !document) {
    return null;
  }

  const { data: localization } = await supabase
    .schema("cms")
    .from("document_localizations")
    .select("id, locale_code, slug, title, summary")
    .eq("document_id", options.documentId)
    .eq("locale_code", localeCode)
    .single();

  const [{ data: pageRow }, { data: revisions }, { data: seo }] = await Promise.all([
    supabase
      .schema("cms")
      .from("pages")
      .select("page_kind")
      .eq("document_id", options.documentId)
      .maybeSingle(),
    supabase
      .schema("cms")
      .from("document_revisions")
      .select(
        "id, revision_number, locale_code, editor_state, change_note, created_at, created_by, content_json",
      )
      .eq("document_id", options.documentId)
      .eq("locale_code", localeCode)
      .order("revision_number", { ascending: false }),
    localization
      ? supabase
          .schema("cms")
          .from("seo_metadata")
          .select(
            "meta_title, meta_description, canonical_url_override, robots_index",
          )
          .eq("document_localization_id", localization.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const latestRevision = revisions?.[0] ?? null;

  return {
    documentId: document.id,
    contentType: normalizeContentType(document.content_type),
    defaultLocale: document.default_locale as DocumentEditorState["defaultLocale"],
    localeCode: localeCode as DocumentEditorState["localeCode"],
    pageKind:
      typeof pageRow?.page_kind === "string" ? pageRow.page_kind : "standard",
    publishedAt: document.published_at,
    slug: localization?.slug ?? "",
    source: "supabase",
    state: normalizeState(document.state),
    summary: localization?.summary ?? null,
    title: localization?.title ?? "",
    seo: createSeoState(seo as Record<string, unknown> | null | undefined),
    content: normalizeContentDocument(latestRevision?.content_json),
    revisions:
      revisions?.map((revision: any) => ({
        revisionId: revision.id,
        revisionNumber: revision.revision_number,
        localeCode: revision.locale_code as DocumentEditorState["localeCode"],
        editorState: normalizeState(revision.editor_state),
        changeNote: revision.change_note,
        createdAt: revision.created_at,
        createdBy: revision.created_by,
      })) ?? [],
  };
}

export async function createDraftRevision(
  supabase: any,
  input: {
    canonicalUrlOverride?: string | null;
    changeNote?: string | null;
    content: ContentDocument;
    contentType?: ContentType;
    documentId?: string;
    intent: "draft" | "review" | "publish";
    localeCode: string;
    metaDescription?: string | null;
    metaTitle?: string | null;
    pageKind?: string;
    robotsIndex: boolean;
    slug: string;
    summary?: string | null;
    title: string;
  },
): Promise<DocumentEditorState> {
  if (!isConfigured(supabase)) {
    throw new Error("Supabase is not configured for content writes yet.");
  }

  let documentId = input.documentId;

  if (!documentId) {
    const { data: createdDocument, error: documentError } = await supabase
      .schema("cms")
      .from("documents")
      .insert({
        content_type: input.contentType ?? "page",
        default_locale: input.localeCode,
        state: input.intent === "publish" ? "published" : input.intent,
      })
      .select("id")
      .single();

    if (documentError || !createdDocument) {
      throw new Error(documentError?.message ?? "Failed to create document.");
    }

    documentId = createdDocument.id;

    if ((input.contentType ?? "page") === "page") {
      const { error: pageError } = await supabase
        .schema("cms")
        .from("pages")
        .insert({
          document_id: documentId,
          page_kind: input.pageKind ?? "standard",
        });

      if (pageError) {
        throw new Error(pageError.message);
      }
    }
  }

  const nextState =
    input.intent === "publish"
      ? "published"
      : input.intent === "review"
        ? "review"
        : "draft";

  const { data: existingRevisions } = await supabase
    .schema("cms")
    .from("document_revisions")
    .select("revision_number")
    .eq("document_id", documentId)
    .eq("locale_code", input.localeCode)
    .order("revision_number", { ascending: false })
    .limit(1);

  const nextRevisionNumber = (existingRevisions?.[0]?.revision_number ?? 0) + 1;

  const { data: revision, error: revisionError } = await supabase
    .schema("cms")
    .from("document_revisions")
    .insert({
      document_id: documentId,
      locale_code: input.localeCode,
      revision_number: nextRevisionNumber,
      editor_state: nextState,
      content_json: input.content,
      change_note: input.changeNote ?? null,
    })
    .select("id")
    .single();

  if (revisionError || !revision) {
    throw new Error(revisionError?.message ?? "Failed to create revision.");
  }

  const { data: localization, error: localizationError } = await supabase
    .schema("cms")
    .from("document_localizations")
    .upsert(
      {
        document_id: documentId,
        locale_code: input.localeCode,
        slug: input.slug,
        title: input.title,
        summary: input.summary ?? null,
        translation_status: nextState === "published" ? "published" : "ready",
      },
      {
        onConflict: "document_id,locale_code",
      },
    )
    .select("id")
    .single();

  if (localizationError || !localization) {
    throw new Error(localizationError?.message ?? "Failed to update localization.");
  }

  const { error: seoError } = await supabase
    .schema("cms")
    .from("seo_metadata")
    .upsert(
      {
        document_localization_id: localization.id,
        meta_title: input.metaTitle ?? null,
        meta_description: input.metaDescription ?? null,
        canonical_url_override: input.canonicalUrlOverride ?? null,
        robots_index: input.robotsIndex,
      },
      {
        onConflict: "document_localization_id",
      },
    );

  if (seoError) {
    throw new Error(seoError.message);
  }

  const { error: documentUpdateError } = await supabase
    .schema("cms")
    .from("documents")
    .update({
      state: nextState,
      published_at:
        nextState === "published" ? new Date().toISOString() : null,
      published_revision_id:
        nextState === "published" ? revision.id : null,
    })
    .eq("id", documentId);

  if (documentUpdateError) {
    throw new Error(documentUpdateError.message);
  }

  const auditAction =
    input.intent === "publish"
      ? "document.publish"
      : input.intent === "review"
        ? "document.submit_for_review"
        : "document.save_draft";

  await supabase.rpc("append_audit_log", {
    p_action: auditAction,
    p_entity_type: "document",
    p_entity_id: documentId,
    p_after: {
      localeCode: input.localeCode,
      slug: input.slug,
      state: nextState,
      revisionId: revision.id,
    },
  });

  if (!documentId) {
    throw new Error("Document identifier is missing after revision creation.");
  }

  const editorState = await getDocumentEditorState(supabase, {
    documentId,
    localeCode: input.localeCode,
  });

  if (!editorState) {
    throw new Error("Document saved, but editor state could not be reloaded.");
  }

  return editorState;
}

export async function publishDocumentRevision(
  supabase: any,
  input: {
    documentId: string;
    localeCode: string;
    revisionId: string;
  },
): Promise<PublishResult> {
  if (!isConfigured(supabase)) {
    throw new Error("Supabase is not configured for publishing yet.");
  }

  const publishedAt = new Date().toISOString();

  const { error: revisionError } = await supabase
    .schema("cms")
    .from("document_revisions")
    .update({
      editor_state: "published",
    })
    .eq("id", input.revisionId)
    .eq("document_id", input.documentId);

  if (revisionError) {
    throw new Error(revisionError.message);
  }

  const { error: documentError } = await supabase
    .schema("cms")
    .from("documents")
    .update({
      state: "published",
      published_at: publishedAt,
      published_revision_id: input.revisionId,
    })
    .eq("id", input.documentId);

  if (documentError) {
    throw new Error(documentError.message);
  }

  await supabase
    .schema("cms")
    .from("document_localizations")
    .update({
      translation_status: "published",
    })
    .eq("document_id", input.documentId)
    .eq("locale_code", input.localeCode);

  await supabase.rpc("append_audit_log", {
    p_action: "document.publish",
    p_entity_type: "document",
    p_entity_id: input.documentId,
    p_after: {
      localeCode: input.localeCode,
      revisionId: input.revisionId,
      publishedAt,
    },
  });

  return {
    documentId: input.documentId,
    localeCode: input.localeCode as PublishResult["localeCode"],
    revisionId: input.revisionId,
    publishedAt,
    state: "published",
  };
}

export async function createPreviewToken(
  supabase: any,
  input: {
    documentId: string;
    localeCode: string;
    path: string;
    revisionId: string;
  },
): Promise<PreviewTokenPayload> {
  if (!isConfigured(supabase)) {
    throw new Error("Supabase is not configured for preview tokens yet.");
  }

  const env = parseAdminEnv();
  if (!env.PREVIEW_TOKEN_SECRET) {
    throw new Error("PREVIEW_TOKEN_SECRET is missing.");
  }

  const token = randomBytes(24).toString("hex");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const signature = createHmac("sha256", env.PREVIEW_TOKEN_SECRET)
    .update(token)
    .digest("hex");
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

  const { error } = await supabase.schema("ops").from("preview_tokens").insert({
    document_id: input.documentId,
    locale_code: input.localeCode,
    revision_id: input.revisionId,
    token_hash: tokenHash,
    expires_at: expiresAt,
  });

  if (error) {
    throw new Error(error.message);
  }

  return {
    token,
    signature,
    expiresAt,
    revisionId: input.revisionId,
    previewPath: input.path,
  };
}

export async function consumePreviewToken(
  supabase: any,
  input: {
    signature: string;
    token: string;
  },
) {
  if (!isConfigured(supabase)) {
    return null;
  }

  const env = parseAdminEnv();
  if (!env.PREVIEW_TOKEN_SECRET) {
    return null;
  }

  const expectedSignature = createHmac("sha256", env.PREVIEW_TOKEN_SECRET)
    .update(input.token)
    .digest("hex");

  if (input.signature !== expectedSignature) {
    return null;
  }

  const tokenHash = createHash("sha256").update(input.token).digest("hex");
  const { data, error } = await supabase
    .schema("ops")
    .from("preview_tokens")
    .select("id, document_id, locale_code, revision_id, expires_at, used_at")
    .eq("token_hash", tokenHash)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  await supabase
    .schema("ops")
    .from("preview_tokens")
    .update({ used_at: new Date().toISOString() })
    .eq("id", data.id);

  return {
    documentId: data.document_id,
    localeCode: data.locale_code,
    revisionId: data.revision_id,
  };
}

export async function listPublishedContent(
  supabase: any,
  contentType: ContentType,
  localeCode: LocaleCode = defaultLocale as LocaleCode,
): Promise<PublishedDocument[]> {
  if (!isConfigured(supabase)) {
    return mockPublishedDocuments.filter(
      (item) => item.contentType === contentType && item.localeCode === localeCode,
    );
  }

  const { data, error } = await supabase
    .schema("cms")
    .from("documents")
    .select(
      `
        id,
        content_type,
        state,
        published_at,
        pages (page_kind),
        document_localizations!inner (
          id,
          locale_code,
          slug,
          title,
          summary,
          seo_metadata (
            meta_title,
            meta_description,
            canonical_url_override,
            robots_index
          )
        ),
        document_revisions (
          id,
          locale_code,
          editor_state,
          revision_number,
          content_json
        )
      `,
    )
    .eq("content_type", contentType)
    .eq("state", "published")
    .eq("document_localizations.locale_code", localeCode)
    .order("published_at", { ascending: false });

  if (error || !data) {
    return [];
  }

  return data.flatMap((row: any) => {
    const localization = Array.isArray(row.document_localizations)
      ? row.document_localizations[0]
      : row.document_localizations;

    if (!localization) {
      return [];
    }

    const revisions = Array.isArray(row.document_revisions)
      ? row.document_revisions
      : [];
    const latestPublishedRevision = revisions
      .filter(
        (revision: any) =>
          revision.locale_code === localeCode && revision.editor_state === "published",
      )
      .sort((left: any, right: any) => right.revision_number - left.revision_number)[0];

    const localizationSeo =
      typeof localization === "object" &&
      localization !== null &&
      "seo_metadata" in localization
        ? Reflect.get(localization, "seo_metadata")
        : null;
    const pageKind =
      Array.isArray(row.pages) && row.pages[0] && typeof row.pages[0].page_kind === "string"
        ? row.pages[0].page_kind
        : null;

    return [
      {
        documentId: row.id,
        contentType: normalizeContentType(row.content_type),
        localeCode: localization.locale_code as PublishedDocument["localeCode"],
        pageKind,
        publishedAt: row.published_at,
        slug: localization.slug,
        source: "supabase" as const,
        summary: localization.summary,
        title: localization.title,
        seo: createSeoState(
          (Array.isArray(localizationSeo)
            ? localizationSeo[0]
            : localizationSeo) as Record<string, unknown> | null | undefined,
        ),
        content: normalizeContentDocument(latestPublishedRevision?.content_json),
      },
    ];
  });
}

export async function getPreviewContentByRevision(
  supabase: any,
  input: {
    documentId: string;
    localeCode: string;
    revisionId: string;
  },
): Promise<PublishedDocument | null> {
  if (!isConfigured(supabase)) {
    return null;
  }

  const { data: document, error: documentError } = await supabase
    .schema("cms")
    .from("documents")
    .select("id, content_type, published_at")
    .eq("id", input.documentId)
    .single();

  if (documentError || !document) {
    return null;
  }

  const [{ data: localization }, { data: revision }, { data: pageRow }, { data: seo }] =
    await Promise.all([
      supabase
        .schema("cms")
        .from("document_localizations")
        .select("id, locale_code, slug, title, summary")
        .eq("document_id", input.documentId)
        .eq("locale_code", input.localeCode)
        .single(),
      supabase
        .schema("cms")
        .from("document_revisions")
        .select("id, locale_code, content_json")
        .eq("document_id", input.documentId)
        .eq("locale_code", input.localeCode)
        .eq("id", input.revisionId)
        .single(),
      supabase
        .schema("cms")
        .from("pages")
        .select("page_kind")
        .eq("document_id", input.documentId)
        .maybeSingle(),
      supabase
        .schema("cms")
        .from("document_localizations")
        .select(
          `
            seo_metadata (
              meta_title,
              meta_description,
              canonical_url_override,
              robots_index
            )
          `,
        )
        .eq("document_id", input.documentId)
        .eq("locale_code", input.localeCode)
        .single(),
    ]);

  if (!localization || !revision) {
    return null;
  }

  const seoData =
    seo && typeof seo === "object" && "seo_metadata" in seo
      ? Reflect.get(seo, "seo_metadata")
      : null;

  return {
    documentId: document.id,
    contentType: normalizeContentType(document.content_type),
    localeCode: localization.locale_code as PublishedDocument["localeCode"],
    pageKind:
      typeof pageRow?.page_kind === "string" ? pageRow.page_kind : null,
    publishedAt: document.published_at,
    slug: localization.slug,
    source: "supabase",
    summary: localization.summary,
    title: localization.title,
    seo: createSeoState(
      (Array.isArray(seoData) ? seoData[0] : seoData) as
        | Record<string, unknown>
        | null
        | undefined,
    ),
    content: normalizeContentDocument(revision.content_json),
  };
}

export async function getPublishedContentBySlug(
  supabase: any,
  options: {
    contentType: ContentType;
    localeCode?: string;
    slug: string;
  },
): Promise<PublishedDocument | null> {
  const localeCode = (options.localeCode ?? defaultLocale) as LocaleCode;

  const items = await listPublishedContent(supabase, options.contentType, localeCode);

  return items.find((item) => item.slug === options.slug) ?? null;
}

export async function getPageByKind(
  supabase: any,
  pageKind: string,
  localeCode: LocaleCode = defaultLocale as LocaleCode,
) {
  if (!isConfigured(supabase)) {
    return mockPublishedDocuments.find(
      (item) =>
        item.contentType === "page" &&
        item.pageKind === pageKind &&
        item.localeCode === localeCode,
    ) ?? null;
  }

  const pages = await listPublishedContent(supabase, "page", localeCode);
  return pages.find((page) => page.pageKind === pageKind) ?? null;
}

export function buildRevalidationTags(input: {
  contentType: ContentType;
  documentId: string;
  localeCode: string;
}) {
  return [
    buildDocumentCacheTag(input.documentId),
    buildLocalizationCacheTag(input.localeCode as LocaleCode),
    buildContentListCacheTag(input.contentType),
  ];
}

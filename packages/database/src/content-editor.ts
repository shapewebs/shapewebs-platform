import "server-only";

import { randomUUID } from "node:crypto";

import { and, desc, eq, sql } from "drizzle-orm";
import {
  contentDocumentSchema,
  type ContentDocument,
} from "@shapewebs/content-schema";
import {
  contentEditorSelectionSchema,
  type ContentRollbackCommandInput,
  type ContentUnpublishCommandInput,
  type PageEditorInput,
} from "@shapewebs/validation";

import type { AdminAuthorizationContext } from "./admin-auth";
import { createDatabase } from "./client";
import {
  auditEvents,
  contentDocuments,
  contentLocalizations,
  contentRevisions,
} from "./schema";

const maximumRevisionHistoryItems = 100;

type ContentState = "archived" | "draft" | "published" | "review" | "scheduled";
type ContentType = "legal" | "method" | "page" | "post" | "project" | "service";
type LocaleCode = "da-DK" | "en";

export type ContentEditorSeoState = {
  canonicalUrlOverride: string | null;
  metaDescription: string | null;
  metaTitle: string | null;
  robotsIndex: boolean;
};

export type ContentRevisionSummary = {
  changeNote: string | null;
  createdAt: string;
  createdBy: string | null;
  editorState: ContentState;
  localeCode: LocaleCode;
  revisionId: string;
  revisionNumber: number;
};

export type ContentEditorState = {
  content: ContentDocument;
  contentType: ContentType;
  defaultLocale: LocaleCode;
  documentId: string | null;
  localeCode: LocaleCode;
  pageKind: string | null;
  publishedAt: string | null;
  publishedRevisionId: string | null;
  revisions: ContentRevisionSummary[];
  seo: ContentEditorSeoState;
  slug: string;
  source: "default" | "neon";
  state: ContentState;
  summary: string | null;
  title: string;
  version: number;
};

export type SavePageContentInput = Omit<
  PageEditorInput,
  "contentJson" | "documentId"
> & {
  content: ContentDocument;
  documentId?: string;
  requestId?: string;
};

export type SavePageContentResult =
  | {
      documentId: string;
      localeCode: LocaleCode;
      revisionId: string;
      status: "duplicate" | "saved";
      version: number;
    }
  | {
      status: "conflict" | "slug_conflict";
    };

export type ContentWorkflowCommandResult =
  | {
      documentId: string;
      localeCode: LocaleCode;
      previousSlug: string | null;
      revisionId: string;
      slug: string;
      status: "duplicate" | "rolled_back" | "unpublished";
      version: number;
    }
  | {
      status: "conflict" | "slug_conflict";
    };

export type RollbackPageContentInput = Omit<
  ContentRollbackCommandInput,
  "confirmation"
> & {
  requestId?: string;
};

export type UnpublishPageContentInput = Omit<
  ContentUnpublishCommandInput,
  "confirmation"
> & {
  requestId?: string;
};

type MutationRow = {
  documentId: string;
  localeCode: string;
  revisionId: string;
  result: "duplicate" | "saved";
  version: number;
};

type WorkflowMutationRow = {
  documentId: string;
  localeCode: string;
  previousSlug: string | null;
  result: "duplicate" | "rolled_back" | "unpublished";
  revisionId: string;
  slug: string;
  version: number;
};

function requireContentEditorAuthorization(
  authorization: AdminAuthorizationContext,
): void {
  if (!["owner", "editor"].includes(authorization.role)) {
    throw new Error(
      "Owner or editor authorization is required to manage content.",
    );
  }
}

function contextQueries(
  database: ReturnType<typeof createDatabase>,
  authorization: AdminAuthorizationContext,
) {
  return [
    database.execute(
      sql`select set_config('app.organization_id', ${authorization.organizationId}, true)`,
    ),
    database.execute(
      sql`select set_config('app.user_id', ${authorization.actor.id}, true)`,
    ),
    database.execute(
      sql`select set_config('app.membership_role', ${authorization.role}, true)`,
    ),
  ] as const;
}

function normalizeSeo(value: unknown): ContentEditorSeoState {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {
      canonicalUrlOverride: null,
      metaDescription: null,
      metaTitle: null,
      robotsIndex: true,
    };
  }

  const seo = value as Record<string, unknown>;

  return {
    canonicalUrlOverride:
      typeof seo.canonicalUrlOverride === "string"
        ? seo.canonicalUrlOverride
        : null,
    metaDescription:
      typeof seo.metaDescription === "string" ? seo.metaDescription : null,
    metaTitle: typeof seo.metaTitle === "string" ? seo.metaTitle : null,
    robotsIndex: typeof seo.robotsIndex === "boolean" ? seo.robotsIndex : true,
  };
}

function createSeoSnapshot(input: SavePageContentInput) {
  return {
    canonicalUrlOverride: input.canonicalUrlOverride ?? null,
    metaDescription: input.metaDescription ?? null,
    metaTitle: input.metaTitle ?? null,
    robotsIndex: input.robotsIndex,
  };
}

function getNextState(intent: SavePageContentInput["intent"]): ContentState {
  if (intent === "publish") {
    return "published";
  }

  return intent === "review" ? "review" : "draft";
}

function getAuditAction(intent: SavePageContentInput["intent"]): string {
  if (intent === "publish") {
    return "content.document_published";
  }

  return intent === "review"
    ? "content.document_submitted_for_review"
    : "content.document_draft_saved";
}

function isUniqueSlugError(error: unknown): boolean {
  const slugConstraints = new Set([
    "content_documents_organization_kind_slug_unique",
    "content_localizations_organization_kind_locale_slug_unique",
  ]);

  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    Reflect.get(error, "code") === "23505" &&
    "constraint" in error &&
    slugConstraints.has(String(Reflect.get(error, "constraint")))
  );
}

function parseMutationRow(value: unknown): MutationRow | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const row = value as Record<string, unknown>;

  if (
    typeof row.documentId !== "string" ||
    typeof row.localeCode !== "string" ||
    typeof row.revisionId !== "string" ||
    (row.result !== "duplicate" && row.result !== "saved") ||
    typeof row.version !== "number"
  ) {
    return null;
  }

  return {
    documentId: row.documentId,
    localeCode: row.localeCode,
    result: row.result,
    revisionId: row.revisionId,
    version: row.version,
  };
}

function parseWorkflowMutationRow(value: unknown): WorkflowMutationRow | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const row = value as Record<string, unknown>;

  if (
    typeof row.documentId !== "string" ||
    typeof row.localeCode !== "string" ||
    (row.previousSlug !== null && typeof row.previousSlug !== "string") ||
    !["duplicate", "rolled_back", "unpublished"].includes(String(row.result)) ||
    typeof row.revisionId !== "string" ||
    typeof row.slug !== "string" ||
    typeof row.version !== "number"
  ) {
    return null;
  }

  return {
    documentId: row.documentId,
    localeCode: row.localeCode,
    previousSlug: row.previousSlug as string | null,
    result: row.result as WorkflowMutationRow["result"],
    revisionId: row.revisionId,
    slug: row.slug,
    version: row.version,
  };
}

export function getDefaultPageEditorState(): ContentEditorState {
  return {
    content: {
      blocks: [],
      schemaVersion: 1,
    },
    contentType: "page",
    defaultLocale: "en",
    documentId: null,
    localeCode: "en",
    pageKind: "standard",
    publishedAt: null,
    publishedRevisionId: null,
    revisions: [],
    seo: {
      canonicalUrlOverride: null,
      metaDescription: null,
      metaTitle: null,
      robotsIndex: true,
    },
    slug: "",
    source: "default",
    state: "draft",
    summary: null,
    title: "",
    version: 0,
  };
}

export async function getContentEditorState(
  databaseUrl: string,
  authorization: AdminAuthorizationContext,
  input: {
    documentId: string;
    localeCode?: string;
  },
): Promise<ContentEditorState | null> {
  requireContentEditorAuthorization(authorization);
  const selectionResult = contentEditorSelectionSchema.safeParse(input);

  if (!selectionResult.success) {
    return null;
  }

  const selection = selectionResult.data;
  const database = createDatabase(databaseUrl);
  const context = contextQueries(database, authorization);
  const results = await database.batch([
    ...context,
    database
      .select({
        contentType: contentDocuments.kind,
        defaultLocale: contentDocuments.defaultLocale,
        documentId: contentDocuments.id,
        localeCode: contentLocalizations.locale,
        pageKind: contentDocuments.pageKind,
        publishedAt: contentLocalizations.publishedAt,
        publishedRevisionId: contentLocalizations.publishedRevisionId,
        seo: contentLocalizations.seo,
        slug: contentLocalizations.slug,
        state: contentDocuments.status,
        summary: contentLocalizations.summary,
        title: contentLocalizations.title,
        version: contentDocuments.version,
      })
      .from(contentDocuments)
      .leftJoin(
        contentLocalizations,
        and(
          eq(contentLocalizations.documentId, contentDocuments.id),
          eq(
            contentLocalizations.locale,
            selection.localeCode ?? contentDocuments.defaultLocale,
          ),
        ),
      )
      .where(eq(contentDocuments.id, selection.documentId))
      .limit(1),
    database
      .select({
        changeNote: contentRevisions.changeNote,
        content: contentRevisions.payload,
        createdAt: contentRevisions.createdAt,
        createdBy: contentRevisions.createdByUserId,
        editorState: contentRevisions.status,
        localeCode: contentRevisions.locale,
        revisionId: contentRevisions.id,
        revisionNumber: contentRevisions.revisionNumber,
      })
      .from(contentRevisions)
      .innerJoin(
        contentDocuments,
        eq(contentDocuments.id, contentRevisions.documentId),
      )
      .where(
        and(
          eq(contentDocuments.id, selection.documentId),
          eq(
            contentRevisions.locale,
            selection.localeCode ?? contentDocuments.defaultLocale,
          ),
        ),
      )
      .orderBy(
        desc(contentRevisions.revisionNumber),
        desc(contentRevisions.createdAt),
      )
      .limit(maximumRevisionHistoryItems),
  ]);
  const document = results[3][0];

  if (!document) {
    return null;
  }

  const revisions = results[4];
  const latestRevision = revisions[0];
  const localeCode = (document.localeCode ??
    selection.localeCode ??
    document.defaultLocale) as LocaleCode;

  return {
    content: contentDocumentSchema.parse(
      latestRevision?.content ?? {
        blocks: [],
        schemaVersion: 1,
      },
    ),
    contentType: document.contentType,
    defaultLocale: document.defaultLocale as LocaleCode,
    documentId: document.documentId,
    localeCode,
    pageKind: document.pageKind,
    publishedAt: document.publishedAt?.toISOString() ?? null,
    publishedRevisionId: document.publishedRevisionId,
    revisions: revisions.map((revision) => ({
      changeNote: revision.changeNote,
      createdAt: revision.createdAt.toISOString(),
      createdBy: revision.createdBy,
      editorState: revision.editorState,
      localeCode: revision.localeCode as LocaleCode,
      revisionId: revision.revisionId,
      revisionNumber: revision.revisionNumber,
    })),
    seo: normalizeSeo(document.seo),
    slug: document.slug ?? "",
    source: "neon",
    state: latestRevision?.editorState ?? document.state,
    summary: document.summary,
    title: document.title ?? "",
    version: document.version,
  };
}

async function executeNewPageContentRevision(
  database: ReturnType<typeof createDatabase>,
  authorization: AdminAuthorizationContext,
  input: SavePageContentInput,
  values: {
    auditAction: string;
    contentJson: string;
    documentId: string;
    nextState: ContentState;
    publishedAt: Date | null;
    revisionId: string;
    seoJson: string;
  },
): Promise<MutationRow | null> {
  const context = contextQueries(database, authorization);
  const results = await database.batch([
    ...context,
    database.execute(
      sql`select pg_advisory_xact_lock(hashtextextended(${input.commandId}::text, 0))`,
    ),
    database.execute(
      sql`select set_config('app.content_command_result', 'duplicate', true)`,
    ),
    database.execute(sql`
      with existing_command as (
        select 1
        from ${contentRevisions} as revision
        inner join ${contentDocuments} as document
          on document."id" = revision."document_id"
        where revision."command_id" = ${input.commandId}
          and document."organization_id" = ${authorization.organizationId}
      ),
      inserted_document as (
        insert into ${contentDocuments} (
          "id",
          "organization_id",
          "kind",
          "slug",
          "status",
          "default_locale",
          "page_kind",
          "version",
          "created_by_user_id",
          "updated_at"
        )
        select
          ${values.documentId},
          ${authorization.organizationId},
          'page',
          ${input.slug},
          ${values.nextState},
          ${input.localeCode},
          ${input.pageKind},
          1,
          ${authorization.actor.id},
          now()
        where not exists (select 1 from existing_command)
        returning "id"
      )
      select set_config('app.content_command_result', 'saved', true)
      from inserted_document
    `),
    database.execute(sql`
      insert into ${contentRevisions} (
        "id",
        "document_id",
        "command_id",
        "revision_number",
        "locale",
        "status",
        "slug",
        "page_kind",
        "title",
        "summary",
        "payload",
        "seo",
        "change_note",
        "created_by_user_id",
        "published_at"
      )
      select
        ${values.revisionId},
        document."id",
        ${input.commandId},
        1,
        ${input.localeCode},
        ${values.nextState},
        ${input.slug},
        ${input.pageKind},
        ${input.title},
        ${input.summary ?? null},
        ${values.contentJson}::jsonb,
        ${values.seoJson}::jsonb,
        ${input.changeNote ?? null},
        ${authorization.actor.id},
        ${values.publishedAt}
      from ${contentDocuments} as document
      where document."id" = ${values.documentId}
        and current_setting('app.content_command_result', true) = 'saved'
        and not exists (
          select 1
          from ${contentRevisions} as revision
          where revision."command_id" = ${input.commandId}
        )
    `),
    database.execute(sql`
      insert into ${contentLocalizations} (
        "organization_id",
        "document_id",
        "kind",
        "locale",
        "slug",
        "title",
        "summary",
        "seo",
        "published_revision_id",
        "published_at",
        "updated_at"
      )
      select
        ${authorization.organizationId},
        revision."document_id",
        'page',
        ${input.localeCode},
        ${input.slug},
        ${input.title},
        ${input.summary ?? null},
        ${values.seoJson}::jsonb,
        ${input.intent === "publish" ? values.revisionId : null},
        ${values.publishedAt},
        now()
      from ${contentRevisions} as revision
      where revision."command_id" = ${input.commandId}
        and current_setting('app.content_command_result', true) = 'saved'
    `),
    database.execute(sql`
      update ${contentDocuments} as document
      set
        "published_at" = ${values.publishedAt}
      where document."id" = ${values.documentId}
        and ${input.intent === "publish"}
        and exists (
          select 1
          from ${contentRevisions} as revision
          where revision."id" = ${values.revisionId}
            and revision."document_id" = document."id"
        )
    `),
    database.execute(sql`
      insert into ${auditEvents} (
        "organization_id",
        "actor_user_id",
        "action",
        "target_type",
        "target_id",
        "request_id",
        "metadata"
      )
      select
        ${authorization.organizationId},
        ${authorization.actor.id},
        ${values.auditAction},
        'content_document',
        revision."document_id"::text,
        ${input.requestId ?? null}::text,
        jsonb_build_object(
          'commandId', ${input.commandId}::uuid,
          'localeCode', ${input.localeCode}::text,
          'result', 'success',
          'revisionId', revision."id"::text,
          'state', ${values.nextState}::text
        )
      from ${contentRevisions} as revision
      where revision."command_id" = ${input.commandId}
        and current_setting('app.content_command_result', true) = 'saved'
    `),
    database.execute(sql<MutationRow>`
      select
        revision."document_id" as "documentId",
        revision."locale" as "localeCode",
        revision."id" as "revisionId",
        current_setting('app.content_command_result', true) as "result",
        document."version"
      from ${contentRevisions} as revision
      inner join ${contentDocuments} as document
        on document."id" = revision."document_id"
      where revision."command_id" = ${input.commandId}
        and document."organization_id" = ${authorization.organizationId}
    `),
  ]);

  return parseMutationRow(results[10].rows[0]);
}

export async function savePageContentRevision(
  databaseUrl: string,
  authorization: AdminAuthorizationContext,
  input: SavePageContentInput,
): Promise<SavePageContentResult> {
  requireContentEditorAuthorization(authorization);
  const database = createDatabase(databaseUrl);
  const documentId = input.documentId ?? randomUUID();
  const revisionId = randomUUID();
  const nextState = getNextState(input.intent);
  const publishedAt = input.intent === "publish" ? new Date() : null;
  const contentJson = JSON.stringify(input.content);
  const seoJson = JSON.stringify(createSeoSnapshot(input));
  const auditAction = getAuditAction(input.intent);
  const context = contextQueries(database, authorization);
  const createDocument = input.documentId === undefined;

  if (createDocument) {
    if (input.expectedVersion !== 0) {
      return { status: "conflict" };
    }

    try {
      const row = await executeNewPageContentRevision(
        database,
        authorization,
        input,
        {
          auditAction,
          contentJson,
          documentId,
          nextState,
          publishedAt,
          revisionId,
          seoJson,
        },
      );

      if (!row) {
        return { status: "conflict" };
      }

      return {
        documentId: row.documentId,
        localeCode: row.localeCode as LocaleCode,
        revisionId: row.revisionId,
        status: row.result,
        version: row.version,
      };
    } catch (error) {
      if (isUniqueSlugError(error)) {
        return { status: "slug_conflict" };
      }

      throw error;
    }
  }

  const mutation = sql<MutationRow>`
        with existing_command as (
          select
            revision."document_id" as "documentId",
            revision."locale" as "localeCode",
            revision."id" as "revisionId",
            document."version" as "version"
          from ${contentRevisions} as revision
          inner join ${contentDocuments} as document
            on document."id" = revision."document_id"
          where revision."command_id" = ${input.commandId}
            and document."organization_id" = ${authorization.organizationId}
        ),
        updated_document as (
          update ${contentDocuments} as document
          set
            "slug" = case
              when document."default_locale" = ${input.localeCode}
                then ${input.slug}
              else document."slug"
            end,
            "status" = ${nextState},
            "page_kind" = ${input.pageKind},
            "version" = document."version" + 1,
            "published_at" = case
              when ${input.intent === "publish"}
                then ${publishedAt}
              else document."published_at"
            end,
            "updated_at" = now()
          where document."id" = ${documentId}
            and document."organization_id" = ${authorization.organizationId}
            and document."version" = ${input.expectedVersion}
            and not exists (select 1 from existing_command)
          returning
            document."id" as "documentId",
            document."kind" as "kind",
            document."version" as "version"
        ),
        inserted_revision as (
          insert into ${contentRevisions} (
            "id",
            "document_id",
            "command_id",
            "revision_number",
            "locale",
            "status",
            "slug",
            "page_kind",
            "title",
            "summary",
            "payload",
            "seo",
            "change_note",
            "created_by_user_id",
            "published_at"
          )
          select
            ${revisionId},
            updated_document."documentId",
            ${input.commandId},
            coalesce((
              select max(revision."revision_number")
              from ${contentRevisions} as revision
              where revision."document_id" = updated_document."documentId"
                and revision."locale" = ${input.localeCode}
            ), 0) + 1,
            ${input.localeCode},
            ${nextState},
            ${input.slug},
            ${input.pageKind},
            ${input.title},
            ${input.summary ?? null},
            ${contentJson}::jsonb,
            ${seoJson}::jsonb,
            ${input.changeNote ?? null},
            ${authorization.actor.id},
            ${publishedAt}
          from updated_document
          returning
            "document_id" as "documentId",
            "id" as "revisionId"
        ),
        upserted_localization as (
          insert into ${contentLocalizations} (
            "organization_id",
            "document_id",
            "kind",
            "locale",
            "slug",
            "title",
            "summary",
            "seo",
            "published_revision_id",
            "published_at",
            "updated_at"
          )
          select
            ${authorization.organizationId},
            inserted_revision."documentId",
            updated_document."kind",
            ${input.localeCode},
            ${input.slug},
            ${input.title},
            ${input.summary ?? null},
            ${seoJson}::jsonb,
            null,
            null,
            now()
          from inserted_revision
          inner join updated_document
            on updated_document."documentId" = inserted_revision."documentId"
          on conflict (
            "document_id",
            "locale"
          )
          do update set
            "slug" = excluded."slug",
            "title" = excluded."title",
            "summary" = excluded."summary",
            "seo" = excluded."seo",
            "published_revision_id" = coalesce(
              excluded."published_revision_id",
              "content_localizations"."published_revision_id"
            ),
            "published_at" = coalesce(
              excluded."published_at",
              "content_localizations"."published_at"
            ),
            "updated_at" = excluded."updated_at"
          returning "document_id" as "documentId"
        ),
        inserted_audit as (
          insert into ${auditEvents} (
            "organization_id",
            "actor_user_id",
            "action",
            "target_type",
            "target_id",
            "request_id",
            "metadata"
          )
          select
            ${authorization.organizationId},
            ${authorization.actor.id},
            ${auditAction},
            'content_document',
            inserted_revision."documentId"::text,
            ${input.requestId ?? null}::text,
            jsonb_build_object(
              'commandId', ${input.commandId}::uuid,
              'localeCode', ${input.localeCode}::text,
              'result', 'success',
              'revisionId', inserted_revision."revisionId"::text,
              'state', ${nextState}::text
            )
          from inserted_revision
          inner join upserted_localization
            on upserted_localization."documentId" =
              inserted_revision."documentId"
          returning "target_id"
        )
        select
          existing_command."documentId",
          existing_command."localeCode",
          existing_command."revisionId",
          'duplicate'::text as "result",
          existing_command."version"
        from existing_command
        union all
        select
          inserted_revision."documentId",
          ${input.localeCode}::text as "localeCode",
          inserted_revision."revisionId",
          'saved'::text as "result",
          updated_document."version"
        from inserted_revision
        inner join updated_document
          on updated_document."documentId" = inserted_revision."documentId"
        inner join inserted_audit
          on inserted_audit."target_id" = inserted_revision."documentId"::text
      `;

  try {
    const results = await database.batch([
      ...context,
      database.execute(
        sql`select pg_advisory_xact_lock(hashtextextended(${input.commandId}::text, 0))`,
      ),
      database.execute(mutation),
      database.execute(sql`
        update ${contentLocalizations} as localization
        set
          "published_revision_id" = revision."id",
          "published_at" = revision."published_at"
        from ${contentRevisions} as revision
        where ${input.intent === "publish"}
          and revision."command_id" = ${input.commandId}
          and revision."document_id" = localization."document_id"
          and revision."locale" = localization."locale"
          and revision."published_at" is not null
      `),
    ]);
    const row = parseMutationRow(results[4].rows[0]);

    if (!row) {
      return { status: "conflict" };
    }

    return {
      documentId: row.documentId,
      localeCode: row.localeCode as LocaleCode,
      revisionId: row.revisionId,
      status: row.result,
      version: row.version,
    };
  } catch (error) {
    if (isUniqueSlugError(error)) {
      return { status: "slug_conflict" };
    }

    throw error;
  }
}

export async function unpublishPageContent(
  databaseUrl: string,
  authorization: AdminAuthorizationContext,
  input: UnpublishPageContentInput,
): Promise<ContentWorkflowCommandResult> {
  requireContentEditorAuthorization(authorization);
  const database = createDatabase(databaseUrl);
  const revisionId = randomUUID();
  const context = contextQueries(database, authorization);
  const mutation = sql<WorkflowMutationRow>`
    with existing_command as (
      select
        document."id" as "documentId",
        revision."locale" as "localeCode",
        null::text as "previousSlug",
        revision."id" as "revisionId",
        revision."slug" as "slug",
        document."version" as "version"
      from ${contentRevisions} as revision
      inner join ${contentDocuments} as document
        on document."id" = revision."document_id"
      where revision."command_id" = ${input.commandId}
        and document."organization_id" = ${authorization.organizationId}
    ),
    eligible_localization as (
      select
        document."id" as "documentId",
        latest_revision."page_kind" as "pageKind",
        latest_revision."payload" as "payload",
        localization."published_revision_id" as "publishedRevisionId",
        published_revision."slug" as "previousSlug",
        latest_revision."seo" as "seo",
        latest_revision."slug" as "slug",
        latest_revision."summary" as "summary",
        latest_revision."title" as "title"
      from ${contentDocuments} as document
      inner join ${contentLocalizations} as localization
        on localization."document_id" = document."id"
        and localization."organization_id" = document."organization_id"
        and localization."locale" = ${input.localeCode}
      inner join ${contentRevisions} as published_revision
        on published_revision."id" = localization."published_revision_id"
        and published_revision."document_id" = document."id"
        and published_revision."locale" = localization."locale"
      inner join lateral (
        select revision.*
        from ${contentRevisions} as revision
        where revision."document_id" = document."id"
          and revision."locale" = localization."locale"
        order by revision."revision_number" desc, revision."created_at" desc
        limit 1
      ) as latest_revision on true
      where document."id" = ${input.documentId}
        and document."organization_id" = ${authorization.organizationId}
        and document."version" = ${input.expectedVersion}
        and localization."published_revision_id" is not null
        and localization."published_at" is not null
        and not exists (select 1 from existing_command)
    ),
    updated_document as (
      update ${contentDocuments} as document
      set
        "status" = case
          when exists (
            select 1
            from ${contentLocalizations} as other_localization
            where other_localization."document_id" = document."id"
              and other_localization."locale" <> ${input.localeCode}
              and other_localization."published_revision_id" is not null
              and other_localization."published_at" is not null
          )
            then 'published'::"app"."content_status"
          else 'archived'::"app"."content_status"
        end,
        "version" = document."version" + 1,
        "published_at" = (
          select max(other_localization."published_at")
          from ${contentLocalizations} as other_localization
          where other_localization."document_id" = document."id"
            and other_localization."locale" <> ${input.localeCode}
            and other_localization."published_revision_id" is not null
        ),
        "updated_at" = now()
      from eligible_localization
      where document."id" = eligible_localization."documentId"
      returning
        document."id" as "documentId",
        document."version" as "version"
    ),
    inserted_revision as (
      insert into ${contentRevisions} (
        "id",
        "document_id",
        "command_id",
        "revision_number",
        "locale",
        "status",
        "slug",
        "page_kind",
        "title",
        "summary",
        "payload",
        "seo",
        "change_note",
        "created_by_user_id",
        "published_at"
      )
      select
        ${revisionId},
        updated_document."documentId",
        ${input.commandId},
        coalesce((
          select max(revision."revision_number")
          from ${contentRevisions} as revision
          where revision."document_id" = updated_document."documentId"
            and revision."locale" = ${input.localeCode}
        ), 0) + 1,
        ${input.localeCode},
        'archived',
        eligible_localization."slug",
        eligible_localization."pageKind",
        eligible_localization."title",
        eligible_localization."summary",
        eligible_localization."payload",
        eligible_localization."seo",
        'Unpublished locale',
        ${authorization.actor.id},
        null
      from updated_document
      inner join eligible_localization
        on eligible_localization."documentId" = updated_document."documentId"
      returning
        "document_id" as "documentId",
        "id" as "revisionId",
        "slug"
    ),
    updated_localization as (
      update ${contentLocalizations} as localization
      set
        "published_revision_id" = null,
        "published_at" = null,
        "updated_at" = now()
      from inserted_revision
      where localization."document_id" = inserted_revision."documentId"
        and localization."organization_id" = ${authorization.organizationId}
        and localization."locale" = ${input.localeCode}
      returning localization."document_id" as "documentId"
    ),
    inserted_audit as (
      insert into ${auditEvents} (
        "organization_id",
        "actor_user_id",
        "action",
        "target_type",
        "target_id",
        "request_id",
        "metadata"
      )
      select
        ${authorization.organizationId},
        ${authorization.actor.id},
        'content.document_unpublished',
        'content_document',
        inserted_revision."documentId"::text,
        ${input.requestId ?? null}::text,
        jsonb_build_object(
          'commandId', ${input.commandId}::uuid,
          'localeCode', ${input.localeCode}::text,
          'previousRevisionId',
            eligible_localization."publishedRevisionId"::text,
          'result', 'success',
          'revisionId', inserted_revision."revisionId"::text,
          'state', 'archived'
        )
      from inserted_revision
      inner join updated_localization
        on updated_localization."documentId" = inserted_revision."documentId"
      inner join eligible_localization
        on eligible_localization."documentId" = inserted_revision."documentId"
      returning "target_id"
    )
    select
      existing_command."documentId",
      existing_command."localeCode",
      existing_command."previousSlug",
      existing_command."revisionId",
      existing_command."slug",
      'duplicate'::text as "result",
      existing_command."version"
    from existing_command
    union all
    select
      inserted_revision."documentId",
      ${input.localeCode}::text as "localeCode",
      eligible_localization."previousSlug",
      inserted_revision."revisionId",
      inserted_revision."slug",
      'unpublished'::text as "result",
      updated_document."version"
    from inserted_revision
    inner join updated_document
      on updated_document."documentId" = inserted_revision."documentId"
    inner join eligible_localization
      on eligible_localization."documentId" = inserted_revision."documentId"
    inner join inserted_audit
      on inserted_audit."target_id" = inserted_revision."documentId"::text
  `;
  const results = await database.batch([
    ...context,
    database.execute(
      sql`select pg_advisory_xact_lock(hashtextextended(${input.commandId}::text, 0))`,
    ),
    database.execute(mutation),
  ]);
  const row = parseWorkflowMutationRow(results[4].rows[0]);

  if (!row) {
    return { status: "conflict" };
  }

  return {
    documentId: row.documentId,
    localeCode: row.localeCode as LocaleCode,
    previousSlug: row.previousSlug,
    revisionId: row.revisionId,
    slug: row.slug,
    status: row.result,
    version: row.version,
  };
}

export async function rollbackPageContentRevision(
  databaseUrl: string,
  authorization: AdminAuthorizationContext,
  input: RollbackPageContentInput,
): Promise<ContentWorkflowCommandResult> {
  requireContentEditorAuthorization(authorization);
  const database = createDatabase(databaseUrl);
  const revisionId = randomUUID();
  const publishedAt = new Date();
  const context = contextQueries(database, authorization);
  const mutation = sql<WorkflowMutationRow>`
    with existing_command as (
      select
        document."id" as "documentId",
        revision."locale" as "localeCode",
        null::text as "previousSlug",
        revision."id" as "revisionId",
        revision."slug" as "slug",
        document."version" as "version"
      from ${contentRevisions} as revision
      inner join ${contentDocuments} as document
        on document."id" = revision."document_id"
      where revision."command_id" = ${input.commandId}
        and document."organization_id" = ${authorization.organizationId}
    ),
    source_revision as (
      select
        document."id" as "documentId",
        document."default_locale" as "defaultLocale",
        source."page_kind" as "pageKind",
        source."payload" as "payload",
        published_revision."slug" as "previousSlug",
        source."revision_number" as "revisionNumber",
        source."seo" as "seo",
        source."slug" as "slug",
        source."summary" as "summary",
        source."title" as "title"
      from ${contentDocuments} as document
      inner join ${contentLocalizations} as localization
        on localization."document_id" = document."id"
        and localization."organization_id" = document."organization_id"
        and localization."locale" = ${input.localeCode}
      inner join ${contentRevisions} as source
        on source."id" = ${input.revisionId}
        and source."document_id" = document."id"
        and source."locale" = localization."locale"
      left join ${contentRevisions} as published_revision
        on published_revision."id" = localization."published_revision_id"
        and published_revision."document_id" = document."id"
        and published_revision."locale" = localization."locale"
      where document."id" = ${input.documentId}
        and document."organization_id" = ${authorization.organizationId}
        and document."version" = ${input.expectedVersion}
        and not exists (select 1 from existing_command)
    ),
    updated_document as (
      update ${contentDocuments} as document
      set
        "slug" = case
          when source_revision."defaultLocale" = ${input.localeCode}
            then source_revision."slug"
          else document."slug"
        end,
        "status" = 'published',
        "page_kind" = source_revision."pageKind",
        "version" = document."version" + 1,
        "published_at" = ${publishedAt},
        "updated_at" = now()
      from source_revision
      where document."id" = source_revision."documentId"
      returning
        document."id" as "documentId",
        document."version" as "version"
    ),
    inserted_revision as (
      insert into ${contentRevisions} (
        "id",
        "document_id",
        "command_id",
        "revision_number",
        "locale",
        "status",
        "slug",
        "page_kind",
        "title",
        "summary",
        "payload",
        "seo",
        "change_note",
        "created_by_user_id",
        "published_at"
      )
      select
        ${revisionId},
        updated_document."documentId",
        ${input.commandId},
        coalesce((
          select max(revision."revision_number")
          from ${contentRevisions} as revision
          where revision."document_id" = updated_document."documentId"
            and revision."locale" = ${input.localeCode}
        ), 0) + 1,
        ${input.localeCode},
        'published',
        source_revision."slug",
        source_revision."pageKind",
        source_revision."title",
        source_revision."summary",
        source_revision."payload",
        source_revision."seo",
        concat(
          'Rollback to revision ',
          source_revision."revisionNumber"::text
        ),
        ${authorization.actor.id},
        ${publishedAt}
      from updated_document
      inner join source_revision
        on source_revision."documentId" = updated_document."documentId"
      returning
        "document_id" as "documentId",
        "id" as "revisionId",
        "slug"
    )
    select
      existing_command."documentId",
      existing_command."localeCode",
      existing_command."previousSlug",
      existing_command."revisionId",
      existing_command."slug",
      'duplicate'::text as "result",
      existing_command."version"
    from existing_command
    union all
    select
      inserted_revision."documentId",
      ${input.localeCode}::text as "localeCode",
      source_revision."previousSlug",
      inserted_revision."revisionId",
      inserted_revision."slug",
      'rolled_back'::text as "result",
      updated_document."version"
    from inserted_revision
    inner join updated_document
      on updated_document."documentId" = inserted_revision."documentId"
    inner join source_revision
      on source_revision."documentId" = inserted_revision."documentId"
  `;

  try {
    const results = await database.batch([
      ...context,
      database.execute(
        sql`select pg_advisory_xact_lock(hashtextextended(${input.commandId}::text, 0))`,
      ),
      database.execute(
        sql`select set_config('app.content_command_result', 'duplicate', true)`,
      ),
      database.execute(mutation),
      database.execute(sql`
        select set_config(
          'app.content_command_result',
          'rolled_back',
          true
        )
        from ${contentRevisions} as revision
        where revision."id" = ${revisionId}
          and revision."command_id" = ${input.commandId}
      `),
      database.execute(sql`
        update ${contentLocalizations} as localization
        set
          "slug" = revision."slug",
          "title" = revision."title",
          "summary" = revision."summary",
          "seo" = revision."seo",
          "published_revision_id" = revision."id",
          "published_at" = revision."published_at",
          "updated_at" = now()
        from ${contentRevisions} as revision
        where current_setting('app.content_command_result', true) =
            'rolled_back'
          and revision."id" = ${revisionId}
          and revision."command_id" = ${input.commandId}
          and localization."document_id" = revision."document_id"
          and localization."organization_id" =
            ${authorization.organizationId}
          and localization."locale" = ${input.localeCode}
      `),
      database.execute(sql`
        with inserted_audit as (
          insert into ${auditEvents} (
            "organization_id",
            "actor_user_id",
            "action",
            "target_type",
            "target_id",
            "request_id",
            "metadata"
          )
          select
            ${authorization.organizationId},
            ${authorization.actor.id},
            'content.document_rolled_back',
            'content_document',
            revision."document_id"::text,
            ${input.requestId ?? null}::text,
            jsonb_build_object(
              'commandId', ${input.commandId}::uuid,
              'localeCode', ${input.localeCode}::text,
              'result', 'success',
              'revisionId', revision."id"::text,
              'sourceRevisionId', ${input.revisionId}::uuid,
              'state', 'published'
            )
          from ${contentRevisions} as revision
          inner join ${contentLocalizations} as localization
            on localization."document_id" = revision."document_id"
            and localization."locale" = revision."locale"
            and localization."published_revision_id" = revision."id"
          where current_setting('app.content_command_result', true) =
              'rolled_back'
            and revision."id" = ${revisionId}
            and revision."command_id" = ${input.commandId}
          returning "target_id"
        )
        select case
          when current_setting('app.content_command_result', true) =
              'rolled_back'
            and not exists (select 1 from inserted_audit)
            then 1 / (
              select count(*)::integer
              from inserted_audit
            )
          else 1
        end as "auditVerified"
      `),
    ]);
    const row = parseWorkflowMutationRow(results[5].rows[0]);

    if (!row) {
      return { status: "conflict" };
    }

    return {
      documentId: row.documentId,
      localeCode: row.localeCode as LocaleCode,
      previousSlug: row.previousSlug,
      revisionId: row.revisionId,
      slug: row.slug,
      status: row.result,
      version: row.version,
    };
  } catch (error) {
    if (isUniqueSlugError(error)) {
      return { status: "slug_conflict" };
    }

    throw error;
  }
}

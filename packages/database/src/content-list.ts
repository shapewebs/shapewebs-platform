import "server-only";

import { and, desc, eq, type SQL, sql } from "drizzle-orm";
import {
  contentDocumentListItemSchema,
  documentFiltersSchema,
  type ContentDocumentListItem,
  type DocumentFiltersInput,
} from "@shapewebs/validation";

import type { AdminAuthorizationContext } from "./admin-auth";
import { createDatabase } from "./client";
import { contentDocuments, contentRevisions } from "./schema";

const maximumListItems = 250;

const defaultContentDocuments = contentDocumentListItemSchema.array().parse([
  {
    contentType: "page",
    documentId: "00000000-0000-4000-8000-000000000101",
    localeCode: "en",
    pageKind: "home",
    publishedAt: "2026-04-08T00:00:00.000Z",
    slug: "home",
    state: "published",
    summary: "Local CMS preview content",
    title: "Shapewebs home",
    updatedAt: "2026-04-08T00:00:00.000Z",
  },
  {
    contentType: "page",
    documentId: "00000000-0000-4000-8000-000000000102",
    localeCode: "en",
    pageKind: "standard",
    publishedAt: null,
    slug: "about",
    state: "draft",
    summary: "Local CMS draft content",
    title: "About Shapewebs",
    updatedAt: "2026-04-08T00:00:00.000Z",
  },
]);

function matchesFilters(
  item: ContentDocumentListItem,
  filters: DocumentFiltersInput,
) {
  return (
    (!filters.contentType || item.contentType === filters.contentType) &&
    (!filters.localeCode || item.localeCode === filters.localeCode) &&
    (!filters.state || item.state === filters.state)
  );
}

export function getDefaultContentDocumentList(
  input: DocumentFiltersInput = {},
): ContentDocumentListItem[] {
  const filters = documentFiltersSchema.parse(input);

  return defaultContentDocuments.filter((item) =>
    matchesFilters(item, filters),
  );
}

export async function listContentDocuments(
  databaseUrl: string,
  authorization: AdminAuthorizationContext,
  input: DocumentFiltersInput = {},
): Promise<ContentDocumentListItem[]> {
  if (!["owner", "editor"].includes(authorization.role)) {
    throw new Error(
      "Owner or editor authorization is required to read content.",
    );
  }

  const filters = documentFiltersSchema.parse(input);
  const database = createDatabase(databaseUrl);
  const latestRevisions = database.$with("latest_content_revisions").as(
    database
      .selectDistinctOn(
        [contentRevisions.documentId, contentRevisions.locale],
        {
          documentId: contentRevisions.documentId,
          localeCode: contentRevisions.locale,
          summary: contentRevisions.summary,
          title: contentRevisions.title,
        },
      )
      .from(contentRevisions)
      .orderBy(
        contentRevisions.documentId,
        contentRevisions.locale,
        desc(contentRevisions.revisionNumber),
        desc(contentRevisions.createdAt),
      ),
  );
  const conditions: SQL[] = [];

  if (filters.contentType) {
    conditions.push(eq(contentDocuments.kind, filters.contentType));
  }

  if (filters.localeCode) {
    conditions.push(eq(latestRevisions.localeCode, filters.localeCode));
  }

  if (filters.state) {
    conditions.push(eq(contentDocuments.status, filters.state));
  }

  const results = await database.batch([
    database.execute(
      sql`select set_config('app.organization_id', ${authorization.organizationId}, true)`,
    ),
    database.execute(
      sql`select set_config('app.user_id', ${authorization.actor.id}, true)`,
    ),
    database.execute(
      sql`select set_config('app.membership_role', ${authorization.role}, true)`,
    ),
    database
      .with(latestRevisions)
      .select({
        contentType: contentDocuments.kind,
        documentId: contentDocuments.id,
        localeCode: latestRevisions.localeCode,
        pageKind: sql<null>`null`,
        publishedAt: contentDocuments.publishedAt,
        slug: contentDocuments.slug,
        state: contentDocuments.status,
        summary: latestRevisions.summary,
        title: latestRevisions.title,
        updatedAt: contentDocuments.updatedAt,
      })
      .from(contentDocuments)
      .innerJoin(
        latestRevisions,
        eq(latestRevisions.documentId, contentDocuments.id),
      )
      .where(and(...conditions))
      .orderBy(
        desc(contentDocuments.updatedAt),
        contentDocuments.id,
        latestRevisions.localeCode,
      )
      .limit(maximumListItems),
  ]);

  return contentDocumentListItemSchema.array().parse(
    results[3].map((item) => ({
      ...item,
      publishedAt: item.publishedAt?.toISOString() ?? null,
      updatedAt: item.updatedAt?.toISOString() ?? null,
    })),
  );
}

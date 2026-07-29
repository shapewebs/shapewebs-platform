import "server-only";

import { createHash, randomBytes, randomUUID } from "node:crypto";

import { and, desc, eq, sql } from "drizzle-orm";
import {
  contentDocumentSchema,
  type ContentDocument,
} from "@shapewebs/content-schema";

import type { AdminAuthorizationContext } from "./admin-auth";
import { createDatabase } from "./client";
import {
  auditEvents,
  contentDocuments,
  contentLocalizations,
  contentPreviewGrants,
  contentRevisions,
} from "./schema";

export type PublicContentType =
  "legal" | "method" | "page" | "post" | "project" | "service";
export type PublicLocaleCode = "da-DK" | "en";

export type PublishedDocument = {
  content: ContentDocument;
  contentType: PublicContentType;
  documentId: string;
  localeCode: PublicLocaleCode;
  pageKind: string | null;
  publishedAt: string | null;
  seo: {
    canonicalUrlOverride: string | null;
    metaDescription: string | null;
    metaTitle: string | null;
    robotsIndex: boolean;
  };
  slug: string;
  source: "fallback" | "neon";
  summary: string | null;
  title: string;
};

export type ContentPreviewGrant = {
  expiresAt: string;
  path: string;
  token: string;
};

export type ConsumedContentPreviewGrant = {
  documentId: string;
  expiresAt: string;
  localeCode: PublicLocaleCode;
  path: string;
  revisionId: string;
  sessionToken: string;
};

const previewLifetimeMilliseconds = 30 * 60 * 1_000;
const maximumPublishedListSize = 200;
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const previewTokenPattern = /^[A-Za-z0-9_-]{43}$/u;

const fallbackDocuments: PublishedDocument[] = [
  {
    content: {
      blocks: [
        {
          body: "Shapewebs creates custom websites with clear strategy, expressive design, and performance-minded engineering.",
          eyebrow: "Shapewebs",
          heading: "Distinctive websites, engineered for speed.",
          primaryCtaHref: "/contact",
          primaryCtaLabel: "Start a project",
          type: "hero",
        },
      ],
      schemaVersion: 1,
    },
    contentType: "page",
    documentId: "fallback-home",
    localeCode: "en",
    pageKind: "home",
    publishedAt: "2026-04-08T00:00:00.000Z",
    seo: {
      canonicalUrlOverride: null,
      metaDescription:
        "Custom websites combining strategy, expressive design, and performance-minded engineering.",
      metaTitle: "Shapewebs",
      robotsIndex: true,
    },
    slug: "home",
    source: "fallback",
    summary: "Shapewebs public-site fallback content.",
    title: "Shapewebs",
  },
  {
    content: {
      blocks: [
        {
          body: "Strategy, design, implementation, and editorial architecture for durable business websites.",
          eyebrow: "Services",
          heading: "Custom website design systems",
          type: "hero",
        },
      ],
      schemaVersion: 1,
    },
    contentType: "service",
    documentId: "fallback-service-strategy",
    localeCode: "en",
    pageKind: null,
    publishedAt: "2026-04-08T00:00:00.000Z",
    seo: {
      canonicalUrlOverride: null,
      metaDescription:
        "Strategy, design, implementation, and editorial architecture for business websites.",
      metaTitle: "Website Strategy",
      robotsIndex: true,
    },
    slug: "website-strategy",
    source: "fallback",
    summary: "Strategy and design systems for focused websites.",
    title: "Website Strategy",
  },
  {
    content: {
      blocks: [
        {
          body: "A practical look at the decisions behind a secure, reliable publishing platform.",
          heading: "Building a durable CMS for a design studio",
          type: "hero",
        },
      ],
      schemaVersion: 1,
    },
    contentType: "post",
    documentId: "fallback-post-platform",
    localeCode: "en",
    pageKind: null,
    publishedAt: "2026-04-08T00:00:00.000Z",
    seo: {
      canonicalUrlOverride: null,
      metaDescription:
        "The decisions behind a secure and reliable design-studio CMS.",
      metaTitle: "Building a durable CMS",
      robotsIndex: true,
    },
    slug: "building-a-design-cms",
    source: "fallback",
    summary: "The architecture behind the Shapewebs publishing system.",
    title: "Building a design CMS",
  },
  {
    content: {
      blocks: [
        {
          body: "A focused portfolio example for the Shapewebs project system.",
          heading: "Northline Studio website system",
          type: "hero",
        },
      ],
      schemaVersion: 1,
    },
    contentType: "project",
    documentId: "fallback-project-northline",
    localeCode: "en",
    pageKind: null,
    publishedAt: "2026-04-08T00:00:00.000Z",
    seo: {
      canonicalUrlOverride: null,
      metaDescription: "A focused portfolio example from Shapewebs.",
      metaTitle: "Northline Studio",
      robotsIndex: true,
    },
    slug: "northline-studio",
    source: "fallback",
    summary: "A focused portfolio example.",
    title: "Northline Studio",
  },
  {
    content: {
      blocks: [
        {
          document: [
            {
              content: [
                {
                  text: "This placeholder remains in use until the reviewed privacy notice is published from the CMS.",
                  type: "text",
                },
              ],
              type: "paragraph",
            },
          ],
          type: "rich_text",
        },
      ],
      schemaVersion: 1,
    },
    contentType: "legal",
    documentId: "fallback-legal-privacy",
    localeCode: "en",
    pageKind: null,
    publishedAt: "2026-04-08T00:00:00.000Z",
    seo: {
      canonicalUrlOverride: null,
      metaDescription: "Shapewebs privacy information.",
      metaTitle: "Privacy Policy",
      robotsIndex: true,
    },
    slug: "privacy",
    source: "fallback",
    summary: "Shapewebs privacy information.",
    title: "Privacy Policy",
  },
];

function requireUuid(value: string, label: string): void {
  if (!uuidPattern.test(value)) {
    throw new Error(`${label} must be a valid UUID.`);
  }
}

function requireContentEditorAuthorization(
  authorization: AdminAuthorizationContext,
): void {
  if (!["owner", "editor"].includes(authorization.role)) {
    throw new Error(
      "Owner or editor authorization is required to preview content.",
    );
  }
}

function requireDatabaseConfiguration(
  databaseUrl: string | null,
  organizationId: string | null,
): { databaseUrl: string; organizationId: string } | null {
  if (!databaseUrl && !organizationId) {
    return null;
  }

  if (!databaseUrl || !organizationId) {
    throw new Error(
      "DATABASE_URL and SHAPEWEBS_ORGANIZATION_ID must be configured together.",
    );
  }

  requireUuid(organizationId, "SHAPEWEBS_ORGANIZATION_ID");
  return { databaseUrl, organizationId };
}

function normalizeSeo(value: unknown): PublishedDocument["seo"] {
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

function parsePublishedDocument(row: {
  content: unknown;
  contentType: PublicContentType;
  documentId: string;
  localeCode: string;
  pageKind: string | null;
  publishedAt: Date | null;
  seo: unknown;
  slug: string;
  summary: string | null;
  title: string;
}): PublishedDocument {
  if (row.localeCode !== "en" && row.localeCode !== "da-DK") {
    throw new Error("The database returned an unsupported content locale.");
  }

  return {
    ...row,
    content: contentDocumentSchema.parse(row.content),
    localeCode: row.localeCode,
    publishedAt: row.publishedAt?.toISOString() ?? null,
    seo: normalizeSeo(row.seo),
    source: "neon",
  };
}

function webContextQueries(
  database: ReturnType<typeof createDatabase>,
  organizationId: string,
  previewTokenHash = "",
) {
  return [
    database.execute(
      sql`select set_config('app.organization_id', ${organizationId}, true)`,
    ),
    database.execute(
      sql`select set_config('app.preview_token_hash', ${previewTokenHash}, true)`,
    ),
  ] as const;
}

function adminContextQueries(
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

function publishedSelection(database: ReturnType<typeof createDatabase>) {
  return database
    .select({
      content: contentRevisions.payload,
      contentType: contentDocuments.kind,
      documentId: contentDocuments.id,
      localeCode: contentRevisions.locale,
      pageKind: contentRevisions.pageKind,
      publishedAt: contentLocalizations.publishedAt,
      seo: contentRevisions.seo,
      slug: contentRevisions.slug,
      summary: contentRevisions.summary,
      title: contentRevisions.title,
    })
    .from(contentDocuments)
    .innerJoin(
      contentLocalizations,
      eq(contentLocalizations.documentId, contentDocuments.id),
    )
    .innerJoin(
      contentRevisions,
      eq(contentRevisions.id, contentLocalizations.publishedRevisionId),
    );
}

function publishedPredicates(
  organizationId: string,
  contentType: PublicContentType,
  localeCode: PublicLocaleCode,
) {
  return [
    eq(contentDocuments.organizationId, organizationId),
    eq(contentDocuments.kind, contentType),
    eq(contentLocalizations.organizationId, organizationId),
    eq(contentLocalizations.locale, localeCode),
  ] as const;
}

export function getDefaultPublishedContent(
  contentType: PublicContentType,
  localeCode: PublicLocaleCode = "en",
): PublishedDocument[] {
  return fallbackDocuments.filter(
    (document) =>
      document.contentType === contentType &&
      document.localeCode === localeCode,
  );
}

export async function listPublishedContent(
  databaseUrl: string | null,
  organizationId: string | null,
  contentType: PublicContentType,
  localeCode: PublicLocaleCode = "en",
): Promise<PublishedDocument[]> {
  const configuration = requireDatabaseConfiguration(
    databaseUrl,
    organizationId,
  );

  if (!configuration) {
    return getDefaultPublishedContent(contentType, localeCode);
  }

  const database = createDatabase(configuration.databaseUrl);
  const results = await database.batch([
    ...webContextQueries(database, configuration.organizationId),
    publishedSelection(database)
      .where(
        and(
          eq(contentDocuments.organizationId, configuration.organizationId),
          eq(contentDocuments.kind, contentType),
          eq(contentLocalizations.organizationId, configuration.organizationId),
          eq(contentLocalizations.locale, localeCode),
        ),
      )
      .orderBy(desc(contentLocalizations.publishedAt), contentDocuments.id)
      .limit(maximumPublishedListSize),
  ]);

  return results[2].map(parsePublishedDocument);
}

export async function getPublishedContentBySlug(
  databaseUrl: string | null,
  organizationId: string | null,
  input: {
    contentType: PublicContentType;
    localeCode?: PublicLocaleCode;
    slug: string;
  },
): Promise<PublishedDocument | null> {
  const localeCode = input.localeCode ?? "en";
  const configuration = requireDatabaseConfiguration(
    databaseUrl,
    organizationId,
  );

  if (!configuration) {
    return (
      getDefaultPublishedContent(input.contentType, localeCode).find(
        (document) => document.slug === input.slug,
      ) ?? null
    );
  }

  const database = createDatabase(configuration.databaseUrl);
  const results = await database.batch([
    ...webContextQueries(database, configuration.organizationId),
    publishedSelection(database)
      .where(
        and(
          ...publishedPredicates(
            configuration.organizationId,
            input.contentType,
            localeCode,
          ),
          eq(contentRevisions.slug, input.slug),
        ),
      )
      .limit(1),
  ]);
  const document = results[2][0];

  return document ? parsePublishedDocument(document) : null;
}

export async function getPublishedPageByKind(
  databaseUrl: string | null,
  organizationId: string | null,
  pageKind: string,
  localeCode: PublicLocaleCode = "en",
): Promise<PublishedDocument | null> {
  const configuration = requireDatabaseConfiguration(
    databaseUrl,
    organizationId,
  );

  if (!configuration) {
    return (
      getDefaultPublishedContent("page", localeCode).find(
        (document) => document.pageKind === pageKind,
      ) ?? null
    );
  }

  const database = createDatabase(configuration.databaseUrl);
  const results = await database.batch([
    ...webContextQueries(database, configuration.organizationId),
    publishedSelection(database)
      .where(
        and(
          ...publishedPredicates(
            configuration.organizationId,
            "page",
            localeCode,
          ),
          eq(contentRevisions.pageKind, pageKind),
        ),
      )
      .limit(1),
  ]);
  const document = results[2][0];

  return document ? parsePublishedDocument(document) : null;
}

function getContentPath(input: {
  contentType: PublicContentType;
  localeCode: PublicLocaleCode;
  pageKind: string | null;
  slug: string;
}): string {
  let path: string;

  switch (input.contentType) {
    case "legal":
      path = `/legal/${input.slug}`;
      break;
    case "post":
      path = `/blog/${input.slug}`;
      break;
    case "project":
      path = `/projects/${input.slug}`;
      break;
    case "service":
      path = `/services/${input.slug}`;
      break;
    case "page":
      path =
        input.pageKind === "home" || input.slug === "home"
          ? "/"
          : `/${input.slug}`;
      break;
    default:
      path = `/${input.slug}`;
  }

  return input.localeCode === "en"
    ? path
    : `/${input.localeCode}${path === "/" ? "" : path}`;
}

export async function createContentPreviewGrant(
  databaseUrl: string,
  authorization: AdminAuthorizationContext,
  input: {
    documentId: string;
    localeCode: PublicLocaleCode;
    revisionId: string;
    requestId?: string;
  },
): Promise<ContentPreviewGrant | null> {
  requireContentEditorAuthorization(authorization);
  requireUuid(input.documentId, "documentId");
  requireUuid(input.revisionId, "revisionId");

  const database = createDatabase(databaseUrl);
  const selected = await database.batch([
    ...adminContextQueries(database, authorization),
    database
      .select({
        contentType: contentDocuments.kind,
        localeCode: contentRevisions.locale,
        pageKind: contentRevisions.pageKind,
        slug: contentRevisions.slug,
      })
      .from(contentRevisions)
      .innerJoin(
        contentDocuments,
        eq(contentDocuments.id, contentRevisions.documentId),
      )
      .where(
        and(
          eq(contentDocuments.id, input.documentId),
          eq(contentDocuments.organizationId, authorization.organizationId),
          eq(contentRevisions.id, input.revisionId),
          eq(contentRevisions.locale, input.localeCode),
        ),
      )
      .limit(1),
  ]);
  const revision = selected[3][0];

  if (!revision) {
    return null;
  }

  const token = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const expiresAt = new Date(Date.now() + previewLifetimeMilliseconds);
  const path = getContentPath({
    ...revision,
    localeCode: revision.localeCode as PublicLocaleCode,
  });
  const grantId = randomUUID();
  const inserted = await database.batch([
    ...adminContextQueries(database, authorization),
    database
      .insert(contentPreviewGrants)
      .values({
        createdByUserId: authorization.actor.id,
        documentId: input.documentId,
        expiresAt,
        id: grantId,
        locale: input.localeCode,
        organizationId: authorization.organizationId,
        path,
        revisionId: input.revisionId,
        tokenHash,
      })
      .returning({ id: contentPreviewGrants.id }),
    database.insert(auditEvents).values({
      action: "content.preview_grant_created",
      actorUserId: authorization.actor.id,
      metadata: {
        expiresAt: expiresAt.toISOString(),
        localeCode: input.localeCode,
        path,
        revisionId: input.revisionId,
      },
      organizationId: authorization.organizationId,
      requestId: input.requestId,
      targetId: input.documentId,
      targetType: "content_document",
    }),
  ]);

  if (!inserted[3][0]) {
    return null;
  }

  return {
    expiresAt: expiresAt.toISOString(),
    path,
    token,
  };
}

export async function consumeContentPreviewGrant(
  databaseUrl: string,
  organizationId: string,
  token: string,
): Promise<ConsumedContentPreviewGrant | null> {
  requireUuid(organizationId, "organizationId");

  if (!previewTokenPattern.test(token)) {
    return null;
  }

  const tokenHash = createHash("sha256").update(token).digest("hex");
  const sessionToken = randomBytes(32).toString("base64url");
  const sessionTokenHash = createHash("sha256")
    .update(sessionToken)
    .digest("hex");
  const database = createDatabase(databaseUrl);
  const results = await database.batch([
    ...webContextQueries(database, organizationId, tokenHash),
    database.execute(
      sql`select set_config('app.preview_session_token_hash', ${sessionTokenHash}, true)`,
    ),
    database
      .update(contentPreviewGrants)
      .set({ consumedAt: sql`now()`, sessionTokenHash })
      .where(
        and(
          eq(contentPreviewGrants.organizationId, organizationId),
          eq(contentPreviewGrants.tokenHash, tokenHash),
          sql`${contentPreviewGrants.consumedAt} is null`,
          sql`${contentPreviewGrants.expiresAt} > now()`,
          sql`${contentPreviewGrants.createdAt} > now() - interval '5 minutes'`,
        ),
      ),
    database.execute(
      sql`select set_config('app.preview_token_hash', ${sessionTokenHash}, true)`,
    ),
    database.execute(
      sql`select set_config('app.preview_session_token_hash', '', true)`,
    ),
    database
      .select({
        documentId: contentPreviewGrants.documentId,
        expiresAt: contentPreviewGrants.expiresAt,
        localeCode: contentPreviewGrants.locale,
        path: contentPreviewGrants.path,
        revisionId: contentPreviewGrants.revisionId,
      })
      .from(contentPreviewGrants)
      .where(
        and(
          eq(contentPreviewGrants.organizationId, organizationId),
          eq(contentPreviewGrants.sessionTokenHash, sessionTokenHash),
          sql`${contentPreviewGrants.consumedAt} is not null`,
          sql`${contentPreviewGrants.expiresAt} > now()`,
        ),
      )
      .limit(1),
  ]);
  const grant = results[6][0];

  if (!grant || (grant.localeCode !== "en" && grant.localeCode !== "da-DK")) {
    return null;
  }

  return {
    ...grant,
    expiresAt: grant.expiresAt.toISOString(),
    localeCode: grant.localeCode,
    sessionToken,
  };
}

export async function getPreviewContentByToken(
  databaseUrl: string,
  organizationId: string,
  token: string,
): Promise<PublishedDocument | null> {
  requireUuid(organizationId, "organizationId");

  if (!previewTokenPattern.test(token)) {
    return null;
  }

  const tokenHash = createHash("sha256").update(token).digest("hex");
  const database = createDatabase(databaseUrl);
  const results = await database.batch([
    ...webContextQueries(database, organizationId, tokenHash),
    database
      .select({
        content: contentRevisions.payload,
        contentType: contentDocuments.kind,
        documentId: contentDocuments.id,
        localeCode: contentRevisions.locale,
        pageKind: contentRevisions.pageKind,
        publishedAt: contentRevisions.publishedAt,
        seo: contentRevisions.seo,
        slug: contentRevisions.slug,
        summary: contentRevisions.summary,
        title: contentRevisions.title,
      })
      .from(contentPreviewGrants)
      .innerJoin(
        contentDocuments,
        eq(contentDocuments.id, contentPreviewGrants.documentId),
      )
      .innerJoin(
        contentRevisions,
        eq(contentRevisions.id, contentPreviewGrants.revisionId),
      )
      .where(
        and(
          eq(contentPreviewGrants.organizationId, organizationId),
          eq(contentPreviewGrants.sessionTokenHash, tokenHash),
          sql`${contentPreviewGrants.consumedAt} is not null`,
          sql`${contentPreviewGrants.expiresAt} > now()`,
        ),
      )
      .limit(1),
  ]);
  const document = results[2][0];

  return document ? parsePublishedDocument(document) : null;
}

export function buildContentRevalidationTags(input: {
  contentType: PublicContentType;
  documentId: string;
  localeCode: string;
}): string[] {
  return [
    `content-document:${input.documentId}`,
    `content-locale:${input.localeCode}`,
    `content-list:${input.contentType}`,
  ];
}

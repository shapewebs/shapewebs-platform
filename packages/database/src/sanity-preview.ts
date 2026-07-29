import "server-only";

import { createHash, randomBytes, randomUUID } from "node:crypto";

import { and, eq, sql } from "drizzle-orm";

import type { AdminAuthorizationContext } from "./admin-auth";
import { createDatabase } from "./client";
import { auditEvents, sanityContentPreviewGrants } from "./schema";

export type SanityContentPreviewGrant = {
  expiresAt: string;
  path: string;
  token: string;
};

export type ConsumedSanityContentPreviewGrant = {
  documentId: string;
  expiresAt: string;
  localeCode: "da-DK" | "en";
  path: string;
  revisionId: string;
  sessionToken: string;
  slug: string;
};

export type SanityContentPreviewSelection = Omit<
  ConsumedSanityContentPreviewGrant,
  "expiresAt" | "sessionToken"
>;

const previewLifetimeMilliseconds = 30 * 60 * 1_000;
const previewTokenPattern = /^[A-Za-z0-9_-]{43}$/u;
const documentIdSegmentPattern = /^[A-Za-z0-9_-]+$/u;
const revisionIdPattern = /^[A-Za-z0-9_-]+$/u;
const slugSegmentPattern = /^[a-z0-9]+$/u;

function isPublishedDocumentId(value: string): boolean {
  return (
    !value.startsWith("drafts.") &&
    !value.startsWith("versions.") &&
    value
      .split(".")
      .every(
        (segment) =>
          segment.length > 0 && documentIdSegmentPattern.test(segment),
      )
  );
}

function isSlug(value: string): boolean {
  return value
    .split("-")
    .every((segment) => segment.length > 0 && slugSegmentPattern.test(segment));
}

function requireAdminAuthorization(
  authorization: AdminAuthorizationContext,
): void {
  if (authorization.role !== "owner" && authorization.role !== "editor") {
    throw new Error(
      "Owner or editor authorization is required to create a preview.",
    );
  }
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

function webContextQueries(
  database: ReturnType<typeof createDatabase>,
  organizationId: string,
  previewTokenHash: string,
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

function getPreviewPath(localeCode: "da-DK" | "en", slug: string): string {
  return localeCode === "en" ? `/blog/${slug}` : `/da-DK/blog/${slug}`;
}

export async function createSanityContentPreviewGrant(
  databaseUrl: string,
  authorization: AdminAuthorizationContext,
  input: {
    documentId: string;
    localeCode: "da-DK" | "en";
    requestId?: string;
    revisionId: string;
    slug: string;
  },
): Promise<SanityContentPreviewGrant | null> {
  requireAdminAuthorization(authorization);

  if (
    input.documentId.length > 160 ||
    !isPublishedDocumentId(input.documentId) ||
    input.revisionId.length > 128 ||
    !revisionIdPattern.test(input.revisionId) ||
    input.slug.length > 120 ||
    !isSlug(input.slug)
  ) {
    return null;
  }

  const database = createDatabase(databaseUrl);
  const token = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const expiresAt = new Date(Date.now() + previewLifetimeMilliseconds);
  const path = getPreviewPath(input.localeCode, input.slug);
  await database.batch([
    ...adminContextQueries(database, authorization),
    database.insert(sanityContentPreviewGrants).values({
      createdByUserId: authorization.actor.id,
      documentId: input.documentId,
      expiresAt,
      id: randomUUID(),
      locale: input.localeCode,
      organizationId: authorization.organizationId,
      path,
      revisionId: input.revisionId,
      slug: input.slug,
      tokenHash,
    }),
    database.insert(auditEvents).values({
      action: "content.sanity_preview_grant_created",
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
      targetType: "sanity_blog_post",
    }),
  ]);

  return {
    expiresAt: expiresAt.toISOString(),
    path,
    token,
  };
}

export async function consumeSanityContentPreviewGrant(
  databaseUrl: string,
  organizationId: string,
  token: string,
): Promise<ConsumedSanityContentPreviewGrant | null> {
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
      .update(sanityContentPreviewGrants)
      .set({ consumedAt: sql`now()`, sessionTokenHash })
      .where(
        and(
          eq(sanityContentPreviewGrants.organizationId, organizationId),
          eq(sanityContentPreviewGrants.tokenHash, tokenHash),
          sql`${sanityContentPreviewGrants.consumedAt} is null`,
          sql`${sanityContentPreviewGrants.expiresAt} > now()`,
          sql`${sanityContentPreviewGrants.createdAt} > now() - interval '5 minutes'`,
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
        documentId: sanityContentPreviewGrants.documentId,
        expiresAt: sanityContentPreviewGrants.expiresAt,
        localeCode: sanityContentPreviewGrants.locale,
        path: sanityContentPreviewGrants.path,
        revisionId: sanityContentPreviewGrants.revisionId,
        slug: sanityContentPreviewGrants.slug,
      })
      .from(sanityContentPreviewGrants)
      .where(
        and(
          eq(sanityContentPreviewGrants.organizationId, organizationId),
          eq(sanityContentPreviewGrants.sessionTokenHash, sessionTokenHash),
          sql`${sanityContentPreviewGrants.consumedAt} is not null`,
          sql`${sanityContentPreviewGrants.expiresAt} > now()`,
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

export async function getSanityContentPreviewSelection(
  databaseUrl: string,
  organizationId: string,
  sessionToken: string,
): Promise<SanityContentPreviewSelection | null> {
  if (!previewTokenPattern.test(sessionToken)) {
    return null;
  }

  const tokenHash = createHash("sha256").update(sessionToken).digest("hex");
  const database = createDatabase(databaseUrl);
  const results = await database.batch([
    ...webContextQueries(database, organizationId, tokenHash),
    database
      .select({
        documentId: sanityContentPreviewGrants.documentId,
        localeCode: sanityContentPreviewGrants.locale,
        path: sanityContentPreviewGrants.path,
        revisionId: sanityContentPreviewGrants.revisionId,
        slug: sanityContentPreviewGrants.slug,
      })
      .from(sanityContentPreviewGrants)
      .where(
        and(
          eq(sanityContentPreviewGrants.organizationId, organizationId),
          eq(sanityContentPreviewGrants.sessionTokenHash, tokenHash),
          sql`${sanityContentPreviewGrants.consumedAt} is not null`,
          sql`${sanityContentPreviewGrants.expiresAt} > now()`,
        ),
      )
      .limit(1),
  ]);
  const grant = results[2][0];

  if (!grant || (grant.localeCode !== "en" && grant.localeCode !== "da-DK")) {
    return null;
  }

  return {
    ...grant,
    localeCode: grant.localeCode,
  };
}

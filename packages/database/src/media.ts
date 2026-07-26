import "server-only";

import { randomUUID } from "node:crypto";

import { and, desc, eq, inArray, lt, sql } from "drizzle-orm";

import type { AdminAuthorizationContext } from "./admin-auth";
import { createDatabase } from "./client";
import { auditEvents, fileLocalizations, files } from "./schema";

const maximumMediaListItems = 100;
const maximumCleanupBatchSize = 25;

export type MediaFileStatus =
  "cleanup_required" | "failed" | "pending" | "ready";

export type AdminMediaFileDto = {
  altText: string;
  byteSize: number;
  caption: string | null;
  createdAt: Date;
  height: number;
  id: string;
  localeCode: "da-DK" | "en";
  mimeType: string;
  originalName: string;
  status: MediaFileStatus;
  visibility: "private" | "public";
  width: number;
};

export type MediaCleanupCandidate = {
  etag: string | null;
  fileId: string;
  pathname: string;
  status: "cleanup_required" | "pending";
  storeId: string;
};

export type PrivateMediaUploadState = {
  etag: string | null;
  status: MediaFileStatus;
};

export type ReservePrivateMediaUploadInput = {
  altText: string;
  authorization: AdminAuthorizationContext;
  byteSize: number;
  caption?: string;
  fileId?: string;
  height: number;
  localeCode: "da-DK" | "en";
  originalByteSize: number;
  originalName: string;
  pathname: string;
  requestId?: string;
  sha256: string;
  storeId: string;
  width: number;
};

type MediaMutationRow = {
  fileId: string;
};

function requireMediaEditorAuthorization(
  authorization: AdminAuthorizationContext,
): void {
  if (!["owner", "editor"].includes(authorization.role)) {
    throw new Error(
      "Owner or editor authorization is required to manage media.",
    );
  }
}

function contextQueries(
  database: ReturnType<typeof createDatabase>,
  input: {
    organizationId: string;
    role: "editor" | "owner";
    userId: string;
  },
) {
  return [
    database.execute(
      sql`select set_config('app.organization_id', ${input.organizationId}, true)`,
    ),
    database.execute(
      sql`select set_config('app.user_id', ${input.userId}, true)`,
    ),
    database.execute(
      sql`select set_config('app.membership_role', ${input.role}, true)`,
    ),
  ] as const;
}

function parseMediaMutationRow(value: unknown): MediaMutationRow | null {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    typeof Reflect.get(value, "fileId") !== "string"
  ) {
    return null;
  }

  return {
    fileId: Reflect.get(value, "fileId") as string,
  };
}

export async function reservePrivateMediaUpload(
  databaseUrl: string,
  input: ReservePrivateMediaUploadInput,
): Promise<{ fileId: string }> {
  requireMediaEditorAuthorization(input.authorization);
  const database = createDatabase(databaseUrl);
  const fileId = input.fileId ?? randomUUID();
  const context = contextQueries(database, {
    organizationId: input.authorization.organizationId,
    role: input.authorization.role,
    userId: input.authorization.actor.id,
  });
  const results = await database.batch([
    ...context,
    database
      .insert(files)
      .values({
        byteSize: input.byteSize,
        height: input.height,
        id: fileId,
        mimeType: "image/webp",
        organizationId: input.authorization.organizationId,
        originalByteSize: input.originalByteSize,
        originalName: input.originalName,
        sha256: input.sha256,
        status: "pending",
        storageKey: input.pathname,
        storageProvider: "vercel_blob",
        storeId: input.storeId,
        uploadedByUserId: input.authorization.actor.id,
        visibility: "private",
        width: input.width,
      })
      .returning({ fileId: files.id }),
    database.insert(fileLocalizations).values({
      altText: input.altText,
      caption: input.caption || null,
      fileId,
      locale: input.localeCode,
      organizationId: input.authorization.organizationId,
    }),
    database.insert(auditEvents).values({
      action: "media.upload_reserved",
      actorUserId: input.authorization.actor.id,
      metadata: {
        byteSize: input.byteSize,
        height: input.height,
        localeCode: input.localeCode,
        result: "success",
        width: input.width,
      },
      organizationId: input.authorization.organizationId,
      requestId: input.requestId,
      targetId: fileId,
      targetType: "media_file",
    }),
  ]);
  const receipt = results[3][0];

  if (!receipt) {
    throw new Error("The reserved media receipt could not be read.");
  }

  return receipt;
}

export async function completePrivateMediaUpload(
  databaseUrl: string,
  input: {
    authorization: AdminAuthorizationContext;
    etag: string;
    fileId: string;
    requestId?: string;
    url: string;
  },
): Promise<boolean> {
  requireMediaEditorAuthorization(input.authorization);
  const database = createDatabase(databaseUrl);
  const context = contextQueries(database, {
    organizationId: input.authorization.organizationId,
    role: input.authorization.role,
    userId: input.authorization.actor.id,
  });
  const results = await database.batch([
    ...context,
    database.execute(sql<MediaMutationRow>`
      with updated as (
        update ${files}
        set
          "status" = 'ready',
          "storage_url" = ${input.url},
          "storage_etag" = ${input.etag},
          "failure_code" = null,
          "updated_at" = now()
        where "id" = ${input.fileId}
          and "organization_id" = ${input.authorization.organizationId}
          and "status" = 'pending'
        returning "id"
      ),
      audited as (
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
          ${input.authorization.organizationId},
          ${input.authorization.actor.id},
          'media.upload_completed',
          'media_file',
          updated."id"::text,
          ${input.requestId ?? null}::text,
          jsonb_build_object('result', 'success')
        from updated
        returning "target_id"
      )
      select "target_id" as "fileId"
      from audited
    `),
  ]);

  return parseMediaMutationRow(results[3].rows[0])?.fileId === input.fileId;
}

export async function getPrivateMediaUploadState(
  databaseUrl: string,
  input: {
    authorization: AdminAuthorizationContext;
    fileId: string;
  },
): Promise<PrivateMediaUploadState | null> {
  requireMediaEditorAuthorization(input.authorization);
  const database = createDatabase(databaseUrl);
  const context = contextQueries(database, {
    organizationId: input.authorization.organizationId,
    role: input.authorization.role,
    userId: input.authorization.actor.id,
  });
  const results = await database.batch([
    ...context,
    database
      .select({
        etag: files.storageEtag,
        status: files.status,
      })
      .from(files)
      .where(
        and(
          eq(files.id, input.fileId),
          eq(files.organizationId, input.authorization.organizationId),
          eq(files.storageProvider, "vercel_blob"),
        ),
      )
      .limit(1),
  ]);

  return results[3][0] ?? null;
}

export async function failPrivateMediaUpload(
  databaseUrl: string,
  input: {
    authorization: AdminAuthorizationContext;
    failureCode: string;
    fileId: string;
    requestId?: string;
  },
): Promise<boolean> {
  requireMediaEditorAuthorization(input.authorization);
  const database = createDatabase(databaseUrl);
  const context = contextQueries(database, {
    organizationId: input.authorization.organizationId,
    role: input.authorization.role,
    userId: input.authorization.actor.id,
  });
  const results = await database.batch([
    ...context,
    database.execute(sql<MediaMutationRow>`
      with updated as (
        update ${files}
        set
          "status" = 'failed',
          "storage_url" = null,
          "storage_etag" = null,
          "failure_code" = ${input.failureCode},
          "updated_at" = now()
        where "id" = ${input.fileId}
          and "organization_id" = ${input.authorization.organizationId}
          and "status" = 'pending'
        returning "id"
      ),
      audited as (
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
          ${input.authorization.organizationId},
          ${input.authorization.actor.id},
          'media.upload_failed',
          'media_file',
          updated."id"::text,
          ${input.requestId ?? null}::text,
          jsonb_build_object(
            'reasonCode', ${input.failureCode}::text,
            'result', 'failure'
          )
        from updated
        returning "target_id"
      )
      select "target_id" as "fileId"
      from audited
    `),
  ]);

  return parseMediaMutationRow(results[3].rows[0])?.fileId === input.fileId;
}

export async function markPrivateMediaCleanupRequired(
  databaseUrl: string,
  input: {
    authorization: AdminAuthorizationContext;
    etag: string;
    failureCode: string;
    fileId: string;
    requestId?: string;
    url: string;
  },
): Promise<boolean> {
  requireMediaEditorAuthorization(input.authorization);
  const database = createDatabase(databaseUrl);
  const context = contextQueries(database, {
    organizationId: input.authorization.organizationId,
    role: input.authorization.role,
    userId: input.authorization.actor.id,
  });
  const results = await database.batch([
    ...context,
    database.execute(sql<MediaMutationRow>`
      with updated as (
        update ${files}
        set
          "status" = 'cleanup_required',
          "storage_url" = ${input.url},
          "storage_etag" = ${input.etag},
          "failure_code" = ${input.failureCode},
          "updated_at" = now()
        where "id" = ${input.fileId}
          and "organization_id" = ${input.authorization.organizationId}
          and "status" = 'pending'
        returning "id"
      ),
      audited as (
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
          ${input.authorization.organizationId},
          ${input.authorization.actor.id},
          'media.cleanup_required',
          'media_file',
          updated."id"::text,
          ${input.requestId ?? null}::text,
          jsonb_build_object(
            'reasonCode', ${input.failureCode}::text,
            'result', 'degraded'
          )
        from updated
        returning "target_id"
      )
      select "target_id" as "fileId"
      from audited
    `),
  ]);

  return parseMediaMutationRow(results[3].rows[0])?.fileId === input.fileId;
}

export async function listAdminMediaFiles(
  databaseUrl: string,
  authorization: AdminAuthorizationContext,
  maximumResults = 100,
): Promise<AdminMediaFileDto[]> {
  requireMediaEditorAuthorization(authorization);
  const database = createDatabase(databaseUrl);
  const context = contextQueries(database, {
    organizationId: authorization.organizationId,
    role: authorization.role,
    userId: authorization.actor.id,
  });
  const safeLimit = Number.isSafeInteger(maximumResults)
    ? Math.max(1, Math.min(maximumResults, maximumMediaListItems))
    : maximumMediaListItems;
  const results = await database.batch([
    ...context,
    database
      .select({
        altText: fileLocalizations.altText,
        byteSize: files.byteSize,
        caption: fileLocalizations.caption,
        createdAt: files.createdAt,
        height: files.height,
        id: files.id,
        localeCode: fileLocalizations.locale,
        mimeType: files.mimeType,
        originalName: files.originalName,
        status: files.status,
        visibility: files.visibility,
        width: files.width,
      })
      .from(files)
      .innerJoin(
        fileLocalizations,
        and(
          eq(fileLocalizations.fileId, files.id),
          eq(fileLocalizations.organizationId, files.organizationId),
        ),
      )
      .where(eq(files.organizationId, authorization.organizationId))
      .orderBy(desc(files.createdAt))
      .limit(safeLimit),
  ]);

  return results[3].flatMap((row) => {
    if (
      !row.width ||
      !row.height ||
      (row.localeCode !== "en" && row.localeCode !== "da-DK")
    ) {
      return [];
    }

    return [
      {
        ...row,
        height: row.height,
        localeCode: row.localeCode,
        visibility: row.visibility as "private" | "public",
        width: row.width,
      },
    ];
  });
}

export async function listMediaCleanupCandidates(
  databaseUrl: string,
  input: {
    organizationId: string;
    staleBefore: Date;
  },
): Promise<MediaCleanupCandidate[]> {
  const database = createDatabase(databaseUrl);
  const context = contextQueries(database, {
    organizationId: input.organizationId,
    role: "owner",
    userId: "",
  });
  const results = await database.batch([
    ...context,
    database
      .select({
        etag: files.storageEtag,
        fileId: files.id,
        pathname: files.storageKey,
        status: files.status,
        storeId: files.storeId,
      })
      .from(files)
      .where(
        and(
          eq(files.organizationId, input.organizationId),
          inArray(files.status, ["pending", "cleanup_required"]),
          lt(files.updatedAt, input.staleBefore),
          eq(files.storageProvider, "vercel_blob"),
        ),
      )
      .orderBy(files.updatedAt)
      .limit(maximumCleanupBatchSize),
  ]);

  return results[3].flatMap((row) => {
    if (
      !row.storeId ||
      (row.status !== "pending" && row.status !== "cleanup_required")
    ) {
      return [];
    }

    return [
      {
        ...row,
        status: row.status,
        storeId: row.storeId,
      },
    ];
  });
}

export async function completeMediaCleanup(
  databaseUrl: string,
  input: {
    fileId: string;
    organizationId: string;
    requestId?: string;
  },
): Promise<boolean> {
  const database = createDatabase(databaseUrl);
  const context = contextQueries(database, {
    organizationId: input.organizationId,
    role: "owner",
    userId: "",
  });
  const results = await database.batch([
    ...context,
    database.execute(sql<MediaMutationRow>`
      with updated as (
        update ${files}
        set
          "status" = 'failed',
          "storage_url" = null,
          "storage_etag" = null,
          "failure_code" = 'cleanup_completed',
          "updated_at" = now()
        where "id" = ${input.fileId}
          and "organization_id" = ${input.organizationId}
          and "status" in ('pending', 'cleanup_required')
        returning "id"
      ),
      audited as (
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
          ${input.organizationId},
          null,
          'media.cleanup_completed',
          'media_file',
          updated."id"::text,
          ${input.requestId ?? null}::text,
          jsonb_build_object('result', 'success')
        from updated
        returning "target_id"
      )
      select "target_id" as "fileId"
      from audited
    `),
  ]);

  return parseMediaMutationRow(results[3].rows[0])?.fileId === input.fileId;
}

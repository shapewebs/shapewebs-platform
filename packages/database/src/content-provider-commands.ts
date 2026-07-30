import "server-only";

import { createHash } from "node:crypto";

import { and, eq, sql } from "drizzle-orm";

import type { AdminAuthorizationContext } from "./admin-auth";
import { createDatabase } from "./client";
import {
  auditEvents,
  contentProviderCommands,
  providerWebhookEvents,
} from "./schema";

export type ContentProviderCommandAction =
  | "blog_post.create"
  | "blog_post.publish"
  | "blog_post.save"
  | "blog_post.unpublish";

export type ContentProviderCommandReservation =
  | { status: "conflict" }
  | { status: "duplicate" }
  | { status: "pending" }
  | { status: "reserved" };

type JsonValue =
  boolean | null | number | string | JsonValue[] | { [key: string]: JsonValue };

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

function canonicalizeJson(value: unknown): JsonValue {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new Error("Command fingerprints require finite JSON numbers.");
    }

    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => canonicalizeJson(item));
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    return Object.fromEntries(
      Object.entries(record)
        .filter((entry) => entry[1] !== undefined)
        .sort(([firstKey], [secondKey]) => firstKey.localeCompare(secondKey))
        .map(([key, item]) => [key, canonicalizeJson(item)]),
    );
  }

  throw new Error("Command fingerprints require JSON-compatible values.");
}

export function createContentProviderCommandFingerprint(
  value: unknown,
): string {
  return createHash("sha256")
    .update(JSON.stringify(canonicalizeJson(value)))
    .digest("hex");
}

export async function reserveContentProviderCommand(
  databaseUrl: string,
  authorization: AdminAuthorizationContext,
  input: {
    action: ContentProviderCommandAction;
    commandId: string;
    requestFingerprint: string;
    targetId: string;
  },
): Promise<ContentProviderCommandReservation> {
  const database = createDatabase(databaseUrl);
  const context = contextQueries(database, authorization);
  const results = await database.batch([
    ...context,
    database
      .insert(contentProviderCommands)
      .values({
        action: input.action,
        actorUserId: authorization.actor.id,
        id: input.commandId,
        organizationId: authorization.organizationId,
        requestFingerprint: input.requestFingerprint,
        sessionId: authorization.session.id,
        targetId: input.targetId,
      })
      .onConflictDoNothing({ target: contentProviderCommands.id })
      .returning({ id: contentProviderCommands.id }),
    database
      .select({
        action: contentProviderCommands.action,
        actorUserId: contentProviderCommands.actorUserId,
        requestFingerprint: contentProviderCommands.requestFingerprint,
        sessionId: contentProviderCommands.sessionId,
        status: contentProviderCommands.status,
        targetId: contentProviderCommands.targetId,
      })
      .from(contentProviderCommands)
      .where(
        and(
          eq(contentProviderCommands.id, input.commandId),
          eq(
            contentProviderCommands.organizationId,
            authorization.organizationId,
          ),
        ),
      )
      .limit(1),
  ]);
  const inserted = results[3].length === 1;
  const receipt = results[4][0];

  if (!receipt) {
    throw new Error("The content command reservation could not be read.");
  }

  if (
    receipt.action !== input.action ||
    receipt.actorUserId !== authorization.actor.id ||
    receipt.requestFingerprint !== input.requestFingerprint ||
    receipt.sessionId !== authorization.session.id ||
    receipt.targetId !== input.targetId
  ) {
    return { status: "conflict" };
  }

  if (inserted) {
    return { status: "reserved" };
  }

  return {
    status: receipt.status === "succeeded" ? "duplicate" : "pending",
  };
}

export async function completeContentProviderCommand(
  databaseUrl: string,
  authorization: AdminAuthorizationContext,
  input: {
    auditAction: string;
    commandId: string;
    providerTransactionId: string;
    requestId?: string;
    targetId: string;
  },
): Promise<"completed" | "duplicate"> {
  const database = createDatabase(databaseUrl);
  const context = contextQueries(database, authorization);
  const results = await database.batch([
    ...context,
    database.execute(sql<{ result: "completed" | "duplicate" }>`
      with completed as (
        update ${contentProviderCommands}
        set
          "status" = 'succeeded',
          "provider_transaction_id" = ${input.providerTransactionId},
          "failure_code" = null,
          "completed_at" = now(),
          "updated_at" = now()
        where "id" = ${input.commandId}
          and "organization_id" = ${authorization.organizationId}
          and "actor_user_id" = ${authorization.actor.id}
          and "session_id" = ${authorization.session.id}
          and "target_id" = ${input.targetId}
          and "status" in ('reserved', 'uncertain')
        returning "id", "action", "target_id"
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
          ${authorization.organizationId},
          ${authorization.actor.id},
          ${input.auditAction},
          'sanity_blog_post',
          completed."target_id",
          ${input.requestId ?? null}::text,
          jsonb_build_object(
            'commandId', completed."id"::text,
            'provider', 'sanity',
            'providerAction', completed."action",
            'result', 'success'
          )
        from completed
        returning "id"
      )
      select
        case
          when exists (select 1 from completed) then 'completed'
          when exists (
            select 1
            from ${contentProviderCommands}
            where "id" = ${input.commandId}
              and "organization_id" = ${authorization.organizationId}
              and "actor_user_id" = ${authorization.actor.id}
              and "session_id" = ${authorization.session.id}
              and "target_id" = ${input.targetId}
              and "status" = 'succeeded'
          ) then 'duplicate'
          else null
        end as "result"
    `),
  ]);
  const result = results[3].rows[0]?.result;

  if (result !== "completed" && result !== "duplicate") {
    throw new Error("The content command could not be completed.");
  }

  return result;
}

export async function markContentProviderCommandUncertain(
  databaseUrl: string,
  authorization: AdminAuthorizationContext,
  input: {
    auditAction: string;
    commandId: string;
    failureCode: string;
    requestId?: string;
    targetId: string;
  },
): Promise<void> {
  const database = createDatabase(databaseUrl);
  const context = contextQueries(database, authorization);

  const results = await database.batch([
    ...context,
    database.execute(sql<{ audited: boolean; marked: boolean }>`
      with marked as (
        update ${contentProviderCommands}
        set
          "status" = 'uncertain',
          "failure_code" = ${input.failureCode},
          "updated_at" = now()
        where "id" = ${input.commandId}
          and "organization_id" = ${authorization.organizationId}
          and "actor_user_id" = ${authorization.actor.id}
          and "session_id" = ${authorization.session.id}
          and "target_id" = ${input.targetId}
          and "status" = 'reserved'
        returning "id", "action", "target_id"
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
          ${authorization.organizationId},
          ${authorization.actor.id},
          ${input.auditAction},
          'sanity_blog_post',
          marked."target_id",
          ${input.requestId ?? null}::text,
          jsonb_build_object(
            'commandId', marked."id"::text,
            'provider', 'sanity',
            'providerAction', marked."action",
            'reasonCode', ${input.failureCode}::text,
            'result', 'failure'
          )
        from marked
        returning "id"
      )
      select
        exists (select 1 from marked) as "marked",
        exists (select 1 from audited) as "audited"
    `),
  ]);
  const result = results[3].rows[0];

  if (!result?.marked || !result.audited) {
    throw new Error("The uncertain content command could not be recorded.");
  }
}

export async function recordSanityWebhook(
  databaseUrl: string,
  input: {
    bodyHash: string;
    eventId: string;
    eventType: string;
    occurredAt: Date;
    organizationId: string;
    transactionId: string;
  },
): Promise<{ status: "accepted" | "conflict" | "duplicate" }> {
  const database = createDatabase(databaseUrl);
  const context = [
    database.execute(
      sql`select set_config('app.organization_id', ${input.organizationId}, true)`,
    ),
    database.execute(sql`select set_config('app.user_id', '', true)`),
    database.execute(
      sql`select set_config('app.membership_role', 'owner', true)`,
    ),
  ] as const;
  const results = await database.batch([
    ...context,
    database
      .insert(providerWebhookEvents)
      .values({
        bodyHash: input.bodyHash,
        eventType: input.eventType,
        id: `sanity:${input.eventId}`,
        occurredAt: input.occurredAt,
        organizationId: input.organizationId,
        provider: "sanity",
        providerMessageId: input.transactionId,
      })
      .onConflictDoNothing({ target: providerWebhookEvents.id })
      .returning({ id: providerWebhookEvents.id }),
    database
      .select({
        bodyHash: providerWebhookEvents.bodyHash,
        eventType: providerWebhookEvents.eventType,
        organizationId: providerWebhookEvents.organizationId,
        provider: providerWebhookEvents.provider,
        providerMessageId: providerWebhookEvents.providerMessageId,
      })
      .from(providerWebhookEvents)
      .where(eq(providerWebhookEvents.id, `sanity:${input.eventId}`))
      .limit(1),
  ]);
  const inserted = results[3].length === 1;
  const receipt = results[4][0];

  if (!receipt) {
    throw new Error("The Sanity webhook receipt could not be read.");
  }

  if (
    receipt.bodyHash !== input.bodyHash ||
    receipt.eventType !== input.eventType ||
    receipt.organizationId !== input.organizationId ||
    receipt.provider !== "sanity" ||
    receipt.providerMessageId !== input.transactionId
  ) {
    return { status: "conflict" };
  }

  return { status: inserted ? "accepted" : "duplicate" };
}

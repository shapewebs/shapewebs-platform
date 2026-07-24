import {
  and,
  asc,
  desc,
  eq,
  gt,
  gte,
  inArray,
  isNull,
  lt,
  lte,
  or,
  sql,
} from "drizzle-orm";

import { createDatabase } from "./client";
import { leadSubmissions, outboxEvents, providerWebhookEvents } from "./schema";
import type { AdminAuthorizationContext } from "./admin-auth";

type LeadKind = "contact" | "project_inquiry";

const maximumSyntheticRetentionBatchSize = 1_000;
const syntheticCompany = "CHECKLY_SYNTHETIC_DO_NOT_CONTACT";
const syntheticEmail = "synthetic-monitor@shapewebs.invalid";
const syntheticMessage = "Synthetic staging reliability check. Safe to delete.";
const syntheticName = "Checkly Synthetic Monitor";

type DatabaseContext = {
  organizationId: string;
  role: "editor" | "owner" | "web";
  userId?: string;
};

function contextQueries(
  database: ReturnType<typeof createDatabase>,
  context: DatabaseContext,
) {
  return [
    database.execute(
      sql`select set_config('app.organization_id', ${context.organizationId}, true)`,
    ),
    database.execute(
      sql`select set_config('app.user_id', ${context.userId ?? ""}, true)`,
    ),
    database.execute(
      sql`select set_config('app.membership_role', ${
        context.role === "web" ? "" : context.role
      }, true)`,
    ),
  ] as const;
}

export type LeadSubmissionCommand = {
  commandId: string;
  email: string;
  kind: LeadKind;
  message: string;
  name: string;
  organizationId: string;
  payload: Record<string, unknown>;
  requestFingerprint: string;
  sourceIpHash: string | null;
};

export async function submitLeadWithOutbox(
  databaseUrl: string,
  command: LeadSubmissionCommand,
): Promise<
  { leadId: string; status: "accepted" } | { status: "idempotency_conflict" }
> {
  const database = createDatabase(databaseUrl);
  const context = contextQueries(database, {
    organizationId: command.organizationId,
    role: "web",
  });
  const idempotencyKey = `lead.notification/${command.commandId}`;

  const results = await database.batch([
    ...context,
    database
      .insert(leadSubmissions)
      .values({
        commandId: command.commandId,
        email: command.email,
        id: command.commandId,
        kind: command.kind,
        message: command.message,
        name: command.name,
        organizationId: command.organizationId,
        payload: command.payload,
        requestFingerprint: command.requestFingerprint,
        sourceIpHash: command.sourceIpHash,
      })
      .onConflictDoNothing({ target: leadSubmissions.commandId }),
    database
      .insert(outboxEvents)
      .values({
        eventType: "lead.notification.requested",
        idempotencyKey,
        leadId: command.commandId,
        organizationId: command.organizationId,
      })
      .onConflictDoNothing(),
    database
      .select({
        id: leadSubmissions.id,
        requestFingerprint: leadSubmissions.requestFingerprint,
      })
      .from(leadSubmissions)
      .where(
        and(
          eq(leadSubmissions.organizationId, command.organizationId),
          eq(leadSubmissions.commandId, command.commandId),
        ),
      )
      .limit(1),
  ]);

  const receipt = results[5][0];

  if (!receipt) {
    throw new Error("The committed lead receipt could not be read.");
  }

  if (receipt.requestFingerprint !== command.requestFingerprint) {
    return { status: "idempotency_conflict" };
  }

  return {
    leadId: receipt.id,
    status: "accepted",
  };
}

export type ClaimedLeadNotification = {
  attempt: number;
  email: string;
  eventId: string;
  idempotencyKey: string;
  kind: LeadKind;
  leadId: string;
  name: string;
};

export type LeadSubmissionDto = {
  createdAt: Date;
  email: string;
  id: string;
  kind: LeadKind;
  message: string;
  name: string;
  notificationStatus:
    "pending" | "permanent_failure" | "processing" | "sent" | null;
  payload: Record<string, unknown>;
  status: "closed" | "new" | "qualified" | "reviewed" | "spam";
};

export async function listLeadSubmissions(
  databaseUrl: string,
  authorization: AdminAuthorizationContext,
  maximumResults = 100,
): Promise<LeadSubmissionDto[]> {
  const database = createDatabase(databaseUrl);
  const context = contextQueries(database, {
    organizationId: authorization.organizationId,
    role: authorization.role,
    userId: authorization.actor.id,
  });
  const safeLimit = Number.isSafeInteger(maximumResults)
    ? Math.max(1, Math.min(maximumResults, 100))
    : 100;
  const results = await database.batch([
    ...context,
    database
      .select({
        createdAt: leadSubmissions.createdAt,
        email: leadSubmissions.email,
        id: leadSubmissions.id,
        kind: leadSubmissions.kind,
        message: leadSubmissions.message,
        name: leadSubmissions.name,
        notificationStatus: outboxEvents.status,
        payload: leadSubmissions.payload,
        status: leadSubmissions.status,
      })
      .from(leadSubmissions)
      .leftJoin(
        outboxEvents,
        and(
          eq(outboxEvents.leadId, leadSubmissions.id),
          eq(outboxEvents.eventType, "lead.notification.requested"),
        ),
      )
      .where(eq(leadSubmissions.organizationId, authorization.organizationId))
      .orderBy(desc(leadSubmissions.createdAt))
      .limit(safeLimit),
  ]);

  return results[3];
}

function expiredSyntheticLeadFilter(organizationId: string) {
  return and(
    eq(leadSubmissions.organizationId, organizationId),
    eq(leadSubmissions.kind, "contact"),
    eq(leadSubmissions.name, syntheticName),
    sql`lower(${leadSubmissions.email}) = ${syntheticEmail}`,
    eq(leadSubmissions.message, syntheticMessage),
    sql`${leadSubmissions.payload}->>'company' = ${syntheticCompany}`,
    sql`${leadSubmissions.createdAt} < now() - interval '6 days'`,
  );
}

export async function deleteExpiredSyntheticLeadSubmissions(
  databaseUrl: string,
  input: {
    organizationId: string;
  },
): Promise<number> {
  const database = createDatabase(databaseUrl);
  const context = contextQueries(database, {
    organizationId: input.organizationId,
    role: "owner",
  });
  const candidates = await database.batch([
    ...context,
    database
      .select({ id: leadSubmissions.id })
      .from(leadSubmissions)
      .where(expiredSyntheticLeadFilter(input.organizationId))
      .orderBy(asc(leadSubmissions.createdAt))
      .limit(maximumSyntheticRetentionBatchSize),
  ]);
  const candidateIds = candidates[3].map(({ id }) => id);

  if (candidateIds.length === 0) {
    return 0;
  }

  const deleted = await database.batch([
    ...context,
    database
      .delete(outboxEvents)
      .where(
        and(
          eq(outboxEvents.organizationId, input.organizationId),
          inArray(outboxEvents.leadId, candidateIds),
        ),
      ),
    database
      .delete(leadSubmissions)
      .where(
        and(
          expiredSyntheticLeadFilter(input.organizationId),
          inArray(leadSubmissions.id, candidateIds),
        ),
      )
      .returning({ id: leadSubmissions.id }),
  ]);

  return deleted[4].length;
}

export async function claimLeadNotification(
  databaseUrl: string,
  input: {
    organizationId: string;
    workerId: string;
  },
  now = new Date(),
): Promise<ClaimedLeadNotification | null> {
  const database = createDatabase(databaseUrl);
  const context = contextQueries(database, {
    organizationId: input.organizationId,
    role: "owner",
  });
  const staleLockCutoff = new Date(now.getTime() - 5 * 60 * 1_000);
  const uncertainDeliveryCutoff = new Date(
    now.getTime() - 23 * 60 * 60 * 1_000,
  );
  const eligible = or(
    and(
      eq(outboxEvents.status, "pending"),
      lte(outboxEvents.nextAttemptAt, now),
    ),
    and(
      eq(outboxEvents.status, "processing"),
      lt(outboxEvents.lockedAt, staleLockCutoff),
      gt(outboxEvents.lockedAt, uncertainDeliveryCutoff),
    ),
  );

  const candidates = await database.batch([
    ...context,
    database
      .update(outboxEvents)
      .set({
        lastErrorCode: sql`case
          when ${outboxEvents.attempts} >= 10
            then 'retry_attempts_exhausted'
          else 'provider_idempotency_window_expired'
        end`,
        lockedAt: null,
        lockedBy: null,
        processedAt: now,
        status: "permanent_failure",
        updatedAt: now,
      })
      .where(
        and(
          eq(outboxEvents.organizationId, input.organizationId),
          eq(outboxEvents.eventType, "lead.notification.requested"),
          or(
            and(
              or(
                eq(outboxEvents.status, "pending"),
                eq(outboxEvents.status, "processing"),
              ),
              gte(outboxEvents.attempts, 10),
            ),
            and(
              eq(outboxEvents.status, "processing"),
              lte(outboxEvents.lockedAt, uncertainDeliveryCutoff),
            ),
          ),
        ),
      ),
    database
      .select({
        attempts: outboxEvents.attempts,
        email: leadSubmissions.email,
        eventId: outboxEvents.id,
        idempotencyKey: outboxEvents.idempotencyKey,
        kind: leadSubmissions.kind,
        leadId: leadSubmissions.id,
        name: leadSubmissions.name,
      })
      .from(outboxEvents)
      .innerJoin(leadSubmissions, eq(leadSubmissions.id, outboxEvents.leadId))
      .where(
        and(
          eq(outboxEvents.organizationId, input.organizationId),
          eq(outboxEvents.eventType, "lead.notification.requested"),
          lt(outboxEvents.attempts, 10),
          eligible,
        ),
      )
      .orderBy(asc(outboxEvents.createdAt))
      .limit(1),
  ]);
  const candidate = candidates[4][0];

  if (!candidate) {
    return null;
  }

  const claimResults = await database.batch([
    ...context,
    database
      .update(outboxEvents)
      .set({
        attempts: sql`${outboxEvents.attempts} + 1`,
        lockedAt: now,
        lockedBy: input.workerId,
        status: "processing",
        updatedAt: now,
      })
      .where(
        and(
          eq(outboxEvents.id, candidate.eventId),
          lt(outboxEvents.attempts, 10),
          eligible,
        ),
      )
      .returning({ id: outboxEvents.id }),
  ]);

  if (claimResults[3].length !== 1) {
    return null;
  }

  return {
    attempt: candidate.attempts + 1,
    email: candidate.email,
    eventId: candidate.eventId,
    idempotencyKey: candidate.idempotencyKey,
    kind: candidate.kind,
    leadId: candidate.leadId,
    name: candidate.name,
  };
}

export async function completeLeadNotification(
  databaseUrl: string,
  input: {
    eventId: string;
    organizationId: string;
    providerMessageId: string;
    workerId: string;
  },
  now = new Date(),
): Promise<boolean> {
  const database = createDatabase(databaseUrl);
  const context = contextQueries(database, {
    organizationId: input.organizationId,
    role: "owner",
  });
  const results = await database.batch([
    ...context,
    database
      .update(outboxEvents)
      .set({
        lastErrorCode: null,
        lockedAt: null,
        lockedBy: null,
        processedAt: now,
        providerMessageId: input.providerMessageId,
        status: "sent",
        updatedAt: now,
      })
      .where(
        and(
          eq(outboxEvents.id, input.eventId),
          eq(outboxEvents.organizationId, input.organizationId),
          eq(outboxEvents.status, "processing"),
          eq(outboxEvents.lockedBy, input.workerId),
        ),
      )
      .returning({ id: outboxEvents.id }),
  ]);

  return results[3].length === 1;
}

export async function failLeadNotification(
  databaseUrl: string,
  input: {
    errorCode: string;
    eventId: string;
    nextAttemptAt: Date;
    organizationId: string;
    permanent: boolean;
    workerId: string;
  },
  now = new Date(),
): Promise<boolean> {
  const database = createDatabase(databaseUrl);
  const context = contextQueries(database, {
    organizationId: input.organizationId,
    role: "owner",
  });
  const results = await database.batch([
    ...context,
    database
      .update(outboxEvents)
      .set({
        lastErrorCode: input.errorCode.slice(0, 80),
        lockedAt: null,
        lockedBy: null,
        nextAttemptAt: input.nextAttemptAt,
        processedAt: input.permanent ? now : null,
        status: input.permanent ? "permanent_failure" : "pending",
        updatedAt: now,
      })
      .where(
        and(
          eq(outboxEvents.id, input.eventId),
          eq(outboxEvents.organizationId, input.organizationId),
          eq(outboxEvents.status, "processing"),
          eq(outboxEvents.lockedBy, input.workerId),
        ),
      )
      .returning({ id: outboxEvents.id }),
  ]);

  return results[3].length === 1;
}

export async function recordResendWebhook(
  databaseUrl: string,
  input: {
    bodyHash: string;
    eventId: string;
    eventType: string;
    occurredAt: Date;
    organizationId: string;
    providerMessageId?: string;
  },
): Promise<{ duplicate: boolean }> {
  const database = createDatabase(databaseUrl);
  const context = contextQueries(database, {
    organizationId: input.organizationId,
    role: "owner",
  });
  const webhookInsert = database
    .insert(providerWebhookEvents)
    .values({
      bodyHash: input.bodyHash,
      eventType: input.eventType,
      id: input.eventId,
      occurredAt: input.occurredAt,
      organizationId: input.organizationId,
      provider: "resend",
      providerMessageId: input.providerMessageId,
    })
    .onConflictDoNothing({ target: providerWebhookEvents.id })
    .returning({ id: providerWebhookEvents.id });

  if (!input.providerMessageId) {
    const insertResults = await database.batch([...context, webhookInsert]);
    return { duplicate: insertResults[3].length === 0 };
  }

  const results = await database.batch([
    ...context,
    webhookInsert,
    database
      .update(outboxEvents)
      .set({
        deliveryOccurredAt: input.occurredAt,
        deliveryStatus: input.eventType,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(outboxEvents.organizationId, input.organizationId),
          eq(outboxEvents.providerMessageId, input.providerMessageId),
          or(
            isNull(outboxEvents.deliveryOccurredAt),
            lte(outboxEvents.deliveryOccurredAt, input.occurredAt),
          ),
        ),
      ),
  ]);

  return { duplicate: results[3].length === 0 };
}

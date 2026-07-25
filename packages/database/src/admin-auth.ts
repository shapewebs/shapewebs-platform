import { and, eq, gt, isNull, sql } from "drizzle-orm";

import { createDatabase } from "./client";
import {
  adminSessionSecurity,
  adminTotpSecurity,
  auditEvents,
  memberships,
  membershipRole,
  organizationSettings,
  session as authSession,
} from "./schema";
import { defaultOrganizationSettingsValue } from "./settings-defaults";

const inactivityLimitMs = 30 * 60 * 1_000;

type MembershipRole = (typeof membershipRole.enumValues)[number];

export type AdminAuthorizationContext = {
  actor: {
    id: string;
  };
  latestStepUpAt: Date | null;
  organizationId: string;
  role: Exclude<MembershipRole, "customer">;
  session: {
    id: string;
  };
};

type AdminSessionIdentity = {
  organizationId: string;
  sessionId: string;
  stepUpVerifiedAt?: Date;
  userId: string;
};

function contextQueries(
  database: ReturnType<typeof createDatabase>,
  identity: Pick<AdminSessionIdentity, "organizationId" | "userId">,
  role: MembershipRole,
) {
  return [
    database.execute(
      sql`select set_config('app.organization_id', ${identity.organizationId}, true)`,
    ),
    database.execute(
      sql`select set_config('app.user_id', ${identity.userId}, true)`,
    ),
    database.execute(
      sql`select set_config('app.membership_role', ${role}, true)`,
    ),
  ] as const;
}

export async function provisionOwnerAdminSession(
  databaseUrl: string,
  identity: AdminSessionIdentity,
): Promise<void> {
  const database = createDatabase(databaseUrl);
  const context = contextQueries(database, identity, "owner");

  await database.batch([
    ...context,
    database
      .insert(memberships)
      .values({
        organizationId: identity.organizationId,
        role: "owner",
        status: "active",
        userId: identity.userId,
      })
      .onConflictDoNothing(),
    database
      .insert(organizationSettings)
      .values({
        ...defaultOrganizationSettingsValue,
        organizationId: identity.organizationId,
      })
      .onConflictDoNothing(),
    database
      .insert(adminSessionSecurity)
      .values({
        stepUpVerifiedAt: identity.stepUpVerifiedAt,
        sessionId: identity.sessionId,
        userId: identity.userId,
      })
      .onConflictDoNothing(),
    database.insert(auditEvents).values({
      action: "auth.login",
      actorUserId: identity.userId,
      metadata: {
        result: "success",
      },
      organizationId: identity.organizationId,
      targetId: identity.sessionId,
      targetType: "session",
    }),
  ]);
}

export async function appendAdminAuditEvent(
  databaseUrl: string,
  input: AdminSessionIdentity & {
    action: string;
    requestId?: string;
    result: "denied" | "failure" | "success";
    role: Exclude<MembershipRole, "customer">;
    targetId?: string;
    targetType: string;
  },
): Promise<void> {
  const database = createDatabase(databaseUrl);
  const context = contextQueries(database, input, input.role);

  await database.batch([
    ...context,
    database.insert(auditEvents).values({
      action: input.action,
      actorUserId: input.userId,
      metadata: {
        result: input.result,
      },
      organizationId: input.organizationId,
      requestId: input.requestId,
      targetId: input.targetId,
      targetType: input.targetType,
    }),
  ]);
}

export async function appendSystemAuditEvent(
  databaseUrl: string,
  input: {
    action: string;
    organizationId: string;
    requestId?: string;
    result: "denied" | "failure" | "success";
    targetId?: string;
    targetType: string;
  },
): Promise<void> {
  const database = createDatabase(databaseUrl);
  const context = contextQueries(
    database,
    {
      organizationId: input.organizationId,
      userId: "",
    },
    "owner",
  );

  await database.batch([
    ...context,
    database.insert(auditEvents).values({
      action: input.action,
      actorUserId: null,
      metadata: {
        result: input.result,
      },
      organizationId: input.organizationId,
      requestId: input.requestId,
      targetId: input.targetId,
      targetType: input.targetType,
    }),
  ]);
}

export async function authorizeAdminSession(
  databaseUrl: string,
  identity: AdminSessionIdentity,
  now = new Date(),
): Promise<AdminAuthorizationContext | null> {
  const database = createDatabase(databaseUrl);
  const context = contextQueries(database, identity, "customer");
  const inactivityCutoff = new Date(now.getTime() - inactivityLimitMs);

  const results = await database.batch([
    ...context,
    database
      .update(adminSessionSecurity)
      .set({ lastSeenAt: now })
      .where(
        and(
          eq(adminSessionSecurity.sessionId, identity.sessionId),
          eq(adminSessionSecurity.userId, identity.userId),
          isNull(adminSessionSecurity.revokedAt),
          gt(adminSessionSecurity.lastSeenAt, inactivityCutoff),
          sql`exists (
            select 1
            from ${authSession}
            where ${authSession.id} = ${identity.sessionId}
              and ${authSession.userId} = ${identity.userId}
              and ${authSession.expiresAt} > ${now}
          )`,
          sql`exists (
            select 1
            from ${memberships}
            where ${memberships.organizationId} = ${identity.organizationId}
              and ${memberships.userId} = ${identity.userId}
              and ${memberships.status} = 'active'
              and ${memberships.role} in ('owner', 'editor')
          )`,
        ),
      )
      .returning({
        stepUpVerifiedAt: adminSessionSecurity.stepUpVerifiedAt,
      }),
    database
      .select({
        role: memberships.role,
      })
      .from(memberships)
      .where(
        and(
          eq(memberships.organizationId, identity.organizationId),
          eq(memberships.userId, identity.userId),
          eq(memberships.status, "active"),
        ),
      )
      .limit(1),
  ]);

  const security = results[3][0];
  const membership = results[4][0];

  if (
    !security ||
    !membership ||
    !["owner", "editor"].includes(membership.role)
  ) {
    return null;
  }

  return {
    actor: {
      id: identity.userId,
    },
    latestStepUpAt: security.stepUpVerifiedAt,
    organizationId: identity.organizationId,
    role: membership.role as Exclude<MembershipRole, "customer">,
    session: {
      id: identity.sessionId,
    },
  };
}

export async function isAdminTotpLocked(
  databaseUrl: string,
  userId: string,
  now = new Date(),
): Promise<boolean> {
  const database = createDatabase(databaseUrl);
  const [security] = await database
    .select({ lockedUntil: adminTotpSecurity.lockedUntil })
    .from(adminTotpSecurity)
    .where(eq(adminTotpSecurity.userId, userId))
    .limit(1);

  return Boolean(
    security?.lockedUntil && security.lockedUntil.getTime() > now.getTime(),
  );
}

export async function recordAdminTotpFailure(
  databaseUrl: string,
  userId: string,
  failedAt = new Date(),
): Promise<void> {
  const database = createDatabase(databaseUrl);

  await database.execute(sql`
    insert into ${adminTotpSecurity} (
      ${adminTotpSecurity.userId},
      ${adminTotpSecurity.failedAttempts},
      ${adminTotpSecurity.updatedAt}
    )
    values (${userId}, 1, ${failedAt})
    on conflict (${adminTotpSecurity.userId}) do update
    set
      ${adminTotpSecurity.failedAttempts} = case
        when ${adminTotpSecurity.lockedUntil} is not null
          and ${adminTotpSecurity.lockedUntil} <= ${failedAt}
          then 1
        when ${adminTotpSecurity.lockedUntil} is not null
          and ${adminTotpSecurity.lockedUntil} > ${failedAt}
          then ${adminTotpSecurity.failedAttempts}
        else ${adminTotpSecurity.failedAttempts} + 1
      end,
      ${adminTotpSecurity.lockedUntil} = case
        when ${adminTotpSecurity.lockedUntil} is not null
          and ${adminTotpSecurity.lockedUntil} > ${failedAt}
          then ${adminTotpSecurity.lockedUntil}
        when ${adminTotpSecurity.lockedUntil} is not null
          and ${adminTotpSecurity.lockedUntil} <= ${failedAt}
          then null
        when ${adminTotpSecurity.failedAttempts} + 1 >= 10
          then cast(${failedAt} as timestamptz) + interval '15 minutes'
        else null
      end,
      ${adminTotpSecurity.updatedAt} = ${failedAt}
  `);
}

export async function consumeAdminTotpCounter(
  databaseUrl: string,
  input: Omit<AdminSessionIdentity, "organizationId" | "stepUpVerifiedAt"> & {
    counter: number;
  },
  verifiedAt = new Date(),
): Promise<boolean> {
  if (!Number.isSafeInteger(input.counter) || input.counter < 0) {
    throw new Error("The TOTP counter must be a non-negative safe integer.");
  }

  const database = createDatabase(databaseUrl);
  const result = await database.execute<{ sessionId: string }>(sql`
    with accepted_counter as (
      insert into ${adminTotpSecurity} (
        ${adminTotpSecurity.userId},
        ${adminTotpSecurity.lastAcceptedCounter},
        ${adminTotpSecurity.failedAttempts},
        ${adminTotpSecurity.lockedUntil},
        ${adminTotpSecurity.updatedAt}
      )
      values (${input.userId}, ${input.counter}, 0, null, ${verifiedAt})
      on conflict (${adminTotpSecurity.userId}) do update
      set
        ${adminTotpSecurity.lastAcceptedCounter} = excluded.${sql.identifier("last_accepted_counter")},
        ${adminTotpSecurity.failedAttempts} = 0,
        ${adminTotpSecurity.lockedUntil} = null,
        ${adminTotpSecurity.updatedAt} = excluded.${sql.identifier("updated_at")}
      where (
        ${adminTotpSecurity.lockedUntil} is null
        or ${adminTotpSecurity.lockedUntil} <= ${verifiedAt}
      )
      and (
        ${adminTotpSecurity.lastAcceptedCounter} is null
        or ${adminTotpSecurity.lastAcceptedCounter} < excluded.${sql.identifier("last_accepted_counter")}
      )
      returning ${adminTotpSecurity.userId}
    )
    update ${adminSessionSecurity}
    set
      ${adminSessionSecurity.lastSeenAt} = ${verifiedAt},
      ${adminSessionSecurity.stepUpVerifiedAt} = ${verifiedAt}
    where ${adminSessionSecurity.sessionId} = ${input.sessionId}
      and ${adminSessionSecurity.userId} = ${input.userId}
      and ${adminSessionSecurity.revokedAt} is null
      and exists (select 1 from accepted_counter)
    returning ${adminSessionSecurity.sessionId} as "sessionId"
  `);

  return result.rows.length === 1;
}

export async function revokeAdminSessionSecurity(
  databaseUrl: string,
  identity: Omit<AdminSessionIdentity, "organizationId">,
  revokedAt = new Date(),
): Promise<void> {
  const database = createDatabase(databaseUrl);
  await database
    .update(adminSessionSecurity)
    .set({ revokedAt })
    .where(
      and(
        eq(adminSessionSecurity.sessionId, identity.sessionId),
        eq(adminSessionSecurity.userId, identity.userId),
      ),
    );
}

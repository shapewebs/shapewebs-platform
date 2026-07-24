import { and, eq, gt, isNull, sql } from "drizzle-orm";

import { createDatabase } from "./client";
import {
  adminSessionSecurity,
  auditEvents,
  memberships,
  membershipRole,
  session as authSession,
} from "./schema";

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
      .insert(adminSessionSecurity)
      .values({
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

export async function recordAdminStepUp(
  databaseUrl: string,
  identity: Omit<AdminSessionIdentity, "organizationId">,
  verifiedAt = new Date(),
): Promise<boolean> {
  const database = createDatabase(databaseUrl);
  const updated = await database
    .update(adminSessionSecurity)
    .set({
      lastSeenAt: verifiedAt,
      stepUpVerifiedAt: verifiedAt,
    })
    .where(
      and(
        eq(adminSessionSecurity.sessionId, identity.sessionId),
        eq(adminSessionSecurity.userId, identity.userId),
        isNull(adminSessionSecurity.revokedAt),
      ),
    )
    .returning({ sessionId: adminSessionSecurity.sessionId });

  return updated.length === 1;
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

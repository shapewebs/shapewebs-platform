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
import {
  adminSessionSecurity,
  adminTotpSecurity,
  adminAuthEmailOutbox,
  account as authAccount,
  auditEvents,
  staffMembershipRole,
  staffMemberships,
  organizationSettings,
  session as authSession,
  user as authUser,
} from "./schema";
import { defaultOrganizationSettingsValue } from "./settings-defaults";

const inactivityLimitMs = 30 * 60 * 1_000;
const authEmailRequestCooldownMs = 5 * 60 * 1_000;

type StaffMembershipRole = (typeof staffMembershipRole.enumValues)[number];

export type AdminAuthorizationContext = {
  actor: {
    id: string;
  };
  latestStepUpAt: Date | null;
  organizationId: string;
  role: StaffMembershipRole;
  session: {
    id: string;
  };
};

export type AdminSessionSummary = {
  createdAt: Date;
  expiresAt: Date;
  id: string;
  isActive: boolean;
  isCurrent: boolean;
  lastSeenAt: Date;
  stepUpVerifiedAt: Date | null;
  userAgent: string;
  userEmail: string;
  userName: string;
};

export type ClaimedAdminAuthEmail = {
  attempt: number;
  encryptedToken: string;
  eventId: string;
  idempotencyKey: string;
  kind: "email_verification" | "password_reset";
  recipient: string;
};

export type AdminAuthEmailRequestCooldown = {
  retryAfterSeconds: number;
};

type AdminSessionIdentity = {
  organizationId: string;
  sessionId: string;
  stepUpVerifiedAt?: Date;
  userId: string;
};

function summarizeUserAgent(value: string | null): string {
  const normalized = (value ?? "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 160);

  return normalized || "Unknown browser";
}

function contextQueries(
  database: ReturnType<typeof createDatabase>,
  identity: Pick<AdminSessionIdentity, "organizationId" | "userId">,
  role: StaffMembershipRole | "",
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

export async function provisionAdminSession(
  databaseUrl: string,
  identity: AdminSessionIdentity & { role: StaffMembershipRole },
): Promise<void> {
  const database = createDatabase(databaseUrl);
  const context = contextQueries(database, identity, identity.role);

  await database.batch([
    ...context,
    database
      .insert(staffMemberships)
      .values({
        organizationId: identity.organizationId,
        role: identity.role,
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

export async function getAdminAuthenticationMethods(
  databaseUrl: string,
  userId: string,
): Promise<{ google: boolean; password: boolean }> {
  const database = createDatabase(databaseUrl);
  const accounts = await database
    .select({ providerId: authAccount.providerId })
    .from(authAccount)
    .where(eq(authAccount.userId, userId));
  const providers = new Set(accounts.map((account) => account.providerId));

  return {
    google: providers.has("google"),
    password: providers.has("credential"),
  };
}

export async function getAdminCredentialPasswordHash(
  databaseUrl: string,
  userId: string,
): Promise<string | null> {
  const database = createDatabase(databaseUrl);
  const result = await database
    .select({ password: authAccount.password })
    .from(authAccount)
    .where(
      and(
        eq(authAccount.userId, userId),
        eq(authAccount.providerId, "credential"),
      ),
    )
    .limit(1);

  return result[0]?.password ?? null;
}

export async function findAdminSessionByToken(
  databaseUrl: string,
  token: string,
): Promise<{ expiresAt: Date; id: string; userId: string } | null> {
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) {
    return null;
  }

  const database = createDatabase(databaseUrl);
  const result = await database
    .select({
      expiresAt: authSession.expiresAt,
      id: authSession.id,
      userId: authSession.userId,
    })
    .from(authSession)
    .where(
      and(eq(authSession.token, token), gt(authSession.expiresAt, new Date())),
    )
    .limit(1);

  return result[0] ?? null;
}

export async function enqueueAdminAuthEmail(
  databaseUrl: string,
  input: {
    encryptedToken: string;
    expiresAt: Date;
    idempotencyKey: string;
    kind: "email_verification" | "password_reset";
    organizationId: string;
    recipient: string;
    tokenHash: string;
    userId: string;
  },
): Promise<void> {
  const database = createDatabase(databaseUrl);
  const context = contextQueries(
    database,
    { organizationId: input.organizationId, userId: input.userId },
    "",
  );

  await database.batch([
    ...context,
    database
      .insert(adminAuthEmailOutbox)
      .values(input)
      .onConflictDoNothing({ target: adminAuthEmailOutbox.idempotencyKey }),
  ]);
}

export async function getAdminAuthEmailRequestCooldown(
  databaseUrl: string,
  authorization: AdminAuthorizationContext,
  kind: "email_verification" | "password_reset",
  now = new Date(),
): Promise<AdminAuthEmailRequestCooldown | null> {
  const database = createDatabase(databaseUrl);
  const context = contextQueries(
    database,
    {
      organizationId: authorization.organizationId,
      userId: authorization.actor.id,
    },
    authorization.role,
  );
  const cutoff = new Date(now.getTime() - authEmailRequestCooldownMs);
  const results = await database.batch([
    ...context,
    database
      .select({ createdAt: adminAuthEmailOutbox.createdAt })
      .from(adminAuthEmailOutbox)
      .where(
        and(
          eq(adminAuthEmailOutbox.organizationId, authorization.organizationId),
          eq(adminAuthEmailOutbox.userId, authorization.actor.id),
          eq(adminAuthEmailOutbox.kind, kind),
          gt(adminAuthEmailOutbox.createdAt, cutoff),
          inArray(adminAuthEmailOutbox.status, [
            "pending",
            "processing",
            "sent",
          ]),
        ),
      )
      .orderBy(desc(adminAuthEmailOutbox.createdAt))
      .limit(1),
  ]);
  const recentRequest = results[3][0];

  if (!recentRequest) {
    return null;
  }

  return {
    retryAfterSeconds: Math.max(
      1,
      Math.ceil(
        (recentRequest.createdAt.getTime() +
          authEmailRequestCooldownMs -
          now.getTime()) /
          1_000,
      ),
    ),
  };
}

export async function claimAdminAuthEmail(
  databaseUrl: string,
  input: { organizationId: string; workerId: string },
  now = new Date(),
): Promise<ClaimedAdminAuthEmail | null> {
  const database = createDatabase(databaseUrl);
  const context = contextQueries(
    database,
    { organizationId: input.organizationId, userId: "" },
    "",
  );
  const staleLockCutoff = new Date(now.getTime() - 5 * 60 * 1_000);
  const uncertainDeliveryCutoff = new Date(
    now.getTime() - 23 * 60 * 60 * 1_000,
  );
  const eligible = or(
    and(
      eq(adminAuthEmailOutbox.status, "pending"),
      lte(adminAuthEmailOutbox.nextAttemptAt, now),
    ),
    and(
      eq(adminAuthEmailOutbox.status, "processing"),
      lt(adminAuthEmailOutbox.lockedAt, staleLockCutoff),
      gt(adminAuthEmailOutbox.lockedAt, uncertainDeliveryCutoff),
    ),
  );

  await database.batch([
    ...context,
    database
      .update(adminAuthEmailOutbox)
      .set({
        lastErrorCode: sql`case
          when ${adminAuthEmailOutbox.expiresAt} <= ${now}
            then 'auth_token_expired'
          when ${adminAuthEmailOutbox.attempts} >= 10
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
          eq(adminAuthEmailOutbox.organizationId, input.organizationId),
          or(
            lte(adminAuthEmailOutbox.expiresAt, now),
            gte(adminAuthEmailOutbox.attempts, 10),
            and(
              eq(adminAuthEmailOutbox.status, "processing"),
              lte(adminAuthEmailOutbox.lockedAt, uncertainDeliveryCutoff),
            ),
          ),
          or(
            eq(adminAuthEmailOutbox.status, "pending"),
            eq(adminAuthEmailOutbox.status, "processing"),
          ),
        ),
      ),
  ]);

  const candidateResults = await database.batch([
    ...context,
    database
      .select({
        attempts: adminAuthEmailOutbox.attempts,
        encryptedToken: adminAuthEmailOutbox.encryptedToken,
        eventId: adminAuthEmailOutbox.id,
        idempotencyKey: adminAuthEmailOutbox.idempotencyKey,
        kind: adminAuthEmailOutbox.kind,
        recipient: adminAuthEmailOutbox.recipient,
      })
      .from(adminAuthEmailOutbox)
      .where(
        and(
          eq(adminAuthEmailOutbox.organizationId, input.organizationId),
          gt(adminAuthEmailOutbox.expiresAt, now),
          lt(adminAuthEmailOutbox.attempts, 10),
          eligible,
        ),
      )
      .orderBy(asc(adminAuthEmailOutbox.createdAt))
      .limit(1),
  ]);
  const candidate = candidateResults[3][0];

  if (!candidate) {
    return null;
  }

  const claimResults = await database.batch([
    ...context,
    database
      .update(adminAuthEmailOutbox)
      .set({
        attempts: sql`${adminAuthEmailOutbox.attempts} + 1`,
        lockedAt: now,
        lockedBy: input.workerId,
        status: "processing",
        updatedAt: now,
      })
      .where(
        and(
          eq(adminAuthEmailOutbox.id, candidate.eventId),
          eq(adminAuthEmailOutbox.organizationId, input.organizationId),
          gt(adminAuthEmailOutbox.expiresAt, now),
          lt(adminAuthEmailOutbox.attempts, 10),
          eligible,
        ),
      )
      .returning({ id: adminAuthEmailOutbox.id }),
  ]);
  const claimed = claimResults[3];

  return claimed.length === 1
    ? {
        attempt: candidate.attempts + 1,
        encryptedToken: candidate.encryptedToken,
        eventId: candidate.eventId,
        idempotencyKey: candidate.idempotencyKey,
        kind: candidate.kind,
        recipient: candidate.recipient,
      }
    : null;
}

export async function completeAdminAuthEmail(
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
  const context = contextQueries(
    database,
    { organizationId: input.organizationId, userId: "" },
    "",
  );
  const results = await database.batch([
    ...context,
    database
      .update(adminAuthEmailOutbox)
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
          eq(adminAuthEmailOutbox.id, input.eventId),
          eq(adminAuthEmailOutbox.organizationId, input.organizationId),
          eq(adminAuthEmailOutbox.status, "processing"),
          eq(adminAuthEmailOutbox.lockedBy, input.workerId),
        ),
      )
      .returning({ id: adminAuthEmailOutbox.id }),
  ]);
  const result = results[3];

  return result.length === 1;
}

export async function failAdminAuthEmail(
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
  const context = contextQueries(
    database,
    { organizationId: input.organizationId, userId: "" },
    "",
  );
  const results = await database.batch([
    ...context,
    database
      .update(adminAuthEmailOutbox)
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
          eq(adminAuthEmailOutbox.id, input.eventId),
          eq(adminAuthEmailOutbox.organizationId, input.organizationId),
          eq(adminAuthEmailOutbox.status, "processing"),
          eq(adminAuthEmailOutbox.lockedBy, input.workerId),
        ),
      )
      .returning({ id: adminAuthEmailOutbox.id }),
  ]);
  const result = results[3];

  return result.length === 1;
}

export async function appendAdminAuditEvent(
  databaseUrl: string,
  input: AdminSessionIdentity & {
    action: string;
    requestId?: string;
    result: "denied" | "failure" | "success";
    role: StaffMembershipRole;
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
  const context = contextQueries(database, identity, "");
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
            from ${staffMemberships}
            where ${staffMemberships.organizationId} = ${identity.organizationId}
              and ${staffMemberships.userId} = ${identity.userId}
              and ${staffMemberships.status} = 'active'
              and ${staffMemberships.role} in ('owner', 'editor')
          )`,
        ),
      )
      .returning({
        stepUpVerifiedAt: adminSessionSecurity.stepUpVerifiedAt,
      }),
    database
      .select({
        role: staffMemberships.role,
      })
      .from(staffMemberships)
      .where(
        and(
          eq(staffMemberships.organizationId, identity.organizationId),
          eq(staffMemberships.userId, identity.userId),
          eq(staffMemberships.status, "active"),
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
    role: membership.role,
    session: {
      id: identity.sessionId,
    },
  };
}

export async function listOrganizationAdminSessions(
  databaseUrl: string,
  authorization: AdminAuthorizationContext,
  now = new Date(),
): Promise<AdminSessionSummary[]> {
  if (authorization.role !== "owner") {
    throw new Error("Only an owner may list organization sessions.");
  }

  const database = createDatabase(databaseUrl);
  const context = contextQueries(
    database,
    {
      organizationId: authorization.organizationId,
      userId: authorization.actor.id,
    },
    authorization.role,
  );
  const results = await database.batch([
    ...context,
    database
      .select({
        createdAt: authSession.createdAt,
        expiresAt: authSession.expiresAt,
        id: authSession.id,
        lastSeenAt: adminSessionSecurity.lastSeenAt,
        stepUpVerifiedAt: adminSessionSecurity.stepUpVerifiedAt,
        userAgent: authSession.userAgent,
        userEmail: authUser.email,
        userName: authUser.name,
      })
      .from(authSession)
      .innerJoin(
        adminSessionSecurity,
        and(
          eq(adminSessionSecurity.sessionId, authSession.id),
          eq(adminSessionSecurity.userId, authSession.userId),
        ),
      )
      .innerJoin(authUser, eq(authUser.id, authSession.userId))
      .innerJoin(
        staffMemberships,
        and(
          eq(staffMemberships.organizationId, authorization.organizationId),
          eq(staffMemberships.userId, authSession.userId),
          eq(staffMemberships.status, "active"),
          sql`${staffMemberships.role} in ('owner', 'editor')`,
        ),
      )
      .where(
        and(
          gt(authSession.expiresAt, now),
          isNull(adminSessionSecurity.revokedAt),
        ),
      )
      .orderBy(desc(adminSessionSecurity.lastSeenAt))
      .limit(50),
  ]);
  const inactivityCutoff = now.getTime() - inactivityLimitMs;

  return results[3].map((session) => ({
    ...session,
    isActive: session.lastSeenAt.getTime() > inactivityCutoff,
    isCurrent: session.id === authorization.session.id,
    userAgent: summarizeUserAgent(session.userAgent),
  }));
}

export async function rotateAdminSessionToken(
  databaseUrl: string,
  input: {
    authorization: AdminAuthorizationContext;
    newToken: string;
    requestId?: string;
    rotatedAt: Date;
    verifiedAt: Date;
  },
): Promise<{ expiresAt: Date } | null> {
  if (!/^[A-Za-z0-9_-]{43}$/.test(input.newToken)) {
    throw new Error("The replacement session token is invalid.");
  }

  const rotatedAtIso = input.rotatedAt.toISOString();
  const verifiedAtIso = input.verifiedAt.toISOString();
  const database = createDatabase(databaseUrl);
  const authorization = input.authorization;
  const context = contextQueries(
    database,
    {
      organizationId: authorization.organizationId,
      userId: authorization.actor.id,
    },
    authorization.role,
  );
  const results = await database.batch([
    ...context,
    database.execute<{ expiresAtEpochMs: string }>(sql`
      with rotated as (
        update ${authSession}
        set
          ${sql.identifier("token")} = ${input.newToken},
          ${sql.identifier("updated_at")} =
            timezone('UTC', ${rotatedAtIso}::timestamptz)
        where ${authSession.id} = ${authorization.session.id}
          and ${authSession.userId} = ${authorization.actor.id}
          and ${authSession.expiresAt} >
            timezone('UTC', ${rotatedAtIso}::timestamptz)
          and exists (
            select 1
            from ${adminSessionSecurity}
            where ${adminSessionSecurity.sessionId} = ${authorization.session.id}
              and ${adminSessionSecurity.userId} = ${authorization.actor.id}
              and ${adminSessionSecurity.revokedAt} is null
              and ${adminSessionSecurity.stepUpVerifiedAt} =
                ${verifiedAtIso}::timestamptz
          )
        returning
          ${authSession.id},
          ${authSession.expiresAt}
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
          'auth.session_rotated',
          'session',
          rotated.${sql.identifier("id")},
          ${input.requestId ?? null},
          jsonb_build_object('result', 'success')
        from rotated
        returning "target_id"
      )
      select
        floor(
          extract(
            epoch from rotated.${sql.identifier("expires_at")} at time zone 'UTC'
          ) * 1000
        )::bigint::text as "expiresAtEpochMs"
      from rotated
      inner join audited
        on audited.${sql.identifier("target_id")} = rotated.${sql.identifier("id")}
    `),
  ]);

  const result = results[3].rows[0];

  if (!result) {
    return null;
  }

  const expiresAtEpochMs = Number(result.expiresAtEpochMs);

  if (!Number.isFinite(expiresAtEpochMs)) {
    throw new Error("The rotated session expiry is invalid.");
  }

  return { expiresAt: new Date(expiresAtEpochMs) };
}

export async function revokeOrganizationAdminSession(
  databaseUrl: string,
  input: {
    authorization: AdminAuthorizationContext;
    requestId?: string;
    targetSessionId: string;
  },
): Promise<boolean> {
  const authorization = input.authorization;

  if (
    authorization.role !== "owner" ||
    input.targetSessionId === authorization.session.id ||
    input.targetSessionId.length < 8 ||
    input.targetSessionId.length > 128
  ) {
    return false;
  }

  const database = createDatabase(databaseUrl);
  const context = contextQueries(
    database,
    {
      organizationId: authorization.organizationId,
      userId: authorization.actor.id,
    },
    authorization.role,
  );
  const results = await database.batch([
    ...context,
    database.execute<{ targetId: string }>(sql`
      with revoked as (
        delete from ${authSession}
        where ${authSession.id} = ${input.targetSessionId}
          and ${authSession.id} <> ${authorization.session.id}
          and exists (
            select 1
            from ${staffMemberships}
            where ${staffMemberships.organizationId} = ${authorization.organizationId}
              and ${staffMemberships.userId} = ${authSession.userId}
              and ${staffMemberships.status} = 'active'
              and ${staffMemberships.role} in ('owner', 'editor')
          )
        returning ${authSession.id}
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
          'auth.session_revoked_by_owner',
          'session',
          revoked.${sql.identifier("id")},
          ${input.requestId ?? null},
          jsonb_build_object('result', 'success')
        from revoked
        returning "target_id"
      )
      select audited.${sql.identifier("target_id")} as "targetId"
      from audited
    `),
  ]);

  return results[3].rows[0]?.targetId === input.targetSessionId;
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
      ${sql.identifier("user_id")},
      ${sql.identifier("failed_attempts")},
      ${sql.identifier("updated_at")}
    )
    values (${userId}, 1, ${failedAt})
    on conflict (${sql.identifier("user_id")}) do update
    set
      ${sql.identifier("failed_attempts")} = case
        when ${adminTotpSecurity.lockedUntil} is not null
          and ${adminTotpSecurity.lockedUntil} <= ${failedAt}
          then 1
        when ${adminTotpSecurity.lockedUntil} is not null
          and ${adminTotpSecurity.lockedUntil} > ${failedAt}
          then ${adminTotpSecurity.failedAttempts}
        else ${adminTotpSecurity.failedAttempts} + 1
      end,
      ${sql.identifier("locked_until")} = case
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
      ${sql.identifier("updated_at")} = ${failedAt}
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
        ${sql.identifier("user_id")},
        ${sql.identifier("last_accepted_counter")},
        ${sql.identifier("failed_attempts")},
        ${sql.identifier("locked_until")},
        ${sql.identifier("updated_at")}
      )
      values (${input.userId}, ${input.counter}, 0, null, ${verifiedAt})
      on conflict (${sql.identifier("user_id")}) do update
      set
        ${sql.identifier("last_accepted_counter")} = excluded.${sql.identifier("last_accepted_counter")},
        ${sql.identifier("failed_attempts")} = 0,
        ${sql.identifier("locked_until")} = null,
        ${sql.identifier("updated_at")} = excluded.${sql.identifier("updated_at")}
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
      ${sql.identifier("last_seen_at")} = ${verifiedAt},
      ${sql.identifier("step_up_verified_at")} = ${verifiedAt}
    where ${adminSessionSecurity.sessionId} = ${input.sessionId}
      and ${adminSessionSecurity.userId} = ${input.userId}
      and ${adminSessionSecurity.revokedAt} is null
      and exists (select 1 from accepted_counter)
    returning ${adminSessionSecurity.sessionId} as "sessionId"
  `);

  return result.rows.length === 1;
}

export async function setAdminSessionStepUp(
  databaseUrl: string,
  input: Omit<AdminSessionIdentity, "organizationId" | "stepUpVerifiedAt">,
  verifiedAt: Date,
): Promise<boolean> {
  const database = createDatabase(databaseUrl);
  const result = await database.execute<{ sessionId: string }>(sql`
    update ${adminSessionSecurity}
    set
      ${sql.identifier("last_seen_at")} = ${verifiedAt},
      ${sql.identifier("step_up_verified_at")} = ${verifiedAt}
    where ${adminSessionSecurity.sessionId} = ${input.sessionId}
      and ${adminSessionSecurity.userId} = ${input.userId}
      and ${adminSessionSecurity.revokedAt} is null
      and exists (
        select 1
        from ${authSession}
        where ${authSession.id} = ${input.sessionId}
          and ${authSession.userId} = ${input.userId}
          and ${authSession.expiresAt} > now()
      )
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

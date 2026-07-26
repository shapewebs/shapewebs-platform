import "server-only";

import { and, asc, eq, gt, gte, lt, lte, or, sql } from "drizzle-orm";

import type { AdminAuthorizationContext } from "./admin-auth";
import { createDatabase } from "./client";
import {
  customerAccount,
  customerAuthEmailOutbox,
  customerSession,
  customerSessionSecurity,
} from "./schema";

const customerInactivityLimitMs = 24 * 60 * 60 * 1_000;

export type CustomerInvitationReceipt = {
  email: string;
  invitationId: string;
  name: string;
  organizationId: string;
};

export type CustomerRegistrationReceipt = {
  invitationId: string;
  organizationId: string;
  userId: string;
};

export type CustomerAuthorizationContext = {
  actor: {
    id: string;
    type: "customer";
  };
  organizationId: string;
  role: "customer";
  session: {
    id: string;
  };
};

export type ClaimedCustomerAuthEmail = {
  attempt: number;
  encryptedToken: string;
  eventId: string;
  idempotencyKey: string;
  kind: "email_verification" | "invitation" | "password_reset";
  recipient: string;
};

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

export async function createCustomerInvitation(
  databaseUrl: string,
  input: {
    authorization: AdminAuthorizationContext;
    email: string;
    encryptedToken: string;
    expiresAt: Date;
    idempotencyKey: string;
    name: string;
    projectIds: string[];
    tokenHash: string;
  },
): Promise<{ invitationId: string }> {
  if (input.authorization.role !== "owner") {
    throw new Error("Only an owner may invite a customer.");
  }

  const database = createDatabase(databaseUrl);
  const results = await database.batch([
    ...adminContextQueries(database, input.authorization),
    database.execute<{ invitationId: string }>(sql`
      select app.create_customer_invitation(
        ${input.authorization.organizationId}::uuid,
        ${input.authorization.actor.id},
        ${input.email},
        ${input.name},
        ${input.tokenHash},
        ${input.encryptedToken},
        ${input.idempotencyKey},
        ${input.expiresAt}::timestamptz,
        ${input.projectIds}::uuid[]
      )::text as "invitationId"
    `),
  ]);
  const invitation = results[3].rows[0];

  if (!invitation) {
    throw new Error("The customer invitation was not committed.");
  }

  return invitation;
}

export async function exchangeCustomerInvitationToken(
  databaseUrl: string,
  input: {
    invitationTokenHash: string;
    registrationGrantExpiresAt: Date;
    registrationGrantHash: string;
  },
): Promise<CustomerInvitationReceipt | null> {
  const database = createDatabase(databaseUrl);
  const result = await database.execute<{
    email: string;
    invitationId: string;
    invitedName: string;
    organizationId: string;
  }>(sql`
    select
      invitation_id::text as "invitationId",
      organization_id::text as "organizationId",
      email,
      invited_name as "invitedName"
    from app.exchange_customer_invitation_token(
      ${input.invitationTokenHash},
      ${input.registrationGrantHash},
      ${input.registrationGrantExpiresAt}::timestamptz
    )
  `);
  const receipt = result.rows[0];

  return receipt
    ? {
        email: receipt.email,
        invitationId: receipt.invitationId,
        name: receipt.invitedName,
        organizationId: receipt.organizationId,
      }
    : null;
}

export async function customerRegistrationGrantMatches(
  databaseUrl: string,
  input: { email: string; registrationGrantHash: string },
): Promise<boolean> {
  const database = createDatabase(databaseUrl);
  const result = await database.execute<{ matches: boolean }>(sql`
    select app.customer_registration_grant_matches(
      ${input.email},
      ${input.registrationGrantHash}
    ) as matches
  `);

  return result.rows[0]?.matches === true;
}

export async function registerCustomerWithPassword(
  databaseUrl: string,
  input: {
    accountId: string;
    email: string;
    encryptedVerificationToken: string;
    name: string;
    passwordHash: string;
    registrationGrantHash: string;
    userId: string;
    verificationExpiresAt: Date;
    verificationIdempotencyKey: string;
    verificationTokenHash: string;
  },
): Promise<CustomerRegistrationReceipt | null> {
  const database = createDatabase(databaseUrl);
  const result = await database.execute<CustomerRegistrationReceipt>(sql`
    select
      user_id as "userId",
      invitation_id::text as "invitationId",
      organization_id::text as "organizationId"
    from app.register_customer_with_password(
      ${input.email},
      ${input.name},
      ${input.registrationGrantHash},
      ${input.userId},
      ${input.accountId},
      ${input.passwordHash},
      ${input.verificationTokenHash},
      ${input.encryptedVerificationToken},
      ${input.verificationIdempotencyKey},
      ${input.verificationExpiresAt}::timestamptz
    )
  `);

  return result.rows[0] ?? null;
}

export async function completeCustomerPasswordRegistration(
  databaseUrl: string,
  input: { finalPasswordHash: string; verificationTokenHash: string },
): Promise<{ organizationId: string; userId: string } | null> {
  const database = createDatabase(databaseUrl);
  const result = await database.execute<{
    organizationId: string;
    userId: string;
  }>(sql`
    select
      user_id as "userId",
      organization_id::text as "organizationId"
    from app.complete_customer_password_registration(
      ${input.verificationTokenHash},
      ${input.finalPasswordHash}
    )
  `);

  return result.rows[0] ?? null;
}

export async function acceptCustomerGoogleInvitation(
  databaseUrl: string,
  input: { registrationGrantHash: string; userId: string },
): Promise<{ organizationId: string; userId: string } | null> {
  const database = createDatabase(databaseUrl);
  const result = await database.execute<{
    organizationId: string;
    userId: string;
  }>(sql`
    select
      user_id as "userId",
      organization_id::text as "organizationId"
    from app.accept_customer_google_invitation(
      ${input.userId},
      ${input.registrationGrantHash}
    )
  `);

  return result.rows[0] ?? null;
}

export async function customerHasActiveMembership(
  databaseUrl: string,
  userId: string,
): Promise<boolean> {
  const database = createDatabase(databaseUrl);
  const result = await database.execute<{ active: boolean }>(sql`
    select app.customer_has_active_membership(${userId}) as active
  `);

  return result.rows[0]?.active === true;
}

export async function getCustomerAuthenticationMethods(
  databaseUrl: string,
  userId: string,
): Promise<{ google: boolean; password: boolean }> {
  const database = createDatabase(databaseUrl);
  const accounts = await database
    .select({ providerId: customerAccount.providerId })
    .from(customerAccount)
    .where(
      and(
        eq(customerAccount.userId, userId),
        sql`app.customer_has_active_membership(${userId})`,
      ),
    );
  const providers = new Set(accounts.map((account) => account.providerId));

  return {
    google: providers.has("google"),
    password: providers.has("credential"),
  };
}

export async function getCustomerCredentialPasswordHash(
  databaseUrl: string,
  userId: string,
): Promise<string | null> {
  const database = createDatabase(databaseUrl);
  const result = await database
    .select({ password: customerAccount.password })
    .from(customerAccount)
    .where(
      and(
        eq(customerAccount.userId, userId),
        eq(customerAccount.providerId, "credential"),
        sql`app.customer_has_active_membership(${userId})`,
      ),
    )
    .limit(1);

  return result[0]?.password ?? null;
}

export async function provisionCustomerSessionSecurity(
  databaseUrl: string,
  input: { sessionId: string; userId: string },
): Promise<void> {
  const database = createDatabase(databaseUrl);

  await database
    .insert(customerSessionSecurity)
    .values({ sessionId: input.sessionId, userId: input.userId })
    .onConflictDoNothing();
}

export async function authorizeCustomerSession(
  databaseUrl: string,
  input: { sessionId: string; userId: string },
  now = new Date(),
): Promise<CustomerAuthorizationContext | null> {
  const database = createDatabase(databaseUrl);
  const inactivityCutoff = new Date(now.getTime() - customerInactivityLimitMs);
  const result = await database.execute<{
    organizationId: string;
    sessionId: string;
    userId: string;
  }>(sql`
    with authorized_session as (
      update ${customerSessionSecurity}
      set
        last_seen_at = ${now},
        updated_at = ${now}
      where session_id = ${input.sessionId}
        and user_id = ${input.userId}
        and revoked_at is null
        and last_seen_at > ${inactivityCutoff}
        and exists (
          select 1
          from ${customerSession}
          where ${customerSession.id} = ${input.sessionId}
            and ${customerSession.userId} = ${input.userId}
            and ${customerSession.expiresAt} > ${now}
        )
        and app.customer_has_active_membership(${input.userId})
      returning session_id, user_id
    )
    select
      authorized_session.session_id as "sessionId",
      authorized_session.user_id as "userId",
      membership.organization_id::text as "organizationId"
    from authorized_session
    inner join app.customer_memberships as membership
      on membership.user_id = authorized_session.user_id
      and membership.status = 'active'
    order by membership.organization_id
    limit 2
  `);

  if (result.rows.length !== 1 || !result.rows[0]) {
    return null;
  }

  return {
    actor: { id: result.rows[0].userId, type: "customer" },
    organizationId: result.rows[0].organizationId,
    role: "customer",
    session: { id: result.rows[0].sessionId },
  };
}

export async function enqueueCustomerAuthEmail(
  databaseUrl: string,
  input: {
    encryptedToken: string;
    expiresAt: Date;
    idempotencyKey: string;
    kind: "password_reset";
    organizationId: string;
    recipient: string;
    tokenHash: string;
    userId: string;
  },
): Promise<void> {
  const database = createDatabase(databaseUrl);

  await database
    .insert(customerAuthEmailOutbox)
    .values(input)
    .onConflictDoNothing({ target: customerAuthEmailOutbox.idempotencyKey });
}

export async function claimCustomerAuthEmail(
  databaseUrl: string,
  input: { organizationId: string; workerId: string },
  now = new Date(),
): Promise<ClaimedCustomerAuthEmail | null> {
  const database = createDatabase(databaseUrl);
  const staleLockCutoff = new Date(now.getTime() - 5 * 60 * 1_000);
  const uncertainDeliveryCutoff = new Date(
    now.getTime() - 23 * 60 * 60 * 1_000,
  );
  const eligible = or(
    and(
      eq(customerAuthEmailOutbox.status, "pending"),
      lte(customerAuthEmailOutbox.nextAttemptAt, now),
    ),
    and(
      eq(customerAuthEmailOutbox.status, "processing"),
      lt(customerAuthEmailOutbox.lockedAt, staleLockCutoff),
      gt(customerAuthEmailOutbox.lockedAt, uncertainDeliveryCutoff),
    ),
  );

  await database
    .update(customerAuthEmailOutbox)
    .set({
      lastErrorCode: sql`case
        when ${customerAuthEmailOutbox.expiresAt} <= ${now}
          then 'auth_token_expired'
        when ${customerAuthEmailOutbox.attempts} >= 10
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
        eq(customerAuthEmailOutbox.organizationId, input.organizationId),
        or(
          lte(customerAuthEmailOutbox.expiresAt, now),
          gte(customerAuthEmailOutbox.attempts, 10),
          and(
            eq(customerAuthEmailOutbox.status, "processing"),
            lte(customerAuthEmailOutbox.lockedAt, uncertainDeliveryCutoff),
          ),
        ),
        or(
          eq(customerAuthEmailOutbox.status, "pending"),
          eq(customerAuthEmailOutbox.status, "processing"),
        ),
      ),
    );

  const candidates = await database
    .select({
      attempts: customerAuthEmailOutbox.attempts,
      encryptedToken: customerAuthEmailOutbox.encryptedToken,
      eventId: customerAuthEmailOutbox.id,
      idempotencyKey: customerAuthEmailOutbox.idempotencyKey,
      kind: customerAuthEmailOutbox.kind,
      recipient: customerAuthEmailOutbox.recipient,
    })
    .from(customerAuthEmailOutbox)
    .where(
      and(
        eq(customerAuthEmailOutbox.organizationId, input.organizationId),
        gt(customerAuthEmailOutbox.expiresAt, now),
        lt(customerAuthEmailOutbox.attempts, 10),
        eligible,
      ),
    )
    .orderBy(asc(customerAuthEmailOutbox.createdAt))
    .limit(1);
  const candidate = candidates[0];

  if (!candidate) {
    return null;
  }

  const claimed = await database
    .update(customerAuthEmailOutbox)
    .set({
      attempts: sql`${customerAuthEmailOutbox.attempts} + 1`,
      lockedAt: now,
      lockedBy: input.workerId,
      status: "processing",
      updatedAt: now,
    })
    .where(
      and(
        eq(customerAuthEmailOutbox.id, candidate.eventId),
        eq(customerAuthEmailOutbox.organizationId, input.organizationId),
        gt(customerAuthEmailOutbox.expiresAt, now),
        lt(customerAuthEmailOutbox.attempts, 10),
        eligible,
      ),
    )
    .returning({ id: customerAuthEmailOutbox.id });

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

export async function completeCustomerAuthEmail(
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
  const result = await database
    .update(customerAuthEmailOutbox)
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
        eq(customerAuthEmailOutbox.id, input.eventId),
        eq(customerAuthEmailOutbox.organizationId, input.organizationId),
        eq(customerAuthEmailOutbox.status, "processing"),
        eq(customerAuthEmailOutbox.lockedBy, input.workerId),
      ),
    )
    .returning({ id: customerAuthEmailOutbox.id });

  return result.length === 1;
}

export async function failCustomerAuthEmail(
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
  const result = await database
    .update(customerAuthEmailOutbox)
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
        eq(customerAuthEmailOutbox.id, input.eventId),
        eq(customerAuthEmailOutbox.organizationId, input.organizationId),
        eq(customerAuthEmailOutbox.status, "processing"),
        eq(customerAuthEmailOutbox.lockedBy, input.workerId),
      ),
    )
    .returning({ id: customerAuthEmailOutbox.id });

  return result.length === 1;
}

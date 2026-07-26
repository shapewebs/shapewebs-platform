import "server-only";

import { and, eq, gt, isNull, sql } from "drizzle-orm";

import type { AdminAuthorizationContext } from "./admin-auth";
import { createDatabase } from "./client";
import {
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
): Promise<boolean> {
  const database = createDatabase(databaseUrl);
  const inactivityCutoff = new Date(now.getTime() - customerInactivityLimitMs);
  const result = await database
    .update(customerSessionSecurity)
    .set({ lastSeenAt: now, updatedAt: now })
    .where(
      and(
        eq(customerSessionSecurity.sessionId, input.sessionId),
        eq(customerSessionSecurity.userId, input.userId),
        isNull(customerSessionSecurity.revokedAt),
        gt(customerSessionSecurity.lastSeenAt, inactivityCutoff),
        sql`exists (
          select 1
          from ${customerSession}
          where ${customerSession.id} = ${input.sessionId}
            and ${customerSession.userId} = ${input.userId}
            and ${customerSession.expiresAt} > ${now}
        )`,
        sql`app.customer_has_active_membership(${input.userId})`,
      ),
    )
    .returning({ sessionId: customerSessionSecurity.sessionId });

  return result.length === 1;
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

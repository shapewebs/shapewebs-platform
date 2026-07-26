import { and, eq, sql } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  claimAdminAuthEmail,
  completeAdminAuthEmail,
  consumeAdminTotpCounter,
  enqueueAdminAuthEmail,
  getAdminAuthEmailRequestCooldown,
  getAdminAuthenticationMethods,
  getAdminCredentialPasswordHash,
  recordAdminTotpFailure,
  rotateAdminSessionToken,
  setAdminSessionStepUp,
} from "../src/admin-auth";
import { createDatabase } from "../src/client";
import {
  adminSessionSecurity,
  adminTotpSecurity,
  adminAuthEmailOutbox,
  account,
  auditEvents,
  session,
} from "../src/schema";

const databaseUrl = process.env.DATABASE_ADMIN_URL;
const fixtureDatabaseUrl = process.env.DATABASE_OWNER_URL;

if (!databaseUrl || !fixtureDatabaseUrl) {
  throw new Error(
    "DATABASE_ADMIN_URL and DATABASE_OWNER_URL are required for the admin-auth integration test.",
  );
}

const database = createDatabase(fixtureDatabaseUrl);
const runtimeDatabase = createDatabase(databaseUrl);
const sessionId = "lifecycle-admin-auth-integration-session";
const sessionToken = "lifecycle-admin-auth-integration-token";
const userId = "lifecycle-owner";
const organizationId = "10000000-0000-4000-8000-000000000001";
const googleAccountId = "lifecycle-admin-google-method";
const credentialAccountId = "lifecycle-admin-password-method";
const authEmailIdempotencyKey =
  "admin.password_reset/lifecycle-admin-auth-integration";

async function removeFixture() {
  await database
    .delete(adminAuthEmailOutbox)
    .where(eq(adminAuthEmailOutbox.idempotencyKey, authEmailIdempotencyKey));
  await database.delete(account).where(eq(account.id, googleAccountId));
  await database.delete(account).where(eq(account.id, credentialAccountId));
  await database.delete(auditEvents).where(eq(auditEvents.targetId, sessionId));
  await database
    .delete(adminTotpSecurity)
    .where(eq(adminTotpSecurity.userId, userId));
  await database.delete(session).where(eq(session.id, sessionId));
}

describe.sequential("Neon administrative TOTP repository", () => {
  beforeEach(async () => {
    await removeFixture();
    const now = new Date();

    await database.insert(session).values({
      createdAt: now,
      expiresAt: new Date(now.getTime() + 60 * 60 * 1_000),
      id: sessionId,
      token: sessionToken,
      updatedAt: now,
      userId,
    });
    await database.insert(adminSessionSecurity).values({
      sessionId,
      userId,
    });
  });

  afterEach(removeFixture);

  it("records failures and atomically consumes each TOTP counter once", async () => {
    const failedAt = new Date("2026-07-25T20:00:00.000Z");

    await recordAdminTotpFailure(databaseUrl, userId, failedAt);

    await expect(
      database
        .select({
          failedAttempts: adminTotpSecurity.failedAttempts,
          updatedAt: adminTotpSecurity.updatedAt,
        })
        .from(adminTotpSecurity)
        .where(eq(adminTotpSecurity.userId, userId))
        .limit(1),
    ).resolves.toEqual([
      {
        failedAttempts: 1,
        updatedAt: failedAt,
      },
    ]);

    const verifiedAt = new Date("2026-07-25T20:00:30.000Z");

    await expect(
      consumeAdminTotpCounter(
        databaseUrl,
        {
          counter: 42,
          sessionId,
          userId,
        },
        verifiedAt,
      ),
    ).resolves.toBe(true);
    await expect(
      consumeAdminTotpCounter(
        databaseUrl,
        {
          counter: 42,
          sessionId,
          userId,
        },
        verifiedAt,
      ),
    ).resolves.toBe(false);

    await expect(
      database
        .select({
          failedAttempts: adminTotpSecurity.failedAttempts,
          lastAcceptedCounter: adminTotpSecurity.lastAcceptedCounter,
          stepUpVerifiedAt: adminSessionSecurity.stepUpVerifiedAt,
        })
        .from(adminTotpSecurity)
        .innerJoin(
          adminSessionSecurity,
          and(
            eq(adminSessionSecurity.userId, adminTotpSecurity.userId),
            eq(adminSessionSecurity.sessionId, sessionId),
          ),
        )
        .where(eq(adminTotpSecurity.userId, userId))
        .limit(1),
    ).resolves.toEqual([
      {
        failedAttempts: 0,
        lastAcceptedCounter: 42,
        stepUpVerifiedAt: verifiedAt,
      },
    ]);
  });

  it("rotates an accepted session token without extending its absolute expiry", async () => {
    const verifiedAt = new Date("2026-07-25T20:01:00.000Z");
    const rotatedAt = new Date("2026-07-25T20:01:01.000Z");

    await expect(
      consumeAdminTotpCounter(
        databaseUrl,
        {
          counter: 43,
          sessionId,
          userId,
        },
        verifiedAt,
      ),
    ).resolves.toBe(true);

    const [originalSession] = await database
      .select({ expiresAt: session.expiresAt })
      .from(session)
      .where(eq(session.id, sessionId))
      .limit(1);

    await expect(
      rotateAdminSessionToken(databaseUrl, {
        authorization: {
          actor: { id: userId },
          latestStepUpAt: verifiedAt,
          organizationId,
          role: "owner",
          session: { id: sessionId },
        },
        newToken: "r".repeat(43),
        requestId: "admin-auth-rotation-integration",
        rotatedAt,
        verifiedAt,
      }),
    ).resolves.toEqual({
      expiresAt: originalSession?.expiresAt,
    });

    await expect(
      database
        .select({
          expiresAt: session.expiresAt,
          token: session.token,
          updatedAt: session.updatedAt,
        })
        .from(session)
        .where(eq(session.id, sessionId))
        .limit(1),
    ).resolves.toEqual([
      {
        expiresAt: originalSession?.expiresAt,
        token: "r".repeat(43),
        updatedAt: rotatedAt,
      },
    ]);

    await expect(
      database
        .select({
          action: auditEvents.action,
          requestId: auditEvents.requestId,
        })
        .from(auditEvents)
        .where(eq(auditEvents.targetId, sessionId)),
    ).resolves.toEqual([
      {
        action: "auth.session_rotated",
        requestId: "admin-auth-rotation-integration",
      },
    ]);
  });

  it("transfers an exact TOTP step-up to a valid replacement session", async () => {
    const verifiedAt = new Date();
    const [candidate] = await database
      .select({
        expiresAt: session.expiresAt,
        revokedAt: adminSessionSecurity.revokedAt,
        securitySessionId: adminSessionSecurity.sessionId,
        sessionId: session.id,
        userId: adminSessionSecurity.userId,
      })
      .from(adminSessionSecurity)
      .innerJoin(session, eq(session.id, adminSessionSecurity.sessionId))
      .where(eq(adminSessionSecurity.sessionId, sessionId))
      .limit(1);

    expect(candidate).toMatchObject({
      revokedAt: null,
      securitySessionId: sessionId,
      sessionId,
      userId,
    });
    expect(candidate?.expiresAt.getTime()).toBeGreaterThan(
      verifiedAt.getTime(),
    );
    const runtimeCandidate = await runtimeDatabase.execute<{
      active: boolean;
      revokedAt: Date | null;
      securitySessionId: string;
      sessionId: string;
      userId: string;
    }>(sql`
      select
        security.${sql.identifier("session_id")} as "securitySessionId",
        security.${sql.identifier("user_id")} as "userId",
        security.${sql.identifier("revoked_at")} as "revokedAt",
        session.${sql.identifier("id")} as "sessionId",
        session.${sql.identifier("expires_at")} > now() as "active"
      from ${adminSessionSecurity} as security
      inner join ${session} as session
        on session.${sql.identifier("id")} =
          security.${sql.identifier("session_id")}
      where security.${sql.identifier("session_id")} = ${sessionId}
    `);

    expect(runtimeCandidate.rows).toEqual([
      {
        active: true,
        revokedAt: null,
        securitySessionId: sessionId,
        sessionId,
        userId,
      },
    ]);

    await expect(
      setAdminSessionStepUp(databaseUrl, { sessionId, userId }, verifiedAt),
    ).resolves.toBe(true);
    await expect(
      setAdminSessionStepUp(
        databaseUrl,
        { sessionId: "missing-admin-session", userId },
        verifiedAt,
      ),
    ).resolves.toBe(false);

    await expect(
      database
        .select({ stepUpVerifiedAt: adminSessionSecurity.stepUpVerifiedAt })
        .from(adminSessionSecurity)
        .where(eq(adminSessionSecurity.sessionId, sessionId)),
    ).resolves.toEqual([{ stepUpVerifiedAt: verifiedAt }]);
  });

  it("reports both attached login methods without returning credential data", async () => {
    const now = new Date();
    await database.insert(account).values([
      {
        accountId: "google-subject",
        id: googleAccountId,
        providerId: "google",
        updatedAt: now,
        userId,
      },
      {
        accountId: userId,
        id: credentialAccountId,
        password: "stored-lifecycle-password-hash",
        providerId: "credential",
        updatedAt: now,
        userId,
      },
    ]);

    await expect(
      getAdminAuthenticationMethods(databaseUrl, userId),
    ).resolves.toEqual({ google: true, password: true });
    await expect(
      getAdminCredentialPasswordHash(databaseUrl, userId),
    ).resolves.toBe("stored-lifecycle-password-hash");
  });

  it("delivers each durable administrative auth email claim once", async () => {
    const tokenHash = "a".repeat(64);
    await enqueueAdminAuthEmail(databaseUrl, {
      encryptedToken: "e".repeat(64),
      expiresAt: new Date(Date.now() + 60 * 60 * 1_000),
      idempotencyKey: authEmailIdempotencyKey,
      kind: "password_reset",
      organizationId,
      recipient: "lifecycle-owner@example.test",
      tokenHash,
      userId,
    });
    await enqueueAdminAuthEmail(databaseUrl, {
      encryptedToken: "e".repeat(64),
      expiresAt: new Date(Date.now() + 60 * 60 * 1_000),
      idempotencyKey: authEmailIdempotencyKey,
      kind: "password_reset",
      organizationId,
      recipient: "lifecycle-owner@example.test",
      tokenHash,
      userId,
    });

    const claimed = await claimAdminAuthEmail(databaseUrl, {
      organizationId,
      workerId: "lifecycle-admin-auth-worker",
    });
    expect(claimed).toMatchObject({
      attempt: 1,
      idempotencyKey: authEmailIdempotencyKey,
      kind: "password_reset",
    });
    expect(claimed).not.toBeNull();

    await expect(
      completeAdminAuthEmail(databaseUrl, {
        eventId: claimed?.eventId ?? "",
        organizationId,
        providerMessageId: "lifecycle-resend-message",
        workerId: "lifecycle-admin-auth-worker",
      }),
    ).resolves.toBe(true);
    await expect(
      claimAdminAuthEmail(databaseUrl, {
        organizationId,
        workerId: "second-lifecycle-worker",
      }),
    ).resolves.toBeNull();

    const requestedAt = new Date();
    const authorization = {
      actor: { id: userId },
      latestStepUpAt: requestedAt,
      organizationId,
      role: "owner" as const,
      session: { id: sessionId },
    };

    const cooldown = await getAdminAuthEmailRequestCooldown(
      databaseUrl,
      authorization,
      "password_reset",
      requestedAt,
    );
    expect(cooldown?.retryAfterSeconds).toBeGreaterThan(0);
    expect(cooldown?.retryAfterSeconds).toBeLessThanOrEqual(300);
    await expect(
      getAdminAuthEmailRequestCooldown(
        databaseUrl,
        authorization,
        "password_reset",
        new Date(requestedAt.getTime() + 5 * 60 * 1_000 + 1),
      ),
    ).resolves.toBeNull();
  });
});

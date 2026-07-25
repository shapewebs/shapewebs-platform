import { and, eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  consumeAdminTotpCounter,
  recordAdminTotpFailure,
  rotateAdminSessionToken,
} from "../src/admin-auth";
import { createDatabase } from "../src/client";
import {
  adminSessionSecurity,
  adminTotpSecurity,
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
const sessionId = "lifecycle-admin-auth-integration-session";
const sessionToken = "lifecycle-admin-auth-integration-token";
const userId = "lifecycle-owner";

async function removeFixture() {
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
          organizationId: "10000000-0000-4000-8000-000000000001",
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
});

import { and, eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  consumeAdminTotpCounter,
  recordAdminTotpFailure,
} from "../src/admin-auth";
import { createDatabase } from "../src/client";
import {
  adminSessionSecurity,
  adminTotpSecurity,
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
});

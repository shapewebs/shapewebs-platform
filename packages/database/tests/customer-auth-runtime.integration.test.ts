import { and, eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createShapewebsAuth } from "../../auth/src/create-auth";
import { hashCustomerPassword } from "../../auth/src/customer-password";
import { authorizeCustomerSession } from "../src/customer-auth";
import { createDatabase } from "../src/client";
import { unifiedCustomerSessionSecurity } from "../src/schema/admin-auth";
import { account, session } from "../src/schema/auth";

const adminDatabaseUrl = process.env.DATABASE_ADMIN_URL;
const customerDatabaseUrl = process.env.DATABASE_CUSTOMER_URL;

if (!adminDatabaseUrl || !customerDatabaseUrl) {
  throw new Error(
    "DATABASE_ADMIN_URL and DATABASE_CUSTOMER_URL are required for the unified customer auth integration test.",
  );
}

const database = createDatabase(adminDatabaseUrl);
const baseUrl = "http://localhost:3001";
const customerId = "lifecycle-customer";
const credentialAccountId = "lifecycle-customer-credential-account";
const organizationId = "10000000-0000-4000-8000-000000000001";
const password = "lifecycle customer passphrase 2026";
const auth = createShapewebsAuth({
  baseUrl,
  customerDatabaseUrl,
  databaseUrl: adminDatabaseUrl,
  editorEmails: [],
  emailEncryptionSecret: "lifecycle-customer-email-encryption-secret-value",
  organizationId,
  ownerEmails: ["lifecycle-owner@example.test"],
  production: false,
  secret: "lifecycle-customer-better-auth-secret-value",
  trustedOrigins: [baseUrl],
});

let sessionId = "";

beforeAll(async () => {
  const passwordHash = await hashCustomerPassword(password);

  await database
    .insert(account)
    .values({
      accountId: customerId,
      id: credentialAccountId,
      password: passwordHash,
      providerId: "credential",
      updatedAt: new Date(),
      userId: customerId,
    })
    .onConflictDoUpdate({
      set: {
        password: passwordHash,
        updatedAt: new Date(),
      },
      target: account.id,
    });
});

afterAll(async () => {
  await database.batch([
    database.delete(session).where(eq(session.userId, customerId)),
    database.delete(account).where(eq(account.id, credentialAccountId)),
  ]);
});

describe.sequential("customer Better Auth runtime", () => {
  it("does not issue a session for an invalid credential", async () => {
    const response = await auth.handler(
      new Request(`${baseUrl}/api/auth/sign-in/email`, {
        body: JSON.stringify({
          email: "lifecycle-customer@example.test",
          password: "incorrect lifecycle password",
        }),
        headers: {
          "Content-Type": "application/json",
          Origin: baseUrl,
        },
        method: "POST",
      }),
    );

    expect(response.status).toBe(401);
    const sessions = await database
      .select({ id: session.id })
      .from(session)
      .where(eq(session.userId, customerId));
    expect(sessions).toEqual([]);
  });

  it("issues one canonical fixed session for an active invited customer", async () => {
    const response = await auth.handler(
      new Request(`${baseUrl}/api/auth/sign-in/email`, {
        body: JSON.stringify({
          email: "lifecycle-customer@example.test",
          password,
          rememberMe: true,
        }),
        headers: {
          "Content-Type": "application/json",
          Origin: baseUrl,
        },
        method: "POST",
      }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toContain(
      "shapewebs.session_token=",
    );

    const sessions = await database
      .select({
        id: session.id,
        lastSeenAt: unifiedCustomerSessionSecurity.lastSeenAt,
        revokedAt: unifiedCustomerSessionSecurity.revokedAt,
        token: session.token,
      })
      .from(session)
      .innerJoin(
        unifiedCustomerSessionSecurity,
        eq(unifiedCustomerSessionSecurity.sessionId, session.id),
      )
      .where(eq(session.userId, customerId));
    expect(sessions).toHaveLength(1);
    expect(sessions[0]?.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(sessions[0]?.revokedAt).toBeNull();
    sessionId = sessions[0]?.id ?? "";

    await expect(
      authorizeCustomerSession(customerDatabaseUrl, {
        organizationId: "20000000-0000-4000-8000-000000000002",
        sessionId,
        userId: customerId,
      }),
    ).resolves.toBeNull();

    await expect(
      authorizeCustomerSession(customerDatabaseUrl, {
        organizationId,
        sessionId,
        userId: customerId,
      }),
    ).resolves.toMatchObject({
      actor: { id: customerId, type: "customer" },
      organizationId,
      role: "customer",
      session: { id: sessionId },
    });
  });

  it("fails closed after the 24-hour inactivity boundary", async () => {
    await database
      .update(unifiedCustomerSessionSecurity)
      .set({
        lastSeenAt: sql`now() - interval '25 hours'`,
      })
      .where(
        and(
          eq(unifiedCustomerSessionSecurity.sessionId, sessionId),
          eq(unifiedCustomerSessionSecurity.userId, customerId),
        ),
      );

    await expect(
      authorizeCustomerSession(customerDatabaseUrl, {
        organizationId,
        sessionId,
        userId: customerId,
      }),
    ).resolves.toBeNull();
  });
});

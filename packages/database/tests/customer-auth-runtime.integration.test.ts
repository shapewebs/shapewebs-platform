import { and, eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createShapewebsCustomerAuth } from "../../auth/src/create-customer-auth";
import { hashCustomerPassword } from "../../auth/src/customer-password";
import { authorizeCustomerSession } from "../src/customer-auth";
import { createDatabase } from "../src/client";
import {
  customerAccount,
  customerSession,
  customerSessionSecurity,
} from "../src/schema/customer-auth";

const databaseUrl = process.env.DATABASE_PORTAL_URL;

if (!databaseUrl) {
  throw new Error(
    "DATABASE_PORTAL_URL is required for the customer auth integration test.",
  );
}

const database = createDatabase(databaseUrl);
const baseUrl = "http://localhost:3002";
const customerId = "lifecycle-customer";
const credentialAccountId = "lifecycle-customer-credential-account";
const password = "lifecycle customer passphrase 2026";
const auth = createShapewebsCustomerAuth({
  baseUrl,
  databaseUrl,
  emailEncryptionSecret: "lifecycle-customer-email-encryption-secret-value",
  organizationId: "10000000-0000-4000-8000-000000000001",
  production: false,
  secret: "lifecycle-customer-better-auth-secret-value",
  trustedOrigins: [baseUrl],
});

let sessionId = "";

beforeAll(async () => {
  const passwordHash = await hashCustomerPassword(password);

  await database
    .insert(customerAccount)
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
      target: customerAccount.id,
    });
});

afterAll(async () => {
  await database.batch([
    database
      .delete(customerSession)
      .where(eq(customerSession.userId, customerId)),
    database
      .delete(customerAccount)
      .where(eq(customerAccount.id, credentialAccountId)),
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
      .select({ id: customerSession.id })
      .from(customerSession)
      .where(eq(customerSession.userId, customerId));
    expect(sessions).toEqual([]);
  });

  it("issues a separate fixed customer session for an active invited member", async () => {
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
      "shapewebs-customer.session_token=",
    );

    const sessions = await database
      .select({
        id: customerSession.id,
        lastSeenAt: customerSessionSecurity.lastSeenAt,
        revokedAt: customerSessionSecurity.revokedAt,
        token: customerSession.token,
      })
      .from(customerSession)
      .innerJoin(
        customerSessionSecurity,
        eq(customerSessionSecurity.sessionId, customerSession.id),
      )
      .where(eq(customerSession.userId, customerId));
    expect(sessions).toHaveLength(1);
    expect(sessions[0]?.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(sessions[0]?.revokedAt).toBeNull();
    sessionId = sessions[0]?.id ?? "";

    await expect(
      authorizeCustomerSession(databaseUrl, {
        sessionId,
        userId: customerId,
      }),
    ).resolves.toBe(true);
  });

  it("fails closed after the 24-hour inactivity boundary", async () => {
    await database
      .update(customerSessionSecurity)
      .set({
        lastSeenAt: sql`now() - interval '25 hours'`,
      })
      .where(
        and(
          eq(customerSessionSecurity.sessionId, sessionId),
          eq(customerSessionSecurity.userId, customerId),
        ),
      );

    await expect(
      authorizeCustomerSession(databaseUrl, {
        sessionId,
        userId: customerId,
      }),
    ).resolves.toBe(false);
  });
});

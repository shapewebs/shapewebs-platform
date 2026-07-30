import { eq } from "drizzle-orm";
import { afterEach, describe, expect, it } from "vitest";

import { createDatabase } from "../src/client";
import {
  createContentProviderCommandFingerprint,
  markContentProviderCommandUncertain,
  reserveContentProviderCommand,
} from "../src/content-provider-commands";
import { auditEvents, contentProviderCommands } from "../src/schema";

const databaseUrl = process.env.DATABASE_ADMIN_URL;
const fixtureDatabaseUrl = process.env.DATABASE_OWNER_URL;

if (!databaseUrl || !fixtureDatabaseUrl) {
  throw new Error(
    "DATABASE_ADMIN_URL and DATABASE_OWNER_URL are required for the content-provider command integration test.",
  );
}

const database = createDatabase(fixtureDatabaseUrl);
const commandId = "10000000-0000-4000-8000-000000000122";
const targetId = "blog-post-content-provider-integration";
const authorization = {
  actor: { id: "lifecycle-owner" },
  latestStepUpAt: new Date("2026-01-01T00:00:00.000Z"),
  organizationId: "10000000-0000-4000-8000-000000000001",
  role: "owner" as const,
  session: { id: "lifecycle-content-provider-session" },
};

async function removeFixture() {
  await database.delete(auditEvents).where(eq(auditEvents.targetId, targetId));
  await database
    .delete(contentProviderCommands)
    .where(eq(contentProviderCommands.id, commandId));
}

describe.sequential("Neon content-provider command repository", () => {
  afterEach(removeFixture);

  it("records an uncertain provider outcome and its immutable audit event", async () => {
    const requestFingerprint = createContentProviderCommandFingerprint({
      action: "blog_post.unpublish",
      targetId,
    });

    await expect(
      reserveContentProviderCommand(databaseUrl, authorization, {
        action: "blog_post.unpublish",
        commandId,
        requestFingerprint,
        targetId,
      }),
    ).resolves.toEqual({ status: "reserved" });

    await expect(
      markContentProviderCommandUncertain(databaseUrl, authorization, {
        auditAction: "content.blog_post_unpublished",
        commandId,
        failureCode: "provider_outcome_unconfirmed",
        requestId: "content-provider-integration-request",
        targetId,
      }),
    ).resolves.toBeUndefined();

    await expect(
      database
        .select({
          failureCode: contentProviderCommands.failureCode,
          status: contentProviderCommands.status,
        })
        .from(contentProviderCommands)
        .where(eq(contentProviderCommands.id, commandId)),
    ).resolves.toEqual([
      {
        failureCode: "provider_outcome_unconfirmed",
        status: "uncertain",
      },
    ]);
    await expect(
      database
        .select({
          action: auditEvents.action,
          metadata: auditEvents.metadata,
          requestId: auditEvents.requestId,
        })
        .from(auditEvents)
        .where(eq(auditEvents.targetId, targetId)),
    ).resolves.toEqual([
      {
        action: "content.blog_post_unpublished",
        metadata: {
          commandId,
          provider: "sanity",
          providerAction: "blog_post.unpublish",
          reasonCode: "provider_outcome_unconfirmed",
          result: "failure",
        },
        requestId: "content-provider-integration-request",
      },
    ]);
  });
});

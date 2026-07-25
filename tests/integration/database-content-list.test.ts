import { describe, expect, it } from "vitest";

import { listContentDocuments } from "../../packages/database/src/content-list";

const databaseUrl = process.env.DATABASE_ADMIN_URL;

if (!databaseUrl) {
  throw new Error(
    "DATABASE_ADMIN_URL is required for the content-list integration test.",
  );
}

const authorization = {
  actor: { id: "lifecycle-owner" },
  latestStepUpAt: new Date("2026-01-01T00:00:00.000Z"),
  organizationId: "10000000-0000-4000-8000-000000000001",
  role: "owner" as const,
  session: { id: "lifecycle-content-list-session" },
};

describe("Neon content-list repository", () => {
  it("returns the latest validated tenant-scoped revision", async () => {
    await expect(
      listContentDocuments(databaseUrl, authorization),
    ).resolves.toEqual([
      {
        contentType: "method",
        documentId: "10000000-0000-4000-8000-000000000004",
        localeCode: "en",
        pageKind: null,
        publishedAt: null,
        slug: "lifecycle-method",
        state: "review",
        summary: "Synthetic review revision",
        title: "Lifecycle method",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
    ]);
  });

  it("applies supported workflow and locale filters in the query", async () => {
    await expect(
      listContentDocuments(databaseUrl, authorization, {
        contentType: "method",
        localeCode: "en",
        state: "review",
      }),
    ).resolves.toHaveLength(1);
    await expect(
      listContentDocuments(databaseUrl, authorization, {
        state: "published",
      }),
    ).resolves.toEqual([]);
    await expect(
      listContentDocuments(databaseUrl, authorization, {
        localeCode: "da-DK",
      }),
    ).resolves.toEqual([]);
  });
});

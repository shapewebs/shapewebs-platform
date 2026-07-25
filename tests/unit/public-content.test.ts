import { describe, expect, it } from "vitest";

import {
  consumeContentPreviewGrant,
  createContentPreviewGrant,
  getDefaultPublishedContent,
  getPublishedContentBySlug,
  getPublishedPageByKind,
  listPublishedContent,
} from "../../packages/database/src/public-content";

const organizationId = "10000000-0000-4000-8000-000000000001";

describe("Neon public-content boundary", () => {
  it("provides deterministic locale- and type-specific fallback content", () => {
    expect(getDefaultPublishedContent("page", "en")).toEqual([
      expect.objectContaining({
        pageKind: "home",
        slug: "home",
        source: "fallback",
      }),
    ]);
    expect(getDefaultPublishedContent("page", "da-DK")).toEqual([]);
  });

  it("uses fallback content only when both database settings are absent", async () => {
    await expect(
      listPublishedContent(null, null, "post", "en"),
    ).resolves.toEqual([
      expect.objectContaining({
        contentType: "post",
        source: "fallback",
      }),
    ]);

    await expect(
      listPublishedContent(
        "postgresql://runtime@example.test/database",
        null,
        "post",
      ),
    ).rejects.toThrow(
      "DATABASE_URL and SHAPEWEBS_ORGANIZATION_ID must be configured together.",
    );
  });

  it("selects deterministic fallback detail records without a database", async () => {
    await expect(
      getPublishedContentBySlug(null, null, {
        contentType: "post",
        localeCode: "en",
        slug: "building-a-design-cms",
      }),
    ).resolves.toMatchObject({
      contentType: "post",
      source: "fallback",
    });
    await expect(
      getPublishedPageByKind(null, null, "home", "en"),
    ).resolves.toMatchObject({
      pageKind: "home",
      source: "fallback",
    });
  });

  it("rejects invalid tenant configuration before opening a database connection", async () => {
    await expect(
      listPublishedContent(
        "postgresql://runtime@example.test/database",
        "not-a-uuid",
        "page",
      ),
    ).rejects.toThrow("SHAPEWEBS_ORGANIZATION_ID must be a valid UUID.");
  });

  it("rejects unauthorized preview creation before opening a database connection", async () => {
    await expect(
      createContentPreviewGrant(
        "not-a-database-url",
        {
          actor: { id: "customer" },
          latestStepUpAt: null,
          organizationId,
          role: "customer",
          session: { id: "customer-session" },
        },
        {
          documentId: "10000000-0000-4000-8000-000000000002",
          localeCode: "en",
          revisionId: "10000000-0000-4000-8000-000000000003",
        },
      ),
    ).rejects.toThrow(
      "Owner or editor authorization is required to preview content.",
    );
  });

  it("rejects malformed preview tokens without querying the database", async () => {
    await expect(
      consumeContentPreviewGrant(
        "not-a-database-url",
        organizationId,
        "malformed",
      ),
    ).resolves.toBeNull();
  });
});

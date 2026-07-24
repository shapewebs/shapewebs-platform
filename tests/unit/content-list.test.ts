import { describe, expect, it } from "vitest";

import {
  getDefaultContentDocumentList,
  listContentDocuments,
} from "../../packages/database/src/content-list";

const authorization = {
  actor: { id: "content-list-owner" },
  latestStepUpAt: new Date(),
  organizationId: "10000000-0000-4000-8000-000000000001",
  role: "owner" as const,
  session: { id: "content-list-session" },
};

describe("Neon content list boundary", () => {
  it("provides deterministic, filterable local setup content", () => {
    expect(getDefaultContentDocumentList()).toHaveLength(2);
    expect(
      getDefaultContentDocumentList({
        contentType: "page",
        localeCode: "en",
        state: "draft",
      }),
    ).toEqual([
      expect.objectContaining({
        localeCode: "en",
        slug: "about",
        state: "draft",
      }),
    ]);
    expect(getDefaultContentDocumentList({ localeCode: "da-DK" })).toEqual([]);
  });

  it("rejects an unauthorized role before opening a database connection", async () => {
    await expect(
      listContentDocuments("not-a-database-url", {
        ...authorization,
        role: "customer",
      } as never),
    ).rejects.toThrow(
      "Owner or editor authorization is required to read content.",
    );
  });

  it("rejects invalid filters before opening a database connection", async () => {
    await expect(
      listContentDocuments("not-a-database-url", authorization, {
        localeCode: "unknown",
      } as never),
    ).rejects.toThrow();
  });
});

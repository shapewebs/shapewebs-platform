import { describe, expect, it } from "vitest";

import { listContentDocuments } from "../../packages/database/src/content-list";
import {
  getContentEditorState,
  savePageContentRevision,
} from "../../packages/database/src/content-editor";
import {
  consumeContentPreviewGrant,
  createContentPreviewGrant,
  getPublishedContentBySlug,
  getPublishedPageByKind,
  getPreviewContentByToken,
  listPublishedContent,
} from "../../packages/database/src/public-content";

const databaseUrl = process.env.DATABASE_ADMIN_URL;
const webDatabaseUrl = process.env.DATABASE_WEB_URL;

if (!databaseUrl || !webDatabaseUrl) {
  throw new Error(
    "DATABASE_ADMIN_URL and DATABASE_WEB_URL are required for the content integration test.",
  );
}

const authorization = {
  actor: { id: "lifecycle-owner" },
  latestStepUpAt: new Date("2026-01-01T00:00:00.000Z"),
  organizationId: "10000000-0000-4000-8000-000000000001",
  role: "owner" as const,
  session: { id: "lifecycle-content-list-session" },
};
const draftCommandId = "10000000-0000-4000-8000-000000000110";
const duplicateSlugCommandId = "10000000-0000-4000-8000-000000000111";
const staleCommandId = "10000000-0000-4000-8000-000000000112";
const publishCommandId = "10000000-0000-4000-8000-000000000113";
const postPublishDraftCommandId = "10000000-0000-4000-8000-000000000114";
const danishDraftCommandId = "10000000-0000-4000-8000-000000000115";
const danishPublishCommandId = "10000000-0000-4000-8000-000000000116";

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

describe.sequential("Neon content-editor repository", () => {
  const baseInput = {
    canonicalUrlOverride: null,
    changeNote: "Initial integration draft",
    commandId: draftCommandId,
    content: {
      blocks: [],
      schemaVersion: 1 as const,
    },
    expectedVersion: 0,
    intent: "draft" as const,
    localeCode: "en" as const,
    metaDescription: "A safe integration draft.",
    metaTitle: "Integration draft",
    pageKind: "standard",
    robotsIndex: true,
    slug: "cms-integration-page",
    summary: "Neon CMS integration coverage.",
    title: "CMS integration page",
  };
  let documentId = "";
  let publishedRevisionId = "";
  let postPublishDraftRevisionId = "";

  it("creates one immutable draft and treats an exact command replay idempotently", async () => {
    const created = await savePageContentRevision(
      databaseUrl,
      authorization,
      baseInput,
    );

    expect(created.status).toBe("saved");
    expect("documentId" in created).toBe(true);

    if (!("documentId" in created)) {
      throw new Error("The synthetic CMS document was not created.");
    }

    documentId = created.documentId;
    expect(created.version).toBe(1);

    await expect(
      savePageContentRevision(databaseUrl, authorization, baseInput),
    ).resolves.toMatchObject({
      documentId,
      revisionId: created.revisionId,
      status: "duplicate",
      version: 1,
    });

    const state = await getContentEditorState(databaseUrl, authorization, {
      documentId,
      localeCode: "en",
    });

    expect(state).toMatchObject({
      documentId,
      localeCode: "en",
      source: "neon",
      state: "draft",
      title: "CMS integration page",
      version: 1,
    });
    expect(state?.revisions).toHaveLength(1);
  });

  it("rejects a stale editor version without creating a revision", async () => {
    await expect(
      savePageContentRevision(databaseUrl, authorization, {
        ...baseInput,
        commandId: staleCommandId,
        documentId,
      }),
    ).resolves.toEqual({ status: "conflict" });

    const state = await getContentEditorState(databaseUrl, authorization, {
      documentId,
      localeCode: "en",
    });
    expect(state?.version).toBe(1);
    expect(state?.revisions).toHaveLength(1);
  });

  it("publishes an exact revision and preserves it after a later draft", async () => {
    const published = await savePageContentRevision(
      databaseUrl,
      authorization,
      {
        ...baseInput,
        changeNote: "Publish integration page",
        commandId: publishCommandId,
        documentId,
        expectedVersion: 1,
        intent: "publish",
      },
    );

    expect(published.status).toBe("saved");

    if (!("revisionId" in published)) {
      throw new Error("The synthetic CMS revision was not published.");
    }

    publishedRevisionId = published.revisionId;

    const drafted = await savePageContentRevision(databaseUrl, authorization, {
      ...baseInput,
      changeNote: "Start a post-publication draft",
      commandId: postPublishDraftCommandId,
      documentId,
      expectedVersion: 2,
      title: "Unpublished follow-up draft",
    });

    expect(drafted).toMatchObject({
      documentId,
      status: "saved",
      version: 3,
    });

    if (!("revisionId" in drafted)) {
      throw new Error("The post-publication draft was not created.");
    }

    postPublishDraftRevisionId = drafted.revisionId;

    const state = await getContentEditorState(databaseUrl, authorization, {
      documentId,
      localeCode: "en",
    });
    expect(state).toMatchObject({
      publishedRevisionId,
      state: "draft",
      title: "Unpublished follow-up draft",
      version: 3,
    });
    expect(state?.revisions).toHaveLength(3);
  });

  it("uses the document default locale when no locale is selected", async () => {
    const drafted = await savePageContentRevision(databaseUrl, authorization, {
      ...baseInput,
      changeNote: "Add Danish localization",
      commandId: danishDraftCommandId,
      documentId,
      expectedVersion: 3,
      localeCode: "da-DK",
      slug: "cms-integrationsside",
      summary: "Dansk Neon CMS-integrationsdækning.",
      title: "Dansk integrationsside",
    });

    expect(drafted).toMatchObject({
      documentId,
      localeCode: "da-DK",
      status: "saved",
      version: 4,
    });

    await expect(
      getContentEditorState(databaseUrl, authorization, {
        documentId,
      }),
    ).resolves.toMatchObject({
      localeCode: "en",
      title: "Unpublished follow-up draft",
    });

    await expect(
      getContentEditorState(databaseUrl, authorization, {
        documentId,
        localeCode: "da-DK",
      }),
    ).resolves.toMatchObject({
      localeCode: "da-DK",
      publishedRevisionId: null,
      title: "Dansk integrationsside",
    });
  });

  it("publishes locales independently without replacing another locale pointer", async () => {
    const published = await savePageContentRevision(
      databaseUrl,
      authorization,
      {
        ...baseInput,
        changeNote: "Publish Danish localization",
        commandId: danishPublishCommandId,
        documentId,
        expectedVersion: 4,
        intent: "publish",
        localeCode: "da-DK",
        slug: "cms-integrationsside",
        summary: "Dansk Neon CMS-integrationsdækning.",
        title: "Dansk integrationsside",
      },
    );

    expect(published).toMatchObject({
      documentId,
      localeCode: "da-DK",
      status: "saved",
      version: 5,
    });

    if (!("revisionId" in published)) {
      throw new Error("The Danish CMS revision was not published.");
    }

    await expect(
      getContentEditorState(databaseUrl, authorization, {
        documentId,
      }),
    ).resolves.toMatchObject({
      localeCode: "en",
      publishedRevisionId,
    });

    await expect(
      getContentEditorState(databaseUrl, authorization, {
        documentId,
        localeCode: "da-DK",
      }),
    ).resolves.toMatchObject({
      localeCode: "da-DK",
      publishedRevisionId: published.revisionId,
    });
  });

  it("serves only exact published revision pointers through the web role", async () => {
    const englishPages = await listPublishedContent(
      webDatabaseUrl,
      authorization.organizationId,
      "page",
      "en",
    );
    const publishedPage = englishPages.find(
      (page) => page.documentId === documentId,
    );

    expect(publishedPage).toMatchObject({
      localeCode: "en",
      source: "neon",
      title: "CMS integration page",
    });
    expect(publishedPage?.title).not.toBe("Unpublished follow-up draft");

    const danishPages = await listPublishedContent(
      webDatabaseUrl,
      authorization.organizationId,
      "page",
      "da-DK",
    );
    expect(
      danishPages.find((page) => page.documentId === documentId),
    ).toMatchObject({
      localeCode: "da-DK",
      title: "Dansk integrationsside",
    });

    await expect(
      getPublishedContentBySlug(webDatabaseUrl, authorization.organizationId, {
        contentType: "page",
        localeCode: "da-DK",
        slug: "cms-integrationsside",
      }),
    ).resolves.toMatchObject({
      documentId,
      localeCode: "da-DK",
      title: "Dansk integrationsside",
    });

    await expect(
      getPublishedPageByKind(
        webDatabaseUrl,
        authorization.organizationId,
        "standard",
        "en",
      ),
    ).resolves.toMatchObject({
      documentId,
      localeCode: "en",
      title: "CMS integration page",
    });
  });

  it("consumes a preview grant once and reads only its exact revision", async () => {
    const grant = await createContentPreviewGrant(databaseUrl, authorization, {
      documentId,
      localeCode: "en",
      revisionId: postPublishDraftRevisionId,
    });

    expect(grant).toMatchObject({
      path: "/cms-integration-page",
    });

    if (!grant) {
      throw new Error("The preview grant was not created.");
    }

    const consumed = await consumeContentPreviewGrant(
      webDatabaseUrl,
      authorization.organizationId,
      grant.token,
    );

    expect(consumed).toMatchObject({
      documentId,
      localeCode: "en",
      revisionId: postPublishDraftRevisionId,
    });

    if (!consumed) {
      throw new Error("The preview grant was not consumed.");
    }

    await expect(
      consumeContentPreviewGrant(
        webDatabaseUrl,
        authorization.organizationId,
        grant.token,
      ),
    ).resolves.toBeNull();

    await expect(
      getPreviewContentByToken(
        webDatabaseUrl,
        authorization.organizationId,
        grant.token,
      ),
    ).resolves.toBeNull();

    await expect(
      getPreviewContentByToken(
        webDatabaseUrl,
        authorization.organizationId,
        consumed.sessionToken,
      ),
    ).resolves.toMatchObject({
      documentId,
      source: "neon",
      title: "Unpublished follow-up draft",
    });

    await expect(
      getPreviewContentByToken(
        webDatabaseUrl,
        "20000000-0000-4000-8000-000000000001",
        consumed.sessionToken,
      ),
    ).resolves.toBeNull();
  });

  it("rejects a locale/type slug collision atomically", async () => {
    await expect(
      savePageContentRevision(databaseUrl, authorization, {
        ...baseInput,
        commandId: duplicateSlugCommandId,
        title: "Conflicting page",
      }),
    ).resolves.toEqual({ status: "slug_conflict" });
  });
});

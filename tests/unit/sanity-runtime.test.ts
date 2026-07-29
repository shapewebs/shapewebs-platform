import { encodeSignatureHeader } from "@sanity/webhook";
import { describe, expect, it, vi } from "vitest";

import {
  getAdminSanityRuntime,
  hasAdminSanityIntent,
} from "../../apps/admin/src/lib/sanity";
import {
  getWebSanityDraftRuntime,
  getWebSanityRuntime,
  hasWebSanityIntent,
} from "../../apps/web/src/lib/sanity";
import {
  createSanityDraftContentRepository,
  createSanityPublishedContentRepository,
  createSanityWriteRepository,
  maximumSanityWebhookBodyBytes,
  resolveSanityImagePresentation,
  SanityWebhookError,
  verifySanityWebhook,
} from "../../packages/content-platform/src/server";

const projectEnvironment = {
  SANITY_DATASET: "staging",
  SANITY_PROJECT_ID: "abc12345",
};
const readerToken = "r".repeat(64);
const writerToken = "w".repeat(64);
const webhookSecret = "h".repeat(48);
const image = {
  _type: "image",
  alt: "Shapewebs article cover",
  asset: {
    _ref: `image-${"a".repeat(40)}-1600x900-webp`,
    _type: "reference",
  },
  decorative: false,
};
const blogPostInput = {
  author: {
    _ref: "author-lukas",
    _type: "reference",
  },
  body: [
    {
      _key: "paragraph1",
      _type: "block",
      children: [
        {
          _key: "span1",
          _type: "span",
          marks: [],
          text: "A secure Sanity integration.",
        },
      ],
      markDefs: [],
      style: "normal",
    },
  ],
  categories: [],
  coverImage: image,
  excerpt: "A secure and reliable Sanity integration.",
  locale: "en",
  seo: {
    noIndex: false,
  },
  slug: {
    _type: "slug",
    current: "secure-sanity-integration",
  },
  title: "Secure Sanity integration",
};

describe("Sanity application environment boundaries", () => {
  it("keeps unconfigured local and generic preview environments optional", () => {
    expect(getAdminSanityRuntime({})).toBeNull();
    expect(getWebSanityDraftRuntime(projectEnvironment)).toBeNull();
    expect(getWebSanityRuntime({})).toBeNull();
    expect(
      getAdminSanityRuntime({
        VERCEL_ENV: "preview",
        VERCEL_GIT_COMMIT_REF: "feature-branch",
      }),
    ).toBeNull();
    expect(hasAdminSanityIntent({})).toBe(false);
    expect(hasWebSanityIntent({})).toBe(false);
  });

  it("creates a token-authenticated no-CDN draft client only when explicitly configured", () => {
    const runtime = getWebSanityDraftRuntime({
      ...projectEnvironment,
      SANITY_API_READ_TOKEN: readerToken,
    });

    expect(runtime).not.toBeNull();
    expect(runtime?.client.config()).toMatchObject({
      dataset: "staging",
      perspective: "drafts",
      projectId: "abc12345",
      token: readerToken,
      useCdn: false,
    });
  });

  it("fails fixed staging and production closed when Sanity is absent", () => {
    for (const environment of [
      {
        VERCEL_ENV: "preview",
        VERCEL_GIT_COMMIT_REF: "staging",
      },
      {
        VERCEL_ENV: "production",
      },
    ]) {
      expect(() => getAdminSanityRuntime(environment)).toThrow();
      expect(() => getWebSanityRuntime(environment)).toThrow();
      expect(hasAdminSanityIntent(environment)).toBe(true);
      expect(hasWebSanityIntent(environment)).toBe(true);
    }
  });

  it("rejects partial admin configuration and accepts separated credentials", () => {
    expect(() => getAdminSanityRuntime(projectEnvironment)).toThrow();

    const runtime = getAdminSanityRuntime({
      ...projectEnvironment,
      SANITY_API_READ_TOKEN: readerToken,
      SANITY_API_WRITE_TOKEN: writerToken,
      SANITY_WEBHOOK_SECRET: webhookSecret,
    });

    expect(runtime).not.toBeNull();
    expect(runtime?.webhookEnvironment.webhookSecret).toBe(webhookSecret);
  });

  it("configures public reads without a browser or server token", () => {
    const runtime = getWebSanityRuntime(projectEnvironment);

    const clientConfiguration = runtime?.client.config();

    expect(clientConfiguration).toMatchObject({
      dataset: "staging",
      perspective: "published",
      projectId: "abc12345",
      useCdn: true,
    });
    expect(clientConfiguration?.token).toBeUndefined();
  });
});

describe("Sanity repository contracts", () => {
  it("resolves only bounded canonical Sanity image references", () => {
    expect(
      resolveSanityImagePresentation(
        {
          apiVersion: "2026-07-01",
          dataset: "staging",
          projectId: "abc12345",
        },
        `image-${"a".repeat(40)}-1600x900-webp`,
      ),
    ).toEqual({
      height: 900,
      url: `https://cdn.sanity.io/images/abc12345/staging/${"a".repeat(
        40,
      )}-1600x900.webp`,
      width: 1600,
    });

    expect(() =>
      resolveSanityImagePresentation(
        {
          apiVersion: "2026-07-01",
          dataset: "staging",
          projectId: "abc12345",
        },
        "image-unsafe-1x1-svg",
      ),
    ).toThrow();
  });

  it("creates, saves, and publishes through revision-bound actions", async () => {
    const action = vi
      .fn()
      .mockResolvedValue({ transactionId: "transaction-1" });
    const transactionCommit = vi
      .fn()
      .mockResolvedValue({ transactionId: "transaction-2" });
    const transaction = {
      commit: transactionCommit,
      createIfNotExists: vi.fn(),
      delete: vi.fn(),
      patch: vi.fn(),
      transactionId: vi.fn(),
    };
    transaction.createIfNotExists.mockReturnValue(transaction);
    transaction.delete.mockReturnValue(transaction);
    transaction.patch.mockReturnValue(transaction);
    transaction.transactionId.mockReturnValue(transaction);
    const client = {
      action,
      assets: {
        upload: vi.fn(),
      },
      transaction: vi.fn().mockReturnValue(transaction),
    } as unknown as Parameters<typeof createSanityWriteRepository>[0]["client"];
    const repository = createSanityWriteRepository({
      client,
      environment: {
        apiVersion: "2026-07-01",
        dataset: "staging",
        projectId: "abc12345",
      },
    });

    const created = await repository.createBlogPostDraft({
      commandId: "10000000-0000-4000-8000-000000000001",
      content: blogPostInput,
    });

    expect(created.documentId).toBe(
      "blog-post-10000000-0000-4000-8000-000000000001",
    );
    expect(action.mock.calls[0]?.[0]).toMatchObject({
      actionType: "sanity.action.document.create",
      attributes: {
        _id: `drafts.${created.documentId}`,
        _type: "blogPost",
        title: blogPostInput.title,
      },
      ifExists: "ignore",
      publishedId: created.documentId,
    });

    await repository.saveBlogPostDraft({
      commandId: "10000000-0000-4000-8000-000000000002",
      content: blogPostInput,
      documentId: created.documentId,
      expectedRevision: "revision1",
    });

    expect(action.mock.calls[1]?.[0]).toMatchObject({
      actionType: "sanity.action.document.edit",
      draftId: `drafts.${created.documentId}`,
      patch: {
        ifRevisionID: "revision1",
        unset: ["publishedAt"],
      },
      publishedId: created.documentId,
    });

    await repository.publishBlogPost({
      commandId: "10000000-0000-4000-8000-000000000003",
      documentId: created.documentId,
      expectedDraftRevision: "revision2",
      expectedPublishedRevision: "revision3",
    });

    expect(action.mock.calls[2]?.[0]).toEqual({
      actionType: "sanity.action.document.publish",
      draftId: `drafts.${created.documentId}`,
      ifDraftRevisionId: "revision2",
      ifPublishedRevisionId: "revision3",
      publishedId: created.documentId,
    });

    await repository.unpublishBlogPost({
      commandId: "10000000-0000-4000-8000-000000000004",
      documentId: created.documentId,
      expectedPublishedRevision: "revision4",
      publishedContent: blogPostInput,
    });

    expect(transaction.createIfNotExists).toHaveBeenCalledWith({
      _id: `drafts.${created.documentId}`,
      _type: "blogPost",
      ...blogPostInput,
    });
    expect(transaction.patch).toHaveBeenCalledWith(created.documentId, {
      ifRevisionID: "revision4",
    });
    expect(transaction.delete).toHaveBeenCalledWith(created.documentId);
    expect(transaction.transactionId).toHaveBeenCalledWith(
      "10000000-0000-4000-8000-000000000004",
    );
    expect(transactionCommit).toHaveBeenCalledWith({
      returnDocuments: false,
      tag: "content.blog-post-unpublish",
    });
  });

  it("uses parameterized queries and rejects non-owned asset URLs", async () => {
    const fetch = vi.fn().mockResolvedValue([
      {
        _createdAt: "2026-07-29T08:00:00.000Z",
        _id: `image-${"b".repeat(40)}-1200x800-webp`,
        _rev: "revision1",
        _type: "sanity.imageAsset",
        _updatedAt: "2026-07-29T08:00:00.000Z",
        metadata: {
          dimensions: {
            aspectRatio: 1.5,
            height: 800,
            width: 1200,
          },
        },
        mimeType: "image/webp",
        originalFilename: "cover.webp",
        size: 120_000,
        url: `https://cdn.sanity.io/images/other123/staging/${"b".repeat(
          40,
        )}-1200x800.webp`,
      },
    ]);
    const client = {
      fetch,
    } as unknown as Parameters<
      typeof createSanityDraftContentRepository
    >[0]["client"];
    const repository = createSanityDraftContentRepository({
      client,
      environment: {
        apiVersion: "2026-07-01",
        dataset: "staging",
        projectId: "abc12345",
      },
    });

    await expect(repository.listImageAssets({ limit: 20 })).rejects.toThrow(
      "configured project and dataset",
    );
    expect(fetch.mock.calls[0]?.[1]).toEqual({ limit: 20 });
  });

  it("projects raw Sanity upload responses into a minimal strict asset DTO", async () => {
    const upload = vi.fn().mockResolvedValue({
      _createdAt: "2026-07-29T08:00:00.000Z",
      _id: `image-${"b".repeat(40)}-1200x800-webp`,
      _rev: "revision1",
      _type: "sanity.imageAsset",
      _updatedAt: "2026-07-29T08:00:00.000Z",
      assetId: "provider-only-asset-id",
      extension: "webp",
      metadata: {
        blurHash: undefined,
        dimensions: {
          aspectRatio: 1.5,
          height: 800,
          providerOnlyDimension: true,
          width: 1200,
        },
        lqip: null,
        palette: {
          providerOnlyPalette: true,
        },
      },
      mimeType: "image/webp",
      originalFilename: "cover.webp",
      path: "images/abc12345/staging/provider-only-path.webp",
      sha1hash: "b".repeat(40),
      size: 120_000,
      url: `https://cdn.sanity.io/images/abc12345/staging/${"b".repeat(
        40,
      )}-1200x800.webp`,
    });
    const client = {
      assets: {
        upload,
      },
    } as unknown as Parameters<typeof createSanityWriteRepository>[0]["client"];
    const repository = createSanityWriteRepository({
      client,
      environment: {
        apiVersion: "2026-07-01",
        dataset: "staging",
        projectId: "abc12345",
      },
    });

    const asset = await repository.uploadImage({
      bytes: new Uint8Array([1, 2, 3]),
      filename: "cover.webp",
    });

    expect(asset).toEqual({
      _createdAt: "2026-07-29T08:00:00.000Z",
      _id: `image-${"b".repeat(40)}-1200x800-webp`,
      _rev: "revision1",
      _type: "sanity.imageAsset",
      _updatedAt: "2026-07-29T08:00:00.000Z",
      metadata: {
        dimensions: {
          aspectRatio: 1.5,
          height: 800,
          width: 1200,
        },
      },
      mimeType: "image/webp",
      originalFilename: "cover.webp",
      size: 120_000,
      url: `https://cdn.sanity.io/images/abc12345/staging/${"b".repeat(
        40,
      )}-1200x800.webp`,
    });
    expect(upload).toHaveBeenCalledWith(
      "image",
      expect.any(Buffer),
      expect.objectContaining({
        contentType: "image/webp",
        filename: "cover.webp",
        timeout: 15_000,
      }),
    );
  });

  it("selects the draft deterministically and retains the published revision", async () => {
    const published = {
      _createdAt: "2026-07-29T08:00:00.000Z",
      _id: "blog-post-test",
      _rev: "publishedRevision",
      _type: "blogPost",
      _updatedAt: "2026-07-29T08:00:00.000Z",
      ...blogPostInput,
      title: "Published title",
    };
    const draft = {
      ...published,
      _id: "drafts.blog-post-test",
      _rev: "draftRevision",
      title: "Draft title",
    };
    const fetch = vi.fn().mockResolvedValue([published, draft]);
    const client = {
      fetch,
    } as unknown as Parameters<
      typeof createSanityDraftContentRepository
    >[0]["client"];
    const repository = createSanityDraftContentRepository({
      client,
      environment: {
        apiVersion: "2026-07-01",
        dataset: "staging",
        projectId: "abc12345",
      },
    });

    await expect(
      repository.getBlogPostEditorState({
        documentId: "blog-post-test",
      }),
    ).resolves.toMatchObject({
      draft: {
        _id: "drafts.blog-post-test",
        title: "Draft title",
      },
      draftRevision: "draftRevision",
      documentId: "blog-post-test",
      hasDraft: true,
      publishedRevision: "publishedRevision",
    });
    expect(fetch.mock.calls[0]?.[1]).toEqual({
      draftId: "drafts.blog-post-test",
      publishedId: "blog-post-test",
    });
  });

  it("normalizes nullable optional Sanity projection fields at the provider boundary", async () => {
    const systemFields = {
      _createdAt: "2026-07-29T08:00:00.000Z",
      _rev: "revision1",
      _updatedAt: "2026-07-29T08:00:00.000Z",
    };
    const fetch = vi
      .fn()
      .mockResolvedValueOnce([
        {
          ...systemFields,
          _id: "author-lukas",
          _type: "author",
          bio: null,
          name: "Lukas Thomsen",
          portrait: null,
          slug: {
            _type: "slug",
            current: "lukas-thomsen",
          },
        },
      ])
      .mockResolvedValueOnce([
        {
          ...systemFields,
          _id: "category-assurance",
          _type: "category",
          description: null,
          slug: {
            _type: "slug",
            current: "assurance",
          },
          title: "Assurance",
        },
      ])
      .mockResolvedValueOnce([
        {
          ...systemFields,
          ...blogPostInput,
          _id: "drafts.blog-post-nullables",
          _type: "blogPost",
          coverImage: {
            ...image,
            caption: null,
            crop: null,
            hotspot: null,
          },
          publishedAt: null,
          seo: {
            ...blogPostInput.seo,
            description: null,
            image: null,
            title: null,
          },
        },
      ]);
    const client = {
      fetch,
    } as unknown as Parameters<
      typeof createSanityDraftContentRepository
    >[0]["client"];
    const repository = createSanityDraftContentRepository({
      client,
      environment: {
        apiVersion: "2026-07-01",
        dataset: "staging",
        projectId: "abc12345",
      },
    });

    const [authors, categories, editorState] = await Promise.all([
      repository.listAuthors({ limit: 20 }),
      repository.listCategories({ limit: 20 }),
      repository.getBlogPostEditorState({
        documentId: "blog-post-nullables",
      }),
    ]);

    expect(authors[0]).not.toHaveProperty("bio");
    expect(authors[0]).not.toHaveProperty("portrait");
    expect(categories[0]).not.toHaveProperty("description");
    expect(editorState?.draft).not.toHaveProperty("publishedAt");
    expect(editorState?.draft.coverImage).not.toHaveProperty("caption");
    expect(editorState?.draft.coverImage).not.toHaveProperty("crop");
    expect(editorState?.draft.coverImage).not.toHaveProperty("hotspot");
    expect(editorState?.draft.seo).not.toHaveProperty("description");
    expect(editorState?.draft.seo).not.toHaveProperty("image");
    expect(editorState?.draft.seo).not.toHaveProperty("title");
  });

  it("parses published query results before returning DTOs", async () => {
    const result = {
      _createdAt: "2026-07-29T08:00:00.000Z",
      _id: "blog-post-test",
      _rev: "revision1",
      _type: "blogPost",
      _updatedAt: "2026-07-29T08:00:00.000Z",
      ...blogPostInput,
    };
    const fetch = vi.fn().mockResolvedValue(result);
    const client = {
      fetch,
    } as unknown as Parameters<
      typeof createSanityPublishedContentRepository
    >[0]["client"];
    const repository = createSanityPublishedContentRepository({
      client,
      environment: {
        apiVersion: "2026-07-01",
        dataset: "staging",
        projectId: "abc12345",
      },
    });

    await expect(
      repository.getBlogPostBySlug({
        locale: "en",
        slug: "secure-sanity-integration",
      }),
    ).resolves.toMatchObject({
      _id: "blog-post-test",
      title: blogPostInput.title,
    });
    expect(fetch.mock.calls[0]?.[1]).toEqual({
      locale: "en",
      slug: "secure-sanity-integration",
    });
  });
});

describe("Sanity webhook boundary", () => {
  it("accepts an authentic bounded projection", async () => {
    const rawBody = JSON.stringify({
      _id: "blog-post-test",
      _type: "blogPost",
      locale: "en",
      operation: "update",
      slug: "secure-sanity-integration",
    });
    const signature = await encodeSignatureHeader(
      rawBody,
      Date.now(),
      webhookSecret,
    );

    await expect(
      verifySanityWebhook({
        rawBody,
        secret: webhookSecret,
        signature,
      }),
    ).resolves.toEqual(JSON.parse(rawBody));
  });

  it("rejects forged, malformed, and oversized requests", async () => {
    await expect(
      verifySanityWebhook({
        rawBody: "{}",
        secret: webhookSecret,
        signature: null,
      }),
    ).rejects.toMatchObject<Partial<SanityWebhookError>>({
      code: "signature_missing",
    });
    await expect(
      verifySanityWebhook({
        rawBody: "{}",
        secret: webhookSecret,
        signature: "t=1,v=forged",
      }),
    ).rejects.toMatchObject<Partial<SanityWebhookError>>({
      code: "signature_invalid",
    });
    await expect(
      verifySanityWebhook({
        rawBody: "x".repeat(maximumSanityWebhookBodyBytes + 1),
        secret: webhookSecret,
        signature: "bounded",
      }),
    ).rejects.toMatchObject<Partial<SanityWebhookError>>({
      code: "body_too_large",
    });
  });
});

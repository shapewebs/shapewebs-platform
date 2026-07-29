import "server-only";

import {
  createDraftId,
  createPublishedId,
  type PublishedId,
} from "@sanity/id-utils";
import type { SanityClient } from "@sanity/client";
import {
  sanityAuthorSchema,
  sanityBlogPostDraftInputSchema,
  sanityBlogPostSchema,
  sanityBlogPostSummarySchema,
  sanityCategorySchema,
  sanityImageAssetSchema,
  type SanityAuthor,
  type SanityBlogPost,
  type SanityBlogPostSummary,
  type SanityCategory,
  type SanityImageAsset,
} from "@shapewebs/content-schema";
import { z } from "zod";

import type { SanityPublishedEnvironment } from "./environment";

const commandIdSchema = z.uuid();
const identifierSegmentPattern = /^[A-Za-z0-9_-]+$/u;
const slugSegmentPattern = /^[a-z0-9]+$/u;
const documentIdSchema = z
  .string()
  .min(1)
  .max(100)
  .refine(
    (value) =>
      !value.startsWith("drafts.") &&
      !value.startsWith("versions.") &&
      value
        .split(".")
        .every(
          (segment) =>
            segment.length > 0 && identifierSegmentPattern.test(segment),
        ),
    "A published Sanity document ID is required.",
  );
const revisionSchema = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[A-Za-z0-9_-]+$/u);
const limitSchema = z.number().int().min(1).max(100);
const imageUploadSchema = z
  .object({
    bytes: z
      .instanceof(Uint8Array)
      .refine(
        (value) =>
          value.byteLength > 0 && value.byteLength <= 4 * 1_024 * 1_024,
        "Sanity image uploads must contain at most four MiB.",
      ),
    filename: z
      .string()
      .normalize()
      .trim()
      .min(1)
      .max(180)
      .regex(/^[^/\\\u0000-\u001f\u007f]+\.webp$/iu),
  })
  .strict();
const imageReferencePattern =
  /^image-([a-f0-9]+)-([1-9][0-9]*)x([1-9][0-9]*)-(jpg|png|webp)$/u;
const imageReferenceSchema = z.string().regex(imageReferencePattern);

const imageProjection = `{
  _type,
  alt,
  decorative,
  caption,
  asset{_type, _ref, _weak},
  crop{_type, top, bottom, left, right},
  hotspot{_type, x, y, height, width}
}`;
const blogPostProjection = `{
  _id,
  _rev,
  _type,
  _createdAt,
  _updatedAt,
  title,
  slug{_type, current},
  locale,
  excerpt,
  author{_type, _ref, _weak},
  categories[]{_type, _ref, _weak},
  coverImage${imageProjection},
  body,
  seo{
    title,
    description,
    noIndex,
    image${imageProjection}
  },
  publishedAt
}`;
const blogPostSummaryProjection = `{
  _id,
  _rev,
  _type,
  _createdAt,
  _updatedAt,
  title,
  slug{_type, current},
  locale,
  excerpt,
  coverImage${imageProjection},
  publishedAt
}`;
const imageAssetProjection = `{
  _id,
  _rev,
  _type,
  _createdAt,
  _updatedAt,
  originalFilename,
  url,
  mimeType,
  size,
  metadata{
    dimensions{width, height, aspectRatio},
    lqip,
    blurHash
  }
}`;
const authorProjection = `{
  _id,
  _rev,
  _type,
  _createdAt,
  _updatedAt,
  name,
  slug{_type, current},
  bio,
  portrait${imageProjection}
}`;
const categoryProjection = `{
  _id,
  _rev,
  _type,
  _createdAt,
  _updatedAt,
  title,
  slug{_type, current},
  description
}`;

export type SanityBlogPostEditorState = {
  draft: SanityBlogPost;
  draftRevision: string;
  documentId: string;
  hasDraft: boolean;
  published?: SanityBlogPost;
  publishedRevision?: string;
};

export type SanityBlogPostEditorialSummary = {
  documentId: string;
  draftRevision?: string;
  post: SanityBlogPostSummary;
  publishedRevision?: string;
};

function requireCanonicalAssetUrl(
  asset: SanityImageAsset,
  environment: SanityPublishedEnvironment,
): SanityImageAsset {
  const parsed = new URL(asset.url);
  const expectedPrefix = `/images/${environment.projectId}/${environment.dataset}/`;

  if (!parsed.pathname.startsWith(expectedPrefix)) {
    throw new Error(
      "The Sanity asset did not belong to the configured project and dataset.",
    );
  }

  return asset;
}

export type SanityImagePresentation = {
  height: number;
  url: string;
  width: number;
};

export function resolveSanityImagePresentation(
  environment: SanityPublishedEnvironment,
  reference: string,
): SanityImagePresentation {
  const parsedReference = imageReferenceSchema.parse(reference);
  const [, hash, widthValue, heightValue, extension] =
    parsedReference.match(imageReferencePattern) ?? [];

  if (!hash || !widthValue || !heightValue || !extension) {
    throw new Error("The Sanity image reference is invalid.");
  }

  const width = Number.parseInt(widthValue, 10);
  const height = Number.parseInt(heightValue, 10);

  if (
    !Number.isSafeInteger(width) ||
    !Number.isSafeInteger(height) ||
    width < 1 ||
    height < 1 ||
    width > 20_000 ||
    height > 20_000
  ) {
    throw new Error("The Sanity image dimensions are invalid.");
  }

  return {
    height,
    url: `https://cdn.sanity.io/images/${environment.projectId}/${environment.dataset}/${hash}-${width}x${height}.${extension}`,
    width,
  };
}

export async function pingSanityContent(
  client: SanityClient,
  abortSignal?: AbortSignal,
): Promise<void> {
  await client.fetch<null>(
    `*[_id == "shapewebs-provider-readiness-marker"][0]._id`,
    {},
    {
      signal: abortSignal,
      tag: "content.readiness",
    },
  );
}

export function createSanityPublishedContentRepository(input: {
  client: SanityClient;
  environment: SanityPublishedEnvironment;
}) {
  return {
    async getBlogPostBySlug(options: {
      abortSignal?: AbortSignal;
      locale: "da-DK" | "en";
      slug: string;
    }): Promise<SanityBlogPost | null> {
      const slug = z
        .string()
        .min(1)
        .max(120)
        .refine((value) =>
          value
            .split("-")
            .every(
              (segment) =>
                segment.length > 0 && slugSegmentPattern.test(segment),
            ),
        )
        .parse(options.slug);
      const result = await input.client.fetch<unknown>(
        `*[
          _type == "blogPost" &&
          locale == $locale &&
          slug.current == $slug
        ][0] ${blogPostProjection}`,
        {
          locale: options.locale,
          slug,
        },
        {
          signal: options.abortSignal,
          tag: "content.blog-post-by-slug",
        },
      );

      return result === null ? null : sanityBlogPostSchema.parse(result);
    },
    async listBlogPosts(options: {
      abortSignal?: AbortSignal;
      limit: number;
      locale: "da-DK" | "en";
    }): Promise<SanityBlogPostSummary[]> {
      const limit = limitSchema.parse(options.limit);
      const result = await input.client.fetch<unknown>(
        `*[_type == "blogPost" && locale == $locale]
          | order(coalesce(publishedAt, _createdAt) desc, _id asc)
          [0...$limit] ${blogPostSummaryProjection}`,
        {
          limit,
          locale: options.locale,
        },
        {
          signal: options.abortSignal,
          tag: "content.blog-post-list",
        },
      );

      if (!Array.isArray(result) || result.length > limit) {
        throw new Error("The Sanity blog post list response is invalid.");
      }

      return result.map((item) => sanityBlogPostSummarySchema.parse(item));
    },
  };
}

export function createSanityDraftContentRepository(input: {
  client: SanityClient;
  environment: SanityPublishedEnvironment;
}) {
  return {
    async getBlogPostEditorState(options: {
      abortSignal?: AbortSignal;
      documentId: string;
    }): Promise<SanityBlogPostEditorState | null> {
      const documentId = documentIdSchema.parse(options.documentId);
      const draftId = createDraftId(documentId as PublishedId);
      const result = await input.client.fetch<unknown>(
        `*[
          _type == "blogPost" &&
          _id in [$publishedId, $draftId]
        ] ${blogPostProjection}`,
        {
          draftId,
          publishedId: documentId,
        },
        {
          perspective: "raw",
          signal: options.abortSignal,
          tag: "content.blog-post-editor-state",
        },
      );

      if (!Array.isArray(result) || result.length > 2) {
        throw new Error("The Sanity blog post editor response is invalid.");
      }

      const documents = result.map((item) => sanityBlogPostSchema.parse(item));
      const draft = documents.find((document) => document._id === draftId);
      const published = documents.find(
        (document) => document._id === documentId,
      );
      const editable = draft ?? published;

      if (!editable) {
        return null;
      }

      return {
        draft: editable,
        draftRevision: editable._rev,
        documentId,
        hasDraft: Boolean(draft),
        published,
        publishedRevision: published?._rev,
      };
    },
    async getBlogPostById(options: {
      abortSignal?: AbortSignal;
      documentId: string;
    }): Promise<SanityBlogPost | null> {
      const state = await this.getBlogPostEditorState(options);

      return state?.draft ?? null;
    },
    async listAuthors(options: {
      abortSignal?: AbortSignal;
      limit: number;
    }): Promise<SanityAuthor[]> {
      const limit = limitSchema.parse(options.limit);
      const result = await input.client.fetch<unknown>(
        `*[_type == "author"]
          | order(name asc, _id asc)
          [0...$limit] ${authorProjection}`,
        { limit },
        {
          perspective: "drafts",
          signal: options.abortSignal,
          tag: "content.author-list",
        },
      );

      if (!Array.isArray(result) || result.length > limit) {
        throw new Error("The Sanity author list response is invalid.");
      }

      return result.map((item) => {
        const author = sanityAuthorSchema.parse(item);

        return {
          ...author,
          _id: createPublishedId(author._id),
        };
      });
    },
    async listBlogPostEditorSummaries(options: {
      abortSignal?: AbortSignal;
      limit: number;
      locale?: "da-DK" | "en";
    }): Promise<SanityBlogPostEditorialSummary[]> {
      const limit = limitSchema.parse(options.limit);
      const fetchLimit = limit * 2;
      const locale = options.locale
        ? z.enum(["da-DK", "en"]).parse(options.locale)
        : null;
      const result = await input.client.fetch<unknown>(
        `*[
          _type == "blogPost" &&
          !(_id in path("versions.**")) &&
          ($locale == null || locale == $locale)
        ]
          | order(_updatedAt desc, _id asc)
          [0...$fetchLimit] ${blogPostSummaryProjection}`,
        { fetchLimit, locale },
        {
          perspective: "raw",
          signal: options.abortSignal,
          tag: "content.blog-post-editor-list",
        },
      );

      if (!Array.isArray(result) || result.length > fetchLimit) {
        throw new Error(
          "The Sanity blog post editor list response is invalid.",
        );
      }

      const grouped = new Map<string, SanityBlogPostEditorialSummary>();

      for (const item of result) {
        const post = sanityBlogPostSummarySchema.parse(item);
        const documentId = createPublishedId(post._id);
        const current = grouped.get(documentId);
        const isDraft = post._id.startsWith("drafts.");

        grouped.set(documentId, {
          documentId,
          draftRevision: isDraft ? post._rev : current?.draftRevision,
          post: isDraft
            ? {
                ...post,
                _id: documentId,
              }
            : (current?.post ?? {
                ...post,
                _id: documentId,
              }),
          publishedRevision: isDraft ? current?.publishedRevision : post._rev,
        });
      }

      return [...grouped.values()].slice(0, limit);
    },
    async listBlogPosts(options: {
      abortSignal?: AbortSignal;
      limit: number;
      locale?: "da-DK" | "en";
    }): Promise<SanityBlogPostSummary[]> {
      const limit = limitSchema.parse(options.limit);
      const locale = options.locale
        ? z.enum(["da-DK", "en"]).parse(options.locale)
        : null;
      const result = await input.client.fetch<unknown>(
        `*[
          _type == "blogPost" &&
          ($locale == null || locale == $locale)
        ]
          | order(_updatedAt desc, _id asc)
          [0...$limit] ${blogPostSummaryProjection}`,
        { limit, locale },
        {
          perspective: "drafts",
          signal: options.abortSignal,
          tag: "content.blog-post-draft-list",
        },
      );

      if (!Array.isArray(result) || result.length > limit) {
        throw new Error("The Sanity blog post list response is invalid.");
      }

      return result.map((item) => {
        const post = sanityBlogPostSummarySchema.parse(item);

        return {
          ...post,
          _id: createPublishedId(post._id),
        };
      });
    },
    async listCategories(options: {
      abortSignal?: AbortSignal;
      limit: number;
    }): Promise<SanityCategory[]> {
      const limit = limitSchema.parse(options.limit);
      const result = await input.client.fetch<unknown>(
        `*[_type == "category"]
          | order(title asc, _id asc)
          [0...$limit] ${categoryProjection}`,
        { limit },
        {
          perspective: "drafts",
          signal: options.abortSignal,
          tag: "content.category-list",
        },
      );

      if (!Array.isArray(result) || result.length > limit) {
        throw new Error("The Sanity category list response is invalid.");
      }

      return result.map((item) => {
        const category = sanityCategorySchema.parse(item);

        return {
          ...category,
          _id: createPublishedId(category._id),
        };
      });
    },
    async listImageAssets(options: {
      abortSignal?: AbortSignal;
      limit: number;
    }): Promise<SanityImageAsset[]> {
      const limit = limitSchema.parse(options.limit);
      const result = await input.client.fetch<unknown>(
        `*[_type == "sanity.imageAsset"]
          | order(_createdAt desc, _id asc)
          [0...$limit] ${imageAssetProjection}`,
        { limit },
        {
          perspective: "raw",
          signal: options.abortSignal,
          tag: "content.image-asset-list",
        },
      );

      if (!Array.isArray(result) || result.length > limit) {
        throw new Error("The Sanity image asset list response is invalid.");
      }

      return result
        .map((item) => sanityImageAssetSchema.parse(item))
        .map((asset) => requireCanonicalAssetUrl(asset, input.environment));
    },
  };
}

export function createSanityWriteRepository(input: {
  client: SanityClient;
  environment: SanityPublishedEnvironment;
}) {
  return {
    async createBlogPostDraft(options: {
      commandId: string;
      content: unknown;
    }): Promise<{ documentId: string; transactionId: string }> {
      const commandId = commandIdSchema.parse(options.commandId);
      const content = sanityBlogPostDraftInputSchema.parse(options.content);
      const publishedId = createPublishedId(`blog-post-${commandId}`);
      const draftId = createDraftId(publishedId);
      const result = await input.client.action(
        {
          actionType: "sanity.action.document.create",
          attributes: {
            _id: draftId,
            _type: "blogPost",
            ...content,
          },
          ifExists: "ignore",
          publishedId,
        },
        {
          tag: "content.blog-post-create",
          transactionId: commandId,
        },
      );

      return {
        documentId: publishedId,
        transactionId: result.transactionId,
      };
    },
    async publishBlogPost(options: {
      commandId: string;
      documentId: string;
      expectedDraftRevision: string;
      expectedPublishedRevision?: string;
    }): Promise<{ transactionId: string }> {
      const commandId = commandIdSchema.parse(options.commandId);
      const publishedId = documentIdSchema.parse(options.documentId);
      const expectedDraftRevision = revisionSchema.parse(
        options.expectedDraftRevision,
      );
      const expectedPublishedRevision = options.expectedPublishedRevision
        ? revisionSchema.parse(options.expectedPublishedRevision)
        : undefined;
      const result = await input.client.action(
        {
          actionType: "sanity.action.document.publish",
          draftId: createDraftId(publishedId as PublishedId),
          ifDraftRevisionId: expectedDraftRevision,
          ...(expectedPublishedRevision
            ? { ifPublishedRevisionId: expectedPublishedRevision }
            : {}),
          publishedId,
        },
        {
          tag: "content.blog-post-publish",
          transactionId: commandId,
        },
      );

      return {
        transactionId: result.transactionId,
      };
    },
    async saveBlogPostDraft(options: {
      commandId: string;
      content: unknown;
      documentId: string;
      expectedRevision: string;
    }): Promise<{ transactionId: string }> {
      const commandId = commandIdSchema.parse(options.commandId);
      const content = sanityBlogPostDraftInputSchema.parse(options.content);
      const publishedId = documentIdSchema.parse(options.documentId);
      const expectedRevision = revisionSchema.parse(options.expectedRevision);
      const result = await input.client.action(
        {
          actionType: "sanity.action.document.edit",
          draftId: createDraftId(publishedId as PublishedId),
          patch: {
            ifRevisionID: expectedRevision,
            set: content,
            ...(content.publishedAt ? {} : { unset: ["publishedAt"] }),
          },
          publishedId,
        },
        {
          tag: "content.blog-post-save",
          transactionId: commandId,
        },
      );

      return {
        transactionId: result.transactionId,
      };
    },
    async unpublishBlogPost(options: {
      commandId: string;
      documentId: string;
      expectedPublishedRevision: string;
      publishedContent: unknown;
    }): Promise<{ transactionId: string }> {
      const commandId = commandIdSchema.parse(options.commandId);
      const publishedId = documentIdSchema.parse(options.documentId);
      const expectedPublishedRevision = revisionSchema.parse(
        options.expectedPublishedRevision,
      );
      const publishedContent = sanityBlogPostDraftInputSchema.parse(
        options.publishedContent,
      );
      const result = await input.client
        .transaction()
        .createIfNotExists({
          _id: createDraftId(publishedId as PublishedId),
          _type: "blogPost",
          ...publishedContent,
        })
        .patch(publishedId, {
          ifRevisionID: expectedPublishedRevision,
        })
        .delete(publishedId)
        .transactionId(commandId)
        .commit({
          returnDocuments: false,
          tag: "content.blog-post-unpublish",
        });

      return {
        transactionId: result.transactionId,
      };
    },
    async uploadImage(options: {
      bytes: Uint8Array;
      filename: string;
    }): Promise<SanityImageAsset> {
      const upload = imageUploadSchema.parse({
        bytes: options.bytes,
        filename: options.filename,
      });
      const result = await input.client.assets.upload(
        "image",
        Buffer.from(upload.bytes),
        {
          contentType: "image/webp",
          filename: upload.filename,
          tag: "content.image-asset-upload",
          timeout: 15_000,
        },
      );
      const asset = sanityImageAssetSchema.parse(result);

      return requireCanonicalAssetUrl(asset, input.environment);
    },
  };
}

import { z } from "zod";

const internalHrefControlCharacterPattern = /[\u0000-\u0020\u007f]/u;
const internalHrefBaseUrl = "https://shapewebs.invalid";

export function isSafeInternalHref(value: string): boolean {
  if (
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\") ||
    internalHrefControlCharacterPattern.test(value)
  ) {
    return false;
  }

  try {
    const parsed = new URL(value, internalHrefBaseUrl);

    return (
      parsed.origin === internalHrefBaseUrl &&
      `${parsed.pathname}${parsed.search}${parsed.hash}` === value
    );
  } catch {
    return false;
  }
}

const internalHrefSchema = z
  .string()
  .trim()
  .min(1)
  .max(240)
  .refine(isSafeInternalHref, {
    message: "Links must use a normalized internal path beginning with '/'.",
  });

export const richTextNodeSchema = z
  .object({
    type: z.string(),
    attrs: z.record(z.string(), z.unknown()).optional(),
    content: z.array(z.unknown()).optional(),
    text: z.string().optional(),
  })
  .strict();

export const heroBlockSchema = z
  .object({
    type: z.literal("hero"),
    eyebrow: z.string().max(80).optional(),
    heading: z.string().min(1).max(140),
    body: z.string().max(1200).optional(),
    primaryCtaLabel: z.string().min(1).max(40).optional(),
    primaryCtaHref: internalHrefSchema.optional(),
  })
  .strict()
  .refine(
    (block) => Boolean(block.primaryCtaLabel) === Boolean(block.primaryCtaHref),
    {
      message: "A primary CTA requires both a label and an internal link.",
      path: ["primaryCtaHref"],
    },
  );

export const richTextBlockSchema = z
  .object({
    type: z.literal("rich_text"),
    document: z.array(richTextNodeSchema),
  })
  .strict();

export const imageBlockSchema = z
  .object({
    type: z.literal("image"),
    assetId: z.string().uuid(),
    caption: z.string().max(280).optional(),
    layout: z.enum(["full", "contained"]).default("contained"),
  })
  .strict();

export const ctaBlockSchema = z
  .object({
    type: z.literal("cta"),
    heading: z.string().min(1).max(120),
    body: z.string().max(500).optional(),
    label: z.string().min(1).max(40),
    href: internalHrefSchema,
  })
  .strict();

export const faqItemSchema = z
  .object({
    question: z.string().min(1).max(200),
    answer: z.array(richTextNodeSchema),
  })
  .strict();

export const faqBlockSchema = z
  .object({
    type: z.literal("faq"),
    heading: z.string().max(120).optional(),
    items: z.array(faqItemSchema).min(1),
  })
  .strict();

export const contentBlockSchema = z.discriminatedUnion("type", [
  heroBlockSchema,
  richTextBlockSchema,
  imageBlockSchema,
  ctaBlockSchema,
  faqBlockSchema,
]);

export const contentDocumentSchema = z
  .object({
    schemaVersion: z.literal(1),
    blocks: z.array(contentBlockSchema),
  })
  .strict();

export type ContentBlock = z.infer<typeof contentBlockSchema>;
export type ContentDocument = z.infer<typeof contentDocumentSchema>;

const sanityIdentifierSegmentPattern = /^[A-Za-z0-9_-]+$/u;
const sanitySlugSegmentPattern = /^[a-z0-9]+$/u;

function hasSafeSanityIdentifierSegments(value: string): boolean {
  return value
    .split(".")
    .every(
      (segment) =>
        segment.length > 0 && sanityIdentifierSegmentPattern.test(segment),
    );
}

export function isSafeSanitySlug(value: string): boolean {
  return value
    .split("-")
    .every(
      (segment) => segment.length > 0 && sanitySlugSegmentPattern.test(segment),
    );
}

const sanityArrayKeySchema = z
  .string()
  .min(1)
  .max(96)
  .regex(/^[A-Za-z0-9_-]+$/u);
const sanityDocumentIdSchema = z
  .string()
  .min(1)
  .max(128)
  .refine(hasSafeSanityIdentifierSegments, {
    message: "Sanity document IDs may not contain empty path segments.",
  });
const sanityRevisionSchema = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[A-Za-z0-9_-]+$/u);
const sanityAssetReferenceIdSchema = z
  .string()
  .min(1)
  .max(180)
  .regex(/^image-[a-f0-9]+-[1-9][0-9]*x[1-9][0-9]*-[a-z0-9]+$/u);
const publicHttpsUrlSchema = z
  .url()
  .max(512)
  .refine((value) => {
    try {
      const parsed = new URL(value);

      return (
        parsed.protocol === "https:" &&
        !parsed.username &&
        !parsed.password &&
        !parsed.port
      );
    } catch {
      return false;
    }
  }, "External links must use HTTPS without credentials or a custom port.");
const publicContentHrefSchema = z
  .string()
  .trim()
  .min(1)
  .max(512)
  .refine(
    (value) =>
      isSafeInternalHref(value) ||
      publicHttpsUrlSchema.safeParse(value).success,
    "Links must be a normalized internal path or a safe HTTPS URL.",
  );
const portableTextDecoratorSchema = z.enum([
  "code",
  "em",
  "strike-through",
  "strong",
  "underline",
]);

export const sanityReferenceSchema = z
  .object({
    _ref: sanityDocumentIdSchema,
    _type: z.literal("reference"),
    _weak: z.literal(false).optional(),
  })
  .strict();

export const sanityAssetReferenceSchema = z
  .object({
    _ref: sanityAssetReferenceIdSchema,
    _type: z.literal("reference"),
    _weak: z.literal(false).optional(),
  })
  .strict();

export const sanityImageCropSchema = z
  .object({
    _type: z.literal("sanity.imageCrop"),
    bottom: z.number().min(0).max(1),
    left: z.number().min(0).max(1),
    right: z.number().min(0).max(1),
    top: z.number().min(0).max(1),
  })
  .strict();

export const sanityImageHotspotSchema = z
  .object({
    _type: z.literal("sanity.imageHotspot"),
    height: z.number().positive().max(1),
    width: z.number().positive().max(1),
    x: z.number().min(0).max(1),
    y: z.number().min(0).max(1),
  })
  .strict();

const accessibleSanityImageFields = {
  alt: z.string().trim().max(240),
  asset: sanityAssetReferenceSchema,
  caption: z.string().trim().max(400).optional(),
  crop: sanityImageCropSchema.optional(),
  decorative: z.boolean().default(false),
  hotspot: sanityImageHotspotSchema.optional(),
} as const;

export const sanityImageSchema = z
  .object({
    _type: z.literal("image"),
    ...accessibleSanityImageFields,
  })
  .strict()
  .superRefine((image, context) => {
    if (!image.decorative && image.alt.length === 0) {
      context.addIssue({
        code: "custom",
        message: "Non-decorative images require alternative text.",
        path: ["alt"],
      });
    }
  });

export const portableTextImageSchema = z
  .object({
    _key: sanityArrayKeySchema,
    _type: z.literal("image"),
    ...accessibleSanityImageFields,
    layout: z.enum(["contained", "wide", "full"]).default("contained"),
  })
  .strict()
  .superRefine((image, context) => {
    if (!image.decorative && image.alt.length === 0) {
      context.addIssue({
        code: "custom",
        message: "Non-decorative images require alternative text.",
        path: ["alt"],
      });
    }
  });

export const portableTextLinkMarkSchema = z
  .object({
    _key: sanityArrayKeySchema,
    _type: z.literal("link"),
    href: publicContentHrefSchema,
  })
  .strict();

export const portableTextSpanSchema = z
  .object({
    _key: sanityArrayKeySchema,
    _type: z.literal("span"),
    marks: z.array(z.string().min(1).max(96)).max(16).default([]),
    text: z.string().max(20_000),
  })
  .strict();

export const portableTextBlockSchema = z
  .object({
    _key: sanityArrayKeySchema,
    _type: z.literal("block"),
    children: z.array(portableTextSpanSchema).min(1).max(256),
    level: z.number().int().min(1).max(6).optional(),
    listItem: z.enum(["bullet", "number"]).optional(),
    markDefs: z.array(portableTextLinkMarkSchema).max(64).default([]),
    style: z.enum(["normal", "h2", "h3", "h4", "blockquote"]).default("normal"),
  })
  .strict()
  .superRefine((block, context) => {
    const markDefinitionKeys = new Set(
      block.markDefs.map((definition) => definition._key),
    );

    for (const [spanIndex, span] of block.children.entries()) {
      for (const [markIndex, mark] of span.marks.entries()) {
        if (
          !portableTextDecoratorSchema.safeParse(mark).success &&
          !markDefinitionKeys.has(mark)
        ) {
          context.addIssue({
            code: "custom",
            message: "Text marks must be known decorators or mark definitions.",
            path: ["children", spanIndex, "marks", markIndex],
          });
        }
      }
    }
  });

export const portableTextCalloutSchema = z
  .object({
    _key: sanityArrayKeySchema,
    _type: z.literal("callout"),
    body: z.string().trim().min(1).max(1_500),
    heading: z.string().trim().max(120).optional(),
    tone: z.enum(["info", "success", "warning"]).default("info"),
  })
  .strict();

export const portableTextCtaSchema = z
  .object({
    _key: sanityArrayKeySchema,
    _type: z.literal("cta"),
    heading: z.string().trim().max(120).optional(),
    href: publicContentHrefSchema,
    label: z.string().trim().min(1).max(60),
  })
  .strict();

export const portableTextCodeSchema = z
  .object({
    _key: sanityArrayKeySchema,
    _type: z.literal("codeBlock"),
    code: z.string().min(1).max(40_000),
    filename: z.string().trim().max(180).optional(),
    language: z
      .enum([
        "bash",
        "css",
        "html",
        "javascript",
        "json",
        "text",
        "tsx",
        "typescript",
      ])
      .default("text"),
  })
  .strict();

export const portableTextContentBlockSchema = z.discriminatedUnion("_type", [
  portableTextBlockSchema,
  portableTextCalloutSchema,
  portableTextCodeSchema,
  portableTextCtaSchema,
  portableTextImageSchema,
]);

export const portableTextContentSchema = z
  .array(portableTextContentBlockSchema)
  .min(1)
  .max(1_000)
  .superRefine((blocks, context) => {
    const keys = new Set<string>();

    for (const [index, block] of blocks.entries()) {
      if (keys.has(block._key)) {
        context.addIssue({
          code: "custom",
          message: "Portable Text block keys must be unique.",
          path: [index, "_key"],
        });
      }

      keys.add(block._key);
    }
  });

export const sanitySlugSchema = z
  .object({
    _type: z.literal("slug"),
    current: z.string().min(1).max(120).refine(isSafeSanitySlug),
  })
  .strict();

export const sanitySeoSchema = z
  .object({
    description: z.string().trim().max(320).optional(),
    image: sanityImageSchema.optional(),
    noIndex: z.boolean().default(false),
    title: z.string().trim().max(70).optional(),
  })
  .strict();

const sanityDocumentSystemFields = {
  _createdAt: z.iso.datetime({ offset: true }),
  _id: sanityDocumentIdSchema,
  _rev: sanityRevisionSchema,
  _updatedAt: z.iso.datetime({ offset: true }),
} as const;

export const sanityBlogPostSchema = z
  .object({
    ...sanityDocumentSystemFields,
    _type: z.literal("blogPost"),
    author: sanityReferenceSchema,
    body: portableTextContentSchema,
    categories: z.array(sanityReferenceSchema).max(12).default([]),
    coverImage: sanityImageSchema,
    excerpt: z.string().trim().min(1).max(320),
    locale: z.enum(["en", "da-DK"]),
    publishedAt: z.iso.datetime({ offset: true }).optional(),
    seo: sanitySeoSchema,
    slug: sanitySlugSchema,
    title: z.string().trim().min(1).max(140),
  })
  .strict();

export const sanityBlogPostDraftInputSchema = sanityBlogPostSchema
  .omit({
    _createdAt: true,
    _id: true,
    _rev: true,
    _type: true,
    _updatedAt: true,
  })
  .strict();

export const sanityBlogPostSummarySchema = sanityBlogPostSchema
  .omit({
    author: true,
    body: true,
    categories: true,
    seo: true,
  })
  .strict();

export const sanityImageAssetSchema = z
  .object({
    ...sanityDocumentSystemFields,
    _type: z.literal("sanity.imageAsset"),
    metadata: z
      .object({
        blurHash: z.string().min(1).max(200).optional(),
        dimensions: z
          .object({
            aspectRatio: z.number().positive().max(100),
            height: z.number().int().positive().max(20_000),
            width: z.number().int().positive().max(20_000),
          })
          .strict(),
        lqip: z.string().min(1).max(20_000).optional(),
      })
      .strict(),
    mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]),
    originalFilename: z.string().trim().min(1).max(180),
    size: z
      .number()
      .int()
      .positive()
      .max(25 * 1_024 * 1_024),
    url: z
      .url()
      .max(1_024)
      .refine((value) => {
        try {
          const parsed = new URL(value);

          return (
            parsed.protocol === "https:" &&
            parsed.hostname === "cdn.sanity.io" &&
            !parsed.username &&
            !parsed.password &&
            !parsed.port &&
            !parsed.search &&
            !parsed.hash
          );
        } catch {
          return false;
        }
      }, "Sanity image assets must use the canonical CDN origin."),
  })
  .strict();

const optionalSanityWebhookLocaleSchema = z
  .enum(["en", "da-DK"])
  .nullish()
  .transform((value) => value ?? undefined);
const optionalSanityWebhookSlugSchema = z
  .string()
  .min(1)
  .max(120)
  .refine(isSafeSanitySlug)
  .nullish()
  .transform((value) => value ?? undefined);

export const sanityWebhookPayloadSchema = z
  .object({
    _id: sanityDocumentIdSchema,
    _type: z.enum(["author", "blogPost", "category"]),
    locale: optionalSanityWebhookLocaleSchema,
    operation: z.enum(["create", "delete", "update"]),
    previousLocale: optionalSanityWebhookLocaleSchema,
    previousSlug: optionalSanityWebhookSlugSchema,
    slug: optionalSanityWebhookSlugSchema,
  })
  .strict();

export const sanityAuthorSchema = z
  .object({
    ...sanityDocumentSystemFields,
    _type: z.literal("author"),
    bio: z.string().trim().max(600).optional(),
    name: z.string().trim().min(1).max(100),
    portrait: sanityImageSchema.optional(),
    slug: sanitySlugSchema,
  })
  .strict();

export const sanityCategorySchema = z
  .object({
    ...sanityDocumentSystemFields,
    _type: z.literal("category"),
    description: z.string().trim().max(320).optional(),
    slug: sanitySlugSchema,
    title: z.string().trim().min(1).max(80),
  })
  .strict();

export type PortableTextContent = z.infer<typeof portableTextContentSchema>;
export type SanityAuthor = z.infer<typeof sanityAuthorSchema>;
export type SanityBlogPost = z.infer<typeof sanityBlogPostSchema>;
export type SanityBlogPostDraftInput = z.infer<
  typeof sanityBlogPostDraftInputSchema
>;
export type SanityBlogPostSummary = z.infer<typeof sanityBlogPostSummarySchema>;
export type SanityCategory = z.infer<typeof sanityCategorySchema>;
export type SanityImage = z.infer<typeof sanityImageSchema>;
export type SanityImageAsset = z.infer<typeof sanityImageAssetSchema>;
export type SanityWebhookPayload = z.infer<typeof sanityWebhookPayloadSchema>;

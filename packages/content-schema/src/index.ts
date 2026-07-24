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

export const richTextNodeSchema = z.object({
  type: z.string(),
  attrs: z.record(z.string(), z.unknown()).optional(),
  content: z.array(z.unknown()).optional(),
  text: z.string().optional(),
});

export const heroBlockSchema = z
  .object({
    type: z.literal("hero"),
    eyebrow: z.string().max(80).optional(),
    heading: z.string().min(1).max(140),
    body: z.string().max(1200).optional(),
    primaryCtaLabel: z.string().min(1).max(40).optional(),
    primaryCtaHref: internalHrefSchema.optional(),
  })
  .refine(
    (block) => Boolean(block.primaryCtaLabel) === Boolean(block.primaryCtaHref),
    {
      message: "A primary CTA requires both a label and an internal link.",
      path: ["primaryCtaHref"],
    },
  );

export const richTextBlockSchema = z.object({
  type: z.literal("rich_text"),
  document: z.array(richTextNodeSchema),
});

export const imageBlockSchema = z.object({
  type: z.literal("image"),
  assetId: z.string().uuid(),
  caption: z.string().max(280).optional(),
  layout: z.enum(["full", "contained"]).default("contained"),
});

export const ctaBlockSchema = z.object({
  type: z.literal("cta"),
  heading: z.string().min(1).max(120),
  body: z.string().max(500).optional(),
  label: z.string().min(1).max(40),
  href: internalHrefSchema,
});

export const faqItemSchema = z.object({
  question: z.string().min(1).max(200),
  answer: z.array(richTextNodeSchema),
});

export const faqBlockSchema = z.object({
  type: z.literal("faq"),
  heading: z.string().max(120).optional(),
  items: z.array(faqItemSchema).min(1),
});

export const contentBlockSchema = z.discriminatedUnion("type", [
  heroBlockSchema,
  richTextBlockSchema,
  imageBlockSchema,
  ctaBlockSchema,
  faqBlockSchema,
]);

export const contentDocumentSchema = z.object({
  schemaVersion: z.literal(1),
  blocks: z.array(contentBlockSchema),
});

export type ContentBlock = z.infer<typeof contentBlockSchema>;
export type ContentDocument = z.infer<typeof contentDocumentSchema>;

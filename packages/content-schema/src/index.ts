import { z } from "zod";

export const richTextNodeSchema = z.object({
  type: z.string(),
  attrs: z.record(z.string(), z.unknown()).optional(),
  content: z.array(z.unknown()).optional(),
  text: z.string().optional(),
});

export const heroBlockSchema = z.object({
  type: z.literal("hero"),
  eyebrow: z.string().max(80).optional(),
  heading: z.string().min(1).max(140),
  body: z.string().max(1200).optional(),
  primaryCtaLabel: z.string().max(40).optional(),
  primaryCtaHref: z.string().max(240).optional(),
});

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
  href: z.string().max(240),
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

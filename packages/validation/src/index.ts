import { z } from "zod";
import { supportedLocales } from "@shapewebs/i18n";

export { readBoundedText } from "./http";

const localeCodes = supportedLocales.map((locale) => locale.code);
const localeCodeEnum = z.enum(localeCodes as [string, ...string[]]);
const emailAddressSchema = z.email();
const notificationMailboxSchema = z
  .string()
  .trim()
  .min(3)
  .max(320)
  .refine((value) => {
    if (emailAddressSchema.safeParse(value).success) {
      return true;
    }

    const displayMailbox = /^[^<>\r\n]{1,100}\s<([^<>\r\n]+)>$/.exec(value);
    return Boolean(
      displayMailbox &&
      emailAddressSchema.safeParse(displayMailbox[1]?.trim()).success,
    );
  }, "Must be one valid email mailbox.");

const sharedEnvSchema = z.object({
  ADMIN_OWNER_EMAILS: z.string().min(3).optional(),
  BETTER_AUTH_SECRET: z.string().min(32).optional(),
  BETTER_AUTH_URL: z.url().optional(),
  CRON_SECRET: z.string().min(32).optional(),
  DATABASE_URL: z.string().min(1).optional(),
  GOOGLE_CLIENT_ID: z.string().min(1).optional(),
  GOOGLE_CLIENT_SECRET: z.string().min(1).optional(),
  LEAD_IP_HASH_SECRET: z.string().min(32).optional(),
  LEAD_NOTIFICATION_FROM_EMAIL: notificationMailboxSchema.optional(),
  LEAD_NOTIFICATION_TO_EMAIL: emailAddressSchema.optional(),
  NEXT_PUBLIC_SITE_URL: z.url().optional(),
  NEXT_PUBLIC_ADMIN_URL: z.url().optional(),
  NEXT_PUBLIC_SUPABASE_URL: z.url().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1).optional(),
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: z.string().min(1).optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  SYNTHETIC_RETENTION_SECRET: z.string().min(32).optional(),
  PREVIEW_TOKEN_SECRET: z.string().min(32).optional(),
  REVALIDATION_WEBHOOK_SECRET: z.string().min(32).optional(),
  RESEND_API_KEY: z.string().min(1).optional(),
  RESEND_WEBHOOK_SECRET: z.string().min(1).optional(),
  SHAPEWEBS_ORGANIZATION_ID: z.string().uuid().optional(),
  TURNSTILE_EXPECTED_HOSTNAME: z.string().min(1).optional(),
  TURNSTILE_SECRET_KEY: z.string().min(1).optional(),
  SENTRY_DSN: z.string().min(1).optional(),
});

export const webEnvSchema = sharedEnvSchema.pick({
  DATABASE_URL: true,
  LEAD_IP_HASH_SECRET: true,
  NEXT_PUBLIC_SITE_URL: true,
  NEXT_PUBLIC_SUPABASE_URL: true,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: true,
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: true,
  SHAPEWEBS_ORGANIZATION_ID: true,
  TURNSTILE_EXPECTED_HOSTNAME: true,
  TURNSTILE_SECRET_KEY: true,
  PREVIEW_TOKEN_SECRET: true,
  REVALIDATION_WEBHOOK_SECRET: true,
  SENTRY_DSN: true,
});

export const adminEnvSchema = sharedEnvSchema.pick({
  ADMIN_OWNER_EMAILS: true,
  BETTER_AUTH_SECRET: true,
  BETTER_AUTH_URL: true,
  CRON_SECRET: true,
  DATABASE_URL: true,
  GOOGLE_CLIENT_ID: true,
  GOOGLE_CLIENT_SECRET: true,
  LEAD_NOTIFICATION_FROM_EMAIL: true,
  LEAD_NOTIFICATION_TO_EMAIL: true,
  NEXT_PUBLIC_ADMIN_URL: true,
  NEXT_PUBLIC_SITE_URL: true,
  NEXT_PUBLIC_SUPABASE_URL: true,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: true,
  SUPABASE_SERVICE_ROLE_KEY: true,
  SYNTHETIC_RETENTION_SECRET: true,
  PREVIEW_TOKEN_SECRET: true,
  REVALIDATION_WEBHOOK_SECRET: true,
  RESEND_API_KEY: true,
  RESEND_WEBHOOK_SECRET: true,
  SHAPEWEBS_ORGANIZATION_ID: true,
  SENTRY_DSN: true,
});

export const serverEnvSchema = sharedEnvSchema;

function stripEmptyValues(env: Record<string, string | undefined>) {
  return Object.fromEntries(
    Object.entries(env).filter(
      ([, value]) => value !== undefined && value !== "",
    ),
  );
}

export function parseWebEnv(
  env: Record<string, string | undefined> = process.env,
) {
  return webEnvSchema.parse(stripEmptyValues(env));
}

export function parseAdminEnv(
  env: Record<string, string | undefined> = process.env,
) {
  return adminEnvSchema.parse(stripEmptyValues(env));
}

export function parseServerEnv(
  env: Record<string, string | undefined> = process.env,
) {
  return serverEnvSchema.parse(stripEmptyValues(env));
}

export function hasSupabaseBrowserEnv(
  env: Record<string, string | undefined> = process.env,
) {
  return Boolean(
    env.NEXT_PUBLIC_SUPABASE_URL && env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

export function hasSupabaseServiceEnv(
  env: Record<string, string | undefined> = process.env,
) {
  return Boolean(
    env.NEXT_PUBLIC_SUPABASE_URL &&
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
    env.SUPABASE_SERVICE_ROLE_KEY,
  );
}

export const adminLoginSchema = z.object({
  email: z.email(),
  password: z.string().min(8).max(200),
  redirectTo: z.string().max(500).optional(),
});

export const mfaChallengeSchema = z.object({
  factorId: z.string().min(1),
  challengeId: z.string().min(1),
  code: z.string().trim().min(6).max(12),
  redirectTo: z.string().max(500).optional(),
});

export const mfaEnrollSchema = z.object({
  friendlyName: z.string().trim().min(2).max(80).default("Shapewebs Admin"),
});

export const documentFiltersSchema = z.object({
  contentType: z
    .enum(["page", "post", "project", "service", "method", "legal"])
    .optional(),
  localeCode: localeCodeEnum.optional(),
  state: z
    .enum(["draft", "review", "scheduled", "published", "archived"])
    .optional(),
});

const canonicalHttpsUrlSchema = z
  .string()
  .trim()
  .max(500)
  .refine(
    (value) => {
      try {
        const url = new URL(value);

        return (
          url.protocol === "https:" &&
          url.username.length === 0 &&
          url.password.length === 0
        );
      } catch {
        return false;
      }
    },
    {
      message: "Canonical URL overrides must use HTTPS without credentials.",
    },
  );

export const pageEditorInputSchema = z.object({
  documentId: z.string().uuid().optional(),
  localeCode: localeCodeEnum.default("en"),
  pageKind: z.string().trim().min(1).max(80).default("standard"),
  title: z.string().trim().min(1).max(140),
  slug: z
    .string()
    .trim()
    .min(1)
    .max(180)
    .regex(/^[a-z0-9-]+$/)
    .refine(
      (value) =>
        !value.startsWith("-") && !value.endsWith("-") && !value.includes("--"),
      "Slug must use single hyphens between lowercase letters and numbers.",
    ),
  summary: z.string().trim().max(320).optional(),
  metaTitle: z.string().trim().max(160).optional(),
  metaDescription: z.string().trim().max(320).optional(),
  canonicalUrlOverride: canonicalHttpsUrlSchema.optional(),
  robotsIndex: z.boolean().default(true),
  contentJson: z.string().trim().min(2),
  changeNote: z.string().trim().max(240).optional(),
  intent: z.enum(["draft", "review", "publish", "preview"]).default("draft"),
});

export const mediaUploadSchema = z.object({
  altText: z.string().trim().min(1).max(180),
  caption: z.string().trim().max(280).optional(),
  localeCode: localeCodeEnum.default("en"),
});

export const contactFormSchema = z.object({
  name: z.string().min(1).max(120),
  email: z.email(),
  company: z.string().max(160).optional(),
  message: z.string().min(10).max(4000),
  localeCode: localeCodeEnum.default("en"),
  consentAccepted: z.literal(true),
});

export const projectInquirySchema = contactFormSchema.extend({
  budgetBand: z.string().max(80).optional(),
  timeline: z.string().max(80).optional(),
  serviceInterest: z.string().max(120).optional(),
});

export type ContactFormInput = z.infer<typeof contactFormSchema>;
export type ProjectInquiryInput = z.infer<typeof projectInquirySchema>;
export type AdminLoginInput = z.infer<typeof adminLoginSchema>;
export type MfaChallengeInput = z.infer<typeof mfaChallengeSchema>;
export type MfaEnrollInput = z.infer<typeof mfaEnrollSchema>;
export type PageEditorInput = z.infer<typeof pageEditorInputSchema>;
export type DocumentFiltersInput = z.infer<typeof documentFiltersSchema>;
export type MediaUploadInput = z.infer<typeof mediaUploadSchema>;

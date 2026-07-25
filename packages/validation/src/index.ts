import { z } from "zod";
import { supportedLocales } from "@shapewebs/i18n";

export { readBoundedText } from "./http";

const localeCodes = supportedLocales.map((locale) => locale.code);
const localeCodeEnum = z.enum(localeCodes as [string, ...string[]]);

function isSafeSettingsKey(value: string) {
  const separators = new Set([".", "_", "-"]);

  if (separators.has(value[0] ?? "") || separators.has(value.at(-1) ?? "")) {
    return false;
  }

  for (const [index, character] of [...value].entries()) {
    const isLowercaseLetter = character >= "a" && character <= "z";
    const isNumber = character >= "0" && character <= "9";

    if (!isLowercaseLetter && !isNumber && !separators.has(character)) {
      return false;
    }

    if (separators.has(character) && separators.has(value[index - 1] ?? "")) {
      return false;
    }
  }

  return true;
}

const settingsKeySchema = z
  .string()
  .trim()
  .min(1)
  .max(100)
  .refine(isSafeSettingsKey, "Must be a normalized lowercase settings key.");

const settingsLocaleSchema = z
  .object({
    code: localeCodeEnum,
    isDefault: z.boolean(),
    label: z.string().trim().min(1).max(80),
  })
  .strict();

const settingsRegionProfileSchema = z
  .object({
    code: settingsKeySchema,
    displayName: z.string().trim().min(1).max(120),
    ruleSetKey: settingsKeySchema,
  })
  .strict();

const settingsFeatureFlagSchema = z
  .object({
    enabled: z.boolean(),
    key: settingsKeySchema,
  })
  .strict();

const settingsConsentRuleSetSchema = z
  .object({
    defaultMode: z.enum(["inform", "mixed", "opt_in"]),
    key: settingsKeySchema,
  })
  .strict();

export const organizationSettingsValueSchema = z
  .object({
    consentRuleSets: z.array(settingsConsentRuleSetSchema).min(1).max(20),
    cookiePolicyVersions: z
      .array(
        z
          .string()
          .trim()
          .min(1)
          .max(80)
          .refine(
            isSafeSettingsKey,
            "Must be a normalized lowercase policy version.",
          ),
      )
      .min(1)
      .max(20),
    featureFlags: z.array(settingsFeatureFlagSchema).max(100),
    locales: z.array(settingsLocaleSchema).min(1).max(20),
    regionProfiles: z.array(settingsRegionProfileSchema).min(1).max(20),
  })
  .strict()
  .superRefine((settings, context) => {
    const uniqueValues = (values: string[], path: string, message: string) => {
      if (new Set(values).size !== values.length) {
        context.addIssue({
          code: "custom",
          message,
          path: [path],
        });
      }
    };

    uniqueValues(
      settings.locales.map((locale) => locale.code),
      "locales",
      "Locale codes must be unique.",
    );
    uniqueValues(
      settings.regionProfiles.map((profile) => profile.code),
      "regionProfiles",
      "Region profile codes must be unique.",
    );
    uniqueValues(
      settings.featureFlags.map((flag) => flag.key),
      "featureFlags",
      "Feature flag keys must be unique.",
    );
    uniqueValues(
      settings.consentRuleSets.map((ruleSet) => ruleSet.key),
      "consentRuleSets",
      "Consent rule-set keys must be unique.",
    );
    uniqueValues(
      settings.cookiePolicyVersions,
      "cookiePolicyVersions",
      "Cookie-policy versions must be unique.",
    );

    if (settings.locales.filter((locale) => locale.isDefault).length !== 1) {
      context.addIssue({
        code: "custom",
        message: "Exactly one locale must be the default.",
        path: ["locales"],
      });
    }

    const consentRuleSetKeys = new Set(
      settings.consentRuleSets.map((ruleSet) => ruleSet.key),
    );

    for (const [index, profile] of settings.regionProfiles.entries()) {
      if (!consentRuleSetKeys.has(profile.ruleSetKey)) {
        context.addIssue({
          code: "custom",
          message:
            "Region profiles must reference an existing consent rule set.",
          path: ["regionProfiles", index, "ruleSetKey"],
        });
      }
    }
  });
export const emailAddressSchema = z
  .string()
  .trim()
  .min(3)
  .max(320)
  .pipe(z.email());
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
  TURNSTILE_TEST_MODE: z.enum(["true", "false"]).optional(),
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
  TURNSTILE_TEST_MODE: true,
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

const contentTypeSchema = z.enum([
  "page",
  "post",
  "project",
  "service",
  "method",
  "legal",
]);
const contentStateSchema = z.enum([
  "draft",
  "review",
  "scheduled",
  "published",
  "archived",
]);
const contentSlugSchema = z
  .string()
  .trim()
  .min(1)
  .max(180)
  .regex(/^[a-z0-9-]+$/)
  .refine(
    (value) =>
      !value.startsWith("-") && !value.endsWith("-") && !value.includes("--"),
    "Slug must use single hyphens between lowercase letters and numbers.",
  );

export const documentFiltersSchema = z.object({
  contentType: contentTypeSchema.optional(),
  localeCode: localeCodeEnum.optional(),
  state: contentStateSchema.optional(),
});

export const contentDocumentListItemSchema = z
  .object({
    contentType: contentTypeSchema,
    documentId: z.uuid(),
    localeCode: localeCodeEnum,
    pageKind: z.string().trim().min(1).max(80).nullable(),
    publishedAt: z.iso.datetime({ offset: true }).nullable(),
    slug: contentSlugSchema,
    state: contentStateSchema,
    summary: z.string().trim().max(320).nullable(),
    title: z.string().trim().min(1).max(140),
    updatedAt: z.iso.datetime({ offset: true }).nullable(),
  })
  .strict();

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
  slug: contentSlugSchema,
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
export type ContentDocumentListItem = z.infer<
  typeof contentDocumentListItemSchema
>;
export type MediaUploadInput = z.infer<typeof mediaUploadSchema>;
export type OrganizationSettingsValue = z.infer<
  typeof organizationSettingsValueSchema
>;

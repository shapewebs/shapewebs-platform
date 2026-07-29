import { z } from "zod";

export const sanityApiVersion = "2026-07-01";

const projectIdSchema = z
  .string()
  .trim()
  .min(8)
  .max(32)
  .regex(/^[a-z0-9]+$/u);
const datasetSchema = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .regex(/^[a-z][a-z0-9_-]*$/u);
const tokenSchema = z
  .string()
  .min(32)
  .max(2_048)
  .refine(
    (value) => !/[\s\u0000-\u001f\u007f]/u.test(value),
    "Sanity credentials may not contain whitespace or control characters.",
  );
const webhookSecretSchema = z
  .string()
  .min(32)
  .max(256)
  .refine(
    (value) => !/[\u0000-\u001f\u007f]/u.test(value),
    "The Sanity webhook secret may not contain control characters.",
  );

export type SanityEnvironmentSource = Readonly<
  Record<string, string | undefined>
>;

export type SanityPublishedEnvironment = {
  apiVersion: typeof sanityApiVersion;
  dataset: string;
  projectId: string;
};

export type SanityDraftEnvironment = SanityPublishedEnvironment & {
  readToken: string;
};

export type SanityWriteEnvironment = SanityPublishedEnvironment & {
  writeToken: string;
};

export type SanityWebhookEnvironment = SanityPublishedEnvironment & {
  webhookSecret: string;
};

function readBaseEnvironment(
  source: SanityEnvironmentSource,
): SanityPublishedEnvironment {
  return {
    apiVersion: sanityApiVersion,
    dataset: datasetSchema.parse(source.SANITY_DATASET),
    projectId: projectIdSchema.parse(source.SANITY_PROJECT_ID),
  };
}

export function hasAnySanityEnvironmentValue(
  source: SanityEnvironmentSource,
): boolean {
  return [
    source.SANITY_API_READ_TOKEN,
    source.SANITY_API_WRITE_TOKEN,
    source.SANITY_DATASET,
    source.SANITY_PROJECT_ID,
    source.SANITY_WEBHOOK_SECRET,
  ].some((value) => typeof value === "string" && value.length > 0);
}

export function readSanityPublishedEnvironment(
  source: SanityEnvironmentSource,
): SanityPublishedEnvironment {
  return readBaseEnvironment(source);
}

export function readSanityDraftEnvironment(
  source: SanityEnvironmentSource,
): SanityDraftEnvironment {
  return {
    ...readBaseEnvironment(source),
    readToken: tokenSchema.parse(source.SANITY_API_READ_TOKEN),
  };
}

export function readSanityWriteEnvironment(
  source: SanityEnvironmentSource,
): SanityWriteEnvironment {
  return {
    ...readBaseEnvironment(source),
    writeToken: tokenSchema.parse(source.SANITY_API_WRITE_TOKEN),
  };
}

export function readSanityWebhookEnvironment(
  source: SanityEnvironmentSource,
): SanityWebhookEnvironment {
  return {
    ...readBaseEnvironment(source),
    webhookSecret: webhookSecretSchema.parse(source.SANITY_WEBHOOK_SECRET),
  };
}

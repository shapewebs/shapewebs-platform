import "server-only";

import {
  createSanityDraftClient,
  createSanityDraftContentRepository,
  createSanityWriteClient,
  createSanityWriteRepository,
  hasAnySanityEnvironmentValue,
  readSanityDraftEnvironment,
  readSanityWebhookEnvironment,
  readSanityWriteEnvironment,
} from "@shapewebs/content-platform/server";

function requiresSanityContent(environment: NodeJS.ProcessEnv): boolean {
  return (
    environment.VERCEL_ENV === "production" ||
    (environment.VERCEL_ENV === "preview" &&
      environment.VERCEL_GIT_COMMIT_REF === "staging")
  );
}

export function hasAdminSanityIntent(
  environment: NodeJS.ProcessEnv = process.env,
): boolean {
  return (
    requiresSanityContent(environment) ||
    hasAnySanityEnvironmentValue(environment)
  );
}

export function getAdminSanityRuntime(
  environment: NodeJS.ProcessEnv = process.env,
) {
  if (!hasAnySanityEnvironmentValue(environment)) {
    if (requiresSanityContent(environment)) {
      throw new Error(
        "Sanity content is required but unavailable in this environment.",
      );
    }

    return null;
  }

  const draftEnvironment = readSanityDraftEnvironment(environment);
  const writeEnvironment = readSanityWriteEnvironment(environment);
  const webhookEnvironment = readSanityWebhookEnvironment(environment);
  const draftClient = createSanityDraftClient(draftEnvironment);
  const writeClient = createSanityWriteClient(writeEnvironment);

  return {
    draftClient,
    draftRepository: createSanityDraftContentRepository({
      client: draftClient,
      environment: draftEnvironment,
    }),
    webhookEnvironment,
    writeRepository: createSanityWriteRepository({
      client: writeClient,
      environment: writeEnvironment,
    }),
  };
}

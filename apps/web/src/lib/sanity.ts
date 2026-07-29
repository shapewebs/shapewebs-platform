import "server-only";

import {
  createSanityDraftClient,
  createSanityDraftContentRepository,
  createSanityPublishedClient,
  createSanityPublishedContentRepository,
  hasAnySanityEnvironmentValue,
  readSanityDraftEnvironment,
  readSanityPublishedEnvironment,
  resolveSanityImagePresentation,
} from "@shapewebs/content-platform/server";

function requiresSanityContent(environment: NodeJS.ProcessEnv): boolean {
  return (
    environment.VERCEL_ENV === "production" ||
    (environment.VERCEL_ENV === "preview" &&
      environment.VERCEL_GIT_COMMIT_REF === "staging")
  );
}

export function hasWebSanityIntent(
  environment: NodeJS.ProcessEnv = process.env,
): boolean {
  return (
    requiresSanityContent(environment) ||
    hasAnySanityEnvironmentValue(environment)
  );
}

export function getWebSanityDraftRuntime(
  environment: NodeJS.ProcessEnv = process.env,
) {
  if (!environment.SANITY_API_READ_TOKEN) {
    return null;
  }

  const sanityEnvironment = readSanityDraftEnvironment(environment);
  const client = createSanityDraftClient(sanityEnvironment);

  return {
    client,
    repository: createSanityDraftContentRepository({
      client,
      environment: sanityEnvironment,
    }),
    resolveImage: (reference: string) =>
      resolveSanityImagePresentation(sanityEnvironment, reference),
  };
}

export function getWebSanityRuntime(
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

  const sanityEnvironment = readSanityPublishedEnvironment(environment);
  const client = createSanityPublishedClient(sanityEnvironment);

  return {
    client,
    repository: createSanityPublishedContentRepository({
      client,
      environment: sanityEnvironment,
    }),
    resolveImage: (reference: string) =>
      resolveSanityImagePresentation(sanityEnvironment, reference),
  };
}

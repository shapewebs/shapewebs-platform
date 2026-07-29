import "server-only";

import { createClient, type SanityClient } from "@sanity/client";

import type {
  SanityDraftEnvironment,
  SanityPublishedEnvironment,
  SanityWriteEnvironment,
} from "./environment";

const requestTagPrefix = "shapewebs";

export function createSanityPublishedClient(
  environment: SanityPublishedEnvironment,
): SanityClient {
  return createClient({
    apiVersion: environment.apiVersion,
    dataset: environment.dataset,
    perspective: "published",
    projectId: environment.projectId,
    requestTagPrefix,
    useCdn: true,
  });
}

export function createSanityDraftClient(
  environment: SanityDraftEnvironment,
): SanityClient {
  return createClient({
    apiVersion: environment.apiVersion,
    dataset: environment.dataset,
    perspective: "drafts",
    projectId: environment.projectId,
    requestTagPrefix,
    token: environment.readToken,
    useCdn: false,
  });
}

export function createSanityWriteClient(
  environment: SanityWriteEnvironment,
): SanityClient {
  return createClient({
    apiVersion: environment.apiVersion,
    dataset: environment.dataset,
    perspective: "raw",
    projectId: environment.projectId,
    requestTagPrefix,
    token: environment.writeToken,
    useCdn: false,
  });
}

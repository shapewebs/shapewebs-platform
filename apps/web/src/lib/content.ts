import { cookies } from "next/headers";
import type { ContentType } from "@shapewebs/config";
import {
  buildContentRevalidationTags,
  getPreviewContentByToken,
  type PublishedDocument,
} from "@shapewebs/database/server";
import {
  contentRouteMatchesDocument,
  type ResolvedContentRoute,
} from "./content-routing";
import { getPreviewCookiePolicy } from "./preview-cookie";

export function getPublicSiteOrigin() {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

export function getContentDatabaseConfiguration() {
  const databaseUrl = process.env.DATABASE_URL ?? null;
  const organizationId = process.env.SHAPEWEBS_ORGANIZATION_ID ?? null;

  if (Boolean(databaseUrl) !== Boolean(organizationId)) {
    if (process.env.VERCEL_ENV) {
      throw new Error(
        "DATABASE_URL and SHAPEWEBS_ORGANIZATION_ID must be configured together.",
      );
    }

    return { databaseUrl: null, organizationId: null };
  }

  if (
    process.env.VERCEL_ENV === "production" &&
    (!databaseUrl || !organizationId)
  ) {
    throw new Error(
      "Public content is not configured for the production environment.",
    );
  }

  return { databaseUrl, organizationId };
}

async function getPreviewToken() {
  const cookieStore = await cookies();
  const cookiePolicy = getPreviewCookiePolicy(
    process.env.NODE_ENV === "production",
  );
  return cookieStore.get(cookiePolicy.name)?.value ?? null;
}

async function getPreviewDocument() {
  const token = await getPreviewToken();

  if (!token) {
    return null;
  }

  const { databaseUrl, organizationId } = getContentDatabaseConfiguration();

  if (!databaseUrl || !organizationId) {
    return null;
  }

  return getPreviewContentByToken(databaseUrl, organizationId, token);
}

export async function getPrivatePreviewContent(
  route: ResolvedContentRoute,
): Promise<PublishedDocument | null> {
  const document = await getPreviewDocument();

  return document && contentRouteMatchesDocument(route, document)
    ? document
    : null;
}

export function buildRevalidationPayload(input: {
  contentType: ContentType;
  documentId: string;
  localeCode: string;
}) {
  return buildContentRevalidationTags(input);
}

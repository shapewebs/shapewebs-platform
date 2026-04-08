import { cookies, draftMode } from "next/headers";
import { siteConfig, type ContentType } from "@shapewebs/config";
import {
  buildRevalidationTags,
  createAdminSupabaseClient,
  getPageByKind,
  getPreviewContentByRevision,
  getPublishedContentBySlug,
  listPublishedContent,
  type PublishedDocument,
} from "@shapewebs/db";
import { getWebServerSupabaseClient } from "./supabase";
import { buildPageMetadata, getAbsoluteSiteUrl } from "./metadata";

export const previewCookieNames = {
  documentId: "sw-preview-document-id",
  localeCode: "sw-preview-locale-code",
  revisionId: "sw-preview-revision-id",
} as const;

export function getPublicSiteOrigin() {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

function joinPath(localeCode: string, pathname: string) {
  if (localeCode === siteConfig.defaultLocale) {
    return pathname;
  }

  return `/${localeCode}${pathname === "/" ? "" : pathname}`;
}

export function getDocumentPath(document: PublishedDocument) {
  switch (document.contentType) {
    case "page":
      return document.pageKind === "home" || document.slug === "home"
        ? "/"
        : `/${document.slug}`;
    case "post":
      return `/blog/${document.slug}`;
    case "project":
      return `/projects/${document.slug}`;
    case "service":
      return `/services/${document.slug}`;
    case "legal":
      return `/legal/${document.slug}`;
    case "method":
      return `/${document.slug}`;
    default:
      return `/${document.slug}`;
  }
}

export function buildDocumentMetadata(document: PublishedDocument) {
  const pathname = getDocumentPath(document);
  const localizedPath = joinPath(document.localeCode, pathname);
  const canonical = getAbsoluteSiteUrl(localizedPath);

  return {
    ...buildPageMetadata({
      title: document.seo.metaTitle ?? document.title,
      description: document.seo.metaDescription ?? document.summary ?? siteConfig.description,
      path: localizedPath,
      noIndex: !document.seo.robotsIndex,
      type: document.contentType === "post" ? "article" : "website",
    }),
    alternates: {
      canonical,
      languages: {
        en: getAbsoluteSiteUrl(pathname),
        "da-DK": getAbsoluteSiteUrl(joinPath("da-DK", pathname)),
        "x-default": getAbsoluteSiteUrl(pathname),
      },
    },
    robots: {
      index: document.seo.robotsIndex,
      follow: true,
    },
  };
}

async function getPreviewSelection() {
  const cookieStore = await cookies();
  const documentId = cookieStore.get(previewCookieNames.documentId)?.value;
  const localeCode = cookieStore.get(previewCookieNames.localeCode)?.value;
  const revisionId = cookieStore.get(previewCookieNames.revisionId)?.value;

  if (!documentId || !localeCode || !revisionId) {
    return null;
  }

  return {
    documentId,
    localeCode,
    revisionId,
  };
}

async function getPreviewDocument() {
  const draft = await draftMode();

  if (!draft.isEnabled) {
    return null;
  }

  const selection = await getPreviewSelection();

  if (!selection) {
    return null;
  }

  const supabase = createAdminSupabaseClient();

  if (!supabase) {
    return null;
  }

  return getPreviewContentByRevision(supabase, selection);
}

export async function getResolvedHomepage(localeCode = siteConfig.defaultLocale) {
  const previewDocument = await getPreviewDocument();

  if (
    previewDocument &&
    previewDocument.contentType === "page" &&
    previewDocument.localeCode === localeCode &&
    (previewDocument.pageKind === "home" || previewDocument.slug === "home")
  ) {
    return previewDocument;
  }

  const supabase = await getWebServerSupabaseClient();
  return getPageByKind(supabase, "home", localeCode);
}

export async function getResolvedContentBySlug(
  contentType: ContentType,
  slug: string,
  localeCode = siteConfig.defaultLocale,
) {
  const previewDocument = await getPreviewDocument();

  if (
    previewDocument &&
    previewDocument.contentType === contentType &&
    previewDocument.localeCode === localeCode &&
    previewDocument.slug === slug
  ) {
    return previewDocument;
  }

  const supabase = await getWebServerSupabaseClient();
  return getPublishedContentBySlug(supabase, {
    contentType,
    localeCode,
    slug,
  });
}

export async function getResolvedContentList(
  contentType: ContentType,
  localeCode = siteConfig.defaultLocale,
) {
  const supabase = await getWebServerSupabaseClient();
  const items = await listPublishedContent(supabase, contentType, localeCode);
  const previewDocument = await getPreviewDocument();

  if (
    previewDocument &&
    previewDocument.contentType === contentType &&
    previewDocument.localeCode === localeCode &&
    !items.some((item) => item.documentId === previewDocument.documentId)
  ) {
    return [previewDocument, ...items];
  }

  return items;
}

export async function getResolvedGenericPage(slug: string, localeCode = siteConfig.defaultLocale) {
  const homepage = await getResolvedHomepage(localeCode);

  if ((slug === "home" || slug === "") && homepage) {
    return homepage;
  }

  return getResolvedContentBySlug("page", slug, localeCode);
}

export function buildRevalidationPayload(input: {
  contentType: ContentType;
  documentId: string;
  localeCode: string;
}) {
  return buildRevalidationTags(input);
}

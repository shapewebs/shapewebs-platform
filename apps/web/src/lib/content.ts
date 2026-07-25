import { cookies } from "next/headers";
import { siteConfig, type ContentType } from "@shapewebs/config";
import {
  buildContentRevalidationTags,
  getPreviewContentByToken,
  getPublishedContentBySlug,
  getPublishedPageByKind,
  listPublishedContent,
  type PublishedDocument,
  type PublicLocaleCode,
} from "@shapewebs/database/server";
import {
  contentRouteMatchesDocument,
  type ResolvedContentRoute,
} from "./content-routing";
import { buildPageMetadata, getAbsoluteSiteUrl } from "./metadata";
import { getPreviewCookiePolicy } from "./preview-cookie";

export function getPublicSiteOrigin() {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

function getContentDatabaseConfiguration() {
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
      description:
        document.seo.metaDescription ??
        document.summary ??
        siteConfig.description,
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

export async function getPublishedContentList(
  contentType: ContentType,
  localeCode: PublicLocaleCode = siteConfig.defaultLocale,
) {
  const { databaseUrl, organizationId } = getContentDatabaseConfiguration();

  return listPublishedContent(
    databaseUrl,
    organizationId,
    contentType,
    localeCode,
  );
}

async function getResolvedHomepage(
  localeCode: PublicLocaleCode = siteConfig.defaultLocale,
) {
  const { databaseUrl, organizationId } = getContentDatabaseConfiguration();
  return getPublishedPageByKind(
    databaseUrl,
    organizationId,
    "home",
    localeCode,
  );
}

export async function getResolvedContentBySlug(
  contentType: ContentType,
  slug: string,
  localeCode: PublicLocaleCode = siteConfig.defaultLocale,
) {
  const { databaseUrl, organizationId } = getContentDatabaseConfiguration();
  return getPublishedContentBySlug(databaseUrl, organizationId, {
    contentType,
    localeCode,
    slug,
  });
}

export async function getResolvedContentList(
  contentType: ContentType,
  localeCode: PublicLocaleCode = siteConfig.defaultLocale,
) {
  return getPublishedContentList(contentType, localeCode);
}

export async function getResolvedGenericPage(
  slug: string,
  localeCode: PublicLocaleCode = siteConfig.defaultLocale,
) {
  const homepage = await getResolvedHomepage(localeCode);

  if ((slug === "home" || slug === "") && homepage) {
    return homepage;
  }

  const page = await getResolvedContentBySlug("page", slug, localeCode);

  if (page) {
    return page;
  }

  return getResolvedContentBySlug("method", slug, localeCode);
}

export function buildRevalidationPayload(input: {
  contentType: ContentType;
  documentId: string;
  localeCode: string;
}) {
  return buildContentRevalidationTags(input);
}

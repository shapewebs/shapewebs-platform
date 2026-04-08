import type { Metadata } from "next";
import { siteConfig } from "@shapewebs/config";

type BuildPageMetadataInput = {
  title: string;
  description?: string;
  path?: string;
  keywords?: string[];
  noIndex?: boolean;
  imagePath?: string;
  openGraphTitle?: string;
  openGraphDescription?: string;
  type?: "website" | "article";
};

function normalizePath(path = "/") {
  if (path.startsWith("/")) {
    return path;
  }

  return `/${path}`;
}

function buildAbsoluteTitle(title: string) {
  return title === siteConfig.name ? title : `${title} | ${siteConfig.name}`;
}

function mergeKeywords(keywords?: string[]) {
  return Array.from(new Set([...siteConfig.keywords, ...(keywords ?? [])]));
}

export function getAbsoluteSiteUrl(path = "/") {
  return new URL(normalizePath(path), siteConfig.productionUrl).toString();
}

export function buildPageMetadata(input: BuildPageMetadataInput): Metadata {
  const path = normalizePath(input.path);
  const description = input.description ?? siteConfig.description;
  const canonical = getAbsoluteSiteUrl(path);
  const imageUrl = getAbsoluteSiteUrl(input.imagePath ?? siteConfig.ogImagePath);
  const openGraphTitle = input.openGraphTitle ?? buildAbsoluteTitle(input.title);
  const openGraphDescription = input.openGraphDescription ?? description;

  return {
    title: input.title,
    description,
    keywords: mergeKeywords(input.keywords),
    alternates: {
      canonical,
    },
    robots: input.noIndex
      ? {
          index: false,
          follow: false,
        }
      : {
          index: true,
          follow: true,
        },
    openGraph: {
      type: input.type ?? "website",
      url: canonical,
      siteName: siteConfig.name,
      title: openGraphTitle,
      description: openGraphDescription,
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: siteConfig.openGraphTitle,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: openGraphTitle,
      description: openGraphDescription,
      images: [imageUrl],
    },
  };
}

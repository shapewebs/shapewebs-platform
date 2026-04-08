import type { Metadata } from "next";
import { siteConfig } from "@shapewebs/config";
import { ContentPage } from "@/components/content/content-page";
import { buildPageMetadata } from "@/lib/metadata";
import { getResolvedHomepage } from "@/lib/content";

export const metadata: Metadata = buildPageMetadata({
  title: "Beautiful, fast websites built with intention",
  description: siteConfig.description,
  path: "/",
  keywords: [
    "custom websites",
    "business websites",
    "creative web design",
    "website strategy",
  ],
  openGraphTitle: siteConfig.openGraphTitle,
  openGraphDescription: siteConfig.openGraphDescription,
});

export default async function MarketingHomePage() {
  const document = await getResolvedHomepage();

  if (!document) {
    return null;
  }

  return <ContentPage document={document} />;
}

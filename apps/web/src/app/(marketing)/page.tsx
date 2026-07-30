import type { Metadata } from "next";
import { siteConfig } from "@shapewebs/config";

import { buildPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildPageMetadata({
  description: siteConfig.description,
  path: "/",
  title: "Visual foundation",
});

export default function MarketingHomePage() {
  return null;
}

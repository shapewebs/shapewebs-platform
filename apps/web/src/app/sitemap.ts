import type { MetadataRoute } from "next";
import { siteConfig } from "@shapewebs/config";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: siteConfig.productionUrl,
      changeFrequency: "weekly",
      priority: 1,
    },
  ];
}

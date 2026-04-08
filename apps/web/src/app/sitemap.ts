import type { MetadataRoute } from "next";
import { siteConfig } from "@shapewebs/config";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: siteConfig.productionUrl,
      lastModified: new Date("2026-04-08T00:00:00.000Z"),
      changeFrequency: "weekly",
      priority: 1,
    },
  ];
}

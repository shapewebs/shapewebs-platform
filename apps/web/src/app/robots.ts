import type { MetadataRoute } from "next";
import { siteConfig } from "@shapewebs/config";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/preview", "/api/revalidate"],
      },
    ],
    host: siteConfig.productionUrl,
    sitemap: `${siteConfig.productionUrl}/sitemap.xml`,
  };
}

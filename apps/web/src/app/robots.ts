import type { MetadataRoute } from "next";
import { siteConfig } from "@shapewebs/config";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
      },
    ],
    host: siteConfig.productionUrl,
  };
}

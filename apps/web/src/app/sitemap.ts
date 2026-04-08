import type { MetadataRoute } from "next";
import { siteConfig } from "@shapewebs/config";
import { getDocumentPath, getResolvedContentList } from "@/lib/content";
import { getAbsoluteSiteUrl } from "@/lib/metadata";

const staticRoutes: MetadataRoute.Sitemap = [
  {
    url: siteConfig.productionUrl,
    lastModified: new Date("2026-04-08T00:00:00.000Z"),
    changeFrequency: "weekly",
    priority: 1,
  },
  {
    url: getAbsoluteSiteUrl("/contact"),
    lastModified: new Date("2026-04-08T00:00:00.000Z"),
    changeFrequency: "monthly",
    priority: 0.8,
  },
  {
    url: getAbsoluteSiteUrl("/blog"),
    lastModified: new Date("2026-04-08T00:00:00.000Z"),
    changeFrequency: "weekly",
    priority: 0.7,
  },
  {
    url: getAbsoluteSiteUrl("/projects"),
    lastModified: new Date("2026-04-08T00:00:00.000Z"),
    changeFrequency: "monthly",
    priority: 0.75,
  },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [pages, posts, projects, services, legalPages] = await Promise.all([
    getResolvedContentList("page"),
    getResolvedContentList("post"),
    getResolvedContentList("project"),
    getResolvedContentList("service"),
    getResolvedContentList("legal"),
  ]);

  const publishedEntries = [...pages, ...posts, ...projects, ...services, ...legalPages].map(
    (document) => ({
      url: getAbsoluteSiteUrl(getDocumentPath(document)),
      lastModified: document.publishedAt
        ? new Date(document.publishedAt)
        : new Date("2026-04-08T00:00:00.000Z"),
      changeFrequency:
        document.contentType === "post"
          ? ("monthly" as const)
          : ("weekly" as const),
      priority:
        document.contentType === "page"
          ? 0.9
          : document.contentType === "service"
            ? 0.8
            : 0.7,
    }),
  );

  const byUrl = new Map<string, MetadataRoute.Sitemap[number]>();

  for (const entry of [...staticRoutes, ...publishedEntries]) {
    byUrl.set(entry.url, entry);
  }

  return Array.from(byUrl.values());
}

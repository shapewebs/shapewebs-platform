export const siteConfig = {
  name: "Shapewebs",
  description:
    "International portfolio, publishing, and lead-generation platform for Shapewebs web design work.",
  productionUrl: "https://shapewebs.com",
  adminUrl: "https://admin.shapewebs.com",
  defaultLocale: "en" as const,
} as const;

export const workspaceTranspilePackages = [
  "@shapewebs/config",
  "@shapewebs/content-schema",
  "@shapewebs/db",
  "@shapewebs/i18n",
  "@shapewebs/observability",
  "@shapewebs/ui",
  "@shapewebs/validation",
] as const;

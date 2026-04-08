export const siteConfig = {
  name: "Shapewebs",
  shortName: "Shapewebs",
  description:
    "Shapewebs introduces the magic back into software through beautiful, fast websites built with intention to feel alive, intuitive, and human.",
  positioningStatement: "Shapewebs introduces the magic back into software.",
  positioningSubstatement:
    "Beautiful, fast websites built with intention. Designed to feel alive, intuitive, and human.",
  productionUrl: "https://shapewebs.com",
  adminUrl: "https://admin.shapewebs.com",
  defaultLocale: "en" as const,
  accentColor: "#007AFF",
  themeColorLight: "#F6FAFF",
  themeColorDark: "#08090A",
  iconBackground: "#08090A",
  openGraphTitle: "Shapewebs | Beautiful, fast websites built with intention",
  openGraphDescription:
    "Shapewebs introduces the magic back into software with beautiful, fast websites designed to feel alive, intuitive, and human.",
  ogImagePath: "/og/og-default.png",
  keywords: [
    "Shapewebs",
    "custom business websites",
    "web design studio",
    "website design",
    "website development",
    "portfolio websites",
    "brand websites",
    "creative websites",
    "lead generation websites",
    "case study websites",
  ],
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

import type { Metadata, Viewport } from "next";
import { siteConfig } from "@shapewebs/config";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "@shapewebs/ui/styles/system-theme.css";
import "@shapewebs/ui/styles/base.css";
import "./brand-theme.css";

export const viewport: Viewport = {
  colorScheme: "dark",
  themeColor: siteConfig.themeColorDark,
};

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.productionUrl),
  applicationName: siteConfig.name,
  title: {
    default: siteConfig.name,
    template: `${siteConfig.name} | %s`,
  },
  description: siteConfig.description,
  keywords: [...siteConfig.keywords],
  referrer: "origin-when-cross-origin",
  creator: siteConfig.name,
  publisher: siteConfig.name,
  category: "technology",
  alternates: {
    canonical: siteConfig.productionUrl,
  },
  formatDetection: {
    address: false,
    email: false,
    telephone: false,
  },
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icons/favicon.svg", type: "image/svg+xml" },
      { url: "/icons/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/icons/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/favicon-48x48.png", sizes: "48x48", type: "image/png" },
    ],
    apple: [
      {
        url: "/icons/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
    shortcut: ["/icons/favicon.png"],
  },
  openGraph: {
    type: "website",
    siteName: siteConfig.name,
    url: siteConfig.productionUrl,
    title: siteConfig.openGraphTitle,
    description: siteConfig.openGraphDescription,
    images: [
      {
        url: siteConfig.ogImagePath,
        width: 1200,
        height: 630,
        alt: siteConfig.openGraphTitle,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: siteConfig.openGraphTitle,
    description: siteConfig.openGraphDescription,
    images: [siteConfig.ogImagePath],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html data-sw-theme="showcase" lang="en">
      <body>
        {children}
        {process.env.VERCEL === "1" ? <SpeedInsights /> : null}
      </body>
    </html>
  );
}

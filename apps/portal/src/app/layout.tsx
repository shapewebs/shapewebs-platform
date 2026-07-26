import type { Metadata } from "next";
import { siteConfig } from "@shapewebs/config";
import "@shapewebs/ui/styles/system-theme.css";
import "@shapewebs/ui/styles/base.css";
import styles from "./layout.module.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.portalUrl),
  title: {
    default: `${siteConfig.name} Customer Portal`,
    template: `%s | ${siteConfig.name} Customer Portal`,
  },
  description: "Private Shapewebs customer project portal.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <div className={styles["sw-portal-shell-f8k2p1"]}>{children}</div>
      </body>
    </html>
  );
}

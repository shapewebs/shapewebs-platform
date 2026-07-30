import type { Metadata } from "next";
import { siteConfig } from "@shapewebs/config";
import "@shapewebs/ui/styles/system-theme.css";
import "@shapewebs/ui/styles/base.css";
import styles from "./layout.module.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.adminUrl),
  title: {
    default: `${siteConfig.name} Admin`,
    template: `%s | ${siteConfig.name} Admin`,
  },
  description: "Private Shapewebs CMS and operations portal.",
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
    <html data-sw-theme="studio" lang="en">
      <body>
        <div className={styles["sw-admin-root-a2m7q4"]}>{children}</div>
      </body>
    </html>
  );
}

export type SiteLinkItem = {
  external?: boolean;
  href: string;
  label: string;
};

export type SiteFooterGroup = {
  items: SiteLinkItem[];
  title: string;
};

export const sitePrimaryLinks: SiteLinkItem[] = [
  {
    label: "Work",
    href: "/work",
  },
  {
    label: "Journal",
    href: "/blog",
  },
  {
    label: "Contact",
    href: "/contact",
  },
];

export const siteCallToAction = {
  href: "/contact",
  label: "Start a project",
} as const;

export const siteFooterGroups: SiteFooterGroup[] = [
  {
    title: "Explore",
    items: [
      { href: "/", label: "Home" },
      { href: "/work", label: "Work" },
      { href: "/blog", label: "Journal" },
    ],
  },
  {
    title: "Enquiries",
    items: [
      { href: "/contact", label: "Start a project" },
      { href: "mailto:lukas@shapewebs.com", label: "lukas@shapewebs.com" },
    ],
  },
];

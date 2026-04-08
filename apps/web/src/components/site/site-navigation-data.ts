export type SiteLinkItem = {
  description?: string;
  external?: boolean;
  href: string;
  label: string;
};

export type SiteMenuSection = {
  items: SiteLinkItem[];
  title: string;
};

export type SiteMenu = {
  key: "product" | "resources";
  label: string;
  sections: SiteMenuSection[];
};

export type SiteFooterGroup = {
  items: SiteLinkItem[];
  title: string;
};

export const siteMenus: SiteMenu[] = [
  {
    key: "product",
    label: "Product",
    sections: [
      {
        title: "Core Features",
        items: [
          {
            label: "Plan",
            description: "Project planning and roadmap tools",
            href: "/plan",
          },
          {
            label: "Build",
            description: "Development and deployment solutions",
            href: "/build",
          },
        ],
      },
      {
        title: "More",
        items: [
          {
            label: "Analytics",
            description: "Track and analyze your performance",
            href: "/analytics",
          },
          {
            label: "Integrations",
            description: "Connect with your favorite tools",
            href: "/integrations",
          },
          {
            label: "Security",
            description: "Keep your data safe and secure",
            href: "/security",
          },
          {
            label: "Automation",
            description: "Streamline your workflows",
            href: "/automation",
          },
          {
            label: "Collaboration",
            description: "Work together with your team",
            href: "/collaboration",
          },
          {
            label: "Enterprise",
            description: "Solutions for large organizations",
            href: "/enterprise",
          },
        ],
      },
    ],
  },
  {
    key: "resources",
    label: "Resources",
    sections: [
      {
        title: "Company",
        items: [
          {
            label: "About",
            description: "Our mission and team",
            href: "/about",
          },
          {
            label: "Career",
            description: "Join our growing team",
            href: "/career",
          },
        ],
      },
      {
        title: "Explore",
        items: [
          {
            label: "Documentation",
            description: "Guides and reference for our platform",
            href: "/docs",
          },
          {
            label: "Templates",
            description: "Ready-to-use website designs",
            href: "/templates",
          },
          {
            label: "Case Studies",
            description: "Success stories from our clients",
            href: "/case-studies",
          },
          {
            label: "Tutorials",
            description: "Step-by-step guides for common tasks",
            href: "/tutorials",
          },
          {
            label: "Webinars",
            description: "Live and recorded training sessions",
            href: "/webinars",
          },
        ],
      },
    ],
  },
];

export const sitePrimaryLinks: SiteLinkItem[] = [
  {
    label: "Customers",
    href: "/customers",
  },
  {
    label: "Pricing",
    href: "/pricing",
  },
  {
    label: "Contact",
    href: "/contact",
  },
];

export const siteCallToAction = {
  href: "/get-started",
  label: "Get Started",
} as const;

export const siteFooterGroups: SiteFooterGroup[] = [
  {
    title: "Features",
    items: [
      { href: "/features", label: "Plan" },
      { href: "/build", label: "Build" },
      { href: "/insights", label: "Insights" },
      { href: "/customer-requests", label: "Customer Requests" },
      { href: "/linear-asks", label: "Linear Asks" },
      { href: "/security", label: "Security" },
      { href: "/mobile", label: "Mobile" },
    ],
  },
  {
    title: "Product",
    items: [
      { href: "/pricing", label: "Pricing" },
      { href: "/method", label: "Method" },
      { href: "/integrations", label: "Integrations" },
      { href: "/changelog", label: "Changelog" },
      { href: "/documentation", label: "Documentation" },
      { href: "/download", label: "Download" },
      { href: "/switch", label: "Switch" },
    ],
  },
  {
    title: "Company",
    items: [
      { href: "/about", label: "About" },
      { href: "/customers", label: "Customers" },
      { href: "/career", label: "Careers" },
      { href: "/blog", label: "Blog" },
      { href: "/quality", label: "Quality" },
      { href: "/brand", label: "Brand" },
    ],
  },
  {
    title: "Resources",
    items: [
      { href: "/status", label: "Status" },
      { href: "/startups", label: "Startups" },
      { href: "/report-issue", label: "Report issue" },
      { href: "/dpa", label: "DPA" },
      { href: "/privacy", label: "Privacy" },
      { href: "/terms", label: "Terms" },
    ],
  },
  {
    title: "Connect",
    items: [
      { href: "/contact", label: "Contact us" },
      { href: "/community", label: "Community" },
      {
        external: true,
        href: "https://twitter.com/shapeweb",
        label: "X (Twitter)",
      },
      {
        external: true,
        href: "https://github.com/shapeweb",
        label: "GitHub",
      },
      {
        external: true,
        href: "https://youtube.com/shapeweb",
        label: "YouTube",
      },
    ],
  },
];

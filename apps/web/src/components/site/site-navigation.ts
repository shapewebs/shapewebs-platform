import { siteConfig } from "@shapewebs/config";
import type { SubmenuNavigationItem } from "@shapewebs/ui/submenu-navigation";

export type FooterLink = Readonly<{
  href: string;
  label: string;
}>;

export type FooterColumn = Readonly<{
  label: string;
  links: readonly FooterLink[];
}>;

export const primaryNavigation = [
  {
    footer: {
      description: "A clear route from first conversation to launch.",
      label: "Not sure where to begin?",
      links: [
        { href: "/services", label: "All services" },
        { href: "/process", label: "See the process" },
        { href: "/start-a-project", label: "Book a call" },
      ],
    },
    id: "services",
    kind: "submenu",
    label: "Services",
    panelSize: "wide",
    sections: [
      {
        label: "Design",
        links: [
          {
            description:
              "Thoughtful visual systems, user journeys, and responsive interfaces.",
            href: "/services/website-design",
            label: "Website design",
          },
          {
            description:
              "Improve an existing site without losing what already works.",
            href: "/services/redesign-modernisation",
            label: "Redesign and modernisation",
          },
        ],
      },
      {
        label: "Build",
        links: [
          {
            description:
              "Fast, production-ready sites built around maintainable components.",
            href: "/services/nextjs-development",
            label: "Next.js development",
          },
          {
            description:
              "Structured publishing that stays flexible without visual drift.",
            href: "/services/cms-content-systems",
            label: "CMS and content systems",
          },
        ],
      },
      {
        label: "Improve",
        links: [
          {
            description:
              "Faster loading, better usability, and measurable technical quality.",
            href: "/services/performance-accessibility",
            label: "Performance and accessibility",
          },
          {
            description:
              "Maintenance, improvements, and continued development after launch.",
            href: "/services/ongoing-support",
            label: "Ongoing support",
          },
        ],
      },
    ],
  },
  {
    footer: {
      description: "Currently booking select new projects.",
      label: "Project availability",
      links: [
        { href: "/contact", label: "Contact Shapewebs" },
        { href: "/start-a-project", label: "Book a call" },
      ],
      status: "available",
    },
    id: "studio",
    kind: "submenu",
    label: "Studio",
    panelSize: "medium",
    sections: [
      {
        label: "Shapewebs",
        links: [
          {
            description: "The studio, its focus, and how work is approached.",
            href: "/studio/about",
            label: "About Shapewebs",
          },
          {
            description: "The standards that guide every project decision.",
            href: "/studio/principles",
            label: "Principles",
          },
        ],
      },
      {
        label: "Guidance",
        links: [
          {
            description: "Notes on design, development, and better websites.",
            href: "/journal",
            label: "Journal",
          },
          {
            description: "Straight answers to common project questions.",
            href: "/resources/project-faq",
            label: "Project FAQ",
          },
          {
            description: "What to expect before, during, and after a project.",
            href: "/resources/project-guide",
            label: "Project guide",
          },
        ],
      },
      {
        label: "Standards",
        links: [
          {
            href: "/standards/performance",
            label: "Performance",
          },
          {
            href: "/standards/accessibility",
            label: "Accessibility",
          },
          {
            href: "/standards/security-reliability",
            label: "Security and reliability",
          },
        ],
      },
    ],
  },
  { href: "/projects", kind: "link", label: "Work" },
  { href: "/process", kind: "link", label: "Process" },
  { href: "/contact", kind: "link", label: "Contact" },
  { id: "search", kind: "slot" },
  { id: "account", kind: "separator" },
  {
    href: `${siteConfig.adminUrl}/login`,
    kind: "link",
    label: "Log in",
  },
  {
    href: "/start-a-project",
    kind: "link",
    label: "Book a call",
    presentation: "action",
  },
] as const satisfies readonly SubmenuNavigationItem[];

export const footerColumns = [
  {
    label: "Services",
    links: [
      { href: "/services/website-design", label: "Website design" },
      {
        href: "/services/redesign-modernisation",
        label: "Redesign and modernisation",
      },
      {
        href: "/services/nextjs-development",
        label: "Next.js development",
      },
      {
        href: "/services/cms-content-systems",
        label: "CMS and content systems",
      },
      {
        href: "/services/performance-accessibility",
        label: "Performance and accessibility",
      },
      { href: "/services/ongoing-support", label: "Ongoing support" },
    ],
  },
  {
    label: "Work",
    links: [
      { href: "/projects", label: "All projects" },
      { href: "/projects/case-studies", label: "Case studies" },
      { href: "/process", label: "Process" },
      { href: "/start-a-project", label: "Book a call" },
    ],
  },
  {
    label: "Studio",
    links: [
      { href: "/studio/about", label: "About Shapewebs" },
      { href: "/studio/principles", label: "Principles" },
      { href: "/journal", label: "Journal" },
      { href: "/resources/project-faq", label: "Project FAQ" },
      { href: "/resources/project-guide", label: "Project guide" },
    ],
  },
  {
    label: "Standards",
    links: [
      { href: "/standards/performance", label: "Performance" },
      { href: "/standards/accessibility", label: "Accessibility" },
      {
        href: "/standards/security-reliability",
        label: "Security and reliability",
      },
      { href: "/legal/privacy", label: "Privacy and data" },
    ],
  },
  {
    label: "Connect",
    links: [
      { href: "/contact", label: "Contact" },
      { href: "/start-a-project", label: "Book a call" },
      { href: "mailto:info@shapewebs.com", label: "info@shapewebs.com" },
      {
        href: "mailto:support@shapewebs.com",
        label: "support@shapewebs.com",
      },
    ],
  },
] as const satisfies readonly FooterColumn[];

export const legalNavigation = [
  { href: "/legal/privacy", label: "Privacy" },
  { href: "/legal/terms", label: "Terms" },
  { href: "/legal/accessibility", label: "Accessibility statement" },
  { href: "/sitemap", label: "Sitemap" },
] as const satisfies readonly FooterLink[];

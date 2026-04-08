import type { ContentDocument } from "@shapewebs/content-schema";
import type {
  ContactSubmissionRecord,
  DocumentEditorState,
  DocumentListItem,
  PublishedDocument,
  SettingsSnapshot,
} from "../types/documents";

const homeContent: ContentDocument = {
  schemaVersion: 1,
  blocks: [
    {
      type: "hero",
      eyebrow: "Shapewebs",
      heading: "A secure custom CMS platform for showcasing web design work.",
      body: "This fallback content keeps the public app useful before Supabase-backed content is configured locally.",
      primaryCtaHref: "/contact",
      primaryCtaLabel: "Start a project",
    },
    {
      type: "cta",
      heading: "Structured content is ready",
      body: "Connect Supabase to replace this fallback homepage with editable CMS data.",
      href: "/contact",
      label: "Contact",
    },
  ],
};

const serviceContent: ContentDocument = {
  schemaVersion: 1,
  blocks: [
    {
      type: "hero",
      eyebrow: "Services",
      heading: "Custom website design systems",
      body: "Strategy, design, implementation, and editorial architecture for business websites.",
    },
  ],
};

const blogContent: ContentDocument = {
  schemaVersion: 1,
  blocks: [
    {
      type: "hero",
      heading: "Building a durable CMS for a design studio",
      body: "An example fallback article while the live publishing system is being wired.",
    },
  ],
};

const projectContent: ContentDocument = {
  schemaVersion: 1,
  blocks: [
    {
      type: "hero",
      heading: "Northline Studio website system",
      body: "Sample project content used until live project entries are loaded from Supabase.",
    },
  ],
};

const legalContent: ContentDocument = {
  schemaVersion: 1,
  blocks: [
    {
      type: "rich_text",
      document: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "This fallback privacy policy page exists until versioned legal content is published from the CMS.",
            },
          ],
        },
      ],
    },
  ],
};

export const mockPublishedDocuments: PublishedDocument[] = [
  {
    documentId: "mock-home",
    contentType: "page",
    localeCode: "en",
    slug: "home",
    title: "Shapewebs home",
    summary: "Fallback homepage content",
    publishedAt: "2026-04-08T00:00:00.000Z",
    pageKind: "home",
    source: "fallback",
    seo: {
      metaTitle: "Shapewebs",
      metaDescription: "Fallback homepage until Supabase content is configured.",
      canonicalUrlOverride: null,
      robotsIndex: true,
    },
    content: homeContent,
  },
  {
    documentId: "mock-service-strategy",
    contentType: "service",
    localeCode: "en",
    slug: "website-strategy",
    title: "Website Strategy",
    summary: "Fallback service page",
    publishedAt: "2026-04-08T00:00:00.000Z",
    pageKind: null,
    source: "fallback",
    seo: {
      metaTitle: "Website Strategy",
      metaDescription: "Fallback service page until Supabase content is configured.",
      canonicalUrlOverride: null,
      robotsIndex: true,
    },
    content: serviceContent,
  },
  {
    documentId: "mock-post-platform",
    contentType: "post",
    localeCode: "en",
    slug: "building-a-design-cms",
    title: "Building a design CMS",
    summary: "Fallback blog post",
    publishedAt: "2026-04-08T00:00:00.000Z",
    pageKind: null,
    source: "fallback",
    seo: {
      metaTitle: "Building a design CMS",
      metaDescription: "Fallback blog post until Supabase content is configured.",
      canonicalUrlOverride: null,
      robotsIndex: true,
    },
    content: blogContent,
  },
  {
    documentId: "mock-project-northline",
    contentType: "project",
    localeCode: "en",
    slug: "northline-studio",
    title: "Northline Studio",
    summary: "Fallback project page",
    publishedAt: "2026-04-08T00:00:00.000Z",
    pageKind: null,
    source: "fallback",
    seo: {
      metaTitle: "Northline Studio",
      metaDescription: "Fallback project page until Supabase content is configured.",
      canonicalUrlOverride: null,
      robotsIndex: true,
    },
    content: projectContent,
  },
  {
    documentId: "mock-legal-privacy",
    contentType: "legal",
    localeCode: "en",
    slug: "privacy",
    title: "Privacy Policy",
    summary: "Fallback legal page",
    publishedAt: "2026-04-08T00:00:00.000Z",
    pageKind: null,
    source: "fallback",
    seo: {
      metaTitle: "Privacy Policy",
      metaDescription: "Fallback legal page until Supabase content is configured.",
      canonicalUrlOverride: null,
      robotsIndex: true,
    },
    content: legalContent,
  },
];

export const mockDocumentListItems: DocumentListItem[] = [
  {
    documentId: "mock-home",
    contentType: "page",
    localeCode: "en",
    pageKind: "home",
    publishedAt: "2026-04-08T00:00:00.000Z",
    slug: "home",
    state: "published",
    summary: "Fallback homepage content",
    title: "Shapewebs home",
    updatedAt: "2026-04-08T00:00:00.000Z",
  },
  {
    documentId: "mock-standard-page",
    contentType: "page",
    localeCode: "en",
    pageKind: "standard",
    publishedAt: null,
    slug: "about",
    state: "draft",
    summary: "Fallback standard page draft",
    title: "About",
    updatedAt: "2026-04-08T00:00:00.000Z",
  },
];

export const mockEditorStates: Record<string, DocumentEditorState> = {
  "mock-home": {
    documentId: "mock-home",
    contentType: "page",
    defaultLocale: "en",
    localeCode: "en",
    pageKind: "home",
    publishedAt: "2026-04-08T00:00:00.000Z",
    slug: "home",
    source: "fallback",
    state: "published",
    summary: "Fallback homepage content",
    title: "Shapewebs home",
    seo: {
      metaTitle: "Shapewebs",
      metaDescription: "Fallback homepage until Supabase content is configured.",
      canonicalUrlOverride: null,
      robotsIndex: true,
    },
    content: homeContent,
    revisions: [
      {
        revisionId: "mock-home-rev-1",
        revisionNumber: 1,
        localeCode: "en",
        editorState: "published",
        changeNote: "Initial fallback homepage",
        createdAt: "2026-04-08T00:00:00.000Z",
        createdBy: null,
      },
    ],
  },
};

export const mockSettingsSnapshot: SettingsSnapshot = {
  source: "fallback",
  locales: [
    { code: "en", label: "English", isDefault: true },
    { code: "da-DK", label: "Dansk", isDefault: false },
  ],
  regionProfiles: [
    { code: "eea_uk_ch", displayName: "EEA / UK / CH", ruleSetKey: "eea_uk_ch" },
    { code: "us_california", displayName: "United States / California-sensitive", ruleSetKey: "us_california" },
    { code: "rest_of_world", displayName: "Rest of world", ruleSetKey: "rest_of_world" },
  ],
  featureFlags: [
    { key: "cms.scheduled_publishing", enabled: false },
    { key: "cms.translation_dashboard", enabled: false },
    { key: "web.region_sensitive_consent", enabled: true },
  ],
  consentRuleSets: [
    { key: "eea_uk_ch", defaultMode: "opt_in" },
    { key: "us_california", defaultMode: "mixed" },
    { key: "rest_of_world", defaultMode: "inform" },
  ],
  cookiePolicyVersions: ["v1-eea", "v1-us", "v1-global"],
};

export const mockContactSubmissions: ContactSubmissionRecord[] = [
  {
    id: "mock-submission-1",
    name: "Jamie Foster",
    email: "jamie@example.com",
    formType: "contact",
    localeCode: "en",
    message: "Looking for a new studio site with a stronger editorial workflow.",
    serviceInterest: "Website strategy",
    status: "new",
    createdAt: "2026-04-08T00:00:00.000Z",
  },
];

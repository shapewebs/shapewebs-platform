import type { ContentDocument } from "@shapewebs/content-schema";
import type { ContentState, ContentType } from "@shapewebs/config";
import type { LocaleCode } from "@shapewebs/i18n";

export type DocumentListItem = {
  contentType: ContentType;
  documentId: string;
  localeCode: LocaleCode;
  pageKind?: string | null;
  publishedAt: string | null;
  slug: string;
  state: ContentState;
  summary: string | null;
  title: string;
  updatedAt: string | null;
};

export type SeoEditorState = {
  canonicalUrlOverride: string | null;
  metaDescription: string | null;
  metaTitle: string | null;
  robotsIndex: boolean;
};

export type DocumentRevisionSummary = {
  changeNote: string | null;
  createdAt: string;
  createdBy: string | null;
  editorState: ContentState;
  localeCode: LocaleCode;
  revisionId: string;
  revisionNumber: number;
};

export type DocumentEditorState = {
  content: ContentDocument;
  contentType: ContentType;
  defaultLocale: LocaleCode;
  documentId: string;
  localeCode: LocaleCode;
  pageKind?: string | null;
  publishedAt: string | null;
  revisions: DocumentRevisionSummary[];
  seo: SeoEditorState;
  slug: string;
  source: "fallback" | "supabase";
  state: ContentState;
  summary: string | null;
  title: string;
};

export type PublishResult = {
  documentId: string;
  localeCode: LocaleCode;
  publishedAt: string;
  revisionId: string;
  state: ContentState;
};

export type PublishedDocument = {
  content: ContentDocument;
  contentType: ContentType;
  documentId: string;
  localeCode: LocaleCode;
  pageKind?: string | null;
  publishedAt: string | null;
  seo: SeoEditorState;
  slug: string;
  source: "fallback" | "supabase";
  summary: string | null;
  title: string;
};

export type SettingsSnapshot = {
  consentRuleSets: Array<{
    defaultMode: string;
    key: string;
  }>;
  cookiePolicyVersions: string[];
  featureFlags: Array<{
    enabled: boolean;
    key: string;
  }>;
  locales: Array<{
    code: LocaleCode;
    isDefault: boolean;
    label: string;
  }>;
  regionProfiles: Array<{
    code: string;
    displayName: string;
    ruleSetKey: string;
  }>;
  source: "fallback" | "supabase";
};

export type ContactSubmissionRecord = {
  createdAt: string;
  email: string;
  formType: string;
  id: string;
  localeCode: LocaleCode;
  message: string;
  name: string;
  serviceInterest: string | null;
  status: "new" | "reviewed" | "archived" | "deleted";
};

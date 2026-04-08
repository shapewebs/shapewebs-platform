import type { ContentDocument } from "@shapewebs/content-schema";
import type { ContentState, ContentType } from "@shapewebs/config";
import type { LocaleCode } from "@shapewebs/i18n";

export type LocalizedDocumentSummary = {
  documentId: string;
  localeCode: LocaleCode;
  slug: string;
  title: string;
  summary: string | null;
  state: ContentState;
  contentType: ContentType;
  publishedAt: string | null;
};

export type RevisionSnapshot = {
  revisionId: string;
  documentId: string;
  localeCode: LocaleCode;
  revisionNumber: number;
  editorState: ContentState;
  content: ContentDocument;
  createdAt: string;
  createdBy: string | null;
  changeNote: string | null;
};

import type { DocumentEditorState } from "@shapewebs/db";
import { PageEditorForm } from "../../_components/page-editor-form";
import { requireAdminSession } from "@/lib/auth";

const newPageState: DocumentEditorState = {
  documentId: "new",
  contentType: "page",
  defaultLocale: "en",
  localeCode: "en",
  pageKind: "standard",
  publishedAt: null,
  revisions: [],
  seo: {
    canonicalUrlOverride: null,
    metaDescription: null,
    metaTitle: null,
    robotsIndex: true,
  },
  slug: "",
  source: "fallback",
  state: "draft",
  summary: null,
  title: "",
  content: {
    schemaVersion: 1,
    blocks: [],
  },
};

export default async function NewPageEditorPage() {
  const runtime = await requireAdminSession({
    redirectTo: "/content/pages/new",
    roles: ["owner", "editor"],
  });

  return (
    <PageEditorForm editorState={newPageState} setupMode={runtime.setupMode} />
  );
}

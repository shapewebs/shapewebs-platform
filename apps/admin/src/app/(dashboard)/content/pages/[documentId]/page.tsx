import { notFound } from "next/navigation";
import { getDocumentEditorState } from "@shapewebs/db";
import { getAdminRuntimeState } from "@/lib/auth";
import { PageEditorForm } from "../../_components/page-editor-form";

type PageEditorRouteProps = {
  params: Promise<{
    documentId: string;
  }>;
  searchParams?: Promise<{
    error?: string;
    locale?: string;
    status?: string;
  }>;
};

const notices: Record<string, string> = {
  saved: "Draft saved.",
  published: "Page published and revalidation requested.",
  "in-review": "Page submitted for review.",
  preview: "Preview token could not be created.",
};

export default async function PageEditorRoute({
  params,
  searchParams,
}: PageEditorRouteProps) {
  const routeParams = await params;
  const query = searchParams ? await searchParams : undefined;
  const runtime = await getAdminRuntimeState();
  const editorState = await getDocumentEditorState(runtime.supabase, {
    documentId: routeParams.documentId,
    localeCode: query?.locale,
  });

  if (!editorState) {
    notFound();
  }

  const notice =
    (query?.status && notices[query.status]) ||
    (query?.error && notices[query.error]) ||
    null;

  return (
    <PageEditorForm
      editorState={editorState}
      notice={notice}
      setupMode={runtime.setupMode}
    />
  );
}

import { randomUUID } from "node:crypto";

import { getDefaultPageEditorState } from "@shapewebs/database/server";

import { PageEditorForm } from "../../_components/page-editor-form";
import { pageEditorNotices } from "../../_components/page-editor-notices";
import { requireAdminSession } from "@/lib/auth";

type NewPageEditorPageProps = {
  searchParams?: Promise<{
    error?: string;
    status?: string;
  }>;
};

export default async function NewPageEditorPage({
  searchParams,
}: NewPageEditorPageProps) {
  const query = searchParams ? await searchParams : undefined;
  const runtime = await requireAdminSession({
    redirectTo: "/content/pages/new",
    roles: ["owner", "editor"],
  });

  return (
    <PageEditorForm
      commandId={randomUUID()}
      editorState={getDefaultPageEditorState()}
      notice={
        (query?.status && pageEditorNotices[query.status]) ||
        (query?.error && pageEditorNotices[query.error]) ||
        null
      }
      setupMode={runtime.setupMode}
    />
  );
}

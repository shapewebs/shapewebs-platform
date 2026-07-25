import { randomUUID } from "node:crypto";

import { notFound } from "next/navigation";
import { getContentEditorState } from "@shapewebs/database/server";

import { requireAdminSession } from "@/lib/auth";
import { getAdminDatabaseUrl } from "@/lib/better-auth";
import { PageEditorForm } from "../../_components/page-editor-form";
import { pageEditorNotices } from "../../_components/page-editor-notices";

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

export default async function PageEditorRoute({
  params,
  searchParams,
}: PageEditorRouteProps) {
  const routeParams = await params;
  const query = searchParams ? await searchParams : undefined;
  const runtime = await requireAdminSession({
    redirectTo: `/content/pages/${routeParams.documentId}`,
    roles: ["owner", "editor"],
  });
  const databaseUrl = getAdminDatabaseUrl();

  if (runtime.setupMode || !databaseUrl || !runtime.authorization) {
    notFound();
  }

  const editorState = await getContentEditorState(
    databaseUrl,
    runtime.authorization,
    {
      documentId: routeParams.documentId,
      localeCode: query?.locale,
    },
  );

  if (!editorState) {
    notFound();
  }

  const notice =
    (query?.status && pageEditorNotices[query.status]) ||
    (query?.error && pageEditorNotices[query.error]) ||
    null;

  return (
    <PageEditorForm
      editorState={editorState}
      commandId={randomUUID()}
      notice={notice}
    />
  );
}

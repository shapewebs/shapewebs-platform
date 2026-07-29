import { randomUUID } from "node:crypto";

import { notFound } from "next/navigation";

import { requireAdminSession } from "@/lib/auth";
import { getAdminSanityRuntime } from "@/lib/sanity";
import {
  BlogEditorForm,
  type BlogAssetOption,
} from "../_components/blog-editor-form";
import {
  previewSavedBlogPostAction,
  publishBlogPostAction,
  saveBlogPostAction,
  unpublishBlogPostAction,
} from "../_actions/blog-editor";

type BlogPostEditorPageProps = {
  params: Promise<{
    documentId: string;
  }>;
  searchParams?: Promise<{
    error?: string;
    status?: string;
  }>;
};

const notices: Record<string, string> = {
  conflict:
    "This draft changed after the editor opened. The current provider revision is shown now.",
  idempotency:
    "The command identifier was already used for different content. Reload before trying again.",
  pending:
    "The provider outcome is awaiting reconciliation. Reload before trying another mutation.",
  provider:
    "Sanity did not confirm the operation. No success was acknowledged.",
  published: "The saved revision is published.",
  "published-revalidation-pending":
    "The revision is published, but public cache revalidation was not confirmed.",
  saved: "The draft was saved with a revision lock.",
  unpublished: "The public article was removed and its draft was retained.",
  "unpublished-revalidation-pending":
    "The article was unpublished, but public cache revalidation was not confirmed.",
  unavailable: "The content provider is unavailable in this environment.",
  validation: "Review the required fields and structured article content.",
};

function toAssetOption(
  asset: Awaited<
    ReturnType<
      NonNullable<
        ReturnType<typeof getAdminSanityRuntime>
      >["draftRepository"]["listImageAssets"]
    >
  >[number],
): BlogAssetOption {
  return {
    height: asset.metadata.dimensions.height,
    id: asset._id,
    name: asset.originalFilename,
    url: asset.url,
    width: asset.metadata.dimensions.width,
  };
}

export default async function BlogPostEditorPage({
  params,
  searchParams,
}: BlogPostEditorPageProps) {
  const { documentId } = await params;
  const query = searchParams ? await searchParams : undefined;
  await requireAdminSession({
    redirectTo: `/content/blog/${documentId}`,
    roles: ["owner", "editor"],
  });
  const sanity = getAdminSanityRuntime();

  if (!sanity) {
    notFound();
  }

  const [editorState, assets, authors, categories] = await Promise.all([
    sanity.draftRepository.getBlogPostEditorState({ documentId }),
    sanity.draftRepository.listImageAssets({ limit: 100 }),
    sanity.draftRepository.listAuthors({ limit: 30 }),
    sanity.draftRepository.listCategories({ limit: 30 }),
  ]);

  if (!editorState) {
    notFound();
  }

  const notice =
    (query?.status && notices[query.status]) ||
    (query?.error && notices[query.error]) ||
    null;

  return (
    <BlogEditorForm
      assets={assets.map(toAssetOption)}
      authors={authors.map((author) => ({
        id: author._id,
        title: author.name,
      }))}
      categories={categories.map((category) => ({
        id: category._id,
        title: category.title,
      }))}
      commandId={randomUUID()}
      documentId={editorState.documentId}
      expectedRevision={editorState.draftRevision}
      hasDraft={editorState.hasDraft}
      notice={notice}
      post={editorState.draft}
      previewAction={previewSavedBlogPostAction}
      publishAction={publishBlogPostAction}
      publishCommandId={randomUUID()}
      publishedRevision={editorState.publishedRevision}
      saveAction={saveBlogPostAction}
      unpublishAction={unpublishBlogPostAction}
      unpublishCommandId={randomUUID()}
    />
  );
}

import { randomUUID } from "node:crypto";

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

type NewBlogPostPageProps = {
  searchParams?: Promise<{
    error?: string;
    status?: string;
  }>;
};

const notices: Record<string, string> = {
  conflict:
    "This draft changed after the editor opened. Reload and review the newest revision.",
  idempotency:
    "The command identifier was already used for different content. Reload before trying again.",
  pending:
    "The provider outcome is awaiting reconciliation. Reload before trying another mutation.",
  provider:
    "Sanity did not confirm the operation. No success was acknowledged.",
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

export default async function NewBlogPostPage({
  searchParams,
}: NewBlogPostPageProps) {
  const query = searchParams ? await searchParams : undefined;
  await requireAdminSession({
    redirectTo: "/content/blog/new",
    roles: ["owner", "editor"],
  });
  const sanity = getAdminSanityRuntime();
  const [assets, authors, categories] = sanity
    ? await Promise.all([
        sanity.draftRepository.listImageAssets({ limit: 100 }),
        sanity.draftRepository.listAuthors({ limit: 30 }),
        sanity.draftRepository.listCategories({ limit: 30 }),
      ])
    : [[], [], []];
  const notice =
    (query?.error && notices[query.error]) ||
    (query?.status && notices[query.status]) ||
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
      notice={notice}
      previewAction={previewSavedBlogPostAction}
      publishAction={publishBlogPostAction}
      publishCommandId={randomUUID()}
      saveAction={saveBlogPostAction}
      unpublishAction={unpublishBlogPostAction}
      unpublishCommandId={randomUUID()}
    />
  );
}

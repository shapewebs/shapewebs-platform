import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ContentPage } from "@/components/content/content-page";
import { PreviewShell } from "@/components/content/preview-shell";
import { SanityBlogPostView } from "@/components/content/sanity-blog-post";
import { getPrivatePreviewContent } from "@/lib/content";
import { resolveContentRoute } from "@/lib/content-routing";
import { getPrivateSanityBlogPreview } from "@/lib/sanity-preview";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Private content preview",
  robots: {
    follow: false,
    index: false,
    nocache: true,
  },
};

type PrivatePreviewPageProps = {
  params: Promise<{
    slug?: string[];
  }>;
};

export default async function PrivatePreviewPage(
  props: PrivatePreviewPageProps,
) {
  const { slug = [] } = await props.params;
  const route = resolveContentRoute(slug);

  if (!route) {
    notFound();
  }

  const sanityPreview = await getPrivateSanityBlogPreview(route);

  if (sanityPreview) {
    return (
      <PreviewShell>
        <SanityBlogPostView
          post={sanityPreview.post}
          resolveImage={sanityPreview.resolveImage}
        />
      </PreviewShell>
    );
  }

  const document = await getPrivatePreviewContent(route);

  if (!document) {
    notFound();
  }

  return (
    <PreviewShell>
      <ContentPage document={document} />
    </PreviewShell>
  );
}

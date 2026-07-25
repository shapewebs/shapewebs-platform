import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ContentPage } from "@/components/content/content-page";
import {
  buildDocumentMetadata,
  getPublishedContentList,
  getResolvedContentBySlug,
} from "@/lib/content";

type BlogDetailPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export async function generateStaticParams() {
  const posts = await getPublishedContentList("post", "en");

  return posts.map((post) => ({
    slug: post.slug,
  }));
}

export async function generateMetadata({
  params,
}: BlogDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const document = await getResolvedContentBySlug("post", slug);

  if (!document) {
    return {};
  }

  return buildDocumentMetadata(document);
}

export default async function BlogDetailPage({ params }: BlogDetailPageProps) {
  const { slug } = await params;
  const document = await getResolvedContentBySlug("post", slug);

  if (!document) {
    notFound();
  }

  return <ContentPage document={document} />;
}

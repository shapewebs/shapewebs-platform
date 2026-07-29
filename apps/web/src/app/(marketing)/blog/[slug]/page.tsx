import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ContentPage } from "@/components/content/content-page";
import { SanityBlogPostView } from "@/components/content/sanity-blog-post";
import {
  buildDocumentMetadata,
  getPublishedContentList,
  getResolvedContentBySlug,
} from "@/lib/content";
import { buildPageMetadata } from "@/lib/metadata";
import { getWebSanityRuntime } from "@/lib/sanity";

export const revalidate = 300;

type BlogDetailPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export async function generateStaticParams() {
  const sanity = getWebSanityRuntime();

  if (sanity) {
    const posts = await sanity.repository.listBlogPosts({
      limit: 100,
      locale: "en",
    });

    return posts.map((post) => ({
      slug: post.slug.current,
    }));
  }

  const posts = await getPublishedContentList("post", "en");

  return posts.map((post) => ({
    slug: post.slug,
  }));
}

export async function generateMetadata({
  params,
}: BlogDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const sanity = getWebSanityRuntime();

  if (sanity) {
    const post = await sanity.repository.getBlogPostBySlug({
      locale: "en",
      slug,
    });

    return post
      ? buildPageMetadata({
          description: post.seo.description ?? post.excerpt,
          noIndex: post.seo.noIndex,
          path: `/blog/${post.slug.current}`,
          title: post.seo.title ?? post.title,
          type: "article",
        })
      : {};
  }

  const document = await getResolvedContentBySlug("post", slug);

  if (!document) {
    return {};
  }

  return buildDocumentMetadata(document);
}

export default async function BlogDetailPage({ params }: BlogDetailPageProps) {
  const { slug } = await params;
  const sanity = getWebSanityRuntime();

  if (sanity) {
    const post = await sanity.repository.getBlogPostBySlug({
      locale: "en",
      slug,
    });

    if (!post) {
      notFound();
    }

    return (
      <SanityBlogPostView post={post} resolveImage={sanity.resolveImage} />
    );
  }

  const document = await getResolvedContentBySlug("post", slug);

  if (!document) {
    notFound();
  }

  return <ContentPage document={document} />;
}

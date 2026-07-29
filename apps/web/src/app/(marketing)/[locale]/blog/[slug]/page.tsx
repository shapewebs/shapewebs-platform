import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";

import { ContentPage } from "@/components/content/content-page";
import { SanityBlogPostView } from "@/components/content/sanity-blog-post";
import { buildDocumentMetadata, getResolvedContentBySlug } from "@/lib/content";
import { buildPageMetadata } from "@/lib/metadata";
import { getWebSanityRuntime } from "@/lib/sanity";

export const revalidate = 300;

type LocalizedBlogPostPageProps = {
  params: Promise<{
    locale: string;
    slug: string;
  }>;
};

export async function generateStaticParams() {
  const sanity = getWebSanityRuntime();

  if (!sanity) {
    return [];
  }

  const posts = await sanity.repository.listBlogPosts({
    limit: 100,
    locale: "da-DK",
  });

  return posts.map((post) => ({
    locale: "da-DK",
    slug: post.slug.current,
  }));
}

export async function generateMetadata({
  params,
}: LocalizedBlogPostPageProps): Promise<Metadata> {
  const { locale, slug } = await params;

  if (locale !== "da-DK") {
    return {};
  }

  const sanity = getWebSanityRuntime();

  if (sanity) {
    const post = await sanity.repository.getBlogPostBySlug({
      locale: "da-DK",
      slug,
    });

    return post
      ? buildPageMetadata({
          description: post.seo.description ?? post.excerpt,
          noIndex: post.seo.noIndex,
          path: `/da-DK/blog/${post.slug.current}`,
          title: post.seo.title ?? post.title,
          type: "article",
        })
      : {};
  }

  const document = await getResolvedContentBySlug("post", slug, "da-DK");
  return document ? buildDocumentMetadata(document) : {};
}

export default async function LocalizedBlogPostPage({
  params,
}: LocalizedBlogPostPageProps) {
  const { locale, slug } = await params;

  if (locale === "en") {
    permanentRedirect(`/blog/${slug}`);
  }

  if (locale !== "da-DK") {
    notFound();
  }

  const sanity = getWebSanityRuntime();

  if (sanity) {
    const post = await sanity.repository.getBlogPostBySlug({
      locale: "da-DK",
      slug,
    });

    if (!post) {
      notFound();
    }

    return (
      <SanityBlogPostView post={post} resolveImage={sanity.resolveImage} />
    );
  }

  const document = await getResolvedContentBySlug("post", slug, "da-DK");

  if (!document) {
    notFound();
  }

  return <ContentPage document={document} />;
}

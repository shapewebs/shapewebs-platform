import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ContentPage } from "@/components/content/content-page";
import {
  buildDocumentMetadata,
  getPublishedContentList,
  getResolvedContentBySlug,
} from "@/lib/content";

export async function generateStaticParams() {
  const projects = await getPublishedContentList("project", "en");

  return projects.map((project) => ({
    slug: project.slug,
  }));
}

export async function generateMetadata(props: {
  params: Promise<{
    slug: string;
  }>;
}): Promise<Metadata> {
  const { slug } = await props.params;
  const document = await getResolvedContentBySlug("project", slug);

  return {
    ...(document ? buildDocumentMetadata(document) : {}),
    robots: {
      index: false,
      follow: true,
    },
  };
}

export default async function WorkDetailPage(props: {
  params: Promise<{
    slug: string;
  }>;
}) {
  const { slug } = await props.params;
  const document = await getResolvedContentBySlug("project", slug);

  if (!document) {
    notFound();
  }

  return <ContentPage document={document} />;
}

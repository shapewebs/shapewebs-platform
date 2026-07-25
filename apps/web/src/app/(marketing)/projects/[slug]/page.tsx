import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ContentPage } from "@/components/content/content-page";
import {
  buildDocumentMetadata,
  getPublishedContentList,
  getResolvedContentBySlug,
} from "@/lib/content";

type ProjectDetailPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export async function generateStaticParams() {
  const projects = await getPublishedContentList("project", "en");

  return projects.map((project) => ({
    slug: project.slug,
  }));
}

export async function generateMetadata({
  params,
}: ProjectDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const document = await getResolvedContentBySlug("project", slug);

  if (!document) {
    return {};
  }

  return buildDocumentMetadata(document);
}

export default async function ProjectDetailPage({
  params,
}: ProjectDetailPageProps) {
  const { slug } = await params;
  const document = await getResolvedContentBySlug("project", slug);

  if (!document) {
    notFound();
  }

  return <ContentPage document={document} />;
}

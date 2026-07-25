import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ContentPage } from "@/components/content/content-page";
import {
  buildDocumentMetadata,
  getPublishedContentList,
  getResolvedContentBySlug,
} from "@/lib/content";

type LegalDetailPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export async function generateStaticParams() {
  const legalPages = await getPublishedContentList("legal", "en");

  return legalPages.map((page) => ({
    slug: page.slug,
  }));
}

export async function generateMetadata({
  params,
}: LegalDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const document = await getResolvedContentBySlug("legal", slug);

  if (!document) {
    return {};
  }

  return buildDocumentMetadata(document);
}

export default async function LegalDetailPage({
  params,
}: LegalDetailPageProps) {
  const { slug } = await params;
  const document = await getResolvedContentBySlug("legal", slug);

  if (!document) {
    notFound();
  }

  return <ContentPage document={document} />;
}

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ContentPage } from "@/components/content/content-page";
import {
  buildDocumentMetadata,
  getPublishedContentList,
  getResolvedContentBySlug,
} from "@/lib/content";

type ServiceDetailPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export async function generateStaticParams() {
  const services = await getPublishedContentList("service", "en");

  return services.map((service) => ({
    slug: service.slug,
  }));
}

export async function generateMetadata({
  params,
}: ServiceDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const document = await getResolvedContentBySlug("service", slug);

  if (!document) {
    return {};
  }

  return buildDocumentMetadata(document);
}

export default async function ServiceDetailPage({
  params,
}: ServiceDetailPageProps) {
  const { slug } = await params;
  const document = await getResolvedContentBySlug("service", slug);

  if (!document) {
    notFound();
  }

  return <ContentPage document={document} />;
}

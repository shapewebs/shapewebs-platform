import type { Metadata } from "next";
import { BlankStage } from "@/components/site/blank-stage";
import { ContentPage } from "@/components/content/content-page";
import { buildDocumentMetadata, getResolvedGenericPage } from "@/lib/content";
import { buildPageMetadata } from "@/lib/metadata";

function formatSlugLabel(slug: string[]) {
  const lastSegment = slug.at(-1) ?? "page";

  return lastSegment
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

type CatchAllPageProps = {
  params: Promise<{
    slug: string[];
  }>;
};

export function generateStaticParams() {
  return [
    { slug: ["pricing"] },
    { slug: ["customers"] },
    { slug: ["about"] },
    { slug: ["docs"] },
  ];
}

export async function generateMetadata(
  props: CatchAllPageProps,
): Promise<Metadata> {
  const { slug } = await props.params;
  const document = await getResolvedGenericPage(slug.at(-1) ?? "page");

  if (document) {
    return buildDocumentMetadata(document);
  }

  return buildPageMetadata({
    title: formatSlugLabel(slug),
    description: `${formatSlugLabel(slug)} is not published yet on Shapewebs.`,
    path: `/${slug.join("/")}`,
    noIndex: true,
  });
}

export default async function CatchAllPage(props: CatchAllPageProps) {
  const { slug } = await props.params;
  const document = await getResolvedGenericPage(slug.at(-1) ?? "page");

  if (document) {
    return <ContentPage document={document} />;
  }

  return <BlankStage routeLabel={formatSlugLabel(slug)} />;
}

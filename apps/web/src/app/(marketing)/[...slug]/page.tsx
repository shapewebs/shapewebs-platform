import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ContentPage } from "@/components/content/content-page";
import {
  buildDocumentMetadata,
  getResolvedContentBySlug,
  getResolvedGenericPage,
} from "@/lib/content";
import {
  resolveContentRoute,
  type ResolvedContentRoute,
} from "@/lib/content-routing";
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

function getRoutedDocument(route: ResolvedContentRoute) {
  return route.kind === "generic"
    ? getResolvedGenericPage(route.slug, route.localeCode)
    : getResolvedContentBySlug(route.contentType, route.slug, route.localeCode);
}

export async function generateMetadata(
  props: CatchAllPageProps,
): Promise<Metadata> {
  const { slug } = await props.params;
  const route = resolveContentRoute(slug);

  if (!route) {
    return buildPageMetadata({
      title: formatSlugLabel(slug),
      description: "This route is not published on Shapewebs.",
      path: `/${slug.join("/")}`,
      noIndex: true,
    });
  }

  const document = await getRoutedDocument(route);

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
  const route = resolveContentRoute(slug);

  if (!route) {
    notFound();
  }

  const document = await getRoutedDocument(route);

  if (document) {
    return <ContentPage document={document} />;
  }

  notFound();
}

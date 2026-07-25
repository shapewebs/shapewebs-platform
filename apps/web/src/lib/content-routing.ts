import type { ContentType } from "@shapewebs/config";
import {
  defaultLocale,
  isSupportedLocale,
  type LocaleCode,
} from "@shapewebs/i18n";

type RoutableDocument = {
  contentType: ContentType;
  localeCode: string;
  pageKind: string | null;
  slug: string;
};

type CollectionContentType = Extract<
  ContentType,
  "legal" | "post" | "project" | "service"
>;

export type ResolvedContentRoute =
  | {
      kind: "generic";
      localeCode: LocaleCode;
      slug: string;
    }
  | {
      contentType: CollectionContentType;
      kind: "typed";
      localeCode: LocaleCode;
      slug: string;
    };

function getCollectionContentType(
  collection: string | undefined,
): CollectionContentType | null {
  switch (collection) {
    case "blog":
      return "post";
    case "legal":
      return "legal";
    case "projects":
    case "work":
      return "project";
    case "services":
      return "service";
    default:
      return null;
  }
}

export function resolveContentRoute(
  untrustedSegments: readonly string[],
): ResolvedContentRoute | null {
  const segments = [...untrustedSegments];
  let localeCode: LocaleCode = defaultLocale;
  const possibleLocale = segments[0];

  if (possibleLocale && isSupportedLocale(possibleLocale)) {
    localeCode = possibleLocale;
    segments.shift();
  }

  if (segments.length === 0) {
    return { kind: "generic", localeCode, slug: "home" };
  }

  if (segments.length === 1 && segments[0]) {
    return { kind: "generic", localeCode, slug: segments[0] };
  }

  const [collection, slug] = segments;
  const contentType = getCollectionContentType(collection);

  if (segments.length !== 2 || !contentType || !slug) {
    return null;
  }

  return {
    contentType,
    kind: "typed",
    localeCode,
    slug,
  };
}

export function contentRouteMatchesDocument(
  route: ResolvedContentRoute,
  document: RoutableDocument,
): boolean {
  if (document.localeCode !== route.localeCode) {
    return false;
  }

  if (route.kind === "typed") {
    return (
      document.contentType === route.contentType && document.slug === route.slug
    );
  }

  if (route.slug === "home") {
    return (
      document.contentType === "page" &&
      (document.pageKind === "home" || document.slug === "home")
    );
  }

  return (
    (document.contentType === "page" || document.contentType === "method") &&
    document.slug === route.slug
  );
}

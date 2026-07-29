import "server-only";

import { cookies } from "next/headers";
import { getSanityContentPreviewSelection } from "@shapewebs/database/server";

import type { ResolvedContentRoute } from "./content-routing";
import { getContentDatabaseConfiguration } from "./content";
import { getPreviewCookiePolicy } from "./preview-cookie";
import { getWebSanityDraftRuntime } from "./sanity";

export async function getPrivateSanityBlogPreview(route: ResolvedContentRoute) {
  if (route.kind !== "typed" || route.contentType !== "post") {
    return null;
  }

  const cookieStore = await cookies();
  const cookiePolicy = getPreviewCookiePolicy(
    process.env.NODE_ENV === "production",
  );
  const sessionToken = cookieStore.get(cookiePolicy.name)?.value;
  const { databaseUrl, organizationId } = getContentDatabaseConfiguration();
  const sanity = getWebSanityDraftRuntime();

  if (!sessionToken || !databaseUrl || !organizationId || !sanity) {
    return null;
  }

  const selection = await getSanityContentPreviewSelection(
    databaseUrl,
    organizationId,
    sessionToken,
  );

  if (
    !selection ||
    selection.localeCode !== route.localeCode ||
    selection.slug !== route.slug
  ) {
    return null;
  }

  const state = await sanity.repository.getBlogPostEditorState({
    documentId: selection.documentId,
  });

  if (
    !state ||
    !state.hasDraft ||
    state.draftRevision !== selection.revisionId ||
    state.draft.locale !== selection.localeCode ||
    state.draft.slug.current !== selection.slug
  ) {
    return null;
  }

  return {
    post: state.draft,
    resolveImage: sanity.resolveImage,
  };
}

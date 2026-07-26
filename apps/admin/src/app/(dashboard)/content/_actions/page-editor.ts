"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { contentDocumentSchema } from "@shapewebs/content-schema";
import {
  createContentPreviewGrant,
  rollbackPageContentRevision,
  savePageContentRevision,
  unpublishPageContent,
  type PublicLocaleCode,
} from "@shapewebs/database/server";
import {
  contentPreviewSelectionSchema,
  contentRollbackCommandSchema,
  contentUnpublishCommandSchema,
  pageEditorInputSchema,
} from "@shapewebs/validation";

import { requireAdminSession } from "@/lib/auth";
import { getAdminDatabaseUrl } from "@/lib/better-auth";
import { triggerPublicContentRevalidation } from "@/lib/public-revalidation";

export type PreviewSavedPageState =
  | {
      status: "idle";
    }
  | {
      endpoint: string;
      status: "ready";
      token: string;
    }
  | {
      status: "unavailable";
    };

function getSiteOrigin() {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

function getPublicPagePath(slug: string, localeCode: string) {
  const localePrefix = localeCode === "en" ? "" : `/${localeCode}`;

  return slug === "home" ? localePrefix || "/" : `${localePrefix}/${slug}`;
}

function normalizeOptionalValue(value: FormDataEntryValue | null) {
  const normalized = typeof value === "string" ? value.trim() : "";
  return normalized.length > 0 ? normalized : undefined;
}

function getEditorPath(
  documentId: string | undefined,
  options: {
    error?: string;
    localeCode?: string;
    status?: string;
  } = {},
) {
  const pathname = documentId
    ? `/content/pages/${documentId}`
    : "/content/pages/new";
  const search = new URLSearchParams();

  if (options.localeCode) {
    search.set("locale", options.localeCode);
  }

  if (options.error) {
    search.set("error", options.error);
  }

  if (options.status) {
    search.set("status", options.status);
  }

  return search.size > 0 ? `${pathname}?${search.toString()}` : pathname;
}

export async function savePageEditorAction(formData: FormData) {
  const rawIntent = formData.get("intent");
  const runtime = await requireAdminSession({
    freshStepUpWithinSeconds: rawIntent === "publish" ? 10 * 60 : undefined,
    redirectTo: "/content",
    roles: ["owner", "editor"],
  });
  const documentId = normalizeOptionalValue(formData.get("documentId"));
  const databaseUrl = getAdminDatabaseUrl();
  const parsed = pageEditorInputSchema.safeParse({
    commandId: formData.get("commandId"),
    documentId,
    expectedVersion: formData.get("expectedVersion"),
    localeCode: formData.get("localeCode"),
    pageKind: formData.get("pageKind"),
    title: formData.get("title"),
    slug: formData.get("slug"),
    summary: normalizeOptionalValue(formData.get("summary")),
    metaTitle: normalizeOptionalValue(formData.get("metaTitle")),
    metaDescription: normalizeOptionalValue(formData.get("metaDescription")),
    canonicalUrlOverride: normalizeOptionalValue(
      formData.get("canonicalUrlOverride"),
    ),
    robotsIndex: formData.get("robotsIndex") === "true",
    contentJson: formData.get("contentJson"),
    changeNote: normalizeOptionalValue(formData.get("changeNote")),
    intent: rawIntent,
  });

  if (!parsed.success) {
    redirect(getEditorPath(documentId, { error: "validation" }));
  }

  let untrustedContent: unknown;

  try {
    untrustedContent = JSON.parse(parsed.data.contentJson);
  } catch {
    redirect(
      getEditorPath(documentId, {
        error: "json",
        localeCode: parsed.data.localeCode,
      }),
    );
  }

  const content = contentDocumentSchema.safeParse(untrustedContent);

  if (!content.success) {
    redirect(
      getEditorPath(documentId, {
        error: "content",
        localeCode: parsed.data.localeCode,
      }),
    );
  }

  if (runtime.setupMode || !databaseUrl || !runtime.authorization) {
    redirect(
      getEditorPath(documentId, {
        error: "setup",
        localeCode: parsed.data.localeCode,
      }),
    );
  }

  const requestHeaders = await headers();
  const result = await savePageContentRevision(
    databaseUrl,
    runtime.authorization,
    {
      ...parsed.data,
      content: content.data,
      documentId: parsed.data.documentId,
      requestId: requestHeaders.get("x-request-id") ?? undefined,
    },
  );

  if (!("documentId" in result)) {
    redirect(
      getEditorPath(documentId, {
        error: result.status,
        localeCode: parsed.data.localeCode,
      }),
    );
  }

  revalidatePath("/content");
  revalidatePath(`/content/pages/${result.documentId}`);

  let status =
    result.status === "duplicate"
      ? "duplicate"
      : parsed.data.intent === "publish"
        ? "published"
        : parsed.data.intent === "review"
          ? "in-review"
          : "saved";

  if (
    parsed.data.intent === "publish" &&
    !(await triggerPublicContentRevalidation({
      documentId: result.documentId,
      localeCode: result.localeCode,
      paths: [getPublicPagePath(parsed.data.slug, result.localeCode)],
      vercelOidcToken: requestHeaders.get("x-vercel-oidc-token") ?? undefined,
    }))
  ) {
    status = "published-revalidation-pending";
  }

  redirect(
    getEditorPath(result.documentId, {
      localeCode: result.localeCode,
      status,
    }),
  );
}

export async function unpublishPageAction(formData: FormData) {
  const runtime = await requireAdminSession({
    freshStepUpWithinSeconds: 5 * 60,
    redirectTo: "/content",
    roles: ["owner", "editor"],
  });
  const parsed = contentUnpublishCommandSchema.safeParse({
    commandId: formData.get("commandId"),
    confirmation: formData.get("confirmation"),
    documentId: formData.get("documentId"),
    expectedVersion: formData.get("expectedVersion"),
    localeCode: formData.get("localeCode"),
  });

  if (!parsed.success) {
    redirect(
      getEditorPath(normalizeOptionalValue(formData.get("documentId")), {
        error: "validation",
        localeCode: normalizeOptionalValue(formData.get("localeCode")),
      }),
    );
  }

  const databaseUrl = getAdminDatabaseUrl();

  if (runtime.setupMode || !databaseUrl || !runtime.authorization) {
    redirect(
      getEditorPath(parsed.data.documentId, {
        error: "setup",
        localeCode: parsed.data.localeCode,
      }),
    );
  }

  const requestHeaders = await headers();
  const result = await unpublishPageContent(
    databaseUrl,
    runtime.authorization,
    {
      commandId: parsed.data.commandId,
      documentId: parsed.data.documentId,
      expectedVersion: parsed.data.expectedVersion,
      localeCode: parsed.data.localeCode,
      requestId: requestHeaders.get("x-request-id") ?? undefined,
    },
  );

  if (!("documentId" in result)) {
    redirect(
      getEditorPath(parsed.data.documentId, {
        error: result.status,
        localeCode: parsed.data.localeCode,
      }),
    );
  }

  revalidatePath("/content");
  revalidatePath(`/content/pages/${result.documentId}`);
  let status = result.status === "duplicate" ? "duplicate" : "unpublished";

  if (
    result.status !== "duplicate" &&
    result.previousSlug &&
    !(await triggerPublicContentRevalidation({
      documentId: result.documentId,
      localeCode: result.localeCode,
      paths: [getPublicPagePath(result.previousSlug, result.localeCode)],
      vercelOidcToken: requestHeaders.get("x-vercel-oidc-token") ?? undefined,
    }))
  ) {
    status = "unpublished-revalidation-pending";
  }

  redirect(
    getEditorPath(result.documentId, {
      localeCode: result.localeCode,
      status,
    }),
  );
}

export async function rollbackPageAction(formData: FormData) {
  const runtime = await requireAdminSession({
    freshStepUpWithinSeconds: 5 * 60,
    redirectTo: "/content",
    roles: ["owner", "editor"],
  });
  const parsed = contentRollbackCommandSchema.safeParse({
    commandId: formData.get("commandId"),
    confirmation: formData.get("confirmation"),
    documentId: formData.get("documentId"),
    expectedVersion: formData.get("expectedVersion"),
    localeCode: formData.get("localeCode"),
    revisionId: formData.get("revisionId"),
  });

  if (!parsed.success) {
    redirect(
      getEditorPath(normalizeOptionalValue(formData.get("documentId")), {
        error: "validation",
        localeCode: normalizeOptionalValue(formData.get("localeCode")),
      }),
    );
  }

  const databaseUrl = getAdminDatabaseUrl();

  if (runtime.setupMode || !databaseUrl || !runtime.authorization) {
    redirect(
      getEditorPath(parsed.data.documentId, {
        error: "setup",
        localeCode: parsed.data.localeCode,
      }),
    );
  }

  const requestHeaders = await headers();
  const result = await rollbackPageContentRevision(
    databaseUrl,
    runtime.authorization,
    {
      commandId: parsed.data.commandId,
      documentId: parsed.data.documentId,
      expectedVersion: parsed.data.expectedVersion,
      localeCode: parsed.data.localeCode,
      requestId: requestHeaders.get("x-request-id") ?? undefined,
      revisionId: parsed.data.revisionId,
    },
  );

  if (!("documentId" in result)) {
    redirect(
      getEditorPath(parsed.data.documentId, {
        error: result.status,
        localeCode: parsed.data.localeCode,
      }),
    );
  }

  revalidatePath("/content");
  revalidatePath(`/content/pages/${result.documentId}`);
  let status = result.status === "duplicate" ? "duplicate" : "rolled-back";

  if (result.status !== "duplicate") {
    const paths = [getPublicPagePath(result.slug, result.localeCode)];

    if (result.previousSlug) {
      paths.push(getPublicPagePath(result.previousSlug, result.localeCode));
    }

    if (
      !(await triggerPublicContentRevalidation({
        documentId: result.documentId,
        localeCode: result.localeCode,
        paths,
        vercelOidcToken: requestHeaders.get("x-vercel-oidc-token") ?? undefined,
      }))
    ) {
      status = "rolled-back-revalidation-pending";
    }
  }

  redirect(
    getEditorPath(result.documentId, {
      localeCode: result.localeCode,
      status,
    }),
  );
}

export async function previewSavedPageAction(
  _state: PreviewSavedPageState,
  formData: FormData,
): Promise<PreviewSavedPageState> {
  const runtime = await requireAdminSession({
    redirectTo: "/content",
    roles: ["owner", "editor"],
  });
  const parsed = contentPreviewSelectionSchema.safeParse({
    documentId: formData.get("documentId"),
    localeCode: formData.get("localeCode"),
    revisionId: formData.get("revisionId"),
  });

  if (!parsed.success) {
    return { status: "unavailable" };
  }

  const databaseUrl = getAdminDatabaseUrl();

  if (runtime.setupMode || !databaseUrl || !runtime.authorization) {
    return { status: "unavailable" };
  }

  const requestHeaders = await headers();
  const grant = await createContentPreviewGrant(
    databaseUrl,
    runtime.authorization,
    {
      ...parsed.data,
      localeCode: parsed.data.localeCode as PublicLocaleCode,
      requestId: requestHeaders.get("x-request-id") ?? undefined,
    },
  );

  if (!grant) {
    return { status: "unavailable" };
  }

  const previewUrl = new URL("/api/preview", getSiteOrigin());
  return {
    endpoint: previewUrl.toString(),
    status: "ready",
    token: grant.token,
  };
}

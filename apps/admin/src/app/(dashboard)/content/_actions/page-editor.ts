"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { contentDocumentSchema } from "@shapewebs/content-schema";
import { savePageContentRevision } from "@shapewebs/database/server";
import { pageEditorInputSchema } from "@shapewebs/validation";

import { requireAdminSession } from "@/lib/auth";
import { getAdminDatabaseUrl } from "@/lib/better-auth";

function getSiteOrigin() {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

async function triggerWebRevalidation(input: {
  documentId: string;
  localeCode: string;
  slug: string;
}) {
  const secret = process.env.REVALIDATION_WEBHOOK_SECRET;

  if (!secret) {
    return false;
  }

  try {
    const response = await fetch(`${getSiteOrigin()}/api/revalidate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-shapewebs-revalidate-secret": secret,
      },
      body: JSON.stringify({
        contentType: "page",
        documentId: input.documentId,
        localeCode: input.localeCode,
        path: input.slug === "home" ? "/" : `/${input.slug}`,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(5_000),
    });

    return response.ok;
  } catch {
    return false;
  }
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
    !(await triggerWebRevalidation({
      documentId: result.documentId,
      localeCode: result.localeCode,
      slug: parsed.data.slug,
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

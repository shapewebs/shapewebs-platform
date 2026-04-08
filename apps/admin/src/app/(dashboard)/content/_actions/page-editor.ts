"use server";

import { redirect } from "next/navigation";
import { contentDocumentSchema } from "@shapewebs/content-schema";
import {
  createDraftRevision,
  createPreviewToken,
} from "@shapewebs/db";
import { pageEditorInputSchema } from "@shapewebs/validation";
import { getAdminRuntimeState } from "@/lib/auth";

function getSiteOrigin() {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

async function triggerWebRevalidation(input: {
  documentId: string;
  localeCode: string;
  slug: string;
  contentType: string;
}) {
  const secret = process.env.REVALIDATION_WEBHOOK_SECRET;

  if (!secret) {
    return;
  }

  await fetch(`${getSiteOrigin()}/api/revalidate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-shapewebs-revalidate-secret": secret,
    },
    body: JSON.stringify({
      contentType: input.contentType,
      documentId: input.documentId,
      localeCode: input.localeCode,
      path: input.slug === "home" ? "/" : `/${input.slug}`,
    }),
    cache: "no-store",
  });
}

function normalizeOptionalValue(value: FormDataEntryValue | null) {
  const normalized = typeof value === "string" ? value.trim() : "";
  return normalized.length > 0 ? normalized : undefined;
}

export async function savePageEditorAction(formData: FormData) {
  const runtime = await getAdminRuntimeState();

  if (!runtime.supabase) {
    redirect("/content?error=setup");
  }

  const contentJson = String(formData.get("contentJson") ?? "");
  const parsed = pageEditorInputSchema.parse({
    documentId: normalizeOptionalValue(formData.get("documentId")),
    localeCode: formData.get("localeCode"),
    pageKind: formData.get("pageKind"),
    title: formData.get("title"),
    slug: formData.get("slug"),
    summary: normalizeOptionalValue(formData.get("summary")),
    metaTitle: normalizeOptionalValue(formData.get("metaTitle")),
    metaDescription: normalizeOptionalValue(formData.get("metaDescription")),
    canonicalUrlOverride: normalizeOptionalValue(formData.get("canonicalUrlOverride")),
    robotsIndex: formData.get("robotsIndex") === "true",
    contentJson,
    changeNote: normalizeOptionalValue(formData.get("changeNote")),
    intent: formData.get("intent"),
  });

  const content = contentDocumentSchema.parse(JSON.parse(parsed.contentJson));

  const editorState = await createDraftRevision(runtime.supabase, {
    documentId: parsed.documentId,
    localeCode: parsed.localeCode,
    pageKind: parsed.pageKind,
    slug: parsed.slug,
    title: parsed.title,
    summary: parsed.summary ?? null,
    metaTitle: parsed.metaTitle ?? null,
    metaDescription: parsed.metaDescription ?? null,
    canonicalUrlOverride: parsed.canonicalUrlOverride ?? null,
    robotsIndex: parsed.robotsIndex,
    changeNote: parsed.changeNote ?? null,
    intent:
      parsed.intent === "preview"
        ? "draft"
        : parsed.intent === "publish"
          ? "publish"
          : parsed.intent === "review"
            ? "review"
            : "draft",
    content,
    contentType: "page",
  });

  if (parsed.intent === "preview") {
    const latestRevision = editorState.revisions[0];

    if (!latestRevision) {
      redirect(`/content/pages/${editorState.documentId}?locale=${editorState.localeCode}&error=preview`);
    }

    const preview = await createPreviewToken(runtime.supabase, {
      documentId: editorState.documentId,
      localeCode: editorState.localeCode,
      revisionId: latestRevision.revisionId,
      path: parsed.slug === "home" ? "/" : `/${parsed.slug}`,
    });

    redirect(
      `${getSiteOrigin()}/api/preview?token=${encodeURIComponent(preview.token)}&signature=${encodeURIComponent(preview.signature)}&path=${encodeURIComponent(preview.previewPath)}`,
    );
  }

  if (parsed.intent === "publish") {
    await triggerWebRevalidation({
      contentType: "page",
      documentId: editorState.documentId,
      localeCode: editorState.localeCode,
      slug: parsed.slug,
    });
  }

  const status =
    parsed.intent === "publish"
      ? "published"
      : parsed.intent === "review"
        ? "in-review"
        : "saved";

  redirect(
    `/content/pages/${editorState.documentId}?locale=${encodeURIComponent(editorState.localeCode)}&status=${status}`,
  );
}

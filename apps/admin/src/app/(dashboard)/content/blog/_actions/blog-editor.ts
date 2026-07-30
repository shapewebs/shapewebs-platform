"use server";

import { randomUUID } from "node:crypto";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { sanityBlogPostDraftInputSchema } from "@shapewebs/content-schema";
import type { SanityBlogPostEditorState } from "@shapewebs/content-platform/server";
import {
  completeContentProviderCommand,
  createSanityContentPreviewGrant,
  createContentProviderCommandFingerprint,
  markContentProviderCommandUncertain,
  reserveContentProviderCommand,
} from "@shapewebs/database/server";
import {
  createStructuredLogger,
  resolveShapewebsEnvironment,
} from "@shapewebs/observability";

import { requireAdminSession } from "@/lib/auth";
import { getAdminDatabaseUrl } from "@/lib/better-auth";
import { triggerPublicContentRevalidation } from "@/lib/public-revalidation";
import { getAdminSanityRuntime } from "@/lib/sanity";
import { getSanityWebhookRevalidationRequests } from "@/lib/sanity-webhook-request";

export type PreviewSavedBlogState =
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

const logger = createStructuredLogger({
  deploymentId: process.env.VERCEL_DEPLOYMENT_ID,
  environment: resolveShapewebsEnvironment(),
  service: "shapewebs-admin",
});

function getSiteOrigin() {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

function readText(
  formData: FormData,
  name: string,
  options: { optional?: boolean } = {},
): string | undefined {
  const value = formData.get(name);

  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.normalize().trim();

  if (options.optional && normalized.length === 0) {
    return undefined;
  }

  return normalized;
}

function getBlogEditorPath(
  documentId: string | undefined,
  options: {
    error?: string;
    status?: string;
  } = {},
) {
  const pathname = documentId
    ? `/content/blog/${documentId}`
    : "/content/blog/new";
  const search = new URLSearchParams();

  if (options.error) {
    search.set("error", options.error);
  }

  if (options.status) {
    search.set("status", options.status);
  }

  return search.size > 0 ? `${pathname}?${search.toString()}` : pathname;
}

async function revalidatePublicBlogRoutes(
  event: Parameters<typeof getSanityWebhookRevalidationRequests>[0],
  vercelOidcToken?: string,
) {
  const requests = getSanityWebhookRevalidationRequests(event);

  if (!requests) {
    return false;
  }

  return (
    await Promise.all(
      requests.map((request) =>
        triggerPublicContentRevalidation({
          ...request,
          vercelOidcToken,
        }),
      ),
    )
  ).every(Boolean);
}

function parseBody(value: FormDataEntryValue | null): unknown {
  if (typeof value !== "string" || value.length > 1_000_000) {
    return null;
  }

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function parseBlogPostContent(formData: FormData, publishedAt?: string) {
  const authorId = readText(formData, "authorId");
  const coverAssetId = readText(formData, "coverAssetId");
  const locale = readText(formData, "locale");
  const slug = readText(formData, "slug");
  const title = readText(formData, "title");
  const excerpt = readText(formData, "excerpt");

  return sanityBlogPostDraftInputSchema.safeParse({
    author: {
      _ref: authorId,
      _type: "reference",
    },
    body: parseBody(formData.get("bodyJson")),
    categories: formData
      .getAll("categoryId")
      .filter((value): value is string => typeof value === "string")
      .map((value) => ({
        _ref: value,
        _type: "reference",
      })),
    coverImage: {
      _type: "image",
      alt: readText(formData, "coverAlt") ?? "",
      asset: {
        _ref: coverAssetId,
        _type: "reference",
      },
      caption: readText(formData, "coverCaption", { optional: true }),
      decorative: formData.get("coverDecorative") === "true",
    },
    excerpt,
    locale,
    ...(publishedAt ? { publishedAt } : {}),
    seo: {
      description: readText(formData, "seoDescription", { optional: true }),
      noIndex: formData.get("seoNoIndex") === "true",
      title: readText(formData, "seoTitle", { optional: true }),
    },
    slug: {
      _type: "slug",
      current: slug,
    },
    title,
  });
}

function isCommandId(value: string | undefined): value is string {
  return Boolean(
    value &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u.test(
      value,
    ),
  );
}

async function markCommandUncertain(input: {
  action: string;
  commandId: string;
  databaseUrl: string;
  requestId: string;
  runtime: Awaited<ReturnType<typeof requireAdminSession>>;
  targetId: string;
}) {
  if (!input.runtime.authorization) {
    return;
  }

  try {
    await markContentProviderCommandUncertain(
      input.databaseUrl,
      input.runtime.authorization,
      {
        auditAction: input.action,
        commandId: input.commandId,
        failureCode: "provider_outcome_unconfirmed",
        requestId: input.requestId,
        targetId: input.targetId,
      },
    );
  } catch {
    logger.log({
      eventCode: "shapewebs.content.provider_command",
      level: "error",
      metadata: {
        operation: input.action,
        reasonCode: "failure_receipt_persistence_failed",
        resourceType: "sanity_blog_post",
      },
      requestId: input.requestId,
      result: "failure",
    });
  }
}

export async function saveBlogPostAction(formData: FormData) {
  const documentId = readText(formData, "documentId", { optional: true });
  const expectedRevision = readText(formData, "expectedRevision", {
    optional: true,
  });
  const commandId = readText(formData, "commandId");
  const runtime = await requireAdminSession({
    redirectTo: getBlogEditorPath(documentId),
    roles: ["owner", "editor"],
  });
  const sanity = getAdminSanityRuntime();
  const databaseUrl = getAdminDatabaseUrl();

  if (
    runtime.setupMode ||
    !runtime.authorization ||
    !sanity ||
    !databaseUrl ||
    !isCommandId(commandId)
  ) {
    redirect(getBlogEditorPath(documentId, { error: "unavailable" }));
  }

  let currentState: SanityBlogPostEditorState | null = null;

  if (documentId) {
    currentState = await sanity.draftRepository.getBlogPostEditorState({
      documentId,
    });

    if (
      !currentState ||
      !expectedRevision ||
      currentState.draftRevision !== expectedRevision
    ) {
      redirect(getBlogEditorPath(documentId, { error: "conflict" }));
    }
  }

  const content = parseBlogPostContent(
    formData,
    currentState?.draft.publishedAt,
  );

  if (!content.success) {
    redirect(getBlogEditorPath(documentId, { error: "validation" }));
  }

  const requestHeaders = await headers();
  const requestId = requestHeaders.get("x-request-id") ?? randomUUID();
  const targetId = documentId ?? `blog-post-${commandId}`;
  const auditAction = documentId
    ? "content.blog_post_draft_saved"
    : "content.blog_post_created";
  const reservation = await reserveContentProviderCommand(
    databaseUrl,
    runtime.authorization,
    {
      action: documentId ? "blog_post.save" : "blog_post.create",
      commandId,
      requestFingerprint: createContentProviderCommandFingerprint({
        action: documentId ? "blog_post.save" : "blog_post.create",
        content: content.data,
        expectedRevision: expectedRevision ?? null,
        targetId,
      }),
      targetId,
    },
  ).catch(() => null);

  if (!reservation) {
    redirect(getBlogEditorPath(documentId, { error: "unavailable" }));
  }

  if (reservation.status === "conflict") {
    redirect(getBlogEditorPath(documentId, { error: "idempotency" }));
  }

  if (reservation.status === "pending") {
    redirect(getBlogEditorPath(documentId, { error: "pending" }));
  }

  if (reservation.status === "duplicate") {
    redirect(getBlogEditorPath(targetId, { status: "saved" }));
  }

  let result: {
    documentId: string;
    transactionId: string;
  };

  try {
    result =
      documentId && expectedRevision
        ? {
            documentId,
            ...(await sanity.writeRepository.saveBlogPostDraft({
              commandId,
              content: content.data,
              documentId,
              expectedRevision,
            })),
          }
        : await sanity.writeRepository.createBlogPostDraft({
            commandId,
            content: content.data,
          });
  } catch {
    await markCommandUncertain({
      action: auditAction,
      commandId,
      databaseUrl,
      requestId,
      runtime,
      targetId,
    });
    redirect(getBlogEditorPath(documentId, { error: "provider" }));
  }

  if (result.documentId !== targetId) {
    await markCommandUncertain({
      action: auditAction,
      commandId,
      databaseUrl,
      requestId,
      runtime,
      targetId,
    });
    redirect(getBlogEditorPath(documentId, { error: "provider" }));
  }

  try {
    await completeContentProviderCommand(databaseUrl, runtime.authorization, {
      auditAction,
      commandId,
      providerTransactionId: result.transactionId,
      requestId,
      targetId,
    });
  } catch {
    redirect(getBlogEditorPath(targetId, { error: "pending" }));
  }

  revalidatePath("/content");
  revalidatePath("/content/blog");
  revalidatePath(`/content/blog/${result.documentId}`);
  redirect(getBlogEditorPath(result.documentId, { status: "saved" }));
}

export async function publishBlogPostAction(formData: FormData) {
  const documentId = readText(formData, "documentId");
  const expectedRevision = readText(formData, "expectedRevision");
  const commandId = readText(formData, "commandId");
  const runtime = await requireAdminSession({
    freshStepUpWithinSeconds: 5 * 60,
    redirectTo: getBlogEditorPath(documentId),
    roles: ["owner", "editor"],
  });
  const sanity = getAdminSanityRuntime();
  const databaseUrl = getAdminDatabaseUrl();

  if (
    runtime.setupMode ||
    !runtime.authorization ||
    !sanity ||
    !databaseUrl ||
    !isCommandId(commandId) ||
    !documentId ||
    !expectedRevision
  ) {
    redirect(getBlogEditorPath(documentId, { error: "unavailable" }));
  }

  const currentState = await sanity.draftRepository.getBlogPostEditorState({
    documentId,
  });

  if (
    !currentState ||
    !currentState.hasDraft ||
    currentState.draftRevision !== expectedRevision
  ) {
    redirect(getBlogEditorPath(documentId, { error: "conflict" }));
  }

  const requestHeaders = await headers();
  const requestId = requestHeaders.get("x-request-id") ?? randomUUID();
  const reservation = await reserveContentProviderCommand(
    databaseUrl,
    runtime.authorization,
    {
      action: "blog_post.publish",
      commandId,
      requestFingerprint: createContentProviderCommandFingerprint({
        action: "blog_post.publish",
        expectedDraftRevision: currentState.draftRevision,
        expectedPublishedRevision: currentState.publishedRevision ?? null,
        targetId: documentId,
      }),
      targetId: documentId,
    },
  ).catch(() => null);

  if (!reservation) {
    redirect(getBlogEditorPath(documentId, { error: "unavailable" }));
  }

  if (reservation.status === "conflict") {
    redirect(getBlogEditorPath(documentId, { error: "idempotency" }));
  }

  if (reservation.status === "pending") {
    redirect(getBlogEditorPath(documentId, { error: "pending" }));
  }

  if (reservation.status === "duplicate") {
    redirect(getBlogEditorPath(documentId, { status: "published" }));
  }

  let providerTransactionId: string;
  try {
    const result = await sanity.writeRepository.publishBlogPost({
      commandId,
      documentId,
      expectedDraftRevision: currentState.draftRevision,
      expectedPublishedRevision: currentState.publishedRevision,
    });
    providerTransactionId = result.transactionId;
  } catch {
    await markCommandUncertain({
      action: "content.blog_post_published",
      commandId,
      databaseUrl,
      requestId,
      runtime,
      targetId: documentId,
    });
    redirect(getBlogEditorPath(documentId, { error: "provider" }));
  }

  try {
    await completeContentProviderCommand(databaseUrl, runtime.authorization, {
      auditAction: "content.blog_post_published",
      commandId,
      providerTransactionId,
      requestId,
      targetId: documentId,
    });
  } catch {
    redirect(getBlogEditorPath(documentId, { error: "pending" }));
  }

  revalidatePath("/content");
  revalidatePath("/content/blog");
  revalidatePath(`/content/blog/${documentId}`);
  let status = "published";

  if (
    !(await revalidatePublicBlogRoutes(
      {
        _id: documentId,
        _type: "blogPost",
        locale: currentState.draft.locale,
        operation: currentState.published ? "update" : "create",
        previousLocale: currentState.published?.locale,
        previousSlug: currentState.published?.slug.current,
        slug: currentState.draft.slug.current,
      },
      requestHeaders.get("x-vercel-oidc-token") ?? undefined,
    ))
  ) {
    status = "published-revalidation-pending";
  }

  redirect(getBlogEditorPath(documentId, { status }));
}

export async function unpublishBlogPostAction(formData: FormData) {
  const documentId = readText(formData, "documentId");
  const expectedPublishedRevision = readText(
    formData,
    "expectedPublishedRevision",
  );
  const commandId = readText(formData, "commandId");
  const runtime = await requireAdminSession({
    freshStepUpWithinSeconds: 5 * 60,
    redirectTo: getBlogEditorPath(documentId),
    roles: ["owner", "editor"],
  });
  const sanity = getAdminSanityRuntime();
  const databaseUrl = getAdminDatabaseUrl();

  if (
    runtime.setupMode ||
    !runtime.authorization ||
    !sanity ||
    !databaseUrl ||
    !isCommandId(commandId) ||
    !documentId ||
    !expectedPublishedRevision
  ) {
    redirect(getBlogEditorPath(documentId, { error: "unavailable" }));
  }

  const currentState = await sanity.draftRepository.getBlogPostEditorState({
    documentId,
  });

  if (
    !currentState?.published ||
    currentState.publishedRevision !== expectedPublishedRevision
  ) {
    redirect(getBlogEditorPath(documentId, { error: "conflict" }));
  }

  const requestHeaders = await headers();
  const requestId = requestHeaders.get("x-request-id") ?? randomUUID();
  const reservation = await reserveContentProviderCommand(
    databaseUrl,
    runtime.authorization,
    {
      action: "blog_post.unpublish",
      commandId,
      requestFingerprint: createContentProviderCommandFingerprint({
        action: "blog_post.unpublish",
        expectedPublishedRevision,
        targetId: documentId,
      }),
      targetId: documentId,
    },
  ).catch(() => null);

  if (!reservation) {
    redirect(getBlogEditorPath(documentId, { error: "unavailable" }));
  }

  if (reservation.status === "conflict") {
    redirect(getBlogEditorPath(documentId, { error: "idempotency" }));
  }

  if (reservation.status === "pending") {
    redirect(getBlogEditorPath(documentId, { error: "pending" }));
  }

  if (reservation.status === "duplicate") {
    redirect(getBlogEditorPath(documentId, { status: "unpublished" }));
  }

  let providerTransactionId: string;

  try {
    const result = await sanity.writeRepository.unpublishBlogPost({
      commandId,
      documentId,
    });
    providerTransactionId = result.transactionId;
  } catch {
    await markCommandUncertain({
      action: "content.blog_post_unpublished",
      commandId,
      databaseUrl,
      requestId,
      runtime,
      targetId: documentId,
    });
    redirect(getBlogEditorPath(documentId, { error: "provider" }));
  }

  try {
    await completeContentProviderCommand(databaseUrl, runtime.authorization, {
      auditAction: "content.blog_post_unpublished",
      commandId,
      providerTransactionId,
      requestId,
      targetId: documentId,
    });
  } catch {
    redirect(getBlogEditorPath(documentId, { error: "pending" }));
  }

  revalidatePath("/content");
  revalidatePath("/content/blog");
  revalidatePath(`/content/blog/${documentId}`);
  let status = "unpublished";

  if (
    !(await revalidatePublicBlogRoutes(
      {
        _id: documentId,
        _type: "blogPost",
        locale: undefined,
        operation: "delete",
        previousLocale: currentState.published.locale,
        previousSlug: currentState.published.slug.current,
        slug: undefined,
      },
      requestHeaders.get("x-vercel-oidc-token") ?? undefined,
    ))
  ) {
    status = "unpublished-revalidation-pending";
  }

  redirect(getBlogEditorPath(documentId, { status }));
}

export async function previewSavedBlogPostAction(
  _state: PreviewSavedBlogState,
  formData: FormData,
): Promise<PreviewSavedBlogState> {
  const documentId = readText(formData, "documentId");
  const revisionId = readText(formData, "revisionId");
  const runtime = await requireAdminSession({
    redirectTo: getBlogEditorPath(documentId),
    roles: ["owner", "editor"],
  });
  const databaseUrl = getAdminDatabaseUrl();
  const sanity = getAdminSanityRuntime();

  if (
    runtime.setupMode ||
    !runtime.authorization ||
    !databaseUrl ||
    !sanity ||
    !documentId ||
    !revisionId
  ) {
    return { status: "unavailable" };
  }

  const currentState = await sanity.draftRepository
    .getBlogPostEditorState({ documentId })
    .catch(() => null);

  if (
    !currentState ||
    !currentState.hasDraft ||
    currentState.draftRevision !== revisionId
  ) {
    return { status: "unavailable" };
  }

  const requestHeaders = await headers();
  const grant = await createSanityContentPreviewGrant(
    databaseUrl,
    runtime.authorization,
    {
      documentId,
      localeCode: currentState.draft.locale,
      requestId: requestHeaders.get("x-request-id") ?? undefined,
      revisionId,
      slug: currentState.draft.slug.current,
    },
  ).catch(() => null);

  if (!grant) {
    return { status: "unavailable" };
  }

  return {
    endpoint: new URL("/api/preview", getSiteOrigin()).toString(),
    status: "ready",
    token: grant.token,
  };
}

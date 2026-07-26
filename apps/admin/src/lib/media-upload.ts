import { randomUUID } from "node:crypto";

import type { AdminAuthorizationContext } from "@shapewebs/database/server";
import type {
  NormalizedMediaImage,
  PrivateMediaStorage,
} from "@shapewebs/media/server";
import type { MediaUploadInput } from "@shapewebs/validation";

const storageOperationTimeoutMs = 12_000;

export type MediaUploadRepository = {
  complete: (input: {
    authorization: AdminAuthorizationContext;
    etag: string;
    fileId: string;
    requestId: string;
    url: string;
  }) => Promise<boolean>;
  fail: (input: {
    authorization: AdminAuthorizationContext;
    failureCode: string;
    fileId: string;
    requestId: string;
  }) => Promise<boolean>;
  inspect: (input: {
    authorization: AdminAuthorizationContext;
    fileId: string;
  }) => Promise<{
    etag: string | null;
    status: "cleanup_required" | "failed" | "pending" | "ready";
  } | null>;
  markCleanupRequired: (input: {
    authorization: AdminAuthorizationContext;
    etag: string;
    failureCode: string;
    fileId: string;
    requestId: string;
    url: string;
  }) => Promise<boolean>;
  reserve: (input: {
    altText: string;
    authorization: AdminAuthorizationContext;
    byteSize: number;
    caption?: string;
    fileId: string;
    height: number;
    localeCode: "da-DK" | "en";
    originalByteSize: number;
    originalName: string;
    pathname: string;
    requestId: string;
    sha256: string;
    storeId: string;
    width: number;
  }) => Promise<{ fileId: string }>;
};

export type MediaUploadResult =
  | {
      media: {
        altText: string;
        byteSize: number;
        caption: string | null;
        height: number;
        id: string;
        localeCode: "da-DK" | "en";
        mimeType: "image/webp";
        originalName: string;
        status: "ready";
        visibility: "private";
        width: number;
      };
      status: "created";
    }
  | {
      reasonCode:
        | "database_finalize_failed"
        | "database_finalize_unconfirmed"
        | "database_reservation_failed"
        | "storage_cleanup_failed"
        | "storage_upload_failed";
      status: "failed";
    };

export async function runPrivateMediaUpload(input: {
  authorization: AdminAuthorizationContext;
  image: NormalizedMediaImage;
  metadata: MediaUploadInput;
  repository: MediaUploadRepository;
  requestId: string;
  storage: PrivateMediaStorage;
  storeId: string;
}): Promise<MediaUploadResult> {
  const fileId = randomUUID();
  const pathname = `organizations/${input.authorization.organizationId}/drafts/${fileId}.webp`;

  try {
    const reservation = await input.repository.reserve({
      altText: input.metadata.altText,
      authorization: input.authorization,
      byteSize: input.image.byteSize,
      ...(input.metadata.caption ? { caption: input.metadata.caption } : {}),
      fileId,
      height: input.image.height,
      localeCode: input.metadata.localeCode,
      originalByteSize: input.image.originalByteSize,
      originalName: input.image.originalName,
      pathname,
      requestId: input.requestId,
      sha256: input.image.sha256,
      storeId: input.storeId,
      width: input.image.width,
    });

    if (reservation.fileId !== fileId) {
      throw new Error("The media reservation receipt did not match.");
    }
  } catch {
    return {
      reasonCode: "database_reservation_failed",
      status: "failed",
    };
  }

  let stored: Awaited<ReturnType<PrivateMediaStorage["put"]>>;

  try {
    stored = await input.storage.put({
      abortSignal: AbortSignal.timeout(storageOperationTimeoutMs),
      bytes: input.image.bytes,
      pathname,
    });
  } catch {
    // Keep the reservation pending. A provider timeout can occur after the
    // object was stored, so the cleanup worker must reconcile the pathname.
    return {
      reasonCode: "storage_upload_failed",
      status: "failed",
    };
  }

  let completionWasUncertain = false;

  try {
    const completed = await input.repository.complete({
      authorization: input.authorization,
      etag: stored.etag,
      fileId,
      requestId: input.requestId,
      url: stored.url,
    });

    if (completed) {
      return {
        media: {
          altText: input.metadata.altText,
          byteSize: input.image.byteSize,
          caption: input.metadata.caption ?? null,
          height: input.image.height,
          id: fileId,
          localeCode: input.metadata.localeCode,
          mimeType: "image/webp",
          originalName: input.image.originalName,
          status: "ready",
          visibility: "private",
          width: input.image.width,
        },
        status: "created",
      };
    }
  } catch {
    completionWasUncertain = true;
  }

  if (completionWasUncertain) {
    try {
      const state = await input.repository.inspect({
        authorization: input.authorization,
        fileId,
      });

      if (state?.status === "ready" && state.etag === stored.etag) {
        return {
          media: {
            altText: input.metadata.altText,
            byteSize: input.image.byteSize,
            caption: input.metadata.caption ?? null,
            height: input.image.height,
            id: fileId,
            localeCode: input.metadata.localeCode,
            mimeType: "image/webp",
            originalName: input.image.originalName,
            status: "ready",
            visibility: "private",
            width: input.image.width,
          },
          status: "created",
        };
      }

      if (!state || state.status !== "pending") {
        return {
          reasonCode: "database_finalize_unconfirmed",
          status: "failed",
        };
      }
    } catch {
      // Do not delete under uncertainty: the database commit may have
      // succeeded. A still-pending reservation is reconciled by the worker.
      return {
        reasonCode: "database_finalize_unconfirmed",
        status: "failed",
      };
    }
  }

  try {
    await input.storage.delete({
      abortSignal: AbortSignal.timeout(storageOperationTimeoutMs),
      etag: stored.etag,
      pathname,
    });
    await input.repository
      .fail({
        authorization: input.authorization,
        failureCode: "database_finalize_failed",
        fileId,
        requestId: input.requestId,
      })
      .catch(() => undefined);

    return {
      reasonCode: "database_finalize_failed",
      status: "failed",
    };
  } catch {
    await input.repository
      .markCleanupRequired({
        authorization: input.authorization,
        etag: stored.etag,
        failureCode: "storage_cleanup_failed",
        fileId,
        requestId: input.requestId,
        url: stored.url,
      })
      .catch(() => undefined);

    return {
      reasonCode: "storage_cleanup_failed",
      status: "failed",
    };
  }
}

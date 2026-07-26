import { describe, expect, it, vi } from "vitest";

import type { AdminAuthorizationContext } from "../../packages/database/src/admin-auth";
import {
  MediaImageError,
  normalizeMediaImage,
  type NormalizedMediaImage,
  type PrivateMediaStorage,
} from "../../packages/media/src/server";
import { parseMediaUploadRequest } from "../../apps/admin/src/lib/media-request";
import { reconcileMediaCleanupCandidates } from "../../apps/admin/src/lib/media-cleanup";
import { getMediaEnvironment } from "../../apps/admin/src/lib/media-environment";
import {
  runPrivateMediaUpload,
  type MediaUploadRepository,
} from "../../apps/admin/src/lib/media-upload";

const validPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAAEUlEQVQImWP4z8DwH4QZYAwAR8oH+Xm0fdIAAAAASUVORK5CYII=",
  "base64",
);

const authorization: AdminAuthorizationContext = {
  actor: { id: "media-editor" },
  latestStepUpAt: new Date(),
  organizationId: "f6214344-7525-42d0-83ac-210881b1b7b6",
  role: "editor",
  session: { id: "media-session" },
};

const image: NormalizedMediaImage = {
  bytes: new Uint8Array([82, 73, 70, 70]),
  byteSize: 4,
  height: 2,
  mimeType: "image/webp",
  originalByteSize: validPng.byteLength,
  originalName: "pixel.png",
  sha256: "a".repeat(64),
  width: 2,
};

function createRepository(): MediaUploadRepository & {
  complete: ReturnType<typeof vi.fn>;
  fail: ReturnType<typeof vi.fn>;
  inspect: ReturnType<typeof vi.fn>;
  markCleanupRequired: ReturnType<typeof vi.fn>;
  reserve: ReturnType<typeof vi.fn>;
} {
  return {
    complete: vi.fn().mockResolvedValue(true),
    fail: vi.fn().mockResolvedValue(true),
    inspect: vi.fn().mockResolvedValue({ etag: "etag-1", status: "ready" }),
    markCleanupRequired: vi.fn().mockResolvedValue(true),
    reserve: vi.fn().mockImplementation(async ({ fileId }) => ({ fileId })),
  };
}

function createStorage(): PrivateMediaStorage & {
  delete: ReturnType<typeof vi.fn>;
  put: ReturnType<typeof vi.fn>;
} {
  return {
    delete: vi.fn().mockResolvedValue(undefined),
    put: vi.fn().mockImplementation(async ({ pathname }) => ({
      etag: "etag-1",
      pathname,
      url: "https://store.private.blob.vercel-storage.com/private.webp",
    })),
  };
}

describe("media security and reliability boundaries", () => {
  it("fails media configuration closed on malformed or incomplete values", () => {
    const completeEnvironment = {
      DATABASE_URL: "postgresql://runtime:redacted@example.test/shapewebs",
      MEDIA_PRIVATE_BLOB_STORE_ID: "store_private_1",
      SHAPEWEBS_ORGANIZATION_ID: authorization.organizationId,
    };

    expect(getMediaEnvironment(completeEnvironment)).toEqual({
      databaseUrl: completeEnvironment.DATABASE_URL,
      organizationId: authorization.organizationId,
      privateStoreId: "store_private_1",
    });
    expect(
      getMediaEnvironment({
        ...completeEnvironment,
        MEDIA_PRIVATE_BLOB_STORE_ID: "bad store",
      }),
    ).toBeNull();
    expect(
      getMediaEnvironment({
        ...completeEnvironment,
        SHAPEWEBS_ORGANIZATION_ID: "not-a-uuid",
      }),
    ).toBeNull();
    expect(
      getMediaEnvironment({
        ...completeEnvironment,
        DATABASE_URL: undefined,
      }),
    ).toBeNull();
  });

  it("decodes and normalizes a matching image without retaining source metadata", async () => {
    const normalized = await normalizeMediaImage({
      bytes: validPng,
      declaredMimeType: "image/png",
      originalName: "pixel.png",
    });
    const normalizedText = Buffer.from(normalized.bytes).toString("latin1");

    expect(normalized).toMatchObject({
      height: 2,
      mimeType: "image/webp",
      originalByteSize: validPng.byteLength,
      originalName: "pixel.png",
      width: 2,
    });
    expect(normalized.sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(normalizedText).not.toContain("EXIF");
    expect(normalizedText).not.toContain("XMP");
  });

  it("rejects extension, declared type, and decoded-format mismatches", async () => {
    for (const input of [
      {
        declaredMimeType: "image/jpeg",
        originalName: "pixel.png",
      },
      {
        declaredMimeType: "image/jpeg",
        originalName: "pixel.jpg",
      },
    ]) {
      await expect(
        normalizeMediaImage({
          bytes: validPng,
          ...input,
        }),
      ).rejects.toMatchObject<Partial<MediaImageError>>({
        code: "media_type_mismatch",
      });
    }
  });

  it("parses only one bounded multipart file and known metadata fields", async () => {
    const formData = new FormData();
    formData.set(
      "file",
      new File([validPng], "pixel.png", { type: "image/png" }),
    );
    formData.set("altText", "A red square");
    formData.set("localeCode", "en");

    const parsed = await parseMediaUploadRequest(
      new Request("https://admin.shapewebs.com/api/admin/media", {
        body: formData,
        method: "POST",
      }),
    );

    expect(parsed).toMatchObject({
      file: {
        declaredMimeType: "image/png",
        originalName: "pixel.png",
      },
      metadata: {
        altText: "A red square",
        localeCode: "en",
      },
      status: "ok",
    });
  });

  it("rejects encoded, oversized, duplicate, and unknown multipart input", async () => {
    const encoded = new Request("https://admin.shapewebs.com/api/admin/media", {
      body: "compressed",
      headers: {
        "content-encoding": "gzip",
        "content-type": "multipart/form-data; boundary=shapewebs",
      },
      method: "POST",
    });
    expect(await parseMediaUploadRequest(encoded)).toMatchObject({
      error: "invalid_request",
      statusCode: 400,
    });

    const oversized = new Request(
      "https://admin.shapewebs.com/api/admin/media",
      {
        body: "small",
        headers: {
          "content-length": "4400001",
          "content-type": "multipart/form-data; boundary=shapewebs",
        },
        method: "POST",
      },
    );
    expect(await parseMediaUploadRequest(oversized)).toMatchObject({
      error: "payload_too_large",
      statusCode: 413,
    });

    const invalidFields = new FormData();
    invalidFields.append(
      "file",
      new File([validPng], "pixel.png", { type: "image/png" }),
    );
    invalidFields.append("file", "not-a-file");
    invalidFields.set("altText", "A red square");
    invalidFields.set("administrator", "true");
    expect(
      await parseMediaUploadRequest(
        new Request("https://admin.shapewebs.com/api/admin/media", {
          body: invalidFields,
          method: "POST",
        }),
      ),
    ).toMatchObject({
      error: "invalid_request",
      statusCode: 400,
    });
  });

  it("acknowledges only after reservation, Blob storage, and finalization", async () => {
    const repository = createRepository();
    const storage = createStorage();
    const result = await runPrivateMediaUpload({
      authorization,
      image,
      metadata: {
        altText: "A red square",
        localeCode: "en",
      },
      repository,
      requestId: "request-success",
      storage,
      storeId: "store_private_1",
    });

    expect(result).toMatchObject({
      media: {
        altText: "A red square",
        status: "ready",
        visibility: "private",
      },
      status: "created",
    });
    expect(repository.reserve).toHaveBeenCalledBefore(storage.put);
    expect(storage.put).toHaveBeenCalledBefore(repository.complete);
    expect(storage.delete).not.toHaveBeenCalled();
    expect(JSON.stringify(result)).not.toContain("vercel-storage.com");
  });

  it("leaves an ambiguous provider failure pending for pathname cleanup", async () => {
    const repository = createRepository();
    const storage = createStorage();
    storage.put.mockRejectedValueOnce(new Error("provider timeout"));
    const result = await runPrivateMediaUpload({
      authorization,
      image,
      metadata: { altText: "A red square", localeCode: "en" },
      repository,
      requestId: "request-storage-failure",
      storage,
      storeId: "store_private_1",
    });

    expect(result).toEqual({
      reasonCode: "storage_upload_failed",
      status: "failed",
    });
    expect(repository.fail).not.toHaveBeenCalled();
    expect(storage.delete).not.toHaveBeenCalled();
  });

  it("deletes the Blob when database finalization definitively fails", async () => {
    const repository = createRepository();
    const storage = createStorage();
    repository.complete.mockResolvedValueOnce(false);
    const result = await runPrivateMediaUpload({
      authorization,
      image,
      metadata: { altText: "A red square", localeCode: "en" },
      repository,
      requestId: "request-finalize-failure",
      storage,
      storeId: "store_private_1",
    });

    expect(result).toEqual({
      reasonCode: "database_finalize_failed",
      status: "failed",
    });
    expect(storage.delete).toHaveBeenCalledOnce();
    expect(repository.fail).toHaveBeenCalledWith(
      expect.objectContaining({
        failureCode: "database_finalize_failed",
      }),
    );
  });

  it("records cleanup work when a stored Blob cannot be deleted", async () => {
    const repository = createRepository();
    const storage = createStorage();
    repository.complete.mockResolvedValueOnce(false);
    storage.delete.mockRejectedValueOnce(new Error("delete timeout"));
    const result = await runPrivateMediaUpload({
      authorization,
      image,
      metadata: { altText: "A red square", localeCode: "en" },
      repository,
      requestId: "request-cleanup-failure",
      storage,
      storeId: "store_private_1",
    });

    expect(result).toEqual({
      reasonCode: "storage_cleanup_failed",
      status: "failed",
    });
    expect(repository.markCleanupRequired).toHaveBeenCalledWith(
      expect.objectContaining({
        etag: "etag-1",
        failureCode: "storage_cleanup_failed",
      }),
    );
  });

  it("reconciles an uncertain database response without deleting ready media", async () => {
    const repository = createRepository();
    const storage = createStorage();
    repository.complete.mockRejectedValueOnce(new Error("network timeout"));
    const result = await runPrivateMediaUpload({
      authorization,
      image,
      metadata: { altText: "A red square", localeCode: "en" },
      repository,
      requestId: "request-reconciled",
      storage,
      storeId: "store_private_1",
    });

    expect(result.status).toBe("created");
    expect(repository.inspect).toHaveBeenCalledOnce();
    expect(storage.delete).not.toHaveBeenCalled();
  });

  it("does not delete when database finalization cannot be reconciled", async () => {
    const repository = createRepository();
    const storage = createStorage();
    repository.complete.mockRejectedValueOnce(new Error("network timeout"));
    repository.inspect.mockRejectedValueOnce(new Error("database unavailable"));
    const result = await runPrivateMediaUpload({
      authorization,
      image,
      metadata: { altText: "A red square", localeCode: "en" },
      repository,
      requestId: "request-unconfirmed",
      storage,
      storeId: "store_private_1",
    });

    expect(result).toEqual({
      reasonCode: "database_finalize_unconfirmed",
      status: "failed",
    });
    expect(storage.delete).not.toHaveBeenCalled();
  });

  it("reconciles stale pending and cleanup-required media independently", async () => {
    const firstStorage = createStorage();
    const secondStorage = createStorage();
    secondStorage.delete.mockRejectedValueOnce(new Error("provider timeout"));
    const complete = vi.fn().mockResolvedValue(true);
    const result = await reconcileMediaCleanupCandidates({
      candidates: [
        {
          etag: null,
          fileId: "pending-file",
          pathname: "organizations/org/drafts/pending.webp",
          status: "pending",
          storeId: "store_private_1",
        },
        {
          etag: "etag-2",
          fileId: "cleanup-file",
          pathname: "organizations/org/drafts/cleanup.webp",
          status: "cleanup_required",
          storeId: "store_private_2",
        },
      ],
      complete,
      createStorage: vi
        .fn()
        .mockReturnValueOnce(firstStorage)
        .mockReturnValueOnce(secondStorage),
    });

    expect(result).toEqual({ cleaned: 1, failed: 1 });
    expect(firstStorage.delete).toHaveBeenCalledWith(
      expect.objectContaining({
        pathname: "organizations/org/drafts/pending.webp",
      }),
    );
    expect(complete).toHaveBeenCalledExactlyOnceWith("pending-file");
  });

  it("bounds cleanup work by elapsed runtime", async () => {
    const storage = createStorage();
    const complete = vi.fn().mockResolvedValue(true);
    const now = vi
      .fn()
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0)
      .mockReturnValue(20_000);
    const result = await reconcileMediaCleanupCandidates({
      candidates: [
        {
          etag: null,
          fileId: "first",
          pathname: "first.webp",
          status: "pending",
          storeId: "store_private_1",
        },
        {
          etag: null,
          fileId: "second",
          pathname: "second.webp",
          status: "pending",
          storeId: "store_private_1",
        },
      ],
      complete,
      createStorage: () => storage,
      now,
    });

    expect(result).toEqual({ cleaned: 1, failed: 0 });
    expect(storage.delete).toHaveBeenCalledOnce();
  });
});

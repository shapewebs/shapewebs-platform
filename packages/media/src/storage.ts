import { del, put } from "@vercel/blob";

import { maximumNormalizedMediaBytes } from "./image";

export type StoredPrivateMedia = {
  etag: string;
  pathname: string;
  url: string;
};

export type PrivateMediaStorage = {
  delete: (input: {
    abortSignal?: AbortSignal;
    etag?: string;
    pathname: string;
  }) => Promise<void>;
  put: (input: {
    abortSignal?: AbortSignal;
    bytes: Uint8Array;
    pathname: string;
  }) => Promise<StoredPrivateMedia>;
};

export type VercelPrivateMediaStorageOptions = {
  oidcToken?: string;
  storeId: string;
};

function requireStoreId(value: string): string {
  const normalized = value.trim();

  if (
    normalized.length < 8 ||
    normalized.length > 128 ||
    /[\s\u0000-\u001f\u007f]/u.test(normalized)
  ) {
    throw new Error("The private media store ID is invalid.");
  }

  return normalized;
}

function requireSafePathname(value: string): string {
  if (
    value.length < 1 ||
    value.length > 512 ||
    value.startsWith("/") ||
    value.includes("..") ||
    /[\u0000-\u001f\u007f\\]/u.test(value)
  ) {
    throw new Error("The private media pathname is invalid.");
  }

  return value;
}

function requirePrivateBlobUrl(
  value: string,
  expectedPathname: string,
): string {
  let parsed: URL;
  let decodedPathname: string;

  try {
    parsed = new URL(value);
    decodedPathname = decodeURIComponent(parsed.pathname.slice(1));
  } catch {
    throw new Error("The private media provider response is invalid.");
  }

  if (
    parsed.protocol !== "https:" ||
    parsed.username ||
    parsed.password ||
    parsed.port ||
    parsed.search ||
    parsed.hash ||
    !parsed.hostname.endsWith(".private.blob.vercel-storage.com") ||
    decodedPathname !== expectedPathname
  ) {
    throw new Error("The private media provider response is invalid.");
  }

  return parsed.toString();
}

export function createVercelPrivateMediaStorage(
  options: VercelPrivateMediaStorageOptions,
): PrivateMediaStorage {
  const storeId = requireStoreId(options.storeId);

  return {
    async delete(input) {
      const pathname = requireSafePathname(input.pathname);

      await del(pathname, {
        abortSignal: input.abortSignal,
        ...(input.etag ? { ifMatch: input.etag } : {}),
        ...(options.oidcToken ? { oidcToken: options.oidcToken } : {}),
        storeId,
      });
    },
    async put(input) {
      const pathname = requireSafePathname(input.pathname);
      const result = await put(pathname, Buffer.from(input.bytes), {
        abortSignal: input.abortSignal,
        access: "private",
        addRandomSuffix: false,
        allowOverwrite: false,
        cacheControlMaxAge: 365 * 24 * 60 * 60,
        contentType: "image/webp",
        maximumSizeInBytes: maximumNormalizedMediaBytes,
        ...(options.oidcToken ? { oidcToken: options.oidcToken } : {}),
        storeId,
      });
      const url = requirePrivateBlobUrl(result.url, pathname);

      if (
        result.pathname !== pathname ||
        result.contentType !== "image/webp" ||
        result.etag.length < 1 ||
        result.etag.length > 256
      ) {
        throw new Error("The private media provider response is invalid.");
      }

      return {
        etag: result.etag,
        pathname: result.pathname,
        url,
      };
    },
  };
}

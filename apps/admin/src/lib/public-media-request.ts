import {
  maximumMediaRequestBytes,
  maximumMediaSourceBytes,
} from "@shapewebs/media/server";
import { readBoundedBytes } from "@shapewebs/validation";

const multipartBoundaryPattern =
  /^multipart\/form-data;\s*boundary=(?:"([!#$%&'*+\-.^_`|~0-9A-Za-z]{1,70})"|([!#$%&'*+\-.^_`|~0-9A-Za-z]{1,70}))$/u;

export type ParsedPublicMediaUploadRequest =
  | {
      file: {
        bytes: Uint8Array;
        declaredMimeType: string;
        originalName: string;
      };
      status: "ok";
    }
  | {
      error: "invalid_request" | "payload_too_large" | "unsupported_media_type";
      status: "error";
      statusCode: 400 | 413 | 415;
    };

export async function parsePublicMediaUploadRequest(
  request: Request,
): Promise<ParsedPublicMediaUploadRequest> {
  if (request.headers.has("content-encoding")) {
    return {
      error: "invalid_request",
      status: "error",
      statusCode: 400,
    };
  }

  const contentType = request.headers.get("content-type")?.trim() ?? "";

  if (!multipartBoundaryPattern.test(contentType)) {
    return {
      error: "unsupported_media_type",
      status: "error",
      statusCode: 415,
    };
  }

  const body = await readBoundedBytes(request, maximumMediaRequestBytes);

  if (body.status === "too_large") {
    return {
      error: "payload_too_large",
      status: "error",
      statusCode: 413,
    };
  }

  let formData: FormData;

  try {
    const bufferedBody = new ArrayBuffer(body.value.byteLength);
    new Uint8Array(bufferedBody).set(body.value);
    formData = await new Response(bufferedBody, {
      headers: { "Content-Type": contentType },
    }).formData();
  } catch {
    return {
      error: "invalid_request",
      status: "error",
      statusCode: 400,
    };
  }

  const entries = [...formData.entries()];

  if (
    entries.length !== 1 ||
    entries[0]?.[0] !== "file" ||
    !(entries[0][1] instanceof File)
  ) {
    return {
      error: "invalid_request",
      status: "error",
      statusCode: 400,
    };
  }

  const file = entries[0][1];

  if (file.size > maximumMediaSourceBytes) {
    return {
      error: "payload_too_large",
      status: "error",
      statusCode: 413,
    };
  }

  return {
    file: {
      bytes: new Uint8Array(await file.arrayBuffer()),
      declaredMimeType: file.type,
      originalName: file.name,
    },
    status: "ok",
  };
}

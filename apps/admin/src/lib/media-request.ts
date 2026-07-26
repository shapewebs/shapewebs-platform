import {
  maximumMediaRequestBytes,
  maximumMediaSourceBytes,
} from "@shapewebs/media/server";
import {
  mediaUploadSchema,
  readBoundedBytes,
  type MediaUploadInput,
} from "@shapewebs/validation";

const allowedFieldNames = new Set(["altText", "caption", "file", "localeCode"]);
const multipartBoundaryPattern =
  /^multipart\/form-data;\s*boundary=(?:"([!#$%&'*+\-.^_`|~0-9A-Za-z]{1,70})"|([!#$%&'*+\-.^_`|~0-9A-Za-z]{1,70}))$/u;

export type ParsedMediaUploadRequest =
  | {
      file: {
        bytes: Uint8Array;
        declaredMimeType: string;
        originalName: string;
      };
      metadata: MediaUploadInput;
      status: "ok";
    }
  | {
      error: "invalid_request" | "payload_too_large" | "unsupported_media_type";
      status: "error";
      statusCode: 400 | 413 | 415;
    };

function error(
  value: ParsedMediaUploadRequest & { status: "error" },
): ParsedMediaUploadRequest {
  return value;
}

export async function parseMediaUploadRequest(
  request: Request,
): Promise<ParsedMediaUploadRequest> {
  if (request.headers.has("content-encoding")) {
    return error({
      error: "invalid_request",
      status: "error",
      statusCode: 400,
    });
  }

  const contentType = request.headers.get("content-type")?.trim() ?? "";

  if (!multipartBoundaryPattern.test(contentType)) {
    return error({
      error: "unsupported_media_type",
      status: "error",
      statusCode: 415,
    });
  }

  const body = await readBoundedBytes(request, maximumMediaRequestBytes);

  if (body.status === "too_large") {
    return error({
      error: "payload_too_large",
      status: "error",
      statusCode: 413,
    });
  }

  let formData: FormData;

  try {
    const bufferedBody = new ArrayBuffer(body.value.byteLength);
    new Uint8Array(bufferedBody).set(body.value);
    formData = await new Response(bufferedBody, {
      headers: { "Content-Type": contentType },
    }).formData();
  } catch {
    return error({
      error: "invalid_request",
      status: "error",
      statusCode: 400,
    });
  }

  const entries = [...formData.entries()];

  if (
    entries.some(([name]) => !allowedFieldNames.has(name)) ||
    [...allowedFieldNames].some(
      (name) => entries.filter(([entryName]) => entryName === name).length > 1,
    )
  ) {
    return error({
      error: "invalid_request",
      status: "error",
      statusCode: 400,
    });
  }

  const file = formData.get("file");

  if (!(file instanceof File)) {
    return error({
      error: "invalid_request",
      status: "error",
      statusCode: 400,
    });
  }

  if (file.size > maximumMediaSourceBytes) {
    return error({
      error: "payload_too_large",
      status: "error",
      statusCode: 413,
    });
  }

  const getText = (name: string): string | undefined => {
    const value = formData.get(name);
    return typeof value === "string" ? value : undefined;
  };
  const parsedMetadata = mediaUploadSchema.safeParse({
    altText: getText("altText"),
    caption: getText("caption") || undefined,
    localeCode: getText("localeCode"),
  });

  if (!parsedMetadata.success) {
    return error({
      error: "invalid_request",
      status: "error",
      statusCode: 400,
    });
  }

  return {
    file: {
      bytes: new Uint8Array(await file.arrayBuffer()),
      declaredMimeType: file.type,
      originalName: file.name,
    },
    metadata: parsedMetadata.data,
    status: "ok",
  };
}

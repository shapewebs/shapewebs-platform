import { createHash } from "node:crypto";

import sharp from "sharp";

export const maximumMediaRequestBytes = 4_400_000;
export const maximumMediaSourceBytes = 4 * 1_024 * 1_024;
export const maximumNormalizedMediaBytes = 4 * 1_024 * 1_024;
export const maximumMediaDimension = 8_192;
export const maximumNormalizedMediaDimension = 3_840;
const maximumMediaPixels = 32_000_000;

type MediaSourceFormat = "jpeg" | "png" | "webp";

const acceptedMimeTypes: ReadonlyMap<string, MediaSourceFormat> = new Map([
  ["image/jpeg", "jpeg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);

const acceptedExtensions: ReadonlyMap<string, MediaSourceFormat> = new Map([
  [".jpeg", "jpeg"],
  [".jpg", "jpeg"],
  [".png", "png"],
  [".webp", "webp"],
]);

export type MediaImageErrorCode =
  | "animated_image_unsupported"
  | "empty_file"
  | "file_too_large"
  | "filename_invalid"
  | "image_decode_failed"
  | "image_dimensions_invalid"
  | "media_type_mismatch"
  | "normalized_file_too_large"
  | "unsupported_extension"
  | "unsupported_media_type";

export class MediaImageError extends Error {
  readonly code: MediaImageErrorCode;

  constructor(code: MediaImageErrorCode) {
    super("The image did not satisfy the Shapewebs media contract.");
    this.code = code;
    this.name = "MediaImageError";
  }
}

export type NormalizedMediaImage = {
  bytes: Uint8Array;
  byteSize: number;
  height: number;
  mimeType: "image/webp";
  originalByteSize: number;
  originalName: string;
  sha256: string;
  width: number;
};

function getSafeOriginalName(value: string): string {
  const normalized = value.normalize("NFKC").trim();

  if (
    normalized.length < 1 ||
    normalized.length > 180 ||
    /[\u0000-\u001f\u007f/\\]/u.test(normalized)
  ) {
    throw new MediaImageError("filename_invalid");
  }

  return normalized;
}

function getExtension(value: string): string {
  const lastDot = value.lastIndexOf(".");

  if (lastDot <= 0 || lastDot === value.length - 1) {
    throw new MediaImageError("unsupported_extension");
  }

  return value.slice(lastDot).toLowerCase();
}

function requireSupportedDeclaredType(value: string): string {
  const normalized = value.trim().toLowerCase();

  if (!acceptedMimeTypes.has(normalized)) {
    throw new MediaImageError("unsupported_media_type");
  }

  return normalized;
}

function requireSourceBounds(
  width: number | undefined,
  height: number | undefined,
): asserts width is number {
  if (
    !Number.isSafeInteger(width) ||
    !Number.isSafeInteger(height) ||
    !width ||
    !height ||
    width > maximumMediaDimension ||
    height > maximumMediaDimension ||
    width * height > maximumMediaPixels
  ) {
    throw new MediaImageError("image_dimensions_invalid");
  }
}

export async function normalizeMediaImage(input: {
  bytes: Uint8Array;
  declaredMimeType: string;
  originalName: string;
}): Promise<NormalizedMediaImage> {
  if (input.bytes.byteLength === 0) {
    throw new MediaImageError("empty_file");
  }

  if (input.bytes.byteLength > maximumMediaSourceBytes) {
    throw new MediaImageError("file_too_large");
  }

  const originalName = getSafeOriginalName(input.originalName);
  const declaredMimeType = requireSupportedDeclaredType(input.declaredMimeType);
  const expectedFormat = acceptedMimeTypes.get(declaredMimeType);
  const extensionFormat = acceptedExtensions.get(getExtension(originalName));

  if (!extensionFormat) {
    throw new MediaImageError("unsupported_extension");
  }

  if (extensionFormat !== expectedFormat) {
    throw new MediaImageError("media_type_mismatch");
  }

  let metadata: Awaited<ReturnType<ReturnType<typeof sharp>["metadata"]>>;

  try {
    metadata = await sharp(input.bytes, {
      animated: false,
      failOn: "error",
      limitInputPixels: maximumMediaPixels,
      sequentialRead: true,
    }).metadata();
  } catch {
    throw new MediaImageError("image_decode_failed");
  }

  if (metadata.format !== expectedFormat) {
    throw new MediaImageError("media_type_mismatch");
  }

  if ((metadata.pages ?? 1) !== 1) {
    throw new MediaImageError("animated_image_unsupported");
  }

  requireSourceBounds(metadata.width, metadata.height);

  let normalized:
    | {
        data: Buffer;
        info: {
          height: number;
          size: number;
          width: number;
        };
      }
    | undefined;

  try {
    normalized = await sharp(input.bytes, {
      animated: false,
      failOn: "error",
      limitInputPixels: maximumMediaPixels,
      sequentialRead: true,
    })
      .rotate()
      .resize({
        fit: "inside",
        height: maximumNormalizedMediaDimension,
        width: maximumNormalizedMediaDimension,
        withoutEnlargement: true,
      })
      .toColourspace("srgb")
      .webp({
        alphaQuality: 90,
        effort: 4,
        quality: 82,
        smartSubsample: true,
      })
      .toBuffer({ resolveWithObject: true });
  } catch {
    throw new MediaImageError("image_decode_failed");
  }

  if (
    normalized.info.size < 1 ||
    normalized.info.size > maximumNormalizedMediaBytes
  ) {
    throw new MediaImageError("normalized_file_too_large");
  }

  return {
    bytes: normalized.data,
    byteSize: normalized.info.size,
    height: normalized.info.height,
    mimeType: "image/webp",
    originalByteSize: input.bytes.byteLength,
    originalName,
    sha256: createHash("sha256").update(normalized.data).digest("hex"),
    width: normalized.info.width,
  };
}

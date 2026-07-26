import "server-only";

export {
  maximumMediaDimension,
  maximumMediaRequestBytes,
  maximumMediaSourceBytes,
  maximumNormalizedMediaBytes,
  maximumNormalizedMediaDimension,
  MediaImageError,
  normalizeMediaImage,
  type MediaImageErrorCode,
  type NormalizedMediaImage,
} from "./image";
export {
  createVercelPrivateMediaStorage,
  type PrivateMediaStorage,
  type StoredPrivateMedia,
  type VercelPrivateMediaStorageOptions,
} from "./storage";

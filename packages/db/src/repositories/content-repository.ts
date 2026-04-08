import type { ContentType } from "@shapewebs/config";
import type { LocaleCode } from "@shapewebs/i18n";

export const contentCacheTagPrefix = "content";
export const localizationCacheTagPrefix = "locale";

export function buildDocumentCacheTag(documentId: string) {
  return `${contentCacheTagPrefix}:${documentId}`;
}

export function buildLocalizationCacheTag(localeCode: LocaleCode) {
  return `${localizationCacheTagPrefix}:${localeCode}`;
}

export function buildContentListCacheTag(contentType: ContentType) {
  return `${contentCacheTagPrefix}:list:${contentType}`;
}

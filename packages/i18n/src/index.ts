export const supportedLocales = [
  {
    code: "en",
    label: "English",
    language: "en",
    region: "global",
    isDefault: true,
  },
  {
    code: "da-DK",
    label: "Dansk",
    language: "da",
    region: "DK",
    isDefault: false,
  },
] as const;

export const regionProfiles = [
  { code: "eea_uk_ch", label: "EEA / UK / CH" },
  { code: "us_california", label: "United States / California-sensitive" },
  { code: "rest_of_world", label: "Rest of world" },
] as const;

export type LocaleDefinition = (typeof supportedLocales)[number];
export type LocaleCode = LocaleDefinition["code"];
export type RegionProfileCode = (typeof regionProfiles)[number]["code"];

export const defaultLocale = supportedLocales.find((locale) => locale.isDefault)?.code ?? "en";

export function isSupportedLocale(locale: string): locale is LocaleCode {
  return supportedLocales.some((candidate) => candidate.code === locale);
}

export function getLocalePrefix(locale: LocaleCode) {
  return locale === defaultLocale ? "" : `/${locale}`;
}

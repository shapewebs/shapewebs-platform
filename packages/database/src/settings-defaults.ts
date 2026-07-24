import {
  organizationSettingsValueSchema,
  type OrganizationSettingsValue,
} from "@shapewebs/validation";

export const defaultOrganizationSettingsValue =
  organizationSettingsValueSchema.parse({
    consentRuleSets: [
      { defaultMode: "opt_in", key: "eea_uk_ch" },
      { defaultMode: "mixed", key: "us_california" },
      { defaultMode: "inform", key: "rest_of_world" },
    ],
    cookiePolicyVersions: ["v1-eea", "v1-us", "v1-global"],
    featureFlags: [
      { enabled: false, key: "cms.scheduled_publishing" },
      { enabled: false, key: "cms.translation_dashboard" },
      { enabled: true, key: "web.region_sensitive_consent" },
    ],
    locales: [
      { code: "en", isDefault: true, label: "English" },
      { code: "da-DK", isDefault: false, label: "Dansk" },
    ],
    regionProfiles: [
      {
        code: "eea_uk_ch",
        displayName: "EEA / UK / CH",
        ruleSetKey: "eea_uk_ch",
      },
      {
        code: "us_california",
        displayName: "United States / California-sensitive",
        ruleSetKey: "us_california",
      },
      {
        code: "rest_of_world",
        displayName: "Rest of world",
        ruleSetKey: "rest_of_world",
      },
    ],
  } satisfies OrganizationSettingsValue);

export function createDefaultOrganizationSettingsValue(): OrganizationSettingsValue {
  return organizationSettingsValueSchema.parse(
    defaultOrganizationSettingsValue,
  );
}

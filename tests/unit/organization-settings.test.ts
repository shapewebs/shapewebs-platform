import { describe, expect, it } from "vitest";

import { createDefaultOrganizationSettingsValue } from "../../packages/database/src/settings-defaults";
import { organizationSettingsValueSchema } from "../../packages/validation/src/index";

describe("organization settings validation", () => {
  it("accepts the deterministic organization defaults", () => {
    const settings = createDefaultOrganizationSettingsValue();

    expect(organizationSettingsValueSchema.parse(settings)).toEqual(settings);
    expect(settings.locales.filter((locale) => locale.isDefault)).toHaveLength(
      1,
    );
  });

  it("rejects duplicate keys and dangling consent references", () => {
    const settings = createDefaultOrganizationSettingsValue();

    expect(
      organizationSettingsValueSchema.safeParse({
        ...settings,
        featureFlags: [settings.featureFlags[0], settings.featureFlags[0]],
      }).success,
    ).toBe(false);
    expect(
      organizationSettingsValueSchema.safeParse({
        ...settings,
        regionProfiles: [
          {
            code: "unknown_region",
            displayName: "Unknown region",
            ruleSetKey: "missing_rule_set",
          },
        ],
      }).success,
    ).toBe(false);
  });

  it("requires one supported default locale and bounded safe keys", () => {
    const settings = createDefaultOrganizationSettingsValue();

    expect(
      organizationSettingsValueSchema.safeParse({
        ...settings,
        locales: settings.locales.map((locale) => ({
          ...locale,
          isDefault: false,
        })),
      }).success,
    ).toBe(false);
    expect(
      organizationSettingsValueSchema.safeParse({
        ...settings,
        featureFlags: [{ enabled: true, key: "<script>alert(1)</script>" }],
      }).success,
    ).toBe(false);
  });
});

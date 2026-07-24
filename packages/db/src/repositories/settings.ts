import { mockContactSubmissions, mockSettingsSnapshot } from "../mock/content";
import type {
  ContactSubmissionRecord,
  SettingsSnapshot,
} from "../types/documents";
import type { ShapewebsSupabaseClient } from "../supabase/shared";

function isConfigured(
  supabase: ShapewebsSupabaseClient | null,
): supabase is ShapewebsSupabaseClient {
  return supabase !== null;
}

export async function getSettingsSnapshot(
  supabase: ShapewebsSupabaseClient | null,
): Promise<SettingsSnapshot> {
  if (!isConfigured(supabase)) {
    return mockSettingsSnapshot;
  }

  const [
    { data: locales },
    { data: regionProfiles },
    { data: featureFlags },
    { data: consentRuleSets },
    { data: cookiePolicyVersions },
  ] = await Promise.all([
    supabase
      .schema("cms")
      .from("locales")
      .select("code, label, is_default")
      .order("is_default", { ascending: false }),
    supabase
      .schema("cms")
      .from("region_profiles")
      .select("code, display_name, rule_set_key")
      .order("code", { ascending: true }),
    supabase
      .schema("cms")
      .from("feature_flags")
      .select("key, enabled")
      .order("key", { ascending: true }),
    supabase
      .schema("ops")
      .from("consent_rule_sets")
      .select("rule_set_key, default_mode")
      .order("rule_set_key", { ascending: true }),
    supabase
      .schema("ops")
      .from("cookie_policy_versions")
      .select("policy_version")
      .order("policy_version", { ascending: true }),
  ]);

  return {
    source: "supabase",
    locales:
      locales?.map((locale) => ({
        code: locale.code as SettingsSnapshot["locales"][number]["code"],
        label: locale.label,
        isDefault: locale.is_default,
      })) ?? [],
    regionProfiles:
      regionProfiles?.map((profile) => ({
        code: profile.code,
        displayName: profile.display_name,
        ruleSetKey: profile.rule_set_key,
      })) ?? [],
    featureFlags:
      featureFlags?.map((flag) => ({
        key: flag.key,
        enabled: flag.enabled,
      })) ?? [],
    consentRuleSets:
      consentRuleSets?.map((ruleSet) => ({
        key: ruleSet.rule_set_key,
        defaultMode: ruleSet.default_mode,
      })) ?? [],
    cookiePolicyVersions:
      cookiePolicyVersions?.map((policy) => policy.policy_version) ?? [],
  };
}

export async function listContactSubmissions(
  supabase: ShapewebsSupabaseClient | null,
): Promise<ContactSubmissionRecord[]> {
  if (!isConfigured(supabase)) {
    return mockContactSubmissions;
  }

  const { data, error } = await supabase
    .schema("ops")
    .from("contact_submissions")
    .select(
      "id, name, email, form_type, locale_code, message, service_interest, status, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(100);

  if (error || !data) {
    return [];
  }

  return data.map((row) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    formType: row.form_type,
    localeCode: row.locale_code as ContactSubmissionRecord["localeCode"],
    message: row.message,
    serviceInterest: row.service_interest,
    status: row.status,
    createdAt: row.created_at,
  }));
}

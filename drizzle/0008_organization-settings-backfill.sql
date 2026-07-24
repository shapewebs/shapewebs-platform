CREATE POLICY "migrator backfills organization settings"
  ON app.organizations
  FOR SELECT
  TO shapewebs_migrator
  USING (true);--> statement-breakpoint
CREATE POLICY "migrator inserts organization settings backfill"
  ON app.organization_settings
  FOR INSERT
  TO shapewebs_migrator
  WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "migrator reads organization settings backfill conflicts"
  ON app.organization_settings
  FOR SELECT
  TO shapewebs_migrator
  USING (true);--> statement-breakpoint
INSERT INTO app.organization_settings (
  organization_id,
  locales,
  region_profiles,
  feature_flags,
  consent_rule_sets,
  cookie_policy_versions
)
SELECT
  id,
  '[{"code":"en","isDefault":true,"label":"English"},{"code":"da-DK","isDefault":false,"label":"Dansk"}]'::jsonb,
  '[{"code":"eea_uk_ch","displayName":"EEA / UK / CH","ruleSetKey":"eea_uk_ch"},{"code":"us_california","displayName":"United States / California-sensitive","ruleSetKey":"us_california"},{"code":"rest_of_world","displayName":"Rest of world","ruleSetKey":"rest_of_world"}]'::jsonb,
  '[{"enabled":false,"key":"cms.scheduled_publishing"},{"enabled":false,"key":"cms.translation_dashboard"},{"enabled":true,"key":"web.region_sensitive_consent"}]'::jsonb,
  '[{"defaultMode":"opt_in","key":"eea_uk_ch"},{"defaultMode":"mixed","key":"us_california"},{"defaultMode":"inform","key":"rest_of_world"}]'::jsonb,
  '["v1-eea","v1-us","v1-global"]'::jsonb
FROM app.organizations
ON CONFLICT (organization_id) DO NOTHING;--> statement-breakpoint
DROP POLICY "migrator reads organization settings backfill conflicts"
  ON app.organization_settings;--> statement-breakpoint
DROP POLICY "migrator inserts organization settings backfill"
  ON app.organization_settings;--> statement-breakpoint
DROP POLICY "migrator backfills organization settings"
  ON app.organizations;

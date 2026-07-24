CREATE TABLE "app"."organization_settings" (
	"organization_id" uuid PRIMARY KEY NOT NULL,
	"locales" jsonb NOT NULL,
	"region_profiles" jsonb NOT NULL,
	"feature_flags" jsonb NOT NULL,
	"consent_rule_sets" jsonb NOT NULL,
	"cookie_policy_versions" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "organization_settings_locales_array" CHECK (jsonb_typeof("app"."organization_settings"."locales") = 'array'),
	CONSTRAINT "organization_settings_region_profiles_array" CHECK (jsonb_typeof("app"."organization_settings"."region_profiles") = 'array'),
	CONSTRAINT "organization_settings_feature_flags_array" CHECK (jsonb_typeof("app"."organization_settings"."feature_flags") = 'array'),
	CONSTRAINT "organization_settings_consent_rule_sets_array" CHECK (jsonb_typeof("app"."organization_settings"."consent_rule_sets") = 'array'),
	CONSTRAINT "organization_settings_cookie_policy_versions_array" CHECK (jsonb_typeof("app"."organization_settings"."cookie_policy_versions") = 'array')
);
--> statement-breakpoint
ALTER TABLE "app"."organization_settings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "app"."organization_settings" ADD CONSTRAINT "organization_settings_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "app"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE POLICY "owner reads current organization settings" ON "app"."organization_settings" AS PERMISSIVE FOR SELECT TO "shapewebs_admin_runtime" USING ("app"."organization_settings"."organization_id" = nullif(current_setting('app.organization_id', true), '')::uuid and nullif(current_setting('app.membership_role', true), '') = 'owner');--> statement-breakpoint
CREATE POLICY "owner manages current organization settings" ON "app"."organization_settings" AS PERMISSIVE FOR ALL TO "shapewebs_admin_runtime" USING ("app"."organization_settings"."organization_id" = nullif(current_setting('app.organization_id', true), '')::uuid and nullif(current_setting('app.membership_role', true), '') = 'owner') WITH CHECK ("app"."organization_settings"."organization_id" = nullif(current_setting('app.organization_id', true), '')::uuid and nullif(current_setting('app.membership_role', true), '') = 'owner');--> statement-breakpoint
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
ALTER TABLE app.organization_settings FORCE ROW LEVEL SECURITY;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE
  ON app.organization_settings
  TO shapewebs_admin_runtime;

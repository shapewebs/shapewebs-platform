insert into cms.feature_flags (key, enabled, rules_json)
values
  ('cms.scheduled_publishing', false, '{}'::jsonb),
  ('cms.translation_dashboard', false, '{}'::jsonb),
  ('web.region_sensitive_consent', true, '{}'::jsonb)
on conflict (key) do nothing;

insert into ops.cookie_policy_versions (policy_version, rule_set_key, published_at)
values
  ('v1-eea', 'eea_uk_ch', timezone('utc', now())),
  ('v1-us', 'us_california', timezone('utc', now())),
  ('v1-global', 'rest_of_world', timezone('utc', now()))
on conflict (policy_version) do nothing;

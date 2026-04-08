begin;

create extension if not exists pgcrypto;

create schema if not exists cms;
create schema if not exists ops;

create or replace function public.set_current_timestamp_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create type cms.admin_profile_status as enum ('invited', 'active', 'suspended', 'revoked');
create type cms.content_type as enum ('page', 'post', 'project', 'service', 'method', 'legal');
create type cms.content_state as enum ('draft', 'review', 'scheduled', 'published', 'archived');
create type cms.translation_status as enum ('missing', 'in_progress', 'ready', 'published');
create type cms.media_asset_status as enum ('pending', 'ready', 'rejected', 'archived');
create type ops.submission_status as enum ('new', 'reviewed', 'archived', 'deleted');

create table if not exists cms.admin_profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique references auth.users(id) on delete cascade,
  display_name text not null,
  status cms.admin_profile_status not null default 'invited',
  default_locale text not null default 'en',
  revoked_after timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists cms.roles (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  is_system boolean not null default true,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists cms.permissions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  resource text not null,
  action text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists cms.role_permissions (
  id uuid primary key default gen_random_uuid(),
  role_id uuid not null references cms.roles(id) on delete cascade,
  permission_id uuid not null references cms.permissions(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  unique (role_id, permission_id)
);

create table if not exists cms.user_role_assignments (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references cms.admin_profiles(id) on delete cascade,
  role_id uuid not null references cms.roles(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  unique (profile_id, role_id)
);

create table if not exists cms.admin_security_events (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references cms.admin_profiles(id) on delete set null,
  event_type text not null,
  ip_hash text,
  user_agent_hash text,
  success boolean not null default true,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists cms.locales (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  label text not null,
  language text not null,
  region text not null,
  is_default boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists ops.consent_rule_sets (
  id uuid primary key default gen_random_uuid(),
  rule_set_key text not null unique,
  default_mode text not null,
  categories_json jsonb not null default '[]'::jsonb,
  banner_copy_ref text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists cms.region_profiles (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  display_name text not null,
  rule_set_key text not null references ops.consent_rule_sets(rule_set_key) on delete restrict,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists cms.documents (
  id uuid primary key default gen_random_uuid(),
  content_type cms.content_type not null,
  state cms.content_state not null default 'draft',
  default_locale text not null default 'en',
  published_at timestamptz,
  archived_at timestamptz,
  published_revision_id uuid,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists cms.pages (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null unique references cms.documents(id) on delete cascade,
  page_kind text not null,
  nav_group text,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists cms.posts (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null unique references cms.documents(id) on delete cascade,
  author_profile_id uuid references cms.admin_profiles(id) on delete set null,
  published_sort_at timestamptz,
  featured boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists cms.projects (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null unique references cms.documents(id) on delete cascade,
  client_name text,
  industry text,
  completed_on date,
  featured boolean not null default false,
  result_metrics_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists cms.services (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null unique references cms.documents(id) on delete cascade,
  service_code text not null unique,
  inquiry_form_type text,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists cms.methods (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null unique references cms.documents(id) on delete cascade,
  method_code text not null unique,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists cms.legal_documents (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null unique references cms.documents(id) on delete cascade,
  legal_doc_type text not null,
  effective_from timestamptz,
  effective_to timestamptz,
  version_label text not null,
  jurisdiction_profile_code text references cms.region_profiles(code) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists cms.document_localizations (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references cms.documents(id) on delete cascade,
  locale_code text not null references cms.locales(code) on delete restrict,
  slug text not null,
  title text not null,
  summary text,
  translation_status cms.translation_status not null default 'missing',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (document_id, locale_code),
  unique (locale_code, slug)
);

create table if not exists cms.document_revisions (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references cms.documents(id) on delete cascade,
  locale_code text not null references cms.locales(code) on delete restrict,
  revision_number integer not null,
  editor_state cms.content_state not null default 'draft',
  content_json jsonb not null default '{"schemaVersion":1,"blocks":[]}'::jsonb,
  change_note text,
  created_by uuid references cms.admin_profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  unique (document_id, locale_code, revision_number)
);

alter table cms.documents
  add constraint documents_published_revision_fk
  foreign key (published_revision_id) references cms.document_revisions(id) on delete set null;

create table if not exists cms.seo_metadata (
  id uuid primary key default gen_random_uuid(),
  document_localization_id uuid not null unique references cms.document_localizations(id) on delete cascade,
  meta_title text,
  meta_description text,
  canonical_url_override text,
  robots_index boolean not null default true,
  og_image_asset_id uuid,
  schema_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists cms.reusable_sections (
  id uuid primary key default gen_random_uuid(),
  section_key text not null unique,
  content_type_scope cms.content_type[],
  state cms.content_state not null default 'draft',
  schema_version integer not null default 1,
  content_json jsonb not null default '{"schemaVersion":1,"blocks":[]}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists cms.media_assets (
  id uuid primary key default gen_random_uuid(),
  bucket text not null,
  path text not null unique,
  mime_type text not null,
  byte_size bigint not null check (byte_size >= 0),
  width integer,
  height integer,
  sha256 text,
  status cms.media_asset_status not null default 'pending',
  uploaded_by uuid references cms.admin_profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table cms.seo_metadata
  add constraint seo_metadata_og_image_fk
  foreign key (og_image_asset_id) references cms.media_assets(id) on delete set null;

create table if not exists cms.media_asset_localizations (
  id uuid primary key default gen_random_uuid(),
  media_asset_id uuid not null references cms.media_assets(id) on delete cascade,
  locale_code text not null references cms.locales(code) on delete restrict,
  alt_text text not null,
  caption text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (media_asset_id, locale_code)
);

create table if not exists cms.site_settings (
  id uuid primary key default gen_random_uuid(),
  key text not null,
  scope text not null default 'global',
  json_value jsonb not null default '{}'::jsonb,
  updated_by uuid references cms.admin_profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (key, scope)
);

create table if not exists cms.feature_flags (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  enabled boolean not null default false,
  rules_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists ops.cookie_policy_versions (
  id uuid primary key default gen_random_uuid(),
  policy_version text not null unique,
  rule_set_key text not null references ops.consent_rule_sets(rule_set_key) on delete cascade,
  published_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists ops.consent_events (
  id uuid primary key default gen_random_uuid(),
  visitor_id_hash text not null,
  locale_code text not null references cms.locales(code) on delete restrict,
  country_code text,
  rule_set_key text not null references ops.consent_rule_sets(rule_set_key) on delete restrict,
  policy_version text not null references ops.cookie_policy_versions(policy_version) on delete restrict,
  categories_json jsonb not null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists ops.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_profile_id uuid references cms.admin_profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  before_json jsonb,
  after_json jsonb,
  ip_hash text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists ops.contact_submissions (
  id uuid primary key default gen_random_uuid(),
  form_type text not null,
  name text not null,
  email text not null,
  company text,
  message text not null,
  service_interest text,
  locale_code text not null references cms.locales(code) on delete restrict,
  country_code text,
  consent_snapshot_json jsonb not null default '{}'::jsonb,
  spam_score numeric(5,2),
  status ops.submission_status not null default 'new',
  submitted_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists ops.job_runs (
  id uuid primary key default gen_random_uuid(),
  job_key text not null,
  status text not null,
  started_at timestamptz not null default timezone('utc', now()),
  ended_at timestamptz,
  result_json jsonb not null default '{}'::jsonb
);

create table if not exists ops.preview_tokens (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references cms.documents(id) on delete cascade,
  locale_code text not null references cms.locales(code) on delete restrict,
  revision_id uuid not null references cms.document_revisions(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists documents_type_state_published_idx
  on cms.documents (content_type, state, published_at desc nulls last);
create index if not exists posts_featured_published_idx
  on cms.posts (featured desc, published_sort_at desc nulls last);
create index if not exists projects_featured_completed_idx
  on cms.projects (featured desc, completed_on desc nulls last);
create index if not exists document_revisions_lookup_idx
  on cms.document_revisions (document_id, locale_code, revision_number desc);
create index if not exists audit_logs_entity_idx
  on ops.audit_logs (entity_type, entity_id, created_at desc);
create index if not exists audit_logs_actor_idx
  on ops.audit_logs (actor_profile_id, created_at desc);
create index if not exists contact_submissions_status_idx
  on ops.contact_submissions (status, submitted_at desc);
create index if not exists preview_tokens_lookup_idx
  on ops.preview_tokens (document_id, locale_code, expires_at desc);

create trigger set_timestamp_admin_profiles
before update on cms.admin_profiles
for each row execute function public.set_current_timestamp_updated_at();
create trigger set_timestamp_documents
before update on cms.documents
for each row execute function public.set_current_timestamp_updated_at();
create trigger set_timestamp_pages
before update on cms.pages
for each row execute function public.set_current_timestamp_updated_at();
create trigger set_timestamp_posts
before update on cms.posts
for each row execute function public.set_current_timestamp_updated_at();
create trigger set_timestamp_projects
before update on cms.projects
for each row execute function public.set_current_timestamp_updated_at();
create trigger set_timestamp_services
before update on cms.services
for each row execute function public.set_current_timestamp_updated_at();
create trigger set_timestamp_methods
before update on cms.methods
for each row execute function public.set_current_timestamp_updated_at();
create trigger set_timestamp_legal_documents
before update on cms.legal_documents
for each row execute function public.set_current_timestamp_updated_at();
create trigger set_timestamp_document_localizations
before update on cms.document_localizations
for each row execute function public.set_current_timestamp_updated_at();
create trigger set_timestamp_seo_metadata
before update on cms.seo_metadata
for each row execute function public.set_current_timestamp_updated_at();
create trigger set_timestamp_reusable_sections
before update on cms.reusable_sections
for each row execute function public.set_current_timestamp_updated_at();
create trigger set_timestamp_media_assets
before update on cms.media_assets
for each row execute function public.set_current_timestamp_updated_at();
create trigger set_timestamp_media_asset_localizations
before update on cms.media_asset_localizations
for each row execute function public.set_current_timestamp_updated_at();
create trigger set_timestamp_site_settings
before update on cms.site_settings
for each row execute function public.set_current_timestamp_updated_at();
create trigger set_timestamp_feature_flags
before update on cms.feature_flags
for each row execute function public.set_current_timestamp_updated_at();
create trigger set_timestamp_consent_rule_sets
before update on ops.consent_rule_sets
for each row execute function public.set_current_timestamp_updated_at();

insert into cms.roles (code, name, is_system)
values
  ('owner', 'Owner', true),
  ('admin', 'Admin', true),
  ('editor', 'Editor', true),
  ('reviewer', 'Reviewer', true)
on conflict (code) do nothing;

insert into cms.permissions (code, resource, action)
values
  ('content.read', 'content', 'read'),
  ('content.write', 'content', 'write'),
  ('content.publish', 'content', 'publish'),
  ('media.manage', 'media', 'manage'),
  ('forms.read', 'forms', 'read'),
  ('settings.manage', 'settings', 'manage'),
  ('users.manage', 'users', 'manage'),
  ('audit.read', 'audit', 'read')
on conflict (code) do nothing;

insert into cms.locales (code, label, language, region, is_default, is_active)
values
  ('en', 'English', 'en', 'global', true, true),
  ('da-DK', 'Dansk', 'da', 'DK', false, true)
on conflict (code) do nothing;

insert into ops.consent_rule_sets (rule_set_key, default_mode, categories_json, banner_copy_ref)
values
  ('eea_uk_ch', 'opt_in', '["necessary","preferences","analytics","marketing"]'::jsonb, 'legal.cookie_banner.eea'),
  ('us_california', 'mixed', '["necessary","preferences","analytics","marketing"]'::jsonb, 'legal.cookie_banner.us'),
  ('rest_of_world', 'inform', '["necessary","preferences","analytics","marketing"]'::jsonb, 'legal.cookie_banner.default')
on conflict (rule_set_key) do nothing;

insert into cms.region_profiles (code, display_name, rule_set_key)
values
  ('eea_uk_ch', 'EEA / UK / CH', 'eea_uk_ch'),
  ('us_california', 'United States / California-sensitive', 'us_california'),
  ('rest_of_world', 'Rest of world', 'rest_of_world')
on conflict (code) do nothing;

insert into cms.site_settings (key, scope, json_value)
values
  ('brand.site', 'global', '{"name":"Shapewebs","defaultLocale":"en"}'::jsonb),
  ('preview.tokens', 'global', '{"ttlMinutes":30}'::jsonb),
  ('forms.retention', 'global', '{"contactDays":365}'::jsonb)
on conflict (key, scope) do nothing;

create or replace function cms.current_admin_profile_id()
returns uuid
language sql
stable
security definer
set search_path = public, cms
as $$
  select ap.id
  from cms.admin_profiles ap
  where ap.auth_user_id = auth.uid()
    and ap.status = 'active'
  limit 1
$$;

create or replace function cms.has_role(role_code text)
returns boolean
language sql
stable
security definer
set search_path = public, cms
as $$
  select exists (
    select 1
    from cms.admin_profiles ap
    join cms.user_role_assignments ura on ura.profile_id = ap.id
    join cms.roles r on r.id = ura.role_id
    where ap.auth_user_id = auth.uid()
      and ap.status = 'active'
      and r.code = role_code
  )
$$;

create or replace function ops.append_audit_log(
  p_action text,
  p_entity_type text,
  p_entity_id uuid default null,
  p_before jsonb default null,
  p_after jsonb default null,
  p_ip_hash text default null
)
returns void
language plpgsql
security definer
set search_path = public, cms, ops
as $$
begin
  insert into ops.audit_logs (
    actor_profile_id,
    action,
    entity_type,
    entity_id,
    before_json,
    after_json,
    ip_hash
  )
  values (
    cms.current_admin_profile_id(),
    p_action,
    p_entity_type,
    p_entity_id,
    p_before,
    p_after,
    p_ip_hash
  );
end;
$$;

alter table cms.admin_profiles enable row level security;
alter table cms.roles enable row level security;
alter table cms.permissions enable row level security;
alter table cms.role_permissions enable row level security;
alter table cms.user_role_assignments enable row level security;
alter table cms.admin_security_events enable row level security;
alter table cms.locales enable row level security;
alter table cms.region_profiles enable row level security;
alter table cms.documents enable row level security;
alter table cms.pages enable row level security;
alter table cms.posts enable row level security;
alter table cms.projects enable row level security;
alter table cms.services enable row level security;
alter table cms.methods enable row level security;
alter table cms.legal_documents enable row level security;
alter table cms.document_localizations enable row level security;
alter table cms.document_revisions enable row level security;
alter table cms.seo_metadata enable row level security;
alter table cms.reusable_sections enable row level security;
alter table cms.media_assets enable row level security;
alter table cms.media_asset_localizations enable row level security;
alter table cms.site_settings enable row level security;
alter table cms.feature_flags enable row level security;
alter table ops.consent_rule_sets enable row level security;
alter table ops.cookie_policy_versions enable row level security;
alter table ops.consent_events enable row level security;
alter table ops.audit_logs enable row level security;
alter table ops.contact_submissions enable row level security;
alter table ops.job_runs enable row level security;
alter table ops.preview_tokens enable row level security;

create policy "admin profiles self or privileged read"
on cms.admin_profiles
for select
to authenticated
using (
  auth_user_id = auth.uid()
  or cms.has_role('owner')
  or cms.has_role('admin')
);

create policy "admin profiles privileged manage"
on cms.admin_profiles
for all
to authenticated
using (cms.has_role('owner') or cms.has_role('admin'))
with check (cms.has_role('owner') or cms.has_role('admin'));

create policy "roles privileged read"
on cms.roles
for select
to authenticated
using (cms.has_role('owner') or cms.has_role('admin'));

create policy "roles owner manage"
on cms.roles
for all
to authenticated
using (cms.has_role('owner'))
with check (cms.has_role('owner'));

create policy "permissions privileged read"
on cms.permissions
for select
to authenticated
using (cms.has_role('owner') or cms.has_role('admin'));

create policy "permissions owner manage"
on cms.permissions
for all
to authenticated
using (cms.has_role('owner'))
with check (cms.has_role('owner'));

create policy "role assignments privileged read"
on cms.user_role_assignments
for select
to authenticated
using (cms.has_role('owner') or cms.has_role('admin'));

create policy "role assignments owner manage"
on cms.user_role_assignments
for all
to authenticated
using (cms.has_role('owner'))
with check (cms.has_role('owner'));

create policy "role permissions privileged read"
on cms.role_permissions
for select
to authenticated
using (cms.has_role('owner') or cms.has_role('admin'));

create policy "role permissions owner manage"
on cms.role_permissions
for all
to authenticated
using (cms.has_role('owner'))
with check (cms.has_role('owner'));

create policy "security events privileged read"
on cms.admin_security_events
for select
to authenticated
using (cms.has_role('owner') or cms.has_role('admin'));

create policy "security events privileged insert"
on cms.admin_security_events
for insert
to authenticated
with check (cms.has_role('owner') or cms.has_role('admin'));

create policy "locale public read"
on cms.locales
for select
to public
using (is_active = true);

create policy "locale admin manage"
on cms.locales
for all
to authenticated
using (cms.has_role('owner') or cms.has_role('admin'))
with check (cms.has_role('owner') or cms.has_role('admin'));

create policy "region profiles privileged read"
on cms.region_profiles
for select
to authenticated
using (cms.has_role('owner') or cms.has_role('admin'));

create policy "region profiles privileged manage"
on cms.region_profiles
for all
to authenticated
using (cms.has_role('owner') or cms.has_role('admin'))
with check (cms.has_role('owner') or cms.has_role('admin'));

create policy "documents public published read"
on cms.documents
for select
to public
using (state = 'published');

create policy "documents editorial read"
on cms.documents
for select
to authenticated
using (
  cms.has_role('owner')
  or cms.has_role('admin')
  or cms.has_role('editor')
  or cms.has_role('reviewer')
);

create policy "documents editorial write"
on cms.documents
for all
to authenticated
using (
  cms.has_role('owner')
  or cms.has_role('admin')
  or cms.has_role('editor')
  or cms.has_role('reviewer')
)
with check (
  cms.has_role('owner')
  or cms.has_role('admin')
  or cms.has_role('editor')
  or cms.has_role('reviewer')
);

create policy "detail tables public published read"
on cms.pages
for select
to public
using (exists (select 1 from cms.documents d where d.id = document_id and d.state = 'published'));

create policy "posts public published read"
on cms.posts
for select
to public
using (exists (select 1 from cms.documents d where d.id = document_id and d.state = 'published'));

create policy "projects public published read"
on cms.projects
for select
to public
using (exists (select 1 from cms.documents d where d.id = document_id and d.state = 'published'));

create policy "services public published read"
on cms.services
for select
to public
using (exists (select 1 from cms.documents d where d.id = document_id and d.state = 'published'));

create policy "methods public published read"
on cms.methods
for select
to public
using (exists (select 1 from cms.documents d where d.id = document_id and d.state = 'published'));

create policy "legal documents public published read"
on cms.legal_documents
for select
to public
using (exists (select 1 from cms.documents d where d.id = document_id and d.state = 'published'));

create policy "detail tables editorial manage"
on cms.pages
for all
to authenticated
using (cms.has_role('owner') or cms.has_role('admin') or cms.has_role('editor'))
with check (cms.has_role('owner') or cms.has_role('admin') or cms.has_role('editor'));

create policy "posts editorial manage"
on cms.posts
for all
to authenticated
using (cms.has_role('owner') or cms.has_role('admin') or cms.has_role('editor'))
with check (cms.has_role('owner') or cms.has_role('admin') or cms.has_role('editor'));

create policy "projects editorial manage"
on cms.projects
for all
to authenticated
using (cms.has_role('owner') or cms.has_role('admin') or cms.has_role('editor'))
with check (cms.has_role('owner') or cms.has_role('admin') or cms.has_role('editor'));

create policy "services editorial manage"
on cms.services
for all
to authenticated
using (cms.has_role('owner') or cms.has_role('admin') or cms.has_role('editor'))
with check (cms.has_role('owner') or cms.has_role('admin') or cms.has_role('editor'));

create policy "methods editorial manage"
on cms.methods
for all
to authenticated
using (cms.has_role('owner') or cms.has_role('admin') or cms.has_role('editor'))
with check (cms.has_role('owner') or cms.has_role('admin') or cms.has_role('editor'));

create policy "legal docs editorial manage"
on cms.legal_documents
for all
to authenticated
using (cms.has_role('owner') or cms.has_role('admin'))
with check (cms.has_role('owner') or cms.has_role('admin'));

create policy "document localizations public published read"
on cms.document_localizations
for select
to public
using (exists (select 1 from cms.documents d where d.id = document_id and d.state = 'published'));

create policy "document localizations editorial manage"
on cms.document_localizations
for all
to authenticated
using (cms.has_role('owner') or cms.has_role('admin') or cms.has_role('editor'))
with check (cms.has_role('owner') or cms.has_role('admin') or cms.has_role('editor'));

create policy "document revisions published read"
on cms.document_revisions
for select
to public
using (exists (select 1 from cms.documents d where d.published_revision_id = id and d.state = 'published'));

create policy "document revisions editorial read"
on cms.document_revisions
for select
to authenticated
using (
  cms.has_role('owner')
  or cms.has_role('admin')
  or cms.has_role('editor')
  or cms.has_role('reviewer')
);

create policy "document revisions editorial write"
on cms.document_revisions
for insert
to authenticated
with check (cms.has_role('owner') or cms.has_role('admin') or cms.has_role('editor') or cms.has_role('reviewer'));

create policy "seo public published read"
on cms.seo_metadata
for select
to public
using (
  exists (
    select 1
    from cms.document_localizations dl
    join cms.documents d on d.id = dl.document_id
    where dl.id = document_localization_id
      and d.state = 'published'
  )
);

create policy "seo editorial manage"
on cms.seo_metadata
for all
to authenticated
using (cms.has_role('owner') or cms.has_role('admin') or cms.has_role('editor'))
with check (cms.has_role('owner') or cms.has_role('admin') or cms.has_role('editor'));

create policy "reusable sections published read"
on cms.reusable_sections
for select
to public
using (state = 'published');

create policy "reusable sections editorial manage"
on cms.reusable_sections
for all
to authenticated
using (cms.has_role('owner') or cms.has_role('admin') or cms.has_role('editor'))
with check (cms.has_role('owner') or cms.has_role('admin') or cms.has_role('editor'));

create policy "media editorial manage"
on cms.media_assets
for all
to authenticated
using (cms.has_role('owner') or cms.has_role('admin') or cms.has_role('editor'))
with check (cms.has_role('owner') or cms.has_role('admin') or cms.has_role('editor'));

create policy "media localizations editorial manage"
on cms.media_asset_localizations
for all
to authenticated
using (cms.has_role('owner') or cms.has_role('admin') or cms.has_role('editor'))
with check (cms.has_role('owner') or cms.has_role('admin') or cms.has_role('editor'));

create policy "settings admin read"
on cms.site_settings
for select
to authenticated
using (cms.has_role('owner') or cms.has_role('admin'));

create policy "settings admin manage"
on cms.site_settings
for all
to authenticated
using (cms.has_role('owner') or cms.has_role('admin'))
with check (cms.has_role('owner') or cms.has_role('admin'));

create policy "feature flags admin manage"
on cms.feature_flags
for all
to authenticated
using (cms.has_role('owner') or cms.has_role('admin'))
with check (cms.has_role('owner') or cms.has_role('admin'));

create policy "consent rules admin manage"
on ops.consent_rule_sets
for all
to authenticated
using (cms.has_role('owner') or cms.has_role('admin'))
with check (cms.has_role('owner') or cms.has_role('admin'));

create policy "cookie policy admin manage"
on ops.cookie_policy_versions
for all
to authenticated
using (cms.has_role('owner') or cms.has_role('admin'))
with check (cms.has_role('owner') or cms.has_role('admin'));

create policy "consent event admin read"
on ops.consent_events
for select
to authenticated
using (cms.has_role('owner') or cms.has_role('admin'));

create policy "contact submissions admin read"
on ops.contact_submissions
for select
to authenticated
using (cms.has_role('owner') or cms.has_role('admin') or cms.has_role('editor') or cms.has_role('reviewer'));

create policy "contact submissions public insert"
on ops.contact_submissions
for insert
to public
with check (true);

create policy "contact submissions admin update"
on ops.contact_submissions
for update
to authenticated
using (cms.has_role('owner') or cms.has_role('admin'))
with check (cms.has_role('owner') or cms.has_role('admin'));

create policy "audit logs admin read"
on ops.audit_logs
for select
to authenticated
using (cms.has_role('owner') or cms.has_role('admin') or cms.has_role('reviewer'));

create policy "job runs admin read"
on ops.job_runs
for select
to authenticated
using (cms.has_role('owner') or cms.has_role('admin'));

create policy "job runs admin manage"
on ops.job_runs
for all
to authenticated
using (cms.has_role('owner') or cms.has_role('admin'))
with check (cms.has_role('owner') or cms.has_role('admin'));

create policy "preview tokens admin manage"
on ops.preview_tokens
for all
to authenticated
using (cms.has_role('owner') or cms.has_role('admin') or cms.has_role('editor') or cms.has_role('reviewer'))
with check (cms.has_role('owner') or cms.has_role('admin') or cms.has_role('editor') or cms.has_role('reviewer'));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('public-assets', 'public-assets', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/avif']),
  ('private-media', 'private-media', false, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/avif'])
on conflict (id) do nothing;

create policy "public can read public assets"
on storage.objects
for select
to public
using (bucket_id = 'public-assets');

create policy "editors can manage media objects"
on storage.objects
for all
to authenticated
using (
  bucket_id in ('public-assets', 'private-media')
  and (cms.has_role('owner') or cms.has_role('admin') or cms.has_role('editor'))
)
with check (
  bucket_id in ('public-assets', 'private-media')
  and (cms.has_role('owner') or cms.has_role('admin') or cms.has_role('editor'))
);

commit;
